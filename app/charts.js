// Inline SVG visualizations for Overview (spending pace glidepath & zero-based allocation ribbon).

import { formatCompactMoney, formatMoney } from "./budget-math.js";

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

export function renderPaceChartSvg(pace) {
  const W = 560;
  const H = 198;
  const pad = { top: 18, right: 18, bottom: 24, left: 48 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const maxY = Math.max(pace.flexiblePool * 1.08, ...pace.points.map((p) => p.actual ?? 0), 100);
  const xAt = (day) => pad.left + ((day - 1) / Math.max(1, pace.totalDays - 1)) * plotW;
  const yAt = (val) => pad.top + plotH - (val / maxY) * plotH;

  const actualPts = pace.points.filter((p) => p.actual !== null);
  const linePath = actualPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${xAt(p.day).toFixed(1)},${yAt(p.actual).toFixed(1)}`)
    .join(" ");
  const last = actualPts[actualPts.length - 1];
  const areaPath = last
    ? `${linePath} L${xAt(last.day).toFixed(1)},${(pad.top + plotH).toFixed(1)} L${xAt(1).toFixed(1)},${(pad.top + plotH).toFixed(1)} Z`
    : "";

  const ticksY = [0, 0.5, 1].map((t) => {
    const v = maxY * t;
    const y = yAt(v);
    return `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${W - pad.right}" y2="${y.toFixed(1)}" stroke="#e6dfd2" stroke-dasharray="3 3"/>
      <text x="${pad.left - 7}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#54625a" font-size="10.5">${formatCompactMoney(v)}</text>`;
  }).join("");

  const dayTicks = [1, 8, 15, 22, pace.totalDays]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((d) => `<text x="${xAt(d).toFixed(1)}" y="${H - 6}" text-anchor="middle" fill="#54625a" font-size="10.5">Day ${d}</text>`)
    .join("");

  const badgeX = last ? Math.max(pad.left + 8, xAt(last.day) - 148) : 0;
  const badgeY = last ? Math.min(pad.top + plotH - 26, yAt(last.actual) + 9) : 0;
  const marker = last
    ? `<line x1="${xAt(last.day).toFixed(1)}" y1="${yAt(last.actual).toFixed(1)}" x2="${xAt(last.day).toFixed(1)}" y2="${(pad.top + plotH).toFixed(1)}" stroke="#163d2f" stroke-opacity="0.25" stroke-dasharray="2 3"/>
       <circle cx="${xAt(last.day).toFixed(1)}" cy="${yAt(last.actual).toFixed(1)}" r="4.8" fill="#163d2f" stroke="#faf7f1" stroke-width="2"/>
       <rect x="${badgeX.toFixed(1)}" y="${badgeY.toFixed(1)}" width="140" height="21" rx="5" fill="#132e24"/>
       <text x="${(badgeX + 70).toFixed(1)}" y="${(badgeY + 14.5).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-size="10.5" font-weight="700">Day ${last.day}: ${formatMoney(last.actual)}</text>`
    : "";

  return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="Variable household spending pace chart">
    <defs>
      <linearGradient id="paceFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#235c46" stop-opacity="0.24"/>
        <stop offset="100%" stop-color="#235c46" stop-opacity="0.02"/>
      </linearGradient>
    </defs>
    ${ticksY}
    <line x1="${xAt(1).toFixed(1)}" y1="${yAt(pace.points[0]?.ideal ?? 0).toFixed(1)}" x2="${xAt(pace.totalDays).toFixed(1)}" y2="${yAt(pace.flexiblePool).toFixed(1)}" stroke="#b87c22" stroke-width="2" stroke-dasharray="6 4"/>
    ${areaPath ? `<path d="${areaPath}" fill="url(#paceFill)"/>` : ""}
    ${linePath ? `<path d="${linePath}" fill="none" stroke="#163d2f" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>` : ""}
    ${marker}
    ${dayTicks}
  </svg>`;
}

export function renderAllocationRibbonSvg(summary) {
  const groups = [
    { pct: summary.needsSharePct, color: "#163d2f" },
    { pct: summary.wantsSharePct, color: "#2e785b" },
    { pct: summary.savingsSharePct, color: "#b87c22" },
  ];
  let cursor = 0;
  const rects = groups.map((g) => {
    const w = Math.max(0, (g.pct / 100) * 520);
    const out = `<rect x="${cursor.toFixed(1)}" y="2" width="${w.toFixed(1)}" height="14" fill="${g.color}"/>`;
    cursor += w;
    return out;
  }).join("");
  return `<svg viewBox="0 0 520 18" class="ribbon-svg" role="img" aria-label="Zero-based budget split ribbon">
    <clipPath id="ribbonClip"><rect x="0" y="2" width="520" height="14" rx="5"/></clipPath>
    <g clip-path="url(#ribbonClip)">${rects}</g>
  </svg>`;
}
