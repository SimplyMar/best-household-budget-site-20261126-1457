// Offline CSV and JSON export/import helpers for household portability and spreadsheet backups.

export function transactionsToCsv(transactions, envelopesMap) {
  const header = ["date", "payee", "type", "category", "envelope_id", "account_id", "member", "cleared", "amount", "memo"];
  const escapeCsv = (val) => {
    const s = String(val ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, "\"\"")}"` : s;
  };
  const rows = transactions.map((t) => [
    t.date,
    t.payee,
    t.type,
    t.envelopeId ? (envelopesMap.get(t.envelopeId)?.name ?? t.envelopeId) : "Household Income",
    t.envelopeId ?? "",
    t.accountId,
    t.member,
    t.cleared ? "cleared" : "uncleared",
    Number(t.amount).toFixed(2),
    t.memo ?? "",
  ].map(escapeCsv).join(","));
  return [header.join(","), ...rows].join("\n");
}

export function parseTransactionsCsv(csvText) {
  const lines = String(csvText ?? "").trim().split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 2) return [];
  const headers = splitCsvRow(lines[0]).map((h) => h.trim().toLowerCase());
  const idx = (names) => headers.findIndex((h) => names.includes(h));

  const iDate = idx(["date", "tx_date"]);
  const iPayee = idx(["payee", "merchant", "description", "name"]);
  const iType = idx(["type", "kind"]);
  const iEnv = idx(["envelope_id", "envelope", "category_id"]);
  const iAcc = idx(["account_id", "account"]);
  const iMember = idx(["member", "owner", "partner"]);
  const iAmount = idx(["amount", "value", "total"]);
  const iMemo = idx(["memo", "note", "notes"]);

  const parsed = [];
  for (let r = 1; r < lines.length; r += 1) {
    const cols = splitCsvRow(lines[r]);
    const rawAmt = Number(String(cols[iAmount] ?? "0").replace(/[$,\s]/g, ""));
    if (!rawAmt || Number.isNaN(rawAmt)) continue;
    const rawType = String(cols[iType] ?? "").toLowerCase();
    const isIncome = rawType === "income" || (rawType === "" && rawAmt > 0 && !cols[iEnv]);
    parsed.push({
      date: cols[iDate]?.trim() || "2026-11-26",
      payee: cols[iPayee]?.trim() || "Imported CSV Entry",
      type: isIncome ? "income" : "expense",
      envelopeId: cols[iEnv]?.trim() || "groceries",
      accountId: cols[iAcc]?.trim() || "checking",
      member: cols[iMember]?.trim() || "Joint",
      amount: Math.abs(rawAmt),
      memo: cols[iMemo]?.trim() || "Imported from CSV",
    });
  }
  return parsed;
}

function splitCsvRow(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === "\"") {
      if (inQuotes && line[i + 1] === "\"") {
        cur += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export function triggerDownload(filename, content, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}