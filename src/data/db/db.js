/* ================= طبقة قاعدة البيانات | Database Layer ================= */
/* طبقة بيانات خالصة — بلا أي استيراد من وحدات التطبيق/الواجهة | Pure data layer — zero imports from app/UI modules. */

const DB_NAME = "SimpleAccountingDB_v1";
const DB_VERSION = 2;

const STORE_PRODUCTS = "products";
const STORE_TRANSACTIONS = "transactions";
const STORE_VOUCHERS = "vouchers";

/* حالة التهيئة مشتركة على globalThis عمداً: أثناء التطوير (HMR) أو الاستيراد عبر مسارين قد تُنشأ نسخ متعددة من هذا الملف، وكل نسخة تفتح القاعدة منفردة فتُحجب الاتصال بين التبويبات؛ وضع الحالة على globalThis يضمن تهيئة واحدة مشتركة لكل الصفحة | Init state lives on globalThis on purpose: during development (HMR) or dual-path imports, several copies of this file can exist and each opens the DB on its own, blocking cross-tab connections; keeping the state on globalThis guarantees a single shared init per page. */
const SHARED = (() => {
    const g = globalThis;
    if (!g.__accountingDbShared) g.__accountingDbShared = { ready: null, useFallback: false, connLost: false };
    return g.__accountingDbShared;
})();

/* مرآة محلية للاتصال، تُملأ من الوعد المشترك بعد كل انتظار | Local mirror of the connection, filled from the shared promise after each await. */
let db = null;

/* ================= التخزين الاحتياطي | Fallback Storage ================= */

const fallback = {
    getProducts() {
        if (typeof window === "undefined") return [];
        return JSON.parse(window.localStorage.getItem(STORE_PRODUCTS) || "[]");
    },
    setProducts(products) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(STORE_PRODUCTS, JSON.stringify(products || []));
    },
    getTransactions() {
        if (typeof window === "undefined") return [];
        return JSON.parse(window.localStorage.getItem(STORE_TRANSACTIONS) || "[]");
    },
    setTransactions(transactions) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem(STORE_TRANSACTIONS, JSON.stringify(transactions || []));
    },
    getVouchers() {
        if (typeof window === "undefined") return [];
        return JSON.parse(window.localStorage.getItem("accountingVouchers") || "[]");
    },
    setVouchers(vouchers) {
        if (typeof window === "undefined") return;
        window.localStorage.setItem("accountingVouchers", JSON.stringify(vouchers || []));
    }
};


/* ================= التشخيص | Diagnostics ================= */

/* مُراقِب زمني للتحذير فقط — لا يُستخدم للتحويل إلى LocalStorage | A warning-only timer — never a trigger to switch to LocalStorage.
   IndexedDB قد يكون بطيئاً (ترقية، ضغط قرص، نافذة أخرى) دون أن يكون معطلاً، والتحويل بسبب مهلة هو بالضبط سبب فقدان بيانات المستخدمين | IndexedDB can be slow (upgrade, disk pressure, another tab) without being broken; a timeout-triggered fallback is exactly what loses user data. */
const DB_SLOW_WARN_MS = 5000;
const DB_VERY_SLOW_WARN_MS = 15000;

const REQUIRED_STORES = [STORE_PRODUCTS, STORE_TRANSACTIONS, STORE_VOUCHERS];

function describeError(e) {
    return {
        name: (e && e.name) || "UnknownError",
        message: (e && e.message) || String(e),
        code: e && e.code !== undefined ? e.code : null,
    };
}

/* فقط هذه الأخطاء تعني أن IndexedDB غير قابل للاستخدام في هذا المتصفح/الوضع | Only these errors mean IndexedDB is unusable in this browser/mode.
   أي خطأ آخر (محاولة مؤقتة، VersionError، محرك مشغول، اتصال أُغلق) لا يحوّل للتخزين الاحتياطي | Any other error (transient attempt, VersionError, busy engine, closed connection) does not switch to fallback. */
function isGenuinelyUnavailable(e) {
    const name = (e && e.name) || "";
    if (typeof window === "undefined" || !window.indexedDB) return true;
    return name === "NotSupportedError" || name === "SecurityError";
}

/* ================= فتح قاعدة البيانات | Open Database ================= */

/* تهيئة واحدة مشتركة لكل التطبيق عبر SHARED.ready: أي استدعاء لاحق يعود لنفس الوعد، فلا تتكرر تهيئة القاعدة ولا يسبق أحدٌ الآخر | One shared init app-wide via SHARED.ready: later calls reuse the same promise, so the DB never initializes twice and no caller runs ahead. */

