// Household What-If & Emergency Runway Stress-Test Lab (#/planner).

import { formatMoney } from "./budget-math.js";
import { escapeHtml } from "./charts.js";
import { projectWhatIfScenario, renderReserveForecastSvg } from "./runway-lab.js";

export function renderPlannerPage(state, summary) {
  const w = state.whatIf;
  const proj = projectWhatIfScenario(summary, w);

  return `
  <section class="page-hero-bar">
    <div>
      <h1 class="page-title">What-If Runway Lab</h1>
      <p class="page-sub">Stress-test a single-income stretch, food inflation, or new fixed costs against your 12-month cash reserve.</p>
    </div>
    <div class="filter-pills">
      <button type="button" class="pill-btn ${w.preset === "baseline" ? "active" : ""}" data-action="apply-preset" data-preset="baseline">Baseline</button>
      <button type="button" class="pill-btn ${w.preset === "one-income" ? "active" : ""}" data-action="apply-preset" data-preset="one-income">1-Income Layoff</button>
      <button type="button" class="pill-btn ${w.preset === "inflation" ? "active" : ""}" data-action="apply-preset" data-preset="inflation">15% Food Spike</button>
      <button type="button" class="pill-btn ${w.preset === "sprint" ? "active" : ""}" data-action="apply-preset" data-preset="sprint">Lean Sprint</button>
    </div>
  </section>

  <div class="dashboard-grid">
    <section class="panel">
      <div class="panel-head">
        <h2>Adjust Household Levers</h2>
        <button type="button" class="btn-chip chip-due" data-action="apply-preset" data-preset="baseline">Reset</button>
      </div>
      <div class="sliders-stack">
        <label class="slider-control">
          <span>Monthly Take-Home Change: <strong>${formatMoney(w.incomeDelta, true)}/mo</strong> (Projected: ${formatMoney(proj.incomeAfterDelta)})</span>
          <input type="range" min="-3600" max="1500" step="100" value="${w.incomeDelta}" data-action="whatif-slider" data-field="incomeDelta">
        </label>
        <label class="slider-control">
          <span>Grocery Price Increase: <strong>+${w.groceryInflationPct}%</strong> (+${formatMoney(760 * (w.groceryInflationPct / 100))}/mo)</span>
          <input type="range" min="0" max="30" step="5" value="${w.groceryInflationPct}" data-action="whatif-slider" data-field="groceryInflationPct">
        </label>
        <label class="slider-control">
          <span>Trim Dining &amp; Discretionary Spend: <strong>-${formatMoney(w.trimDiscretionary)}/mo</strong></span>
          <input type="range" min="0" max="650" step="25" value="${w.trimDiscretionary}" data-action="whatif-slider" data-field="trimDiscretionary">
        </label>
        <label class="slider-control">
          <span>New Fixed Cost (e.g. Care / Car): <strong>+${formatMoney(w.newFixedCost)}/mo</strong></span>
          <input type="range" min="0" max="1200" step="50" value="${w.newFixedCost}" data-action="whatif-slider" data-field="newFixedCost">
        </label>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>12-Month Emergency HYSA Trajectory</h2>
          <p class="muted">Starting from $16,400 dedicated reserve at 4.35% APY.</p>
        </div>
        <span class="pill ${proj.sustainable ? "pill-good" : "pill-danger"}">
          ${proj.sustainable ? `Cashflow Positive (${formatMoney(proj.monthlySurplus, true)}/mo)` : `Drawdown (${formatMoney(proj.monthlySurplus)}/mo)`}
        </span>
      </div>
      <div class="scenario-kpis">
        <div><span>Living Run-Rate</span><strong>${formatMoney(proj.newExpenseRunRate)}/mo</strong></div>
        <div><span>Monthly Net Delta</span><strong class="${proj.sustainable ? "amt-pos" : "amt-neg"}">${formatMoney(proj.monthlySurplus, true)}</strong></div>
        <div><span>${proj.sustainable ? "Core Runway" : "Months Until $0"}</span><strong>${proj.runwayMonths} mo</strong></div>
      </div>
      ${renderReserveForecastSvg(proj.projection)}
      <div class="callout-box">
        <strong>Household Action Playbook:</strong>
        ${proj.sustainable
          ? `At <strong>${formatMoney(proj.monthlySurplus, true)}/mo</strong> surplus, the Mercer-Lin family hits the $24,000 6-month target while preserving sinking funds.`
          : `In a <strong>${formatMoney(proj.monthlySurplus)}/mo</strong> shortfall, pause extra debt principal ($315/mo) and cut discretionary envelopes to stretch HYSA across <strong>${proj.runwayMonths} months</strong>.`}
      </div>
    </section>
  </div>`;
}
