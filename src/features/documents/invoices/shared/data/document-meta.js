export const DOCUMENT_META_KEY = "accountingDocumentMeta";

export function getAllDocumentMeta() {
  try {
    return JSON.parse(localStorage.getItem(DOCUMENT_META_KEY) || "{}");
  } catch {
    return {};
  }
}

export function setAllDocumentMeta(meta) {
  localStorage.setItem(DOCUMENT_META_KEY, JSON.stringify(meta || {}));
}

export function getDocumentMetaId(key, category) {
  return `${category}:${key}`;
}

export function getDocumentMeta(key, category) {
  return getAllDocumentMeta()[getDocumentMetaId(key, category)] || null;
}

export function saveDocumentMeta(key, category, values) {
  const allMeta = getAllDocumentMeta();
  allMeta[getDocumentMetaId(key, category)] = {
    ...values,
    updatedAt: new Date().toISOString()
  };
  setAllDocumentMeta(allMeta);
}

export function generateUniqueDocNo() {
  const allMeta = getAllDocumentMeta();
  const existing = new Set(
    Object.values(allMeta).map(m => m.code).filter(Boolean)
  );
  let code;
  do {
    code = String(Math.floor(Math.random() * 90000000) + 10000000);
  } while (existing.has(code));
  return code;
}

export function migrateDocumentNos(getAllVouchers, setAllVouchers) {
  const allMeta = getAllDocumentMeta();
  let changed = false;
  const codeMap = {};

  Object.entries(allMeta).forEach(([metaId, meta]) => {
    if (!metaId.startsWith("invoice:")) return;
    const oldCode = meta.code;
    if (/^\d{8}$/.test(oldCode)) { codeMap[oldCode] = oldCode; return; }
    const newCode = generateUniqueDocNo();
    codeMap[oldCode || ""] = newCode;
    allMeta[metaId] = { ...meta, code: newCode };
    changed = true;
  });

  if (changed) setAllDocumentMeta(allMeta);

  const vouchers = getAllVouchers();
  let vChanged = false;
  vouchers.forEach(v => {
    if (v.invoiceNo && codeMap[v.invoiceNo] && codeMap[v.invoiceNo] !== v.invoiceNo) {
      v.invoiceNo = codeMap[v.invoiceNo];
      vChanged = true;
    }
  });
  if (vChanged) setAllVouchers(vouchers);

  try {
    const transactions = JSON.parse(localStorage.getItem("transactions") || "[]");
    let tChanged = false;
    transactions.forEach(tx => {
      if (tx.ref && codeMap[tx.ref] && codeMap[tx.ref] !== tx.ref) {
        tx.ref = codeMap[tx.ref];
        tChanged = true;
      }
    });
    if (tChanged) localStorage.setItem("transactions", JSON.stringify(transactions));
  } catch {}
}