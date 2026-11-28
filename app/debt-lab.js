// Debt amortization math and multi-curve comparison chart (lazy-loaded with Goals & Debt view).

import { formatCompactMoney, formatMoney } from "./budget-math.js";

export function simulateDebtPayoff(debts, extraMonthly = 315, strategy = "avalanche") {
  const ordered = debts.map((d) => ({ ...d, rem: Number(d.balance) }));
  const sortFn = strategy === "avalanche"
    ? (a, b) => b.apr - a.apr || a.rem - b.rem
    : (a, b) => a.rem - b.rem || b.apr - a.apr;

  const totalMinimums = ordered.reduce((s, d) => s + Number(d.minPayment), 0);
  const monthlyBudget = totalMinimums + Math.max(0, Number(extraMonthly));
  const curve = [{ month: 0, totalBalance: Number(ordered.reduce((s, d) => s + d.rem, 0).toFixed(2)) }];

  let months = 0;
  let totalInterest = 0;
  const payoffOrder = [];

  while (ordered.some((d) => d.rem > 0.01) && months < 180) {
    months += 1;
    for (const d of ordered) {
      if (d.rem <= 0.01) continue;
      const interest = d.rem * (d.apr / 100 / 12);
      d.rem += interest;
      totalInterest += interest;
    }
    let pool = monthlyBudget;
    for (const d of ordered) {
      if (d.rem <= 0.01) continue;
      const pay = Math.min(d.rem, d.minPayment);
      d.rem -= pay;
      pool -= pay;
      if (d.rem <= 0.01) {
        d.rem = 0;
        if (!payoffOrder.find((p) => p.id === d.id)) payoffOrder.push({ id: d.id, name: d.name, month: months });
      }
    }
    const targets = ordered.filter((d) => d.rem > 0.01).sort(sortFn);
    for (const target of targets) {
      if (pool <= 0.01) break;
      const pay = Math.min(target.rem, pool);
      target.rem -= pay;
      pool -= pay;
      if (target.rem <= 0.01) {
        target.rem = 0;
        if (!payoffOrder.find((p) => p.id === target.id)) payoffOrder.push({ id: target.id, name: target.name, month: months });
      }
    }
    curve.push({ month: months, totalBalance: Number(ordered.reduce((s, d) => s + d.rem, 0).toFixed(2)) });
  }

  const endTotalMonths = 2026 * 12 + 10 + months;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    strategy,
    months,
    debtFreeLabel: `${names[endTotalMonths % 12]} ${Math.floor(endTotalMonths / 12)}`,
    totalInterest: Number(totalInterest.toFixed(2)),
    monthlyBudget: Number(monthlyBudget.toFixed(2)),
    curve,
    payoffOrder,
  };
}

export function renderDebtComparisonSvg(avalancheSim, snowballSim, minOnlySim) {
  const W = 520;
  const H = 188;
  const pad = { top: 18, right: 20, bottom: 26, left: 50 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const maxMonths = Math.max(minOnlySim?.months ?? 0, avalancheSim.months, snowballSim.months, 12);
  const maxBal = Math.max(avalancheSim.curve[0]?.totalBalance ?? 1000, 1000);
  const xAt = (m) => pad.left + (m / maxMonths) * plotW;
  const yAt = (b) => pad.top + plotH - (b / maxBal) * plotH;

  const toPath = (curve) => curve.map((pt, i) => `${i === 0 ? "M" : "L"}${xAt(pt.month).toFixed(1)},${yAt(pt.totalBalance).toFixed(1)}`).join(" ");
  const avLine = toPath(avalancheSim.curve);
  const avArea = `${avLine} L${xAt(avalancheSim.months).toFixed(1)},${(pad.top + plotH).toFixed(1)} L${pad.left},${(pad.top + plotH).toFixed(1)} Z`;

  const grid = [0, 0.5, 1].map((t) => {
    const val = maxBal * t;
    const y = yAt(val);
    return `<line x1="${pad.left}" y1="${y.toFixed(1)}" x2="${W - pad.right}" y2="${y.toFixed(1)}" stroke="#e6dfd2" stroke-dasharray="3 3"/>
      <text x="${pad.left - 7}" y="${(y + 4).toFixed(1)}" text-anchor="end" fill="#54625a" font-size="10.5">${formatCompactMoney(val)}</text>`;
  }).join("");

  const xLabels = [0, avalancheSim.months, snowballSim.months, maxMonths]
    .filter((v, i, a) => a.indexOf(v) === i)
    .map((m) => `<text x="${xAt(m).toFixed(1)}" y="${H - 7}" text-anchor="middle" fill="#54625a" font-size="10.5">Mo ${m}</text>`)
    .join("");

  const savedMonths = Math.max(0, (minOnlySim?.months ?? 0) - avalancheSim.months);
  const savedInt = Math.max(0, (minOnlySim?.totalInterest ?? 0) - avalancheSim.totalInterest);

  return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="Debt payoff curves comparing Avalanche, Snowball, and Minimums">
    <defs>
      <linearGradient id="debtFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#163d2f" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#163d2f" stop-opacity="0.01"/>
      </linearGradient>
    </defs>
    ${grid}
    ${minOnlySim ? `<path d="${toPath(minOnlySim.curve)}" fill="none" stroke="#8c948e" stroke-width="2" stroke-dasharray="3 4"/>` : ""}
    <path d="${avArea}" fill="url(#debtFill)"/>
    <path d="${toPath(snowballSim.curve)}" fill="none" stroke="#b87c22" stroke-width="2.4" stroke-dasharray="6 4"/>
    <path d="${avLine}" fill="none" stroke="#163d2f" stroke-width="2.8"/>
    <circle cx="${xAt(avalancheSim.months).toFixed(1)}" cy="${yAt(0).toFixed(1)}" r="4.5" fill="#163d2f"/>
    <circle cx="${xAt(snowballSim.months).toFixed(1)}" cy="${yAt(0).toFixed(1)}" r="3.8" fill="#b87c22"/>
    ${minOnlySim ? `<circle cx="${xAt(minOnlySim.months).toFixed(1)}" cy="${yAt(0).toFixed(1)}" r="3.8" fill="#8c948e"/>` : ""}
    <rect x="${(W - 186).toFixed(1)}" y="${(pad.top + 4).toFixed(1)}" width="166" height="22" rx="5" fill="#132e24"/>
    <text x="${(W - 103).toFixed(1)}" y="${(pad.top + 18.5).toFixed(1)}" text-anchor="middle" fill="#ffffff" font-size="10.5" font-weight="700">Save ${formatMoney(savedInt)} · ${savedMonths} mo</text>
    ${xLabels}
  </svg>`;
}
