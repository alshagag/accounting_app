import {
  idbGetAll,
  STORE_PRODUCTS,
  STORE_TRANSACTIONS,
  isFallbackMode,
  fallback
} from "@/data/db/db.js";

import { showGlobalAlert } from "@/components/ui.js";

const EXPORT_VERSION = 1;

function getTodayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function downloadJson(filename, data) {
  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

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
  const products = isFallbackMode()
    ? fallback.getProducts() || []
    : await idbGetAll(STORE_PRODUCTS);

  const transactions = isFallbackMode()
    ? fallback.getTransactions() || []
    : await idbGetAll(STORE_TRANSACTIONS);

  return {
    products,
    transactions
  };
}

export async function exportData() {
  try {
    const data = await getCurrentData();

    downloadJson(
      `accounting-backup-${getTodayStamp()}.json`,
      {
        app: "accounting_app",
        version: EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        ...data
      }
    );

    showGlobalAlert("تم تصدير البيانات بنجاح", "success");

  } catch (error) {

    console.error(error);

    showGlobalAlert("تعذر تصدير البيانات", "danger");
  }
}