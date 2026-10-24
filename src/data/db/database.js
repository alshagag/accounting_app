/* ================= وحدة قاعدة البيانات (إعادة تصدير) | Database Module (Re-exports) ================= */
/* غلاف رقيق — كل المنطق في db.js لتجنّب الاعتماديات الدائرية | Thin wrapper — all logic lives in db.js to avoid circular deps. */

export {
  STORE_PRODUCTS,
  STORE_TRANSACTIONS,
  isFallbackMode,
  fallback,
  openDatabase,
  idbGetAll,
  idbAdd,
  idbPut,
  idbDelete,
  invalidateCache,
  getAllTransactions,
} from "./db.js";
