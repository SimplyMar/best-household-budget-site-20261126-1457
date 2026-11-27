// Custom inline SVG visualizations for household spending pace, zero-based allocation, and debt payoff curves.
// Pure HTML5 inline <svg> with zero external dependencies or network URLs.

import { formatCompactMoney, formatMoney } from "./budget-math.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

export function renderPaceChartSvg(pace) {
  const W = 580;
  const H = 186;
  const pad = { top: 20, right: 20, bottom: 26, left: 50 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const maxY = Math.max(pace.flexiblePool * 1.08, ...pace.points.map((p) => p.actual ?? 0), 100);
  const xAt = (day) => pad.left + ((day - 1) / Math.max(1, pace.totalDays - 1)) * plotW;
  const yAt = (val) => pad.top + plotH - (val / maxY) * plotH;

  const idealX1 = xAt(1).toFixed(1);
  const idealY1 = yAt(pace.points[0]?.ideal ?? 0).toFixed(1);
  const idealX2 = xAt(pace.totalDays).toFixed(1);
  const idealY2 = yAt(pace.flexiblePool).toFixed(1);

  const actualPts = pace.points.filter((p) => p.actual !== null);
  const linePath = actualPts
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${xAt(p.day).toFixed(1)},${yAt(p.actual).toFixed(1)}`)
    .join(" ");
  const lastActual = actualPts[actualPts.length - 1];
  const areaPath = actualPts.length
    ? `${linePath} L${xAt(lastActual.day).toFixed(1)},${(pad.top + plotH).toFixed(1)} L${xAt(1).toFixed(1)},${(pad.top + plotH).toFixed(1)} Z`
    : "";

  const ticksY = [0, 0.5, 1].map((t) => {
    const v = maxY * t;
    const y = yAt(v);
    return `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${W - pad.right}" y2="${y.toFixed(1)}" stroke="#e3ddd1" stroke-dasharray="3 3"/>
      <text x="${pad.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#546058" font-size="11">${formatCompactMoney(v)}</text>`;
  }).join("");

  const dayTicks = [1, 8, 15, 22, pace.totalDays]
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .map((d) => `<text x="${xAt(d).toFixed(1)}" y="${H - 6}" text-anchor="middle" fill="#546058" font-size="11">Day ${d}</text>`)
    .join("");

  const badgeX = lastActual ? Math.min(W - 152, Math.max(pad.left + 4, xAt(lastActual.day) - 74)) : 0;
  const badgeY = lastActual ? Math.min(pad.top + plotH - 26, yAt(lastActual.actual) + 8) : 0;
  const marker = lastActual
    ? `<circle cx="${xAt(lastActual.day).toFixed(1)}" cy="${yAt(lastActual.actual).toFixed(1)}" r="4.8" fill="#163a2e" stroke="#faf8f4" stroke-width="2"/>
       <rect x="${badgeX.toFixed(1)}" y="${badgeY.toFixed(1)}" width="146" height="21" rx="5" fill="#163a2e"/>
       <text x="${(badgeX + 73).toFixed(1)}" y="${(badgeY + 14.5).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-size="11" font-weight="600">Day ${lastActual.day}: ${formatMoney(lastActual.actual)}</text>`
    : "";

  return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="Variable household spending pace chart">
    <defs>
      <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1f5c46" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#1f5c46" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    ${ticksY}
    <line x1="${idealX1}" y1="${idealY1}" x2="${idealX2}" y2="${idealY2}" stroke="#b57b24" stroke-width="2" stroke-dasharray="6 4"/>
    ${areaPath ? `<path d="${areaPath}" fill="url(#paceFill)"/>` : ""}
    ${linePath ? `<path d="${linePath}" fill="none" stroke="#163a2e" stroke-width="2.75" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    ${marker}
    ${dayTicks}
  </svg>`;
}

export function renderAllocationRibbonSvg(summary) {
  const groups = [
    { label: "Essentials", pct: summary.needsSharePct, color: "#163a2e" },
    { label: "Flexible Living", pct: summary.wantsSharePct, color: "#2f765a" },
    { label: "Sinking & Debt/Save", pct: summary.savingsSharePct, color: "#b57b24" },
  ];
  let cursor = 0;
  const rects = groups.map((g) => {
    const w = Math.max(0, (g.pct / 100) * 520);
    const r = `<rect x="${cursor.toFixed(1)}" y="2" width="${w.toFixed(1)}" height="15" fill="${g.color}"/>`;
    cursor += w;
    return r;
  }).join("");

  return `<svg viewBox="0 0 520 19" class="ribbon-svg" role="img" aria-label="Zero-based budget allocation bar">
    <clipPath id="ribbonClip"><rect x="0" y="2" width="520" height="15" rx="5"/></clipPath>
    <g clip-path="url(#ribbonClip)">${rects}</g>
  </svg>`;
}

export function renderDebtComparisonSvg(avalancheSim, snowballSim, minOnlySim) {
  const W = 560;
  const H = 200;
  const pad = { top: 18, right: 20, bottom: 28, left: 52 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const maxMonths = Math.max(minOnlySim?.months ?? 0, avalancheSim.months, snowballSim.months, 12);
  const maxBal = Math.max(avalancheSim.curve[0]?.totalBalance ?? 1000, 1000);
  const xAt = (m) => pad.left + (m / maxMonths) * plotW;
  const yAt = (b) => pad.top + plotH - (b / maxBal) * plotH;

  const toPath = (curve) => curve.map((pt, idx) => `${idx === 0 ? "M" : "L"}${xAt(pt.month).toFixed(1)},${yAt(pt.totalBalance).toFixed(1)}`).join(" ");
  const avLine = toPath(avalancheSim.curve);
  const avArea = `${avLine} L${xAt(avalancheSim.months).toFixed(1)},${(pad.top + plotH).toFixed(1)} L${pad.left},${(pad.top + plotH).toFixed(1)} Z`;

  const grid = [0, 0.5, 1].map((t) => {
    const val = maxBal * t;
    const y = yAt(val);
    return `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${W - pad.right}" y2="${y.toFixed(1)}" stroke="#e3ddd1" stroke-dasharray="3 3"/>
      <text x="${pad.left - 8}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#546058" font-size="11">${formatCompactMoney(val)}</text>`;
  }).join("");

  const xLabels = [0, avalancheSim.months, maxMonths]
    .filter((v, idx, arr) => arr.indexOf(v) === idx)
    .map((m) => `<text x="${xAt(m).toFixed(1)}" y="${H - 7}" text-anchor="middle" fill="#546058" font-size="11">Mo ${m}</text>`)
    .join("");

  return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="Debt payoff curve comparison">
    <defs>
      <linearGradient id="debtFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#163a2e" stop-opacity="0.16"/>
        <stop offset="100%" stop-color="#163a2e" stop-opacity="0.01"/>
      </linearGradient>
    </defs>
    ${grid}
    ${minOnlySim ? `<path d="${toPath(minOnlySim.curve)}" fill="none" stroke="#8c948e" stroke-width="2" stroke-dasharray="3 4"/>` : ""}
    <path d="${avArea}" fill="url(#debtFill)"/>
    <path d="${toPath(snowballSim.curve)}" fill="none" stroke="#b57b24" stroke-width="2.3" stroke-dasharray="7 4"/>
    <path d="${avLine}" fill="none" stroke="#163a2e" stroke-width="2.9"/>
    <circle cx="${xAt(avalancheSim.months).toFixed(1)}" cy="${yAt(0).toFixed(1)}" r="4.5" fill="#163a2e"/>
    ${minOnlySim ? `<circle cx="${xAt(minOnlySim.months).toFixed(1)}" cy="${yAt(0).toFixed(1)}" r="4" fill="#8c948e"/>` : ""}
    ${xLabels}
  </svg>`;
}

export function renderReserveForecastSvg(projection) {
  const W = 540;
  const H = 185;
  const pad = { top: 18, right: 18, bottom: 26, left: 52 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const vals = projection.map((p) => p.reserve);
  const maxV = Math.max(...vals, 25000);
  const xAt = (m) => pad.left + (m / 12) * plotW;
  const yAt = (v) => pad.top + plotH - (v / maxV) * plotH;

  const line = projection.map((p, idx) => `${idx === 0 ? "M" : "L"}${xAt(p.month).toFixed(1)},${yAt(p.reserve).toFixed(1)}`).join(" ");
  const targetY = yAt(24000);

  return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="12-month emergency reserve forecast">
    <line x1="${pad.left}" y1="${targetY.toFixed(1)}" x2="${W - pad.right}" y2="${targetY.toFixed(1)}" stroke="#b57b24" stroke-dasharray="5 4"/>
    <text x="${W - pad.right - 4}" y="${(targetY - 5).toFixed(1)}" text-anchor="end" fill="#8d5d14" font-size="11" font-weight="600">6-Mo Target ($24k)</text>
    <path d="${line}" fill="none" stroke="#163a2e" stroke-width="2.8" stroke-linecap="round"/>
    <text x="${pad.left}" y="${H - 6}" fill="#546058" font-size="11">Now (${formatCompactMoney(vals[0])})</text>
    <text x="${W - pad.right}" y="${H - 6}" text-anchor="end" fill="#163a2e" font-size="11" font-weight="600">+12 Mo (${formatCompactMoney(vals[vals.length - 1])})</text>
  </svg>`;
}