function openWithVersion(version) {
    return new Promise((resolve, reject) => {
        /* بدون واجهة متصفح (اختبارات Node/SSR) لا يوجد indexedDB أصلاً | Without a browser (Node/SSR tests) indexedDB is absent.
          فنتجنّب ReferenceError ونُبلغ عن فشل واضح | so we avoid a ReferenceError and report a clear failure. */
        if (typeof indexedDB === "undefined" || !indexedDB) {
            reject(new Error("IndexedDB is not available in this environment"));
            return;
        }
        console.log(`[DB] Opening database: ${DB_NAME}${version ? " v" + version : " (at current version)"}`);
        const req = version ? indexedDB.open(DB_NAME, version) : indexedDB.open(DB_NAME);

        req.onupgradeneeded = (e) => {
            console.log("[DB] Database upgrade started");
            const rdb = e.target.result;
            try {
                if (!rdb.objectStoreNames.contains(STORE_PRODUCTS)) {
                    const s = rdb.createObjectStore(STORE_PRODUCTS, { keyPath: "id", autoIncrement: true });
                    if (!s.indexNames.contains("name")) s.createIndex("name", "name");
                    console.log(`[DB] Object store "${STORE_PRODUCTS}" created.`);
                }
                if (!rdb.objectStoreNames.contains(STORE_TRANSACTIONS)) {
                    const s = rdb.createObjectStore(STORE_TRANSACTIONS, { keyPath: "id", autoIncrement: true });
                    if (!s.indexNames.contains("type")) s.createIndex("type", "type");
                    if (!s.indexNames.contains("date")) s.createIndex("date", "date");
                    console.log(`[DB] Object store "${STORE_TRANSACTIONS}" created.`);
                }
                if (!rdb.objectStoreNames.contains(STORE_VOUCHERS)) {
                    rdb.createObjectStore(STORE_VOUCHERS, { keyPath: "id" });
                    console.log(`[DB] Object store "${STORE_VOUCHERS}" created.`);
                }
                console.log("[DB] Database upgrade completed");
            } catch (err) {
                /* خطأ داخل الترقية يُجهض معاملة versionchange ويؤدي لفشل الفتح؛ نسجّله بالتفصيل بدل ابتلاعه | An error inside the upgrade aborts the versionchange transaction and fails the open; we log it in detail instead of swallowing it */
                console.error("[DB] Error during onupgradeneeded:", describeError(err));
                throw err;
            }
        };

        req.onsuccess = () => {
            const rdb = req.result;
            db = rdb;
            SHARED.useFallback = false;
            SHARED.connLost = false;

            /* عند ترقية القاعدة من نافذة أخرى يجب إغلاق اتصالنا وإلا تُحجب هناك للأبد | When another window upgrades the database we must close our connection, otherwise it stays blocked there forever. */
            rdb.onversionchange = () => {
                console.warn("[DB] onversionchange: another tab upgraded the database. Closing our connection.");
                try { rdb.close(); } catch (_) {}
                db = null;
                SHARED.connLost = true;
            };
            rdb.onclose = () => {
                console.warn("[DB] onclose: the database connection was closed (database deleted or reset).");
                db = null;
                SHARED.connLost = true;
            };

            const present = REQUIRED_STORES.filter((s) => rdb.objectStoreNames.contains(s));
            const missing = REQUIRED_STORES.filter((s) => !rdb.objectStoreNames.contains(s));
            if (missing.length) {
                console.warn(`[DB] Missing object store(s): ${missing.join(", ")}`);
            }
            console.log(`[DB] Database opened successfully (version ${rdb.version}, stores: ${present.join(", ") || "none"})`);
            resolve(rdb);
        };

        req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));

        /* blocked ليس فشلاً: نافذة/تبويب آخر يحتجز الاتصال | blocked is not a failure: another window/tab is holding the connection.
           لا نرفض ولا نحول للتخزين الاحتياطي — ننتظر ونُبلغ المستخدم فقط | We neither reject nor fall back — we wait and only inform the user. */
        req.onblocked = () => {
            console.warn("[DB] onblocked: another tab is holding an older connection. " +
                "Waiting for it to close — NOT switching to LocalStorage.");
        };
    });
}

/* مراقبة زمنية إخبارية فقط: تنبّه إن كان الفتح بطيئاً، ولا ترفض الوعد | Informational watchdog only: it warns when opening is slow and never rejects the promise.
   المؤقتات تُلغى فور نجاح الفتح حتى لا يضلّل Console | Timers are cleared on success so the Console is not misled. */
