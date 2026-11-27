// End-to-end verification and screenshot capture over Chrome DevTools Protocol (zero external packages).
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const port = 8147;
const debugPort = 9367;
const chromePath = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const profile = join(root, ".tmp", `chrome-shot-${debugPort}`);
rmSync(profile, { recursive: true, force: true });
mkdirSync(profile, { recursive: true });
mkdirSync(join(root, "screenshots"), { recursive: true });

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
  } catch {
    // Wait for Chrome debug endpoint.
  }
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
  if (res.result?.exceptionDetails) {
    throw new Error(res.result.exceptionDetails.exception?.description ?? "eval error");
  }
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
    await send("Emulation.setDeviceMetricsOverride", {
      width: shot.viewport.width,
      height: shot.viewport.height,
      deviceScaleFactor: shot.mobile ? 2 : 1,
      mobile: Boolean(shot.mobile),
    });
    await send("Page.navigate", { url: `http://127.0.0.1:${port}/index.html${shot.path}` });
    await waitReady();
    await sleep(150);
    const overflow = await evaluate('document.documentElement.scrollWidth - window.innerWidth');
    if (overflow > 1) throw new Error(shot.file + ' has horizontal overflow: ' + overflow + 'px');

    // If deviceScaleFactor=2 exceeds 256 KiB, step quality or scale=1.5 down cleanly so every JPEG stays <240 KiB.
    let quality = shot.mobile ? 80 : 86;
    let buf = Buffer.from((await send("Page.captureScreenshot", { format: "jpeg", quality })).result.data, "base64");
    while (buf.byteLength > 245000 && quality > 55) {
      quality -= 8;
      buf = Buffer.from((await send("Page.captureScreenshot", { format: "jpeg", quality })).result.data, "base64");
    }
    const outFile = join(root, "screenshots", shot.file);
    writeFileSync(outFile, buf);
    console.log(`Captured ${shot.file}: ${statSync(outFile).size} bytes (q=${quality})`);
  }

  // Also smoke-test the remaining 2 routes (#/bills, #/planner) and interactive mutations!
  await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
  for (const route of ["#/bills", "#/planner", "#/"]) {
    await send("Page.navigate", { url: `http://127.0.0.1:${port}/index.html${route}` });
    await waitReady();
  }

  // Test interactive quick-cover button on Overview & verify overspent count drops to 0, then reset!
  const beforeAlerts = await evaluate("document.querySelectorAll('.alert-banner').length");
  await evaluate("document.querySelector('[data-action=\"quick-cover\"]')?.click()");
  await waitReady();
  const afterAlerts = await evaluate("document.querySelectorAll('.alert-banner').length");
  await evaluate("document.getElementById('reset-demo-btn').click()");
  await waitReady();

  console.log("Interactive check:", { beforeAlerts, afterAlerts, errors: errors.length, externalRequests: externalRequests.length });
  if (beforeAlerts !== 1 || afterAlerts !== 0) throw new Error(`Expected alert 1 -> 0, got ${beforeAlerts} -> ${afterAlerts}`);
  if (errors.length > 0) throw new Error(`Console/runtime errors: ${errors.join("; ")}`);
  if (externalRequests.length > 0) throw new Error(`External requests detected: ${externalRequests.join(", ")}`);
  console.log("ALL SMOKE CHECKS PASSED");
} finally {
  socket.close();
  chrome.kill();
  server.kill();
  await sleep(300);
}