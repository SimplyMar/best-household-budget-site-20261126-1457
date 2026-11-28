// End-to-end verification and gate-safe screenshot capture over Chrome DevTools Protocol (zero external packages).
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function readJpegDimensions(buf) {
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i += 1; continue; }
    const marker = buf[i + 1];
    if (marker === 0xd8 || marker === 0xd9) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    if ((marker >= 0xc0 && marker <= 0xc3) || (marker >= 0xc5 && marker <= 0xc7) || (marker >= 0xc9 && marker <= 0xcb)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + len;
  }
  throw new Error("Could not parse JPEG dimensions");
}

const port = 8149;
const debugPort = 9369;
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const profile = join(root, ".tmp", `chrome-shot-${debugPort}`);
rmSync(profile, { recursive: true, force: true });
mkdirSync(profile, { recursive: true });

const shotsDir = join(root, "screenshots");
mkdirSync(shotsDir, { recursive: true });
for (const old of readdirSync(shotsDir)) rmSync(join(shotsDir, old), { force: true });

const server = spawn(process.execPath, [join(root, "serve.ts"), "--port", String(port)], { stdio: "ignore" });
const chrome = spawn(chromePath, [
  "--headless=new",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profile}`,
  "--window-size=1280,800",
  "--hide-scrollbars",
  "--no-first-run",
  "--no-default-browser-check",
  "about:blank",
], { stdio: "ignore" });

let wsUrl = null;
for (let i = 0; i < 60 && !wsUrl; i += 1) {
  try {
    const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
    wsUrl = targets.find((t) => t.type === "page")?.webSocketDebuggerUrl ?? null;
  } catch { /* wait for Chrome */ }
  if (!wsUrl) await sleep(200);
}
if (!wsUrl) {
  chrome.kill();
  server.kill();
  throw new Error("Chrome debug port failed to start");
}

const socket = new WebSocket(wsUrl);
await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));

let nextId = 1;
const pending = new Map();
const errors = [];
const externalRequests = [];

socket.addEventListener("message", (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  } else if (msg.method === "Runtime.exceptionThrown") {
    errors.push(msg.params.exceptionDetails.text || "exception");
  } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    errors.push(msg.params.args.map((a) => a.value ?? a.description).join(" "));
  } else if (msg.method === "Network.requestWillBeSent") {
    const u = msg.params.request.url;
    if (!u.startsWith(`http://127.0.0.1:${port}`) && !u.startsWith("data:") && !u.startsWith("blob:") && u !== "about:blank") {
      externalRequests.push(u);
    }
  }
});

const send = (method, params = {}) => new Promise((resolve) => {
  const id = nextId++;
  pending.set(id, resolve);
  socket.send(JSON.stringify({ id, method, params }));
});

const evaluate = async (expression) => {
  const res = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (res.result?.exceptionDetails) throw new Error(res.result.exceptionDetails.exception?.description ?? "eval error");
  return res.result?.result?.value;
};

const waitReady = async () => {
  for (let i = 0; i < 80; i += 1) {
    if (await evaluate("window.__shotReady === true")) return;
    await sleep(100);
  }
  throw new Error("Timed out waiting for window.__shotReady");
};

try {
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Network.enable");

  const shots = JSON.parse(readFileSync(join(root, "shots.json"), "utf8"));
  for (const shot of shots) {
    const scale = Number(shot.scale ?? (shot.mobile ? 1.5 : 1));
    await send("Emulation.setDeviceMetricsOverride", {
      width: shot.viewport.width,
      height: shot.viewport.height,
      deviceScaleFactor: scale,
      mobile: Boolean(shot.mobile),
    });
    await send("Page.navigate", { url: `http://127.0.0.1:${port}/index.html${shot.path}` });
    await waitReady();
    await sleep(160);

    const overflow = await evaluate("document.documentElement.scrollWidth - window.innerWidth");
    if (overflow > 1) throw new Error(`${shot.file} horizontal overflow: ${overflow}px`);

    let quality = 86;
    let buf = Buffer.from((await send("Page.captureScreenshot", { format: "jpeg", quality })).result.data, "base64");
    while (buf.byteLength > 245000 && quality > 55) {
      quality -= 6;
      buf = Buffer.from((await send("Page.captureScreenshot", { format: "jpeg", quality })).result.data, "base64");
    }
    const { width, height } = readJpegDimensions(buf);
    const longSide = Math.max(width, height);
    const shortSide = Math.min(width, height);
    if (longSide > 1280) throw new Error(`${shot.file} long side ${longSide}px exceeds 1280px cap`);
    if (shortSide < 360) throw new Error(`${shot.file} short side ${shortSide}px below 360px floor`);
    if (buf.byteLength > 262144) throw new Error(`${shot.file} size ${buf.byteLength} exceeds 256 KiB cap`);

    const outFile = join(shotsDir, shot.file);
    writeFileSync(outFile, buf);
    console.log(`Captured ${shot.file}: ${width}x${height}px, ${statSync(outFile).size} bytes (q=${quality})`);
  }

  // Smoke-test remaining desktop routes + interactive state mutations.
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 760, deviceScaleFactor: 1, mobile: false });
  for (const route of ["#/bills", "#/planner", "#/"]) {
    await send("Page.navigate", { url: `http://127.0.0.1:${port}/index.html${route}` });
    await waitReady();
    const ov = await evaluate("document.documentElement.scrollWidth - window.innerWidth");
    if (ov > 1) throw new Error(`Route ${route} overflow: ${ov}px`);
  }

  const beforeAlerts = await evaluate("document.querySelectorAll('.alert-banner').length");
  await evaluate("document.querySelector('[data-action=\"quick-cover\"]')?.click()");
  await waitReady();
  const afterAlerts = await evaluate("document.querySelectorAll('.alert-banner').length");
  await evaluate("document.getElementById('reset-demo-btn').click()");
  await waitReady();

  console.log("Interactive check:", { beforeAlerts, afterAlerts, errors: errors.length, externalRequests: externalRequests.length });
  if (beforeAlerts !== 1 || afterAlerts !== 0) throw new Error(`Expected alert 1 -> 0, got ${beforeAlerts} -> ${afterAlerts}`);
  if (errors.length > 0) throw new Error(`Console/runtime errors: ${errors.join("; ")}`);
  if (externalRequests.length > 0) throw new Error(`External requests: ${externalRequests.join(", ")}`);
  console.log("ALL SMOKE CHECKS PASSED");
} finally {
  socket.close();
  chrome.kill();
  server.kill();
  await sleep(300);
}