function attachSpeedWatchdogs(promise) {
    const t1 = setTimeout(() => console.warn(`[DB] Still opening after ${DB_SLOW_WARN_MS}ms. Waiting — this does not mean failure.`), DB_SLOW_WARN_MS);
    const t2 = setTimeout(() => console.warn(`[DB] Still opening after ${DB_VERY_SLOW_WARN_MS}ms. Still waiting on IndexedDB.`), DB_VERY_SLOW_WARN_MS);
    const clear = () => { clearTimeout(t1); clearTimeout(t2); };
    promise.then(clear, clear);
    return promise;
}

function startOpen() {
    return attachSpeedWatchdogs(
        openWithVersion(DB_VERSION).catch((err) => {
            const info = describeError(err);
            console.error("IndexedDB error:", info);

            /* القاعدة قد تكون بإصدار أحدث من المطلوب؛ طلب التخفيض يُنتج VersionError فلا نحاوله | The DB can be on a newer version than requested; a downgrade request raises VersionError, so we never attempt it.
               نلتصق بالإصدار الموجود كما هو دون المساس بأي بيانات | We stick to the stored version as-is and touch no data. */
            if (info.name === "VersionError") {
                console.warn(`[DB] Requested version ${DB_VERSION} is older than the stored database. ` +
                    "Re-opening at the stored version without changing any data.");
                return openWithVersion(null);
            }
            throw err;
        })
    ).then(
        (conn) => {
            console.log("[DB] Database ready");
            SHARED.useFallback = false;
            return conn;
        },
        (err) => {
            const info = describeError(err);
            console.error("[DB] IndexedDB initialization failed:", info);
            if (isGenuinelyUnavailable(err)) {
                SHARED.useFallback = true;
                console.warn("[DB] IndexedDB is genuinely unavailable in this context. LocalStorage fallback enabled.");
            } else {
                /* خطأ غير نهائي (محاولة فاشلة، محرك مشغول، قاعدة تالفة) | A transient error (failed attempt, busy engine, corrupt database).
                   لا نُسقط المستخدم إلى LocalStorage ونترك بياناته في مكانين | We do not drop the user to LocalStorage and leave their data in two places. */
                SHARED.useFallback = false;
                console.error("[DB] Transient/uncategorised IndexedDB failure. Staying on IndexedDB, no fallback engaged.");
            }
            return null;
        }
    );
}

function openDatabase() {
    /* الوعد المشترك على globalThis: نسخ متعددة من هذا الملف تنتظر كلها نتيجة تهيئة واحدة | The shared promise on globalThis: multiple copies of this file all await one init result. */
    if (!SHARED.ready) {
        console.log("[DB] IndexedDB initialization started");
        console.log(`[DB] IndexedDB supported: ${typeof window !== "undefined" && !!window.indexedDB}`);
        SHARED.ready = startOpen();
    }
    return SHARED.ready;
}

/* =========================
   انتظار آمن للقاعدة | Safe DB Wait
========================= */

/* كل عملية قراءة/كتابة تنتظر تهيئة واحدة مشتركة قبل لمس IndexedDB | Every read/write waits for the single shared init before touching IndexedDB. */
async function ensureDB() {
    let conn = await openDatabase();
    /* الوعد المشترك يحتفظ بالاتصال الأصلي حتى لو أُغلق لاحقاً، فلا نأخذ به قبل التأكد أنه حيّ (فحص connLost) | The shared promise keeps the original connection even if it is closed later, so we use it only after confirming it is alive (connLost check). */
    if (conn && !SHARED.connLost) db = conn;

    if (SHARED.useFallback) return;

    /* ضاع الاتصال (حُذفت القاعدة من DevTools أو أُغلقت): نعيد الفتح مرة واحدة بدل رمي استثناء يكسر كل عملية، وبلا رجوع نهائي للتخزين الاحتياطي | The connection is gone (DB deleted from DevTools or closed): we reopen once instead of throwing an exception that breaks every operation, and never fall back permanently. */
    if (SHARED.connLost || !db) {
        console.warn("[DB] Connection lost. Re-opening the database once.");
        SHARED.ready = null;
        SHARED.connLost = false;
        conn = await openDatabase();
        if (conn) db = conn;
    }

    if (!db) {
        throw new Error("DB reference missing");
    }
}

/* ================= ذاكرة التخزين المؤقت | Data Cache ================= */

