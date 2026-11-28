// Core zero-based budget math for Overview, Envelopes, and Account Reconciliation.
// Debt amortization and What-If runway calculators live in lazy-loaded modules to keep first load lean.

export function formatMoney(amount, showSign = false) {
  const n = Number(amount) || 0;
  const abs = Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (n < -0.004) return `-$${abs}`;
  if (showSign && n > 0.004) return `+$${abs}`;
  return `$${abs}`;
}

export function formatCompactMoney(amount) {
  const n = Number(amount) || 0;
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 1 : 2)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function daysInMonth(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

export function monthLabel(monthKey) {
  const [y, m] = monthKey.split("-").map(Number);
  const names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  return `${names[(m - 1) % 12]} ${y}`;
}

export function computeEnvelopeBalances(state, monthKey = state.activeMonth) {
  const spentByEnvelope = new Map();
  for (const tx of state.transactions) {
    if (tx.date.startsWith(monthKey) && tx.type === "expense" && tx.envelopeId) {
      spentByEnvelope.set(tx.envelopeId, (spentByEnvelope.get(tx.envelopeId) ?? 0) + Number(tx.amount));
    }
  }
  return state.envelopes.map((env) => {
    const rollover = Number(env.rolloverByMonth?.[monthKey] ?? 0);
    const assigned = Number(env.assignedByMonth?.[monthKey] ?? 0);
    const spent = Number((spentByEnvelope.get(env.id) ?? 0).toFixed(2));
    const available = Number((rollover + assigned - spent).toFixed(2));
    const totalPool = rollover + assigned;
    const pctUsed = totalPool > 0 ? Math.min(140, (spent / totalPool) * 100) : spent > 0 ? 100 : 0;
    return { ...env, rollover, assigned, spent, available, totalPool, pctUsed, overspent: available < -0.005 };
  });
}

export function reconcileAccounts(state) {
  return state.accounts.map((acc) => {
    const novTx = state.transactions.filter((t) => t.accountId === acc.id && t.date.startsWith("2026-11"));
    let clearedDelta = 0;
    let unclearedDelta = 0;
    for (const tx of novTx) {
      const signed = tx.type === "income" ? Number(tx.amount) : -Number(tx.amount);
      if (tx.cleared) clearedDelta += signed;
      else unclearedDelta += signed;
    }
    const inboundTransfers = acc.id === "hysa"
      ? state.transactions
          .filter((t) => t.date.startsWith("2026-11") && t.envelopeId === "emergency_reserve" && t.cleared)
          .reduce((s, t) => s + Number(t.amount), 0)
      : 0;
    const clearedBalance = Number((acc.startingBalance + clearedDelta + inboundTransfers).toFixed(2));
    const workingBalance = Number((clearedBalance + unclearedDelta).toFixed(2));
    return {
      ...acc,
      clearedBalance,
      unclearedDelta: Number(unclearedDelta.toFixed(2)),
      workingBalance,
      unclearedCount: novTx.filter((t) => !t.cleared).length,
    };
  });
}

export function computeMonthSummary(state, monthKey = state.activeMonth) {
  const envelopes = computeEnvelopeBalances(state, monthKey);
  const income = state.transactions
    .filter((t) => t.date.startsWith(monthKey) && t.type === "income")
    .reduce((s, t) => s + Number(t.amount), 0);

  const assignedTotal = envelopes.reduce((s, e) => s + e.assigned, 0);
  const rolloverTotal = envelopes.reduce((s, e) => s + e.rollover, 0);
  const readyToAssign = Number((income - assignedTotal).toFixed(2));

  const groupMap = new Map(state.envelopeGroups.map((g) => [g.id, g]));
  let consumptionSpent = 0;
  let wealthAndSinkingAssigned = 0;
  let needsAssigned = 0;
  let wantsAssigned = 0;

  for (const env of envelopes) {
    const g = groupMap.get(env.groupId);
    if (env.groupId === "wealth_debt") {
      wealthAndSinkingAssigned += env.assigned;
    } else {
      consumptionSpent += env.spent;
      if (env.groupId === "sinking") wealthAndSinkingAssigned += env.assigned;
    }
    if (g?.bucket === "needs") needsAssigned += env.assigned;
    else if (g?.bucket === "wants") wantsAssigned += env.assigned;
  }

  const totalOutflows = envelopes.reduce((s, e) => s + e.spent, 0);
  const availableInSpendingEnvelopes = envelopes
    .filter((e) => e.groupId !== "wealth_debt")
    .reduce((s, e) => s + e.available, 0);
  const overspentEnvelopes = envelopes.filter((e) => e.overspent);
  const savingsRatePct = income > 0 ? (wealthAndSinkingAssigned / income) * 100 : 0;

  const accounts = reconcileAccounts(state);
  const liquidCash = accounts.filter((a) => a.type !== "credit").reduce((s, a) => s + a.workingBalance, 0);
  const creditCardBalance = accounts.filter((a) => a.type === "credit").reduce((s, a) => s + a.workingBalance, 0);
  const netLiquid = Number((liquidCash + creditCardBalance).toFixed(2));

  return {
    monthKey,
    income: Number(income.toFixed(2)),
    assignedTotal: Number(assignedTotal.toFixed(2)),
    rolloverTotal: Number(rolloverTotal.toFixed(2)),
    readyToAssign,
    consumptionSpent: Number(consumptionSpent.toFixed(2)),
    totalOutflows: Number(totalOutflows.toFixed(2)),
    availableInSpendingEnvelopes: Number(availableInSpendingEnvelopes.toFixed(2)),
    wealthAndSinkingAssigned: Number(wealthAndSinkingAssigned.toFixed(2)),
    savingsRatePct: Number(savingsRatePct.toFixed(1)),
    needsSharePct: assignedTotal > 0 ? Number(((needsAssigned / assignedTotal) * 100).toFixed(1)) : 0,
    wantsSharePct: assignedTotal > 0 ? Number(((wantsAssigned / assignedTotal) * 100).toFixed(1)) : 0,
    savingsSharePct: assignedTotal > 0 ? Number((((assignedTotal - needsAssigned - wantsAssigned) / assignedTotal) * 100).toFixed(1)) : 0,
    overspentEnvelopes,
    envelopes,
    accounts,
    netLiquid,
    runwayMonths: Number((netLiquid / state.profile.coreMonthlyExpensesBaseline).toFixed(1)),
  };
}

export function computeDailyPaceSeries(state, monthKey = state.activeMonth) {
  const totalDays = daysInMonth(monthKey);
  const currentDay = monthKey === "2026-11" ? 26 : totalDays;
  const fixedIds = new Set(["mortgage", "childcare", "debt_auto", "debt_card", "emergency_reserve", "college_529"]);

  const envelopes = computeEnvelopeBalances(state, monthKey);
  const flexiblePool = envelopes.filter((e) => !fixedIds.has(e.id)).reduce((s, e) => s + e.assigned, 0);

  const byDay = new Array(totalDays + 1).fill(0);
  for (const tx of state.transactions) {
    if (!tx.date.startsWith(monthKey) || tx.type !== "expense" || fixedIds.has(tx.envelopeId)) continue;
    const d = Number(tx.date.slice(8, 10));
    if (d >= 1 && d <= totalDays) byDay[d] += Number(tx.amount);
  }

  const points = [];
  let cumulative = 0;
  for (let d = 1; d <= totalDays; d += 1) {
    cumulative += byDay[d];
    points.push({
      day: d,
      actual: d <= currentDay ? Number(cumulative.toFixed(2)) : null,
      ideal: Number(((flexiblePool * d) / totalDays).toFixed(2)),
    });
  }
  const todayPoint = points[currentDay - 1] ?? points[points.length - 1];
  const paceDelta = Number(((todayPoint?.ideal ?? 0) - (todayPoint?.actual ?? 0)).toFixed(2));
  return { totalDays, currentDay, flexiblePool: Number(flexiblePool.toFixed(2)), points, paceDelta };
}
