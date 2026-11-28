// Emergency reserve stress-test calculator & 12-month trajectory chart (lazy-loaded with What-If Lab).

import { formatCompactMoney } from "./budget-math.js";

export function projectWhatIfScenario(summary, scenario) {
  const incomeAfterDelta = summary.income + Number(scenario.incomeDelta ?? 0);
  const baseLiving = summary.assignedTotal - summary.wealthAndSinkingAssigned;
  const groceryInflationImpact = 760 * (Number(scenario.groceryInflationPct ?? 0) / 100);
  const trimWants = Number(scenario.trimDiscretionary ?? 0);
  const newExpenseRunRate = Math.max(1800, baseLiving + groceryInflationImpact - trimWants + Number(scenario.newFixedCost ?? 0));
  const monthlySurplus = Number((incomeAfterDelta - newExpenseRunRate).toFixed(2));

  const startingReserve = 16400;
  const projection = [];
  let reserve = startingReserve;
  for (let m = 0; m <= 12; m += 1) {
    projection.push({ month: m, reserve: Number(Math.max(0, reserve).toFixed(2)) });
    const monthlyYield = reserve > 0 ? reserve * (0.0435 / 12) : 0;
    reserve = reserve + monthlyYield + monthlySurplus;
  }

  const emergencyBurn = Math.max(2500, newExpenseRunRate - 450);
  const runwayMonths = monthlySurplus >= 0
    ? Number((startingReserve / emergencyBurn).toFixed(1))
    : Number((startingReserve / Math.abs(monthlySurplus)).toFixed(1));

  return {
    incomeAfterDelta: Number(incomeAfterDelta.toFixed(2)),
    newExpenseRunRate: Number(newExpenseRunRate.toFixed(2)),
    monthlySurplus,
    runwayMonths,
    projection,
    sustainable: monthlySurplus >= 0,
  };
}

export function renderReserveForecastSvg(projection) {
  const W = 520;
  const H = 180;
  const pad = { top: 18, right: 18, bottom: 26, left: 50 };
  const plotW = W - pad.left - pad.right;
  const plotH = H - pad.top - pad.bottom;

  const vals = projection.map((p) => p.reserve);
  const maxV = Math.max(...vals, 25000);
  const xAt = (m) => pad.left + (m / 12) * plotW;
  const yAt = (v) => pad.top + plotH - (v / maxV) * plotH;

  const line = projection.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(p.month).toFixed(1)},${yAt(p.reserve).toFixed(1)}`).join(" ");
  const targetY = yAt(24000);

  return `<svg viewBox="0 0 ${W} ${H}" class="chart-svg" role="img" aria-label="12-month emergency reserve forecast">
    <line x1="${pad.left}" y1="${targetY.toFixed(1)}" x2="${W - pad.right}" y2="${targetY.toFixed(1)}" stroke="#b87c22" stroke-dasharray="5 4"/>
    <text x="${W - pad.right - 4}" y="${(targetY - 5).toFixed(1)}" text-anchor="end" fill="#7e520c" font-size="10.5" font-weight="700">6-Mo Target ($24k)</text>
    <path d="${line}" fill="none" stroke="#163d2f" stroke-width="2.7" stroke-linecap="round"/>
    <text x="${pad.left}" y="${H - 6}" fill="#54625a" font-size="10.5">Now (${formatCompactMoney(vals[0])})</text>
    <text x="${W - pad.right}" y="${H - 6}" text-anchor="end" fill="#163d2f" font-size="10.5" font-weight="700">+12 Mo (${formatCompactMoney(vals[vals.length - 1])})</text>
  </svg>`;
}