function invalidateCache(store) {
    // توقيع متوافق فقط: الدالة لا تفعل شيئاً وتبقى لمناداة الوحدات الأخرى | Compatibility no-op: the function does nothing and remains for calls from other modules.
}

/* ================= الوصول إلى التخزين الاحتياطي | Fallback Store Access ================= */
/* يعكس عمليات IndexedDB على تخزين localStorage الاحتياطي حتى لا تنهار دوال idb* عند تعذّر القاعدة | Mirrors IndexedDB operations on the localStorage fallback so idb* functions never crash when the DB is unavailable. */

function fallbackStore(store) {
    const isProducts = store === STORE_PRODUCTS;
    const isTransactions = store === STORE_TRANSACTIONS;
    const isVouchers = store === STORE_VOUCHERS;
    if (!isProducts && !isTransactions && !isVouchers) return null;

    const get = () => (isProducts ? fallback.getProducts() : isTransactions ? fallback.getTransactions() : fallback.getVouchers()) || [];
    const set = (items) => (isProducts ? fallback.setProducts(items) : isTransactions ? fallback.setTransactions(items) : fallback.setVouchers(items));

    return {
        getAll() {
            return get();
        },
        add(value) {
            const items = get();
            const item = { ...value, id: value.id ?? (Date.now() + Math.random()) };
            items.push(item);
            set(items);
            return item.id;
        },
        put(value) {
            const items = get();
            const index = items.findIndex(item => String(item.id) === String(value.id));
            if (index === -1) items.push(value);
            else items[index] = value;
            set(items);
            return value.id;
        },
        delete(key) {
            set(get().filter(item => String(item.id) !== String(key)));
        }
    };
}

/* ================= عمليات IndexedDB | IndexedDB Operations ================= */

/* ينفّذ عملية على الاتصال ويعيد المحاولة مرة واحدة إن أُغلق تحت أيدينا (مثل حذف القاعدة من DevTools أثناء العمل)؛ الاتصال المغلق لا يُطلق close دائماً فيظهر ذلك عند أول معاملة | Runs an operation on the connection and retries once if it was closed underneath us (e.g. DB deleted from DevTools while working); a closed connection does not always fire close, so it surfaces at the first transaction.
   يجب استدعاؤها بعد ensureDB() وفحص وضع الـ fallback لأن db يبقى null في وضع التخزين الاحتياطي | Call after ensureDB() and the fallback check, because db stays null in fallback mode. */
async function withConnection(fn) {
    await ensureDB();
    if (!db) {
        /* fallback تفعّل أثناء التهيئة: لا عملية IndexedDB هنا | Fallback activated during init: no IndexedDB operation here. */
        throw new Error("IndexedDB connection unavailable (fallback mode)");
    }
    try {
        return await fn(db);
    } catch (err) {
        if (err && err.name === "InvalidStateError") {
            console.warn("[DB] Connection was closed underneath us. Re-opening and retrying once.");
            SHARED.ready = null;
            SHARED.connLost = false;
            db = null;
            await ensureDB();
            if (!db) throw new Error("IndexedDB connection unavailable after re-open");
            return await fn(db);
        }
        throw err;
    }
}

async function idbGetAll(store) {
    await ensureDB();
    if (isFallbackMode()) {
        const fb = fallbackStore(store);
        return fb ? fb.getAll() : [];
    }

    return withConnection((conn) => new Promise((resolve, reject) => {
        const tx = conn.transaction(store, "readonly");
        const req = tx.objectStore(store).getAll();

        req.onsuccess = () => {
            const data = req.result || [];
            resolve(data);
        };
        req.onerror = () => reject(req.error);
    }));
}

async function idbAdd(store, value) {
    await ensureDB();
    invalidateCache(store);
    if (isFallbackMode()) {
        const fb = fallbackStore(store);
        return fb ? fb.add(value) : value;
    }

    return withConnection((conn) => new Promise((resolve, reject) => {
        try {
            const tx = conn.transaction(store, "readwrite");
            const objectStore = tx.objectStore(store);
            const req = objectStore.add(value);

            tx.oncomplete = () => {
                resolve(req.result); // نحلّ بالمفتاح الجديد عند اكتمال المعاملة | Resolve with the new key when the transaction completes
            };

            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(new Error('Transaction aborted'));
        } catch (e) {
            reject(e);
        }
    }));
}

