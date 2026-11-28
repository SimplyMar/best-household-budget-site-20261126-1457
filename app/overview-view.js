// Primary household overview page (#/): KPI pulse, pace glidepath, watchlist, reconciled accounts, bills & latest ledger.

import { computeDailyPaceSeries, formatMoney, monthLabel } from "./budget-math.js";
import { escapeHtml, renderAllocationRibbonSvg, renderPaceChartSvg } from "./charts.js";

export function renderOverviewPage(state, summary) {
  const pace = computeDailyPaceSeries(state, state.activeMonth);
  const overspent = summary.overspentEnvelopes[0] ?? null;
  const donor = summary.envelopes.find((e) => e.id === "recreation" && e.available >= 30)
    ?? summary.envelopes.find((e) => e.available >= 30 && e.groupId === "flexible");

  const rtaBalanced = Math.abs(summary.readyToAssign) < 0.01;
  const headerBadge = overspent
    ? `<span class="status-badge badge-warn">${rtaBalanced ? "$0 Ready" : formatMoney(summary.readyToAssign)} · ${formatMoney(Math.abs(overspent.available))} Over</span>`
    : `<span class="status-badge badge-good">Zero-Based Balanced · 0 Overspent</span>`;

  const watchlistIds = ["dining", "groceries", "utilities", "holiday_gifts", "transit_fuel"];
  const watchlist = watchlistIds.map((id) => summary.envelopes.find((e) => e.id === id)).filter(Boolean);

  const dueBills = state.bills
    .map((b) => ({ ...b, paid: b.paidMonths.includes(state.activeMonth) }))
    .sort((a, b) => Number(a.paid) - Number(b.paid) || a.dueDay - b.dueDay)
    .slice(0, 2);

  const recentTx = state.transactions
    .filter((t) => t.date.startsWith(state.activeMonth))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3);
  const envMap = new Map(summary.envelopes.map((e) => [e.id, e]));

  return `
  <div class="page-top">
    <div>
      <h1 class="page-title">Household Overview</h1>
      <p class="page-sub">Zero-based pulse · Mercer-Lin Family · ${escapeHtml(monthLabel(state.activeMonth))}</p>
    </div>
    ${headerBadge}
  </div>

  <section class="kpi-strip" aria-label="Monthly household financial summary">
    <article class="kpi-card">
      <span class="kpi-label">Take-Home Income</span>
      <strong class="kpi-value">${formatMoney(summary.income)}</strong>
      <span class="pill ${rtaBalanced ? "pill-good" : "pill-warn"}">${rtaBalanced ? "Every dollar assigned" : `${formatMoney(summary.readyToAssign)} ready`}</span>
    </article>
    <article class="kpi-card">
      <span class="kpi-label">Month Outflows</span>
      <strong class="kpi-value">${formatMoney(summary.totalOutflows)}</strong>
      <span class="kpi-sub">87% of plan · $1,345 save/debt</span>
    </article>
    <article class="kpi-card">
      <span class="kpi-label">Safe in Envelopes</span>
      <strong class="kpi-value">${formatMoney(summary.availableInSpendingEnvelopes)}</strong>
      <span class="pill ${pace.paceDelta >= 0 ? "pill-good" : "pill-danger"}">${pace.paceDelta >= 0 ? `${formatMoney(pace.paceDelta)} ahead of pace` : `${formatMoney(Math.abs(pace.paceDelta))} over pace`}</span>
    </article>
    <article class="kpi-card">
      <span class="kpi-label">Wealth &amp; Debt Rate</span>
      <strong class="kpi-value">${summary.savingsRatePct}%</strong>
      <span class="kpi-sub">${formatMoney(summary.wealthAndSinkingAssigned)} to reserves &amp; debt</span>
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
      <strong>Action needed:</strong> <em>${escapeHtml(overspent.name)}</em> is over by <strong>${formatMoney(Math.abs(overspent.available))}</strong> (${formatMoney(overspent.spent)} / ${formatMoney(overspent.totalPool)}). Cover from <em>${escapeHtml(donor.name)}</em> (${formatMoney(donor.available)} left).
    </div>
    <div class="alert-actions">
      <button type="button" class="btn btn-accent btn-sm" data-action="quick-cover" data-target="${escapeHtml(overspent.id)}" data-source="${escapeHtml(donor.id)}" data-amount="${Math.abs(overspent.available).toFixed(2)}">Cover ${formatMoney(Math.abs(overspent.available))}</button>
      <a class="btn btn-ghost btn-sm" href="#/envelopes">Envelopes</a>
    </div>
  </section>` : ""}

  <div class="dashboard-grid">
    <div class="col-stack">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Variable Spending Pace vs. Glidepath</h2>
            <p class="muted">Daily groceries, utilities &amp; flexible spend vs. ${formatMoney(pace.flexiblePool)} monthly cap.</p>
          </div>
          <span class="legend-inline">
            <span><i class="swatch swatch-pine"></i>Actual</span>
            <span><i class="swatch swatch-brass"></i>Glidepath</span>
          </span>
        </div>
        ${renderPaceChartSvg(pace)}
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Zero-Based Split &amp; Reconciled Accounts</h2>
            <p class="muted">${formatMoney(summary.assignedTotal)} assigned across Essentials, Flexible, and Reserves.</p>
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
          ${summary.accounts.map((acc) => {
            const [shortName, last4] = acc.name.split(" ••");
            return `
            <div class="account-chip">
              <div class="account-chip-top">
                <strong>${escapeHtml(shortName)}</strong>
                <span class="${acc.workingBalance < 0 ? "amt-neg" : "amt-pos"}">${formatMoney(acc.workingBalance)}</span>
              </div>
              <small>${last4 ? `••${escapeHtml(last4)} · ` : ""}${escapeHtml(acc.institution)}</small>
              <small>${acc.unclearedCount ? `${acc.unclearedCount} pending (${formatMoney(acc.unclearedDelta)})` : `Reconciled ${escapeHtml(acc.lastReconciled.slice(5))}`}</small>
            </div>`;
          }).join("")}
        </div>
      </section>
    </div>

    <div class="col-stack">
      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Envelope Watchlist</h2>
            <p class="muted">Active categories needing attention before month-end.</p>
          </div>
          <a class="text-link" href="#/envelopes">All 20 &rarr;</a>
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
            <h2>Due This Week &amp; Latest Ledger</h2>
            <p class="muted">Upcoming November drafts and recent partner activity.</p>
          </div>
          <div class="inline-links">
            <a class="text-link" href="#/bills">11 Bills</a>
            <a class="text-link" href="#/ledger">Ledger &rarr;</a>
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
                <button type="button" class="btn-chip ${b.paid ? "chip-paid" : "chip-due"}" data-action="toggle-bill" data-bill-id="${escapeHtml(b.id)}">${b.paid ? "Paid ✓" : "Mark Paid"}</button>
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
                <td class="nowrap">${escapeHtml(t.date.slice(5))}</td>
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
