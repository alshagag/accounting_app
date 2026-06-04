import { $ } from "./utils.js";

/* =========================
   Database State | حالة قاعدة البيانات
========================= */

const DB_NAME = "SimpleAccountingDB_v1";
const DB_VERSION = 1;

const STORE_PRODUCTS = "products";
const STORE_TRANSACTIONS = "transactions";

window.STORE_PRODUCTS = STORE_PRODUCTS;
window.STORE_TRANSACTIONS = STORE_TRANSACTIONS;

let db = null;

window.useFallback = false;

/* =========================
   DB Ready Promise | وعد جاهزية قاعدة البيانات
========================= */

let resolveDBReady;
window.dbReadyPromise = new Promise((resolve) => {
  resolveDBReady = resolve;
});

/* =========================
   Fallback Storage | التخزين الاحتياطي
========================= */

const fallback = {
  getProducts() {
    return JSON.parse(localStorage.getItem(STORE_PRODUCTS) || "[]");
  },
  setProducts(products) {
    localStorage.setItem(STORE_PRODUCTS, JSON.stringify(products || []));
  },
  getTransactions() {
    return JSON.parse(localStorage.getItem(STORE_TRANSACTIONS) || "[]");
  },
  setTransactions(transactions) {
    localStorage.setItem(STORE_TRANSACTIONS, JSON.stringify(transactions || []));
  }
};

window.getFallbackProducts = fallback.getProducts;
window.setFallbackProducts = fallback.setProducts;
window.getFallbackTransactions = fallback.getTransactions;
window.setFallbackTransactions = fallback.setTransactions;

/* =========================
   Open Database | فتح قاعدة البيانات
========================= */

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const rdb = e.target.result;

      if (!rdb.objectStoreNames.contains(STORE_PRODUCTS)) {
        const s = rdb.createObjectStore(STORE_PRODUCTS, {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("name", "name");
      }

      if (!rdb.objectStoreNames.contains(STORE_TRANSACTIONS)) {
        const s = rdb.createObjectStore(STORE_TRANSACTIONS, {
          keyPath: "id",
          autoIncrement: true,
        });
        s.createIndex("type", "type");
        s.createIndex("date", "date");
      }
    };

    req.onsuccess = (e) => {
      db = e.target.result;
      window.db = db;

      resolveDBReady(db);

      resolve(db);
    };

    req.onerror = () => reject(req.error);
  });
}

/* =========================
   Safe DB Wait | انتظار آمن للقاعدة
========================= */

async function ensureDB() {
  if (!window.dbReadyPromise) {
    throw new Error("DB not initialized");
  }

  await window.dbReadyPromise;

  if (!db) {
    throw new Error("DB reference missing");
  }
}

/* =========================
   IndexedDB Operations | عمليات IndexedDB
========================= */

async function idbGetAll(store) {
  await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbAdd(store, value) {
  await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).add(value);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(store, value) {
  await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).put(value);

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(store, key) {
  await ensureDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    const req = tx.objectStore(store).delete(key);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/* =========================
   App Initialization | تهيئة التطبيق
========================= */

async function initApp() {
  const loading = document.getElementById("loadingBox");
  const app = document.getElementById("app");

  if (!loading || !app) return;

  loading.style.display = "block";
  app.classList.add("d-none");

  try {
    await openDatabase();
    window.useFallback = false;
  } catch (e) {
    console.warn("DB fallback mode:", e);
    window.useFallback = true;
  } finally {
    loading.style.display = "none";
    app.classList.remove("d-none");

    setTimeout(() => {
      window.bindUI?.();
      window.loadProductsToUI?.();
      window.loadTransactionsToUI?.();
      window.setDefaultDate?.();
    }, 100);
  }
}

/* =========================
   Module Exports | تصدير الوحدة
========================= */

export {
  initApp,
  idbAdd,
  idbPut,
  idbDelete,
  idbGetAll,
  STORE_PRODUCTS,
  STORE_TRANSACTIONS
};

/* Global bindings | الربط العام */
window.initApp = initApp;
window.idbAdd = idbAdd;
window.idbPut = idbPut;
window.idbDelete = idbDelete;
window.idbGetAll = idbGetAll;
