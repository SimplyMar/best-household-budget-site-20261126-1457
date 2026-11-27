// Persistent client-side state store backed by localStorage with safe fallback.

import {
  ACCOUNTS,
  ANNUAL_IRREGULAR_EXPENSES,
  DEBTS,
  ENVELOPES,
  ENVELOPE_GROUPS,
  HOUSEHOLD_PROFILE,
  RECURRING_BILLS,
  SEED_TRANSACTIONS,
  SINKING_GOALS,
} from "./household-data.js";

const STORAGE_KEY = "hearthledger_state_v1";

function cloneSeedState() {
  return JSON.parse(JSON.stringify({
    profile: HOUSEHOLD_PROFILE,
    activeMonth: HOUSEHOLD_PROFILE.activeMonth,
    accounts: ACCOUNTS,
    envelopeGroups: ENVELOPE_GROUPS,
    envelopes: ENVELOPES,
    bills: RECURRING_BILLS,
    irregularExpenses: ANNUAL_IRREGULAR_EXPENSES,
    goals: SINKING_GOALS,
    debts: DEBTS,
    transactions: SEED_TRANSACTIONS,
    whatIf: {
      preset: "baseline",
      incomeDelta: 0,
      groceryInflationPct: 0,
      trimDiscretionary: 0,
      newFixedCost: 0,
      extraDebtPayment: 315,
      debtStrategy: "avalanche",
    },
  }));
}

let memoryState = null;
const listeners = new Set();

export function getState() {
  if (memoryState) return memoryState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.envelopes) && Array.isArray(parsed.transactions)) {
        memoryState = parsed;
        return memoryState;
      }
    }
  } catch {
    // Fallback to in-memory state when storage is restricted.
  }
  memoryState = cloneSeedState();
  return memoryState;
}

function commit() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryState));
  } catch {
    // Keep live state in memory.
  }
  for (const fn of listeners) fn(memoryState);
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resetHouseholdData() {
  memoryState = cloneSeedState();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage removal errors.
  }
  for (const fn of listeners) fn(memoryState);
}

export function setActiveMonth(monthKey) {
  getState().activeMonth = monthKey;
  commit();
}

export function updateEnvelopeAssigned(envelopeId, amount, monthKey = getState().activeMonth) {
  const env = getState().envelopes.find((e) => e.id === envelopeId);
  if (!env) return;
  env.assignedByMonth[monthKey] = Math.max(0, Math.round(Number(amount) * 100) / 100);
  commit();
}

export function coverOverspentEnvelope(targetEnvelopeId, sourceEnvelopeId, amount, monthKey = getState().activeMonth) {
  const s = getState();
  const target = s.envelopes.find((e) => e.id === targetEnvelopeId);
  const source = s.envelopes.find((e) => e.id === sourceEnvelopeId);
  const shift = Math.max(0, Math.round(Number(amount) * 100) / 100);
  if (!target || !source || shift <= 0 || target.id === source.id) return false;
  source.assignedByMonth[monthKey] = Math.max(0, Number(((source.assignedByMonth[monthKey] ?? 0) - shift).toFixed(2)));
  target.assignedByMonth[monthKey] = Number(((target.assignedByMonth[monthKey] ?? 0) + shift).toFixed(2));
  commit();
  return true;
}

export function addTransaction(entry) {
  const s = getState();
  const amount = Math.max(0.01, Math.round(Number(entry.amount) * 100) / 100);
  const tx = {
    id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: entry.date || `${s.activeMonth}-26`,
    payee: String(entry.payee || "Household Purchase").trim(),
    type: entry.type === "income" ? "income" : "expense",
    amount,
    envelopeId: entry.type === "income" ? null : (entry.envelopeId || "groceries"),
    accountId: entry.accountId || "visa",
    member: entry.member || "Joint",
    cleared: Boolean(entry.cleared),
    memo: String(entry.memo || "").trim(),
  };
  s.transactions.unshift(tx);
  commit();
  return tx;
}

export function addSplitTransaction({ date, payee, accountId, member, memo, splits }) {
  const s = getState();
  const group = `split-${Date.now()}`;
  const valid = splits.filter((sp) => Number(sp.amount) > 0 && sp.envelopeId);
  valid.forEach((sp, idx) => {
    s.transactions.unshift({
      id: `tx-${Date.now()}-${idx}`,
      date: date || `${s.activeMonth}-26`,
      payee: `${payee} (Split ${idx + 1}/${valid.length})`,
      type: "expense",
      amount: Math.round(Number(sp.amount) * 100) / 100,
      envelopeId: sp.envelopeId,
      accountId: accountId || "visa",
      member: member || "Joint",
      cleared: false,
      splitGroup: group,
      memo: sp.memo || memo || "Split receipt",
    });
  });
  commit();
}

export function toggleTransactionCleared(txId) {
  const tx = getState().transactions.find((t) => t.id === txId);
  if (!tx) return;
  tx.cleared = !tx.cleared;
  commit();
}

export function deleteTransaction(txId) {
  const s = getState();
  s.transactions = s.transactions.filter((t) => t.id !== txId);
  commit();
}

export function toggleBillPaid(billId, monthKey = getState().activeMonth) {
  const s = getState();
  const bill = s.bills.find((b) => b.id === billId);
  if (!bill) return;
  const idx = bill.paidMonths.indexOf(monthKey);
  if (idx >= 0) {
    bill.paidMonths.splice(idx, 1);
  } else {
    bill.paidMonths.push(monthKey);
    const hasTx = s.transactions.some((t) => t.date.startsWith(monthKey) && t.envelopeId === bill.envelopeId && Math.abs(t.amount - bill.amount) < 0.01);
    if (!hasTx) {
      const day = String(bill.dueDay).padStart(2, "0");
      s.transactions.unshift({
        id: `tx-bill-${bill.id}-${monthKey}`,
        date: `${monthKey}-${day}`,
        payee: bill.name,
        type: "expense",
        amount: bill.amount,
        envelopeId: bill.envelopeId,
        accountId: bill.accountId,
        member: "Joint",
        cleared: true,
        memo: "Logged from recurring bills calendar",
      });
    }
  }
  commit();
}

export function contributeToGoal(goalId, amount) {
  const g = getState().goals.find((item) => item.id === goalId);
  const delta = Math.max(0, Math.round(Number(amount) * 100) / 100);
  if (!g || delta <= 0) return;
  g.saved = Number((g.saved + delta).toFixed(2));
  commit();
}

export function updateWhatIf(patch) {
  Object.assign(getState().whatIf, patch);
  commit();
}

export function importTransactionsBatch(rows) {
  const s = getState();
  let added = 0;
  for (const r of rows) {
    const amt = Math.abs(Number(r.amount));
    if (!amt || Number.isNaN(amt)) continue;
    s.transactions.unshift({
      id: `tx-imp-${Date.now()}-${added}`,
      date: /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : `${s.activeMonth}-26`,
      payee: String(r.payee || "Imported Entry").trim(),
      type: r.type === "income" ? "income" : "expense",
      amount: Math.round(amt * 100) / 100,
      envelopeId: r.type === "income" ? null : (r.envelopeId || "groceries"),
      accountId: r.accountId || "checking",
      member: r.member || "Joint",
      cleared: true,
      memo: r.memo || "CSV import",
    });
    added += 1;
  }
  if (added > 0) commit();
  return added;
}