async function idbPut(store, value) {
    await ensureDB();
    invalidateCache(store);
    if (isFallbackMode()) {
        const fb = fallbackStore(store);
        return fb ? fb.put(value) : value;
    }

    return withConnection((conn) => new Promise((resolve, reject) => {
        try {
            const tx = conn.transaction(store, "readwrite");
            const objectStore = tx.objectStore(store);
            const req = objectStore.put(value);

            tx.oncomplete = () => {
                resolve(req.result);
            };

            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(new Error('Transaction aborted'));
        } catch (e) {
            reject(e);
        }
    }));
}

async function idbDelete(store, key) {
    await ensureDB();
    invalidateCache(store);
    if (isFallbackMode()) {
        const fb = fallbackStore(store);
        if (fb) fb.delete(key);
        return;
    }

    return withConnection((conn) => new Promise((resolve, reject) => {
        const tx = conn.transaction(store, "readwrite");
        const req = tx.objectStore(store).delete(key);

        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
    }));
}

async function syncFallbackToIDB() {
    console.log("[DB_SYNC] Checking for fallback data to migrate...");
    // تُرحّل بيانات الحفظ الاحتياطي (localStorage) إلى IndexedDB عند نجاح الاتصال | Migrates fallback (localStorage) data into IndexedDB once the connection succeeds.
    if (SHARED.useFallback || !db) {
        console.log("[DB_SYNC] Skipping: in fallback mode or DB not connected.");
        return;
    }

    const fProds = fallback.getProducts();
    const fTrans = fallback.getTransactions();

    if (fProds.length === 0 && fTrans.length === 0) {
        console.log("[DB_SYNC] No fallback data found. Sync complete.");
        return; // لا شيء للمزامنة | Nothing to sync
    }

    try {
        console.log(`[DB_SYNC] Migrating ${fProds.length} products and ${fTrans.length} transactions from fallback storage.`);

        // الخطوة 1: جلب المنتجات الموجودة لتجنّب التكرار | Step 1: read existing products to avoid duplicates
        const readTx = db.transaction(STORE_PRODUCTS, 'readonly');
        const existingProducts = await new Promise((res, rej) => {
            const r = readTx.objectStore(STORE_PRODUCTS).getAll();
            r.onsuccess = () => res(r.result);
            r.onerror = () => rej(r.error);
        });
        const existingProductNames = new Set(existingProducts.map(p => p.name));

        // الخطوة 2: كتابة البيانات الجديدة في معاملة واحدة | Step 2: write the new data in a single transaction
        const writeTx = db.transaction([STORE_PRODUCTS, STORE_TRANSACTIONS], 'readwrite');
        const productStore = writeTx.objectStore(STORE_PRODUCTS);
        const transactionStore = writeTx.objectStore(STORE_TRANSACTIONS);

        for (const p of fProds) {
            if (!existingProductNames.has(p.name)) {
                const newProd = { ...p };
                delete newProd.id;
                productStore.add(newProd);
            }
        }

        for (const t of fTrans) {
            const newTrans = { ...t };
            delete newTrans.id;
            transactionStore.add(newTrans);
        }

        await new Promise((res, rej) => {
            writeTx.oncomplete = res;
            writeTx.onerror = () => rej(writeTx.error);
        });

        fallback.setProducts([]);
        fallback.setTransactions([]);
        console.log('[DB_SYNC] Migration successful. Fallback storage cleared.');

    } catch (error) {
        console.error('[DB_SYNC] Error migrating data from fallback storage:', error);
    }
}

/* ================= فحص الوضع | Mode Check ================= */

function isFallbackMode() {
    return SHARED.useFallback;
}

/* ================= الوصول للبيانات | Data Access ================= */

async function getAllTransactions() {
    if (isFallbackMode()) {
        return fallback.getTransactions() || [];
    }

    return await idbGetAll(STORE_TRANSACTIONS);
}

/* ================= تصدير الوحدة | Module Exports ================= */

/* الولوج الموحّد لعملية التهيئة المشتركة، مصرّح لكل الوحدات | Unified access to the shared init, exported for all modules. */
function getDbReadyPromise() {
    return openDatabase();
}

if (typeof window !== "undefined" && window.indexedDB) {
    openDatabase();
}

export {
    STORE_PRODUCTS,
    STORE_TRANSACTIONS,
    STORE_VOUCHERS,
    isFallbackMode,
    fallback,
    openDatabase,
    getDbReadyPromise,
    idbGetAll,
    idbAdd,
    idbPut,
    idbDelete,
    invalidateCache,
    getAllTransactions,
    syncFallbackToIDB,
};
