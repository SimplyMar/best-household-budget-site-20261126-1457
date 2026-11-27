// Application router, interactive event delegation, and lazy route loading.
// Overview renders on first load; secondary tools load on demand via literal import() for fast startup.

import { computeMonthSummary, formatMoney } from "./budget-math.js";
import { escapeHtml } from "./charts.js";
import {
  addSplitTransaction,
  addTransaction,
  contributeToGoal,
  coverOverspentEnvelope,
  deleteTransaction,
  getState,
  importTransactionsBatch,
  resetHouseholdData,
  setActiveMonth,
  subscribe,
  toggleBillPaid,
  toggleTransactionCleared,
  updateEnvelopeAssigned,
  updateWhatIf,
} from "./household-store.js";
import { renderOverviewPage } from "./overview-view.js";

const mainEl = document.getElementById("main-content");
const monthSelect = document.getElementById("month-select");
const toastEl = document.getElementById("status-toast");
const dialogEl = document.getElementById("quick-entry-dialog");
const quickForm = document.getElementById("quick-entry-form");

const uiState = {
  envelopeFilter: "all",
  ledgerQuery: "",
  ledgerMember: "all",
  ledgerAccount: "all",
  ledgerEnvelope: "all",
  ledgerScope: "month",
  splitMode: false,
};

let toastTimer = null;
function announceStatus(message) {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.hidden = true;
  }, 3200);
}

