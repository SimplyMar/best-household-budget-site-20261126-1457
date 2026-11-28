// Monthly recurring bills calendar & annual true-expense reserve planner (#/bills).

import { daysInMonth, formatMoney, monthLabel } from "./budget-math.js";
import { escapeHtml } from "./charts.js";

export function renderBillsPage(state) {
  const totalDays = daysInMonth(state.activeMonth);
  const [yr, mo] = state.activeMonth.split("-").map(Number);
  const firstWeekday = new Date(yr, mo - 1, 1).getDay();

  const billsWithStatus = state.bills
    .map((b) => ({ ...b, paid: b.paidMonths.includes(state.activeMonth) }))
    .sort((a, b) => a.dueDay - b.dueDay);

  const totalMonthlyBills = billsWithStatus.reduce((s, b) => s + b.amount, 0);
  const paidTotal = billsWithStatus.filter((b) => b.paid).reduce((s, b) => s + b.amount, 0);
  const remainingTotal = totalMonthlyBills - paidTotal;

  const byDay = new Map();
  for (const b of billsWithStatus) {
    const list = byDay.get(b.dueDay) ?? [];
    list.push(b);
    byDay.set(b.dueDay, list);
  }

  const cells = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push(`<div class="cal-cell cal-empty"></div>`);
  for (let d = 1; d <= totalDays; d += 1) {
    const dayBills = byDay.get(d) ?? [];
    const isPayday = d === 1 || d === 15;
    const isToday = state.activeMonth === "2026-11" && d === 26;
    cells.push(`
      <div class="cal-cell ${isToday ? "cal-today" : ""}">
        <div class="cal-day-head">
          <span class="cal-day-num">${d}</span>
          ${isPayday ? `<span class="cal-payday">+$3,920</span>` : ""}
        </div>
        ${dayBills.map((b) => `
          <button type="button" class="cal-bill-pill ${b.paid ? "cal-paid" : "cal-due"}" data-action="toggle-bill" data-bill-id="${escapeHtml(b.id)}">
            <span>${escapeHtml(b.name.split(" ")[0])}</span>
            <strong>${formatMoney(b.amount)}</strong>
          </button>
        `).join("")}
      </div>`);
  }

  return `
  <section class="page-hero-bar">
    <div>
      <h1 class="page-title">Recurring Bills Calendar</h1>
      <p class="page-sub">${escapeHtml(monthLabel(state.activeMonth))} · Fixed drafts mapped against bi-monthly paydays so checking never dips low.</p>
    </div>
    <div class="zero-equation">
      <div><span>Monthly Bills</span><strong>${formatMoney(totalMonthlyBills)}</strong></div>
      <span class="eq-op">&minus;</span>
      <div><span>Cleared</span><strong>${formatMoney(paidTotal)}</strong></div>
      <span class="eq-op">=</span>
      <div class="eq-result ${remainingTotal === 0 ? "eq-balanced" : "eq-unbalanced"}">
        <span>Remaining Due</span>
        <strong>${formatMoney(remainingTotal)}</strong>
      </div>
    </div>
  </section>

  <div class="dashboard-grid">
    <section class="panel">
      <div class="panel-head">
        <div>
          <h2>${escapeHtml(monthLabel(state.activeMonth))} Cashflow Calendar</h2>
          <p class="muted">Click any bill pill to toggle paid status and log it in the register.</p>
        </div>
      </div>
      <div class="cal-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
      <div class="cal-grid">${cells.join("")}</div>
    </section>

    <div class="col-stack">
      <section class="panel">
        <div class="panel-head">
          <h2>Scheduled Monthly Bills (${billsWithStatus.length})</h2>
          <span class="muted">${billsWithStatus.filter((b) => b.autoPay).length} Auto-Pay</span>
        </div>
        <div class="mini-bills">
          ${billsWithStatus.map((b) => `
            <div class="mini-bill-row">
              <div>
                <strong>Day ${String(b.dueDay).padStart(2, "0")} · ${escapeHtml(b.name)}</strong>
                <small class="muted">${b.autoPay ? "Auto-draft" : "Manual"} · ${escapeHtml(b.accountId.toUpperCase())}</small>
              </div>
              <div class="mini-bill-right">
                <strong>${formatMoney(b.amount)}</strong>
                <button type="button" class="btn-chip ${b.paid ? "chip-paid" : "chip-due"}" data-action="toggle-bill" data-bill-id="${escapeHtml(b.id)}">${b.paid ? "Paid ✓" : "Mark Paid"}</button>
              </div>
            </div>
          `).join("")}
        </div>
      </section>

      <section class="panel">
        <div class="panel-head">
          <div>
            <h2>Annual &amp; Irregular True Expenses</h2>
            <p class="muted">Smoothed into calm monthly transfers so renewals never hit credit cards.</p>
          </div>
        </div>
        <table class="compact-table">
          <thead><tr><th>Expense</th><th>Due</th><th class="num">Saved / Cost</th><th class="num">Set-Aside</th></tr></thead>
          <tbody>
            ${state.irregularExpenses.map((item) => `
              <tr>
                <td><strong>${escapeHtml(item.name)}</strong></td>
                <td>${escapeHtml(item.renewalMonth)}</td>
                <td class="num">${formatMoney(item.saved)} / ${formatMoney(item.cost)}</td>
                <td class="num"><strong>${formatMoney(item.monthlySetAside)}/mo</strong></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </section>
    </div>
  </div>`;
}
