// Primary household overview page (#/): KPI summary, spending pace chart, envelope watchlist, and upcoming bills + recent ledger.

import { computeDailyPaceSeries, formatMoney, monthLabel } from "./budget-math.js";
import { escapeHtml, renderAllocationRibbonSvg, renderPaceChartSvg } from "./charts.js";

export function renderOverviewPage(state, summary) {
  const pace = computeDailyPaceSeries(state, state.activeMonth);
  const overspent = summary.overspentEnvelopes[0] ?? null;
  const donor = summary.envelopes.find((e) => e.id === "recreation" && e.available >= 30)
    ?? summary.envelopes.find((e) => e.available >= 30 && e.groupId === "flexible");

  const rtaClass = Math.abs(summary.readyToAssign) < 0.01
    ? "pill-good"
    : summary.readyToAssign > 0 ? "pill-warn" : "pill-danger";
  const rtaText = Math.abs(summary.readyToAssign) < 0.01
    ? "Every dollar assigned ($0.00 left)"
    : summary.readyToAssign > 0
      ? `${formatMoney(summary.readyToAssign)} ready to assign`
      : `${formatMoney(summary.readyToAssign)} over-assigned`;

  const watchlistIds = ["dining", "groceries", "utilities", "holiday_gifts", "transit_fuel"];
  const watchlist = watchlistIds
    .map((id) => summary.envelopes.find((e) => e.id === id))
    .filter(Boolean);

  const dueBills = state.bills
    .map((b) => ({ ...b, paid: b.paidMonths.includes(state.activeMonth) }))
    .sort((a, b) => Number(a.paid) - Number(b.paid) || a.dueDay - b.dueDay)
    .slice(0, 2);

  const recentTx = state.transactions
    .filter((t) => t.date.startsWith(state.activeMonth))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const envMap = new Map(summary.envelopes.map((e) => [e.id, e]));

  return `
  <section class="kpi-strip" aria-label="Monthly household financial summary">
    <article class="kpi-card">
      <span class="kpi-label">${escapeHtml(monthLabel(state.activeMonth))} Take-Home</span>
      <strong class="kpi-value">${formatMoney(summary.income)}</strong>
      <span class="pill ${rtaClass}">${escapeHtml(rtaText)}</span>
    </article>
    <article class="kpi-card">
      <span class="kpi-label">Outflows Logged</span>
      <strong class="kpi-value">${formatMoney(summary.totalOutflows)}</strong>
      <span class="kpi-sub">${formatMoney(summary.consumptionSpent)} living · ${formatMoney(summary.totalOutflows - summary.consumptionSpent)} debt &amp; save</span>
    </article>
    <article class="kpi-card">
      <span class="kpi-label">Safe in Envelopes</span>
      <strong class="kpi-value">${formatMoney(summary.availableInSpendingEnvelopes)}</strong>
      <span class="pill ${pace.paceDelta >= 0 ? "pill-good" : "pill-danger"}">
        ${pace.paceDelta >= 0 ? `${formatMoney(pace.paceDelta)} ahead of pace` : `${formatMoney(Math.abs(pace.paceDelta))} over pace`}
      </span>
    </article>
    <article class="kpi-card">
      <span class="kpi-label">Savings &amp; Extra Debt</span>
      <strong class="kpi-value">${formatMoney(summary.wealthAndSinkingAssigned)}</strong>
      <span class="kpi-sub">${summary.savingsRatePct}% of household net income</span>
    </article>
    <article class="kpi-card">
      <span class="kpi-label">Net Liquid Cash</span>
      <strong class="kpi-value">${formatMoney(summary.netLiquid)}</strong>
      <span class="kpi-sub">${summary.runwayMonths} mo core expense runway</span>
    </article>
  </section>

  ${overspent && donor ? `
  <section class="alert-banner" role="region" aria-label="Overspent envelope alert">
    <div>
      <strong>Action needed:</strong> <em>${escapeHtml(overspent.name)}</em> is overspent by <strong>${formatMoney(Math.abs(overspent.available))}</strong> (${formatMoney(overspent.spent)} spent of ${formatMoney(overspent.totalPool)}).
      Rebalance from <em>${escapeHtml(donor.name)}</em> (${formatMoney(donor.available)} available) to keep your plan zero-based.
    </div>
    <div class="alert-actions">
      <button type="button" class="btn btn-accent" data-action="quick-cover" data-target="${escapeHtml(overspent.id)}" data-source="${escapeHtml(donor.id)}" data-amount="${Math.abs(overspent.available).toFixed(2)}">
        Cover ${formatMoney(Math.abs(overspent.available))} Now
      </button>
      <a class="btn btn-ghost" href="#/envelopes">Open Envelopes</a>
    </div>
  </section>` : ""}

  <div class="dashboard-grid">
    <div class="col-stack">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Variable Spending Pace vs. Monthly Glidepath</h2>
            <p class="muted">Day-by-day groceries, utilities, dining &amp; flexible spend vs. ${formatMoney(pace.flexiblePool)} monthly cap.</p>
          </div>
          <span class="legend-inline">
            <span><i class="swatch swatch-pine"></i>Actual</span>
            <span><i class="swatch swatch-brass"></i>Safe Glidepath</span>
          </span>
        </div>
        ${renderPaceChartSvg(pace)}
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Zero-Based Split &amp; Reconciled Accounts</h2>
            <p class="muted">Every dollar of ${formatMoney(summary.assignedTotal)} assigned across Needs, Living, and Reserves.</p>
          </div>
          <a class="text-link" href="#/planner">What-If Lab &rarr;</a>
        </div>
        ${renderAllocationRibbonSvg(summary)}
        <div class="split-metrics">
          <span><i class="swatch swatch-pine"></i>Essentials <strong>${summary.needsSharePct}%</strong></span>
          <span><i class="swatch swatch-sage"></i>Flexible <strong>${summary.wantsSharePct}%</strong></span>
          <span><i class="swatch swatch-brass"></i>Reserves &amp; Debt <strong>${summary.savingsSharePct}%</strong></span>
        </div>
        <div class="account-strip">
          ${summary.accounts.map((acc) => `
            <div class="account-chip">
              <div class="account-chip-top">
                <strong>${escapeHtml(acc.name)}</strong>
                <span class="${acc.workingBalance < 0 ? "amt-neg" : "amt-pos"}">${formatMoney(acc.workingBalance)}</span>
              </div>
              <small>${escapeHtml(acc.institution)} · ${acc.unclearedCount ? `${acc.unclearedCount} pending` : "Reconciled"}</small>
            </div>
          `).join("")}
        </div>
      </section>
    </div>

    <div class="col-stack">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Envelope Watchlist</h2>
            <p class="muted">Active categories ordered by attention needed before month-end.</p>
          </div>
          <a class="text-link" href="#/envelopes">All 20 envelopes &rarr;</a>
        </div>
        <div class="watchlist">
          ${watchlist.map((env) => {
            const barClass = env.overspent ? "bar-over" : env.pctUsed > 82 ? "bar-warn" : "bar-ok";
            return `
            <div class="watch-row">
              <div class="watch-top">
                <a href="#/envelopes" class="watch-name">${escapeHtml(env.name)}</a>
                <span class="watch-nums">
                  <span class="muted">${formatMoney(env.spent)} / ${formatMoney(env.totalPool)}</span>
                  <strong class="pill-amt ${env.overspent ? "pill-danger" : "pill-neutral"}">${formatMoney(env.available)} left</strong>
                </span>
              </div>
              <div class="meter"><span class="meter-fill ${barClass}" style="width:${Math.min(100, Math.max(4, env.pctUsed)).toFixed(1)}%"></span></div>
            </div>`;
          }).join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Due This Week &amp; Latest Ledger Activity</h2>
            <p class="muted">Remaining November bills and recent partner transactions.</p>
          </div>
          <div class="inline-links">
            <a class="text-link" href="#/bills">11 Bills</a>
            <a class="text-link" href="#/ledger">Full Ledger &rarr;</a>
          </div>
        </div>
        <div class="mini-bills">
          ${dueBills.map((b) => `
            <div class="mini-bill-row">
              <div>
                <strong>${escapeHtml(b.name)}</strong>
                <span class="muted"> · Due ${state.activeMonth.slice(5)}/${String(b.dueDay).padStart(2, "0")} (${b.autoPay ? "Auto" : "Manual"})</span>
              </div>
              <div class="mini-bill-right">
                <strong>${formatMoney(b.amount)}</strong>
                <button type="button" class="btn-chip ${b.paid ? "chip-paid" : "chip-due"}" data-action="toggle-bill" data-bill-id="${escapeHtml(b.id)}">
                  ${b.paid ? "Paid ✓" : "Mark Paid"}
                </button>
              </div>
            </div>
          `).join("")}
        </div>
        <table class="compact-table" aria-label="Recent household transactions">
          <thead>
            <tr><th>Date</th><th>Payee</th><th>Envelope</th><th>By</th><th class="num">Amount</th></tr>
          </thead>
          <tbody>
            ${recentTx.map((t) => `
              <tr>
                <td>${escapeHtml(t.date.slice(5))}</td>
                <td>${escapeHtml(t.payee)}</td>
                <td>${escapeHtml(t.envelopeId ? (envMap.get(t.envelopeId)?.name ?? t.envelopeId) : "Income")}</td>
                <td><span class="member-tag">${escapeHtml(t.member)}</span></td>
                <td class="num ${t.type === "income" ? "amt-pos" : ""}">${t.type === "income" ? "+" : "-"}${formatMoney(t.amount)}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    </div>
  </div>`;
}