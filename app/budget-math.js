// Financial calculations for zero-based envelopes, daily pacing, debt amortization, and runway stress tests.

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
  const txForMonth = state.transactions.filter((t) => t.date.startsWith(monthKey));
  const spentByEnvelope = new Map();
  for (const tx of txForMonth) {
    if (tx.type === "expense" && tx.envelopeId) {
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
    // Credit HYSA when emergency_reserve transfer leaves checking.
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
  const txForMonth = state.transactions.filter((t) => t.date.startsWith(monthKey));
  const income = txForMonth.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount), 0);

  const assignedTotal = envelopes.reduce((s, e) => s + e.assigned, 0);
  const rolloverTotal = envelopes.reduce((s, e) => s + e.rollover, 0);
  const readyToAssign = Number((income - assignedTotal).toFixed(2));

  const groupMap = new Map(state.envelopeGroups.map((g) => [g.id, g]));
  let consumptionSpent = 0;
  let consumptionBudget = 0;
  let wealthAndSinkingAssigned = 0;
  let needsAssigned = 0;
  let wantsAssigned = 0;

  for (const env of envelopes) {
    const g = groupMap.get(env.groupId);
    if (env.groupId === "wealth_debt") {
      wealthAndSinkingAssigned += env.assigned;
    } else {
      consumptionSpent += env.spent;
      consumptionBudget += env.assigned + env.rollover;
      if (env.groupId === "sinking") wealthAndSinkingAssigned += env.assigned;
    }
    if (g?.bucket === "needs") needsAssigned += env.assigned;
    else if (g?.bucket === "wants") wantsAssigned += env.assigned;
  }

  const totalOutflows = envelopes.reduce((s, e) => s + e.spent, 0);
  const availableInSpendingEnvelopes = envelopes.filter((e) => e.groupId !== "wealth_debt").reduce((s, e) => s + e.available, 0);
  const overspentEnvelopes = envelopes.filter((e) => e.overspent);
  const savingsRatePct = income > 0 ? (wealthAndSinkingAssigned / income) * 100 : 0;

  const accounts = reconcileAccounts(state);
  const liquidCash = accounts.filter((a) => a.type !== "credit").reduce((s, a) => s + a.workingBalance, 0);
  const creditCardBalance = accounts.filter((a) => a.type === "credit").reduce((s, a) => s + a.workingBalance, 0);

  return {
    monthKey,
    income: Number(income.toFixed(2)),
    assignedTotal: Number(assignedTotal.toFixed(2)),
    rolloverTotal: Number(rolloverTotal.toFixed(2)),
    readyToAssign,
    consumptionSpent: Number(consumptionSpent.toFixed(2)),
    consumptionBudget: Number(consumptionBudget.toFixed(2)),
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
    liquidCash: Number(liquidCash.toFixed(2)),
    creditCardBalance: Number(creditCardBalance.toFixed(2)),
    netLiquid: Number((liquidCash + creditCardBalance).toFixed(2)),
    runwayMonths: Number(((liquidCash + creditCardBalance) / state.profile.coreMonthlyExpensesBaseline).toFixed(1)),
  };
}

export function computeDailyPaceSeries(state, monthKey = state.activeMonth) {
  const totalDays = daysInMonth(monthKey);
  const currentDay = monthKey === "2026-11" ? 26 : totalDays;
  const fixedEnvelopeIds = new Set(["mortgage", "childcare", "debt_auto", "debt_card", "emergency_reserve", "college_529"]);

  const envelopes = computeEnvelopeBalances(state, monthKey);
  // Compare variable monthly spending against this month's newly assigned variable budget (excluding multi-month sinking rollovers).
  const flexiblePool = envelopes.filter((e) => !fixedEnvelopeIds.has(e.id)).reduce((s, e) => s + e.assigned, 0);

  const byDay = new Array(totalDays + 1).fill(0);
  for (const tx of state.transactions) {
    if (!tx.date.startsWith(monthKey) || tx.type !== "expense") continue;
    if (fixedEnvelopeIds.has(tx.envelopeId)) continue;
    const d = Number(tx.date.slice(8, 10));
    if (d >= 1 && d <= totalDays) byDay[d] += Number(tx.amount);
  }

  const points = [];
  let cumulative = 0;
  for (let d = 1; d <= totalDays; d += 1) {
    cumulative += byDay[d];
    const ideal = (flexiblePool * d) / totalDays;
    points.push({
      day: d,
      actual: d <= currentDay ? Number(cumulative.toFixed(2)) : null,
      ideal: Number(ideal.toFixed(2)),
      dailySpend: Number(byDay[d].toFixed(2)),
    });
  }
  const todayPoint = points[currentDay - 1] ?? points[points.length - 1];
  const paceDelta = Number(((todayPoint?.ideal ?? 0) - (todayPoint?.actual ?? 0)).toFixed(2));
  return { totalDays, currentDay, flexiblePool: Number(flexiblePool.toFixed(2)), points, paceDelta };
}

export function simulateDebtPayoff(debts, extraMonthly = 250, strategy = "avalanche") {
  const ordered = debts.map((d) => ({ ...d, rem: Number(d.balance) }));
  const sortFn = strategy === "avalanche"
    ? (a, b) => b.apr - a.apr || a.rem - b.rem
    : (a, b) => a.rem - b.rem || b.apr - a.apr;

  const totalMinimums = ordered.reduce((s, d) => s + Number(d.minPayment), 0);
  const monthlyBudget = totalMinimums + Math.max(0, Number(extraMonthly));
  const curve = [{ month: 0, totalBalance: Number(ordered.reduce((s, d) => s + d.rem, 0).toFixed(2)) }];

  let months = 0;
  let totalInterest = 0;
  const payoffOrder = [];

  while (ordered.some((d) => d.rem > 0.01) && months < 180) {
    months += 1;
    for (const d of ordered) {
      if (d.rem <= 0.01) continue;
      const interest = d.rem * (d.apr / 100 / 12);
      d.rem += interest;
      totalInterest += interest;
    }
    let pool = monthlyBudget;
    for (const d of ordered) {
      if (d.rem <= 0.01) continue;
      const pay = Math.min(d.rem, d.minPayment);
      d.rem -= pay;
      pool -= pay;
      if (d.rem <= 0.01) {
        d.rem = 0;
        if (!payoffOrder.find((p) => p.id === d.id)) payoffOrder.push({ id: d.id, name: d.name, month: months });
      }
    }
    const targets = ordered.filter((d) => d.rem > 0.01).sort(sortFn);
    for (const target of targets) {
      if (pool <= 0.01) break;
      const pay = Math.min(target.rem, pool);
      target.rem -= pay;
      pool -= pay;
      if (target.rem <= 0.01) {
        target.rem = 0;
        if (!payoffOrder.find((p) => p.id === target.id)) payoffOrder.push({ id: target.id, name: target.name, month: months });
      }
    }
    curve.push({ month: months, totalBalance: Number(ordered.reduce((s, d) => s + d.rem, 0).toFixed(2)) });
  }

  const endTotalMonths = 2026 * 12 + 10 + months;
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return {
    strategy,
    months,
    debtFreeLabel: `${names[endTotalMonths % 12]} ${Math.floor(endTotalMonths / 12)}`,
    totalInterest: Number(totalInterest.toFixed(2)),
    monthlyBudget: Number(monthlyBudget.toFixed(2)),
    curve,
    payoffOrder,
  };
}

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