function currentRoute() {
  const raw = (window.location.hash || "#/").replace(/^#\/?/, "").split("?")[0].trim();
  if (!raw) return "overview";
  if (["envelopes", "ledger", "bills", "goals", "planner"].includes(raw)) return raw;
  return "overview";
}

function populateQuickModalOptions(state) {
  const envSel = document.getElementById("quick-envelope-select");
  const accSel = document.getElementById("quick-account-select");
  const dateInp = document.getElementById("quick-date");
  if (envSel) {
    envSel.innerHTML = state.envelopes.map((e) => `<option value="${escapeHtml(e.id)}">${escapeHtml(e.name)}</option>`).join("");
  }
  if (accSel) {
    accSel.innerHTML = state.accounts.map((a) => `<option value="${escapeHtml(a.id)}">${escapeHtml(a.name)}</option>`).join("");
  }
  if (dateInp) dateInp.value = `${state.activeMonth}-26`;
}

let renderToken = 0;
export async function renderCurrentRoute(preserveScroll = false) {
  const token = ++renderToken;
  window.__shotReady = false;

  const state = getState();
  const summary = computeMonthSummary(state, state.activeMonth);
  const route = currentRoute();

  if (monthSelect && monthSelect.value !== state.activeMonth) {
    monthSelect.value = state.activeMonth;
  }
  document.querySelectorAll("[data-nav]").forEach((link) => {
    const active = link.getAttribute("data-nav") === route;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });

  let html = "";
  let pageTitle = "Overview";
  if (route === "overview") {
    html = renderOverviewPage(state, summary);
  } else if (route === "envelopes") {
    pageTitle = "Zero-Based Envelopes";
    const mod = await import("./envelopes-view.js");
    html = mod.renderEnvelopesPage(state, summary, uiState.envelopeFilter);
  } else if (route === "ledger") {
    pageTitle = "Household Ledger";
    const mod = await import("./ledger-view.js");
    html = mod.renderLedgerPage(state, summary, uiState);
  } else if (route === "bills") {
    pageTitle = "Bills & Calendar";
    const mod = await import("./bills-view.js");
    html = mod.renderBillsPage(state);
  } else if (route === "goals") {
    pageTitle = "Goals & Debt Lab";
    const mod = await import("./goals-debt-view.js");
    html = mod.renderGoalsDebtPage(state);
  } else if (route === "planner") {
    pageTitle = "What-If Runway Lab";
    const mod = await import("./planner-view.js");
    html = mod.renderPlannerPage(state, summary);
  }

  if (token !== renderToken) return;
  document.title = `${pageTitle} | Hearthledger`;
  mainEl.innerHTML = html;
  populateQuickModalOptions(state);
  if (!preserveScroll) window.scrollTo(0, 0);
  window.__shotReady = true;
}

const WHATIF_PRESETS = {
  baseline: { preset: "baseline", incomeDelta: 0, groceryInflationPct: 0, trimDiscretionary: 0, newFixedCost: 0 },
  "one-income": { preset: "one-income", incomeDelta: -3220, groceryInflationPct: 0, trimDiscretionary: 520, newFixedCost: 0 },
  inflation: { preset: "inflation", incomeDelta: 0, groceryInflationPct: 15, trimDiscretionary: 150, newFixedCost: 220 },
  sprint: { preset: "sprint", incomeDelta: 300, groceryInflationPct: 0, trimDiscretionary: 380, newFixedCost: 0 },
};

document.addEventListener("click", async (event) => {
  const btn = event.target.closest("[data-action]");
  if (!btn) return;
  const action = btn.getAttribute("data-action");

  if (action === "quick-cover") {
    const ok = coverOverspentEnvelope(btn.dataset.target, btn.dataset.source, Number(btn.dataset.amount));
    if (ok) announceStatus(`Covered ${formatMoney(Number(btn.dataset.amount))} overspend cleanly.`);
  } else if (action === "toggle-bill") {
    toggleBillPaid(btn.dataset.billId);
    announceStatus("Updated recurring bill payment status.");
  } else if (action === "filter-envelopes") {
    uiState.envelopeFilter = btn.dataset.group || "all";
    renderCurrentRoute(true);
  } else if (action === "toggle-split-mode") {
    uiState.splitMode = !uiState.splitMode;
    renderCurrentRoute(true);
  } else if (action === "toggle-cleared") {
    toggleTransactionCleared(btn.dataset.txId);
  } else if (action === "delete-tx") {
    deleteTransaction(btn.dataset.txId);
    announceStatus("Removed transaction from household ledger.");
  } else if (action === "boost-goal") {
    contributeToGoal(btn.dataset.goalId, 50);
    announceStatus("Added $50.00 sinking contribution to goal.");
  } else if (action === "set-debt-strategy") {
    updateWhatIf({ debtStrategy: btn.dataset.strategy });
  } else if (action === "apply-preset") {
    const patch = WHATIF_PRESETS[btn.dataset.preset] ?? WHATIF_PRESETS.baseline;
    updateWhatIf(patch);
  } else if (action === "export-csv") {
    const state = getState();
    const summary = computeMonthSummary(state, state.activeMonth);
    const envMap = new Map(summary.envelopes.map((e) => [e.id, e]));
    const io = await import("./csv-io.js");
    const csv = io.transactionsToCsv(state.transactions, envMap);
    io.triggerDownload(`hearthledger-${state.activeMonth}.csv`, csv);
    announceStatus("Exported household ledger CSV.");
  }
});

document.addEventListener("change", async (event) => {
  const el = event.target;
  if (el === monthSelect) {
    setActiveMonth(el.value);
    announceStatus(`Switched budget view to ${el.value}.`);
    return;
  }
  const action = el.getAttribute("data-action");
  if (action === "edit-assigned") {
    updateEnvelopeAssigned(el.dataset.envelopeId, Number(el.value));
    announceStatus("Updated monthly envelope allocation.");
  } else if (action === "ledger-member") {
    uiState.ledgerMember = el.value;
    renderCurrentRoute(true);
  } else if (action === "ledger-account") {
    uiState.ledgerAccount = el.value;
    renderCurrentRoute(true);
  } else if (action === "ledger-scope") {
    uiState.ledgerScope = el.value;
    renderCurrentRoute(true);
  } else if (action === "import-csv" && el.files?.[0]) {
    const text = await el.files[0].text();
    const io = await import("./csv-io.js");
    const rows = io.parseTransactionsCsv(text);
    const count = importTransactionsBatch(rows);
    announceStatus(`Imported ${count} transaction(s) from CSV.`);
  }
});

document.addEventListener("input", (event) => {
  const el = event.target;
  const action = el.getAttribute("data-action");
  if (action === "ledger-search") {
    uiState.ledgerQuery = el.value;
    renderCurrentRoute(true);
    const input = document.querySelector("[data-action='ledger-search']");
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  } else if (action === "extra-debt-slider") {
    updateWhatIf({ extraDebtPayment: Number(el.value) });
  } else if (action === "whatif-slider") {
    updateWhatIf({ preset: "custom", [el.dataset.field]: Number(el.value) });
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  const kind = form.getAttribute("data-form");
  if (kind === "cover-overspent") {
    event.preventDefault();
    const fd = new FormData(form);
    coverOverspentEnvelope(fd.get("targetId"), fd.get("sourceId"), Number(fd.get("amount")));
    announceStatus("Moved surplus funds to cover overspent category.");
  } else if (kind === "add-inline-tx") {
    event.preventDefault();
    const fd = new FormData(form);
    addTransaction(Object.fromEntries(fd.entries()));
    form.reset();
    announceStatus("Recorded transaction in household ledger.");
  } else if (kind === "add-split-tx") {
    event.preventDefault();
    const fd = new FormData(form);
    addSplitTransaction({
      date: fd.get("date"),
      payee: fd.get("payee"),
      accountId: fd.get("accountId"),
      member: fd.get("member"),
      memo: fd.get("memo"),
      splits: [
        { envelopeId: fd.get("env1"), amount: Number(fd.get("amt1")) },
        { envelopeId: fd.get("env2"), amount: Number(fd.get("amt2")) },
      ],
    });
    uiState.splitMode = false;
    announceStatus("Recorded split receipt across two envelopes.");
  }
});

document.getElementById("open-quick-log")?.addEventListener("click", () => {
  populateQuickModalOptions(getState());
  dialogEl?.showModal();
});
document.getElementById("close-quick-log")?.addEventListener("click", () => dialogEl?.close());
document.getElementById("cancel-quick-log")?.addEventListener("click", () => dialogEl?.close());
quickForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const fd = new FormData(quickForm);
  addTransaction(Object.fromEntries(fd.entries()));
  quickForm.reset();
  dialogEl?.close();
  announceStatus("Saved transaction and updated envelope balance.");
});

document.getElementById("reset-demo-btn")?.addEventListener("click", () => {
  resetHouseholdData();
  announceStatus("Restored Mercer-Lin household demo data.");
});

subscribe(() => {
  renderCurrentRoute(true);
});
window.addEventListener("hashchange", () => {
  renderCurrentRoute(false);
});

renderCurrentRoute(false);