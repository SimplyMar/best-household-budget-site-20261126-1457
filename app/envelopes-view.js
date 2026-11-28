// Zero-based envelopes page (#/envelopes): quick -$25/+$25 steppers, inline editor, 50/30/20 guardrail, and rebalance bar.

import { formatMoney, monthLabel } from "./budget-math.js";
import { escapeHtml } from "./charts.js";

export function renderEnvelopesPage(state, summary, filterGroup = "all") {
  const overspentList = summary.envelopes.filter((e) => e.overspent);
  const surplusList = summary.envelopes.filter((e) => e.available >= 15 && !e.overspent);

  const orderedGroups = [...state.envelopeGroups].sort((a, b) => {
    const rank = { flexible: 0, essentials: 1, sinking: 2, wealth_debt: 3 };
    return (rank[a.id] ?? 9) - (rank[b.id] ?? 9);
  });

  const groupsToRender = orderedGroups.filter((g) => (
    filterGroup === "all" || filterGroup === "overspent" ? true : g.id === filterGroup
  ));

  return `
  <section class="page-hero-bar">
    <div>
      <h1 class="page-title">Zero-Based Envelopes</h1>
      <p class="page-sub">${escapeHtml(monthLabel(state.activeMonth))} · Assign every dollar a concrete household job; unspent reserves roll forward.</p>
    </div>
    <div class="zero-equation" aria-label="Zero-based budget equation">
      <div><span>Income</span><strong>${formatMoney(summary.income)}</strong></div>
      <span class="eq-op">&minus;</span>
      <div><span>Assigned</span><strong>${formatMoney(summary.assignedTotal)}</strong></div>
      <span class="eq-op">=</span>
      <div class="eq-result ${Math.abs(summary.readyToAssign) < 0.01 ? "eq-balanced" : "eq-unbalanced"}">
        <span>Ready to Assign</span>
        <strong>${formatMoney(summary.readyToAssign)}</strong>
      </div>
    </div>
  </section>

  <section class="guardrail-bar panel-tight">
    <div class="filter-pills" role="tablist" aria-label="Filter envelope groups">
      ${[
        ["all", `All (${summary.envelopes.length})`],
        ["overspent", `Needs Cover (${overspentList.length})`],
        ["flexible", "Flexible Living"],
        ["essentials", "Fixed Essentials"],
        ["sinking", "True-Expense Reserves"],
        ["wealth_debt", "Debt & Wealth"],
      ].map(([key, label]) => `
        <button type="button" class="pill-btn ${filterGroup === key ? "active" : ""}" data-action="filter-envelopes" data-group="${key}">${escapeHtml(label)}</button>
      `).join("")}
    </div>
    <div class="guardrail-ratios">
      <span>50/30/20 Check:</span>
      <strong>${summary.needsSharePct}% Needs</strong> ·
      <strong>${summary.wantsSharePct}% Wants</strong> ·
      <strong>${summary.savingsSharePct}% Save &amp; Debt</strong>
    </div>
  </section>

  ${overspentList.length > 0 && surplusList.length > 0 ? `
  <form class="cover-bar" data-form="cover-overspent">
    <strong>Rebalance Overspend:</strong>
    <label>Cover
      <select name="targetId">
        ${overspentList.map((e) => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)} (${formatMoney(e.available)})</option>`).join("")}
      </select>
    </label>
    <label>from
      <select name="sourceId">
        ${surplusList.map((e) => `<option value="${escapeHtml(e.id)}" ${e.id === "recreation" ? "selected" : ""}>${escapeHtml(e.name)} (${formatMoney(e.available)})</option>`).join("")}
      </select>
    </label>
    <label>$
      <input type="text" inputmode="decimal" name="amount" value="${Math.abs(overspentList[0].available).toFixed(2)}" required>
    </label>
    <button type="submit" class="btn btn-accent btn-sm">Move Money</button>
  </form>` : ""}

  <div class="envelope-groups">
    ${groupsToRender.map((group) => {
      let rows = summary.envelopes.filter((e) => e.groupId === group.id);
      if (filterGroup === "overspent") rows = rows.filter((e) => e.overspent);
      if (rows.length === 0) return "";
      const gRoll = rows.reduce((s, r) => s + r.rollover, 0);
      const gAssign = rows.reduce((s, r) => s + r.assigned, 0);
      const gSpent = rows.reduce((s, r) => s + r.spent, 0);
      const gAvail = rows.reduce((s, r) => s + r.available, 0);

      return `
      <section class="panel envelope-group-panel">
        <div class="group-header">
          <div>
            <h2>${escapeHtml(group.title)}</h2>
            <p class="muted">${escapeHtml(group.description)}</p>
          </div>
          <div class="group-totals">
            <span>Assigned <strong>${formatMoney(gAssign)}</strong></span>
            <span>Spent <strong>${formatMoney(gSpent)}</strong></span>
            <span>Available <strong>${formatMoney(gAvail)}</strong></span>
          </div>
        </div>
        <table class="data-table envelope-table">
          <thead>
            <tr>
              <th>Category &amp; Household Note</th>
              <th class="num hide-sm">Rollover</th>
              <th class="num">Assigned ($)</th>
              <th class="num">Activity</th>
              <th class="hide-sm">Pacing</th>
              <th class="num">Available</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((env) => {
              const barClass = env.overspent ? "bar-over" : env.pctUsed > 85 ? "bar-warn" : "bar-ok";
              return `
              <tr class="${env.overspent ? "row-overspent" : ""}">
                <td>
                  <div><strong>${escapeHtml(env.name)}</strong> ${env.autoPay ? `<span class="tag-mini">Auto</span>` : ""}</div>
                  <small class="muted">${escapeHtml(env.note)}</small>
                </td>
                <td class="num hide-sm">${formatMoney(env.rollover)}</td>
                <td class="num">
                  <div class="stepper-cell">
                    <button type="button" class="btn-step hide-sm" data-action="step-assigned" data-envelope-id="${escapeHtml(env.id)}" data-delta="-25" aria-label="Decrease ${escapeHtml(env.name)} by $25">-25</button>
                    <input type="text" inputmode="decimal" class="inline-money-input" aria-label="Assigned budget for ${escapeHtml(env.name)}" data-action="edit-assigned" data-envelope-id="${escapeHtml(env.id)}" value="${env.assigned.toFixed(2)}">
                    <button type="button" class="btn-step hide-sm" data-action="step-assigned" data-envelope-id="${escapeHtml(env.id)}" data-delta="25" aria-label="Increase ${escapeHtml(env.name)} by $25">+25</button>
                  </div>
                </td>
                <td class="num"><a href="#/ledger">-${formatMoney(env.spent)}</a></td>
                <td class="hide-sm meter-cell">
                  <div class="meter"><span class="meter-fill ${barClass}" style="width:${Math.min(100, Math.max(3, env.pctUsed)).toFixed(1)}%"></span></div>
                </td>
                <td class="num">
                  <span class="pill-amt ${env.overspent ? "pill-danger" : env.available > 0 ? "pill-good" : "pill-neutral"}">${formatMoney(env.available)}</span>
                </td>
              </tr>`;
            }).join("")}
          </tbody>
          <tfoot>
            <tr>
              <td><strong>${escapeHtml(group.title)} Subtotal</strong></td>
              <td class="num hide-sm">${formatMoney(gRoll)}</td>
              <td class="num"><strong>${formatMoney(gAssign)}</strong></td>
              <td class="num">-${formatMoney(gSpent)}</td>
              <td class="hide-sm"></td>
              <td class="num"><strong>${formatMoney(gAvail)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </section>`;
    }).join("")}
  </div>`;
}
