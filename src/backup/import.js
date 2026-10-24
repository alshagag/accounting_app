import {
  idbGetAll,
  idbDelete,
  idbPut,
  STORE_PRODUCTS,
  STORE_TRANSACTIONS,
  isFallbackMode,
  fallback
} from "@/data/db/db.js";

import { showGlobalAlert } from "@/components/ui.js";

import { confirmDelete } from "@/components/dialogs/confirm-dialog.js";

import { loadProductsToUI } from "@/features/products/products.js";

import {
  loadTransactionsToUI,
  setDefaultDate
} from "@/features/documents/transactions.js";

function normalizeImportData(data) {

  if (!data || typeof data !== "object") {
    throw new Error("Invalid backup");
  }

  return {

    products:
      Array.isArray(data.products)
        ? data.products
        : [],

    transactions:
      Array.isArray(data.transactions)
        ? data.transactions
        : []

  };

}

async function replaceStore(store, rows) {

  const currentRows = await idbGetAll(store);

  for (const row of currentRows) {

    await idbDelete(store, Number(row.id));

  }

  for (const row of rows) {

    await idbPut(store, row);

  }

}

async function saveImportedData(data) {

  if (isFallbackMode()) {

    fallback.setProducts(data.products);

    fallback.setTransactions(data.transactions);

    return;

  }

  await replaceStore(
    STORE_PRODUCTS,
    data.products
  );

  await replaceStore(
    STORE_TRANSACTIONS,
    data.transactions
  );

}

async function refreshAfterImport() {

  await loadProductsToUI();

  await loadTransactionsToUI();

  setDefaultDate();

}

export async function importDataFromFile(file) {

  if (!file) return;

  try {

    const text = await file.text();

    const data =
      normalizeImportData(
        JSON.parse(text)
      );

    const confirmed =
      await confirmDelete({

        title: "استيراد البيانات",

        message:
          "هل تريد استبدال البيانات الحالية ببيانات الملف؟",

        detail: "سيتم استبدال المنتجات والمبيعات والمشتريات الحالية. يفضل تصدير نسخة احتياطية قبل المتابعة.",

        confirmText:
          "استيراد واستبدال"

      });

    if (!confirmed) return;

    await saveImportedData(data);

    await refreshAfterImport();

    showGlobalAlert(
      "تم استيراد البيانات بنجاح",
      "success"
    );

  } catch (error) {

    console.error(error);

    showGlobalAlert(
      "ملف الاستيراد غير صالح",
      "danger"
    );

  }

}