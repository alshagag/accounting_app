import { $ } from "./utils.js";

const EXPORT_VERSION = 1;

function getTodayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

async function getCurrentData() {
  const products = window.useFallback
    ? window.getFallbackProducts?.() || []
    : await window.idbGetAll(window.STORE_PRODUCTS);

  const transactions = window.useFallback
    ? window.getFallbackTransactions?.() || []
    : await window.idbGetAll(window.STORE_TRANSACTIONS);

  return { products, transactions };
}

async function exportData() {
  try {
    const data = await getCurrentData();

    downloadJson(`accounting-backup-${getTodayStamp()}.json`, {
      app: "accounting_app",
      version: EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      ...data
    });

    window.showGlobalAlert?.("تم تصدير البيانات بنجاح", "success");
  } catch (error) {
    console.error("exportData error:", error);
    window.showGlobalAlert?.("تعذر تصدير البيانات", "danger");
  }
}

function normalizeImportData(data) {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid backup file");
  }

  const products = Array.isArray(data.products) ? data.products : null;
  const transactions = Array.isArray(data.transactions) ? data.transactions : null;

  if (!products || !transactions) {
    throw new Error("Backup must include products and transactions arrays");
  }

  return {
    products,
    transactions
  };
}

async function replaceStore(store, rows) {
  const currentRows = await window.idbGetAll(store);

  for (const row of currentRows) {
    await window.idbDelete(store, Number(row.id));
  }

  for (const row of rows) {
    await window.idbPut(store, row);
  }
}

async function saveImportedData(data) {
  if (window.useFallback) {
    window.setFallbackProducts?.(data.products);
    window.setFallbackTransactions?.(data.transactions);
    return;
  }

  await replaceStore(window.STORE_PRODUCTS, data.products);
  await replaceStore(window.STORE_TRANSACTIONS, data.transactions);
}

async function refreshAfterImport() {
  await window.loadProductsToUI?.();
  await window.loadTransactionsToUI?.();
  window.setDefaultDate?.();
}

async function importDataFromFile(file) {
  if (!file) return;

  try {
    const text = await file.text();
    const data = normalizeImportData(JSON.parse(text));

    const confirmed = await window.confirmDelete?.({
      title: "استيراد البيانات",
      message: "هل تريد استبدال البيانات الحالية ببيانات الملف؟",
      detail: "سيتم استبدال المنتجات والمبيعات والمشتريات الحالية. يفضل تصدير نسخة احتياطية قبل المتابعة.",
      confirmText: "استيراد واستبدال"
    });

    if (!confirmed) return;

    await saveImportedData(data);
    await refreshAfterImport();

    window.showGlobalAlert?.("تم استيراد البيانات بنجاح", "success");
  } catch (error) {
    console.error("importData error:", error);
    window.showGlobalAlert?.("ملف الاستيراد غير صالح أو تعذر حفظ البيانات", "danger");
  }
}

function bindDataTransfer() {
  $("btnExportData")?.addEventListener("click", exportData);

  $("btnImportData")?.addEventListener("click", () => {
    $("importDataFile")?.click();
  });

  $("importDataFile")?.addEventListener("change", async (event) => {
    await importDataFromFile(event.target.files?.[0]);
    event.target.value = "";
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bindDataTransfer);
} else {
  bindDataTransfer();
}

window.exportData = exportData;
window.importDataFromFile = importDataFromFile;

export {
  exportData,
  importDataFromFile
};
