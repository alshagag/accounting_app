import { $ } from "./utils.js";

/* =========================
   Database State | حالة قاعدة البيانات
========================= */

/* الإصدار 2 هو إصدار المخطط الفعلي الذي يستخدمه التطبيق: المخازن الثلاثة
   products / transactions / vouchers. الإصدار 1 كان يُستخدم هنا، فتفشل كل
   محاولة فتح على قاعدة موجودة (VersionError) ويتحوّل التطبيق إلى تخزين
   احتياطي فارغ، فتختفي البيانات existing despite وجودها. */
const DB_NAME = "SimpleAccountingDB_v1";
const DB_VERSION = 2;

const STORE_PRODUCTS = "products";
const STORE_TRANSACTIONS = "transactions";
const STORE_VOUCHERS = "vouchers";

window.STORE_PRODUCTS = STORE_PRODUCTS;
window.STORE_TRANSACTIONS = STORE_TRANSACTIONS;
window.STORE_VOUCHERS = STORE_VOUCHERS;

let db = null;

window.useFallback = false;

function describeError(e) {
  if (!e) return { name: "UnknownError", message: "unknown", code: null };
  return { name: e.name || "Error", message: e.message || String(e), code: e.code ?? null };
}

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

/* تسجيل المخازن وأعداد السجلات الفعلية (تشخيص) */
async function logStoreCounts(conn) {
  const names = [...conn.objectStoreNames];
  console.log("[DB] Object stores:", names.join(", ") || "none");

  const labels = {
    [STORE_PRODUCTS]: "Products",
    [STORE_TRANSACTIONS]: "Invoices",
    [STORE_VOUCHERS]: "Vouchers",
  };

  for (const s of names) {
    try {
      const n = await new Promise((resolve, reject) => {
        const q = conn.transaction(s, "readonly").objectStore(s).count();
        q.onsuccess = () => resolve(q.result);
        q.onerror = () => reject(q.error);
      });
      console.log(`[DB] ${labels[s] || s} count: ${n}`);
    } catch (e) {
      console.warn(`[DB] ${labels[s] || s} count: unavailable (${describeError(e).name})`);
    }
  }
}

/* =========================
   Open Database | فتح قاعدة البيانات
========================= */

function openWithVersion(version) {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB not supported"));
      return;
    }

    console.log(`[DB] Opening database: ${DB_NAME}${version ? " v" + version : " (at current version)"}`);
    const req = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME);

    req.onupgradeneeded = (e) => {
      console.log("[DB] Database upgrade started");
      const rdb = e.target.result;

      try {
        if (!rdb.objectStoreNames.contains(STORE_PRODUCTS)) {
          const s = rdb.createObjectStore(STORE_PRODUCTS, {
            keyPath: "id",
            autoIncrement: true,
          });
          s.createIndex("name", "name");
          console.log(`[DB] Object store "${STORE_PRODUCTS}" created.`);
        }

        if (!rdb.objectStoreNames.contains(STORE_TRANSACTIONS)) {
          const s = rdb.createObjectStore(STORE_TRANSACTIONS, {
            keyPath: "id",
            autoIncrement: true,
          });
          s.createIndex("type", "type");
          s.createIndex("date", "date");
          console.log(`[DB] Object store "${STORE_TRANSACTIONS}" created.`);
        }

        if (!rdb.objectStoreNames.contains(STORE_VOUCHERS)) {
          rdb.createObjectStore(STORE_VOUCHERS, { keyPath: "id" });
          console.log(`[DB] Object store "${STORE_VOUCHERS}" created.`);
        }
      } catch (err) {
        console.error("[DB] Upgrade failed:", describeError(err));
        throw err;
      }
    };

    req.onsuccess = (e) => {
      const rdb = e.target.result;
      db = rdb;
      window.db = db;

      /* إذا رقّى تبويب آخر القاعدة يجب إغلاق اتصالنا وإلا يُحجب هناك. */
      rdb.onversionchange = () => {
        console.warn("[DB] onversionchange: another tab upgraded the database. Closing our connection.");
        try { rdb.close(); } catch (_) {}
        db = null;
        window.db = null;
      };

      console.log(`[DB] Database opened successfully (version ${rdb.version}, stores: ${[...rdb.objectStoreNames].join(", ")})`);
      logStoreCounts(rdb)
        .catch(() => {})
        .then(() => console.log("[DB] Database ready"));

      resolveDBReady(db);

      resolve(db);
    };

    req.onerror = () => {
      const err = req.error || new Error("IndexedDB open failed");

      /* downgrade: لا نحذف ولا نغيّر شيئاً، نفتح القاعدة على نسختها الحالية. */
      if (err && err.name === "VersionError") {
        console.warn(`[DB] Requested version ${version} is older than the stored database. ` +
          "Re-opening at the stored version without changing any data.");
        openWithVersion(null).then(resolve, reject);
        return;
      }

      reject(err);
    };

    /* blocked ليس فشلاً: تبويب آخر يحتجز اتصالاً قديماً، ننتظر ولا نفقد بيانات. */
    req.onblocked = () => {
      console.warn("[DB] onblocked: another tab is holding an older connection. Waiting (no data is lost).");
    };
  });
}

function openDatabase() {
  return openWithVersion(DB_VERSION);
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
    throw new Error("IndexedDB connection unavailable");
  }

  return db;
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
    console.log("[DB] Data loaded successfully");
  } catch (e) {
    const info = describeError(e);
    console.error("[DB] Database initialization failed:", info);

    /* لا نستخدم التخزين الاحتياطي إلا إذا كان IndexedDB غير متاح فعلياً.
       إن كانت القاعدة موجودة وفشل الفتح لسبب آخر، نُظهر الخطأ الحقيقي بدل
       عرض قائمة فارغة من LocalStorage توحي بأن البيانات ضاعت. */
    const genuinelyUnavailable =
      !window.indexedDB || info.name === "NotSupportedError" || info.name === "SecurityError";

    if (genuinelyUnavailable) {
      window.useFallback = true;
      console.warn("[DB] IndexedDB is genuinely unavailable. LocalStorage fallback enabled.");
    } else {
      window.useFallback = false;
      console.error("[DB] IndexedDB exists but could not be opened. " +
        "NOT switching to LocalStorage, to avoid showing empty data.");
    }

    /* لا نترك dbReadyPromise بلا حل، وإلا hung كل طلب قراءة للأبد. */
    resolveDBReady(null);
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
   App Initialization | تهيئة التطبيق
========================= */

/* Start the app automatically when the DOM is ready */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
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
