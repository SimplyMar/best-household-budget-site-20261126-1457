// Household transaction register (#/ledger): account reconciliation, search/filters, single & split receipt logging, and CSV I/O.

import { formatMoney, monthLabel } from "./budget-math.js";
import { escapeHtml } from "./charts.js";

export function renderLedgerPage(state, summary, ui) {
  const envMap = new Map(summary.envelopes.map((e) => [e.id, e]));
  const accMap = new Map(summary.accounts.map((a) => [a.id, a]));
  const q = (ui.ledgerQuery || "").trim().toLowerCase();

  const filtered = state.transactions
    .filter((t) => {
      if (ui.ledgerScope !== "all" && !t.date.startsWith(state.activeMonth)) return false;
      if (ui.ledgerMember && ui.ledgerMember !== "all" && t.member !== ui.ledgerMember) return false;
      if (ui.ledgerAccount && ui.ledgerAccount !== "all" && t.accountId !== ui.ledgerAccount) return false;
      if (ui.ledgerEnvelope && ui.ledgerEnvelope !== "all") {
        if (ui.ledgerEnvelope === "income" && t.type !== "income") return false;
        if (ui.ledgerEnvelope !== "income" && t.envelopeId !== ui.ledgerEnvelope) return false;
      }
      if (q) {
        const envName = t.envelopeId ? (envMap.get(t.envelopeId)?.name ?? "") : "income";
        const hay = `${t.payee} ${t.memo} ${envName} ${t.member} ${t.date}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      // Surface split receipts & recent day-to-day entries in chronological reverse order.
      return b.date.localeCompare(a.date);
    });

  const filteredNet = filtered.reduce((s, t) => s + (t.type === "income" ? t.amount : -t.amount), 0);

  return `
  <section class="page-hero-bar">
    <div>
      <h1>Household Ledger &amp; Reconciled Accounts</h1>
      <p class="muted">Joint &amp; partner register, multi-category split receipts, bank reconciliation, and CSV backup.</p>
    </div>
    <div class="hero-actions">
      <button type="button" class="btn btn-secondary" data-action="export-csv">Export CSV</button>
      <label class="btn btn-secondary file-btn">
        Import CSV
        <input type="file" accept=".csv,text/csv" data-action="import-csv" hidden>
      </label>
      <button type="button" class="btn btn-primary" data-action="toggle-split-mode">
        ${ui.splitMode ? "Single Entry" : "Split Receipt"}
      </button>
    </div>
  </section>

  <section class="reconcile-grid" aria-label="Account balances and reconciliation">
    ${summary.accounts.map((acc) => `
      <article class="reconcile-card">
        <div class="reconcile-top">
          <strong>${escapeHtml(acc.name)}</strong>
          <span class="reconcile-inline-bal ${acc.workingBalance < 0 ? "amt-neg" : "amt-pos"}">${formatMoney(acc.workingBalance)}</span>
        </div>
        <div class="reconcile-meta">
          <span>Cleared: ${formatMoney(acc.clearedBalance)}</span>
          <span>${acc.unclearedCount ? `${acc.unclearedCount} pending (${formatMoney(acc.unclearedDelta)})` : `Reconciled ${acc.lastReconciled.slice(5)}`}</span>
        </div>
      </article>
    `).join("")}
  </section>

  <section class="panel">
    <div class="ledger-toolbar">
      <input type="search" class="search-input" placeholder="Search payee, memo, category..." value="${escapeHtml(ui.ledgerQuery || "")}" data-action="ledger-search" aria-label="Search transactions">
      <select data-action="ledger-member" aria-label="Filter by household member">
        <option value="all">All Partners</option>
        ${state.profile.members.map((m) => `<option value="${escapeHtml(m)}" ${ui.ledgerMember === m ? "selected" : ""}>${escapeHtml(m)}</option>`).join("")}
      </select>
      <select data-action="ledger-account" aria-label="Filter by account">
        <option value="all">All Accounts</option>
        ${state.accounts.map((a) => `<option value="${escapeHtml(a.id)}" ${ui.ledgerAccount === a.id ? "selected" : ""}>${escapeHtml(a.name)}</option>`).join("")}
      </select>
      <select data-action="ledger-scope" aria-label="Month scope" class="hide-sm">
        <option value="month" ${ui.ledgerScope !== "all" ? "selected" : ""}>${escapeHtml(monthLabel(state.activeMonth))}</option>
        <option value="all" ${ui.ledgerScope === "all" ? "selected" : ""}>All 3 Months</option>
      </select>
      <span class="ledger-count"><strong>${filtered.length}</strong> tx · Net <strong>${formatMoney(filteredNet, true)}</strong></span>
    </div>

    <div class="ledger-list">
      <table class="data-table ledger-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Payee &amp; Category</th>
            <th class="hide-sm">Account</th>
            <th>By</th>
            <th class="num">Amount</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map((t) => {
            const envName = t.type === "income" ? "Household Income" : (envMap.get(t.envelopeId)?.name ?? t.envelopeId);
            return `
            <tr>
              <td class="nowrap">${escapeHtml(t.date.slice(5))}</td>
              <td>
                <div class="tx-payee-line">
                  <strong>${escapeHtml(t.payee)}</strong>
                  ${t.splitGroup ? `<span class="tag-mini">Split</span>` : ""}
                </div>
                <div class="muted small-memo">${escapeHtml(envName)}${t.memo ? ` · ${escapeHtml(t.memo)}` : ""}</div>
              </td>
              <td class="hide-sm">${escapeHtml(accMap.get(t.accountId)?.name ?? t.accountId)}</td>
              <td><span class="member-tag">${escapeHtml(t.member)}</span></td>
              <td class="num ${t.type === "income" ? "amt-pos" : ""}">
                <strong>${t.type === "income" ? "+" : "-"}${formatMoney(t.amount)}</strong>
              </td>
              <td class="nowrap">
                <button type="button" class="btn-chip ${t.cleared ? "chip-paid" : "chip-due"}" data-action="toggle-cleared" data-tx-id="${escapeHtml(t.id)}">
                  ${t.cleared ? "✓" : "Pend"}
                </button>
                <button type="button" class="btn-icon-del hide-sm" title="Delete transaction" aria-label="Delete ${escapeHtml(t.payee)}" data-action="delete-tx" data-tx-id="${escapeHtml(t.id)}">&times;</button>
              </td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>
  </section>

  ${ui.splitMode ? `
  <form class="panel entry-composer" data-form="add-split-tx">
    <div class="panel-head">
      <h2>Log Split Receipt Across Two Envelopes</h2>
      <span class="muted">Split a single store trip across two budget categories.</span>
    </div>
    <div class="form-row-4">
      <label>Date <input type="date" name="date" value="${escapeHtml(state.activeMonth)}-26" required></label>
      <label>Merchant / Payee <input type="text" name="payee" placeholder="e.g. Costco Wholesale" required></label>
      <label>Account
        <select name="accountId">
          ${state.accounts.map((a) => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}</option>`).join("")}
        </select>
      </label>
      <label>Paid By
        <select name="member">
          ${state.profile.members.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="form-row-4">
      <label>Split 1 Envelope
        <select name="env1">
          ${state.envelopes.map((e) => `<option value="${escapeHtml(e.id)}" ${e.id === "groceries" ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}
        </select>
      </label>
      <label>Split 1 Amount ($) <input type="text" inputmode="decimal" name="amt1" placeholder="85.00" required></label>
      <label>Split 2 Envelope
        <select name="env2">
          ${state.envelopes.map((e) => `<option value="${escapeHtml(e.id)}" ${e.id === "household_supplies" ? "selected" : ""}>${escapeHtml(e.name)}</option>`).join("")}
        </select>
      </label>
      <label>Split 2 Amount ($) <input type="text" inputmode="decimal" name="amt2" placeholder="32.50" required></label>
    </div>
    <div class="composer-actions">
      <input type="text" name="memo" placeholder="Optional split receipt note" class="memo-wide">
      <button type="submit" class="btn btn-accent">Record Split Receipt</button>
    </div>
  </form>` : `
  <form class="panel entry-composer" data-form="add-inline-tx">
    <div class="panel-head">
      <h2>Add Transaction Inline</h2>
      <span class="muted">Or click + Log Expense in the top bar from any screen.</span>
    </div>
    <div class="form-row-6">
      <label>Date <input type="date" name="date" value="${escapeHtml(state.activeMonth)}-26" required></label>
      <label>Payee <input type="text" name="payee" placeholder="Merchant or payroll" required></label>
      <label>Type
        <select name="type">
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </label>
      <label>Envelope
        <select name="envelopeId">
          ${state.envelopes.map((e) => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)}</option>`).join("")}
        </select>
      </label>
      <label>Account
        <select name="accountId">
          ${state.accounts.map((a) => `<option value="${escapeHtml(a.id)}" ${a.id === "visa" ? "selected" : ""}>${escapeHtml(a.name)}</option>`).join("")}
        </select>
      </label>
      <label>Amount ($) <input type="text" inputmode="decimal" name="amount" placeholder="42.50" required></label>
    </div>
    <div class="composer-actions">
      <select name="member" aria-label="Household member">
        ${state.profile.members.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join("")}
      </select>
      <input type="text" name="memo" placeholder="Memo (what was this for?)" class="memo-wide">
      <button type="submit" class="btn btn-primary">+ Record Entry</button>
    </div>
  </form>`}`;
}