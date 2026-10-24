import {
    idbGetAll,
    idbPut,
    idbDelete,
    isFallbackMode,
    STORE_PRODUCTS,
    STORE_TRANSACTIONS,
    STORE_VOUCHERS,
} from "@/data/db/db.js";

/* السندات تُخزَّن في IndexedDB حتى يمسحها حذف قاعدة البيانات فعلياً؛ localStorage يبقى fallback فقط | Vouchers live in IndexedDB so a DB deletion truly wipes them; localStorage remains a fallback only
 * ترحيل لمرة واحدة من localStorage يجري فقط عند قاعدة سليمة تحوي بيانات؛ قاعدة مفروَّغة لا تُحيي سندات قديمة أبداً | One-time migration from localStorage runs only when the DB is healthy and holds data; a wiped DB never resurrects old vouchers */

export const VOUCHER_STORAGE_KEY = "accountingVouchers";
const VOUCHER_MIGRATED_MARKER = "accountingVouchersMigrated";

let vouchersCache = null;

function readLegacy() {
    if (typeof window === "undefined") return [];
    try {
        return JSON.parse(window.localStorage.getItem(VOUCHER_STORAGE_KEY) || "[]");
    } catch {
        return [];
    }
}

function writeLegacy(vouchers) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(VOUCHER_STORAGE_KEY, JSON.stringify(vouchers || []));
    } catch {}
}

function markMigrated() {
    if (typeof window === "undefined") return;
    try { window.localStorage.setItem(VOUCHER_MIGRATED_MARKER, "1"); } catch {}
}

/* قرار الترحيل الواحد من localStorage — لا إحياء لسندات قديمة بعد حذف القاعدة؛ الترحيل مسموح فقط حين تحوي القاعدة أعمالاً فعلية | Single migration decision from localStorage — never resurrect old vouchers after a DB wipe; migration is allowed only when the DB holds actual data */
export function resolveVoucherHydration({ legacy, fromDb, fromProducts, fromTransactions, migrated }) {
    const dbHasBusiness =
        (Array.isArray(fromProducts) && fromProducts.length > 0) ||
        (Array.isArray(fromTransactions) && fromTransactions.length > 0);

    if (!migrated && legacy.length && fromDb.length === 0 && dbHasBusiness) {
        return { list: legacy, shouldMigrate: true, markMigrated: true };
    }
    if (!migrated && legacy.length && fromDb.length === 0) {
        return { list: [], shouldMigrate: false, markMigrated: true };
    }
    return { list: fromDb, shouldMigrate: false, markMigrated: false };
}

/* يُستدعى مرة عند الإقلاع قبل أي قراءة UI؛ يقرأ السندات من القاعدة وينفّذ الترحيل الواحد مع حماية صارمة من إعادة إحياء البيانات | Called once at startup before any UI read; loads vouchers from the DB and runs the single migration with strict protection against data resurrection */
export async function loadVoucherCache() {
    const legacy = readLegacy();

    if (isFallbackMode()) {
        vouchersCache = legacy;
        return vouchersCache;
    }

    const migrated = (() => {
        if (typeof window === "undefined") return false;
        return window.localStorage.getItem(VOUCHER_MIGRATED_MARKER) === "1";
    })();

    try {
        const fromDb = (await idbGetAll(STORE_VOUCHERS)) || [];

        const decision = resolveVoucherHydration({
            legacy,
            fromDb,
            fromProducts: await idbGetAll(STORE_PRODUCTS),
            fromTransactions: await idbGetAll(STORE_TRANSACTIONS),
            migrated,
        });

        if (decision.shouldMigrate) {
            await Promise.all(legacy.map(v => idbPut(STORE_VOUCHERS, { ...v })));
            console.log(`[VOUCHERS] Migrated ${legacy.length} legacy voucher(s) into IndexedDB.`);
        } else if (legacy.length && fromDb.length === 0) {
            console.log("[VOUCHERS] Legacy vouchers are NOT re-imported (DB empty/wiped).");
        }

        vouchersCache = decision.list;
        if (decision.markMigrated) markMigrated();

        // في وضع IndexedDB المصدر هو القاعدة فقط؛ أي نسخة قديمة في localStorage تُمسح حتى لا يتسرب منها شيء لاحقاً | In IndexedDB mode the DB is the only source; any stale legacy copy in localStorage is wiped so nothing can leak into later reads
        writeLegacy([]);
        return vouchersCache;
    } catch (error) {
        console.warn("[VOUCHERS] loadVoucherCache error:", error);
        vouchersCache = [];
        return vouchersCache;
    }
}

function persistVouchers(vouchers) {
    if (isFallbackMode()) {
        writeLegacy(vouchers);
        return;
    }
    Promise.all((vouchers || []).map(v => idbPut(STORE_VOUCHERS, { ...v })))
        .catch(error => console.warn("[VOUCHERS] persist error:", error));
}

export function getAllVouchers() {
    if (!Array.isArray(vouchersCache)) {
        // قبل اكتمال الإقلاع أو في وضع fallback لا يُقرأ من localStorage المهجورة في وضع القاعدة — السلوك الآمن قائمة فارغة | Before startup completes or in fallback mode, never read the legacy localStorage used in DB mode — the safe behavior is an empty list
        vouchersCache = isFallbackMode() ? readLegacy() : [];
    }
    return vouchersCache;
}

export function setAllVouchers(vouchers) {
    vouchersCache = vouchers || [];
    persistVouchers(vouchersCache);
}

export function getVouchersForInvoice(invoiceKey, category) {
    return getAllVouchers().filter(
        v => v.invoiceKey === invoiceKey && v.invoiceCategory === category
    );
}

export function deleteVoucher(id) {
    const next = getAllVouchers().filter(v => v.id !== id);
    vouchersCache = next;

    if (isFallbackMode()) {
        writeLegacy(next);
        return;
    }

    idbDelete(STORE_VOUCHERS, id).catch(error =>
        console.warn("[VOUCHERS] delete error:", error)
    );
}