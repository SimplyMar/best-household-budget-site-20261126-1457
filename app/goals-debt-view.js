// Sinking funds & interactive debt payoff simulator (#/goals): compares Avalanche, Snowball, and Minimums Only.

import { formatMoney, simulateDebtPayoff } from "./budget-math.js";
import { escapeHtml, renderDebtComparisonSvg } from "./charts.js";

export function renderGoalsDebtPage(state) {
  const extra = Number(state.whatIf.extraDebtPayment ?? 315);
  const activeStrategy = state.whatIf.debtStrategy || "avalanche";

  const minOnly = simulateDebtPayoff(state.debts, 0, "avalanche");
  const avalanche = simulateDebtPayoff(state.debts, extra, "avalanche");
  const snowball = simulateDebtPayoff(state.debts, extra, "snowball");
  const chosen = activeStrategy === "avalanche" ? avalanche : snowball;

  const interestSavedVsMin = Math.max(0, minOnly.totalInterest - chosen.totalInterest);
  const monthsSavedVsMin = Math.max(0, minOnly.months - chosen.months);
  const totalDebt = state.debts.reduce((s, d) => s + d.balance, 0);

  return `
  <section class="page-hero-bar">
    <div>
      <h1>Sinking Reserves &amp; Debt Payoff Lab</h1>
      <p class="muted">Fund upcoming capital expenses in cash while accelerating debt payoff with transparent amortization math.</p>
    </div>
    <div class="zero-equation">
      <div><span>Remaining Debt</span><strong>${formatMoney(totalDebt)}</strong></div>
      <span class="eq-op">&middot;</span>
      <div><span>Debt-Free Date</span><strong>${escapeHtml(chosen.debtFreeLabel)}</strong></div>
      <span class="eq-op">&middot;</span>
      <div class="eq-result eq-balanced">
        <span>Interest Saved</span>
        <strong>${formatMoney(interestSavedVsMin)}</strong>
      </div>
    </div>
  </section>

  <section class="goals-grid" aria-label="Household savings and sinking goals">
    ${state.goals.map((g) => {
      const pct = Math.min(100, (g.saved / g.target) * 100);
      const remaining = Math.max(0, g.target - g.saved);
      const monthsLeft = g.monthlyPlan > 0 ? Math.ceil(remaining / g.monthlyPlan) : 0;
      return `
      <article class="panel goal-card">
        <div class="goal-top">
          <span class="tag-mini">${escapeHtml(g.category)}</span>
          <span class="muted">Target ${escapeHtml(g.targetDate)}</span>
        </div>
        <h3>${escapeHtml(g.name)}</h3>
        <div class="goal-amounts">
          <strong>${formatMoney(g.saved)}</strong>
          <span class="muted">of ${formatMoney(g.target)} (${pct.toFixed(0)}%)</span>
        </div>
        <div class="meter"><span class="meter-fill bar-ok" style="width:${pct.toFixed(1)}%"></span></div>
        <p class="muted small-memo">${escapeHtml(g.notes)}</p>
        <div class="goal-foot">
          <span>Plan: <strong>${formatMoney(g.monthlyPlan)}/mo</strong> (${monthsLeft} mo left)</span>
          <button type="button" class="btn-chip chip-paid" data-action="boost-goal" data-goal-id="${escapeHtml(g.id)}">+$50 Boost</button>
        </div>
      </article>`;
    }).join("")}
  </section>

  <div class="dashboard-grid">
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Avalanche vs. Snowball vs. Minimums</h2>
          <p class="muted">Minimums total $465/mo (${minOnly.months} mo). Slide extra principal to compare curves.</p>
        </div>
        <div class="strategy-toggle" role="group" aria-label="Payoff strategy">
          <button type="button" class="pill-btn ${activeStrategy === "avalanche" ? "active" : ""}" data-action="set-debt-strategy" data-strategy="avalanche">
            Avalanche (Highest APR)
          </button>
          <button type="button" class="pill-btn ${activeStrategy === "snowball" ? "active" : ""}" data-action="set-debt-strategy" data-strategy="snowball">
            Snowball (Smallest Bal)
          </button>
        </div>
      </div>

      <label class="slider-control">
        <span>Extra Monthly Principal Above Minimums: <strong>${formatMoney(extra)}/mo</strong> (Total payment: ${formatMoney(chosen.monthlyBudget)}/mo)</span>
        <input type="range" min="0" max="700" step="25" value="${extra}" data-action="extra-debt-slider">
      </label>

      ${renderDebtComparisonSvg(avalanche, snowball, minOnly)}

      <div class="split-metrics">
        <span><i class="swatch swatch-pine"></i>Avalanche: <strong>${avalanche.months} mo</strong> (${formatMoney(avalanche.totalInterest)} int)</span>
        <span><i class="swatch swatch-brass"></i>Snowball: <strong>${snowball.months} mo</strong> (${formatMoney(snowball.totalInterest)} int)</span>
        <span><i class="swatch swatch-slate"></i>Min Only: <strong>${minOnly.months} mo</strong> (${monthsSavedVsMin} mo slower)</span>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>Household Debt Schedule &amp; Payoff Order</h2>
          <p class="muted">Under <strong>${escapeHtml(activeStrategy)}</strong>, freed payments roll into the next balance automatically.</p>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr><th>Account</th><th class="num">Balance</th><th class="num">APR</th><th class="num">Min</th><th>Paid Off</th></tr>
        </thead>
        <tbody>
          ${state.debts.map((d) => {
            const hit = chosen.payoffOrder.find((p) => p.id === d.id);
            return `
            <tr>
              <td>
                <strong>${escapeHtml(d.name)}</strong>
                <div class="muted small-memo">${escapeHtml(d.lender)}</div>
              </td>
              <td class="num">${formatMoney(d.balance)}</td>
              <td class="num">${d.apr.toFixed(1)}%</td>
              <td class="num">${formatMoney(d.minPayment)}</td>
              <td><span class="pill pill-good">Month ${hit ? hit.month : "-"}</span></td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
      <div class="callout-box">
        <strong>Why Avalanche wins for Mercer-Lin:</strong> Targeting the <strong>18.9% Storm Fence &amp; Roof Card</strong> first eliminates high-APR interest in ${avalanche.payoffOrder[0]?.month ?? 7} months, saving <strong>${formatMoney(interestSavedVsMin)}</strong> vs. minimum payments and <strong>${formatMoney(Math.max(0, snowball.totalInterest - avalanche.totalInterest))}</strong> vs. Snowball.
      </div>
    </section>
  </div>`;
}