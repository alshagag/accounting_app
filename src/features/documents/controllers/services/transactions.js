import { getAllTransactions } from "@/data/db/db.js";
import { normalizeType } from "../utils/format.js";
import { getDocumentMeta } from "../../invoices/shared/data/document-meta.js";
import { getInvoicePaymentSummary } from "../../invoices/shared/data/payment.js";
import { getVouchersForInvoice } from "../../invoices/vouchers/voucher-storage.js";
import { getDefaultStoreInfo, getPersistedShowFooter } from "../../invoices/shared/data/store-info.js";
import { generateUniqueDocNo } from "../../invoices/shared/data/document-meta.js";

export function getTransactionTotal(transaction) {
    const quantity = Number(transaction.quantity ?? transaction.qty ?? 0);
    const price = Number(transaction.price || 0);
    return Number(transaction.total ?? (quantity * price));
}

export async function getTransactionsSafe() {
    try {
        return await getAllTransactions() || [];
    } catch (error) {
        console.error("getTransactionsSafe error:", error);
        return [];
    }
}

export function groupTransactions(transactions, type) {
    const groups = new Map();

    transactions
        .filter(tx => normalizeType(tx.type) === type)
        .forEach(tx => {
            const date = String(tx.date || "").slice(0, 10) || "بدون تاريخ";
            const key = `${type}-${date}`;

            if (!groups.has(key)) groups.set(key, { key, type, date, items: [], total: 0 });

            const group = groups.get(key);
            group.items.push(tx);
            group.total += getTransactionTotal(tx);
        });

    return [...groups.values()].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getInventoryMap() {
    const transactions = await getTransactionsSafe();
    const inventory = new Map();

    transactions.forEach(tx => {
        const product = String(tx.product || "").trim();
        if (!product) return;
        const quantity = Number(tx.quantity ?? tx.qty ?? 0) || 0;
        const type = normalizeType(tx.type);
        const current = Number(inventory.get(product) || 0);

        if (type === "شراء") inventory.set(product, current + quantity);
        else if (type === "بيع") inventory.set(product, current - quantity);
    });

    return inventory;
}

// ─── أدوات مساعدة يستخدمها toDocument | Helpers used by toDocument ───────────

function getPartyNameByPhone(phone) {
    if (!phone) return null;
    try {
        const parties = JSON.parse(localStorage.getItem("accountingParties") || "[]");
        const match = parties.find(p => p.phone?.trim() === phone.trim());
        return match ? match.name : null;
    } catch { return null; }
}

export function getDocumentParty(group) {
    if (group.type === "شراء") return group.items.find(i => i.supplier)?.supplier || "المورد";
    const phone = group.items.find(i => i.customerPhone)?.customerPhone || "";
    return phone ? `عميل ${phone}` : "العميل";
}

export function getDocumentPhone(group) {
    if (group.type !== "بيع") return "";
    return group.items.find(i => i.customerPhone)?.customerPhone || "";
}

export function toDocument(group, category, title) {
    const defaultCode = generateUniqueDocNo();
    const storeInfo = getDefaultStoreInfo();
    const itemCustomTitle = group.items?.find(i => i.customTitle)?.customTitle || "";
    const paymentSummary = getInvoicePaymentSummary(
        { key: group.key, category, total: Number(group.total || 0) },
        getVouchersForInvoice(group.key, category)
    );

    const phone = getDocumentPhone(group);
    const realNameFromPhone = getPartyNameByPhone(phone);
    const fallbackParty = getDocumentParty(group);

    // رقم مرجع العملية هو المفتاح الذي يستخدمه النموذج عند saveDocumentMeta | The transaction reference number is the key the form uses when calling saveDocumentMeta
    const firstItemRef = group.items?.map(i => i.ref || i.referenceNo).find(Boolean) || "";

    // البحث عن الميتا برقم المرجع أولاً ثم group.key كاحتياط للبيانات القديمة | Look up meta by ref number first, then group.key as fallback for legacy data
    const meta = getDocumentMeta(firstItemRef || group.key, category);

    const resolvedTitle = meta?.customTitle || itemCustomTitle || fallbackParty;

    // toggleStates هو المصدر الوحيد لإعدادات التبديل؛ تُشتق القيم بمطابقة اللاحقة لتعمل مع "toggle…" و"purchaseToggle…" | toggleStates is the single source of truth; values are derived by suffix-matching so both the "toggle…" and "purchaseToggle…" prefixes work
    const toggleStates = meta?.toggleStates || {};
    const hasToggle = (suffix) => {
        for (const k of Object.keys(toggleStates)) {
            if (k.endsWith(suffix)) return toggleStates[k];   // يُعيد القيمة المنطقية الفعلية | returns the actual boolean
        }
        return undefined;                                     // لم تُحفظ بعد | not saved yet
    };

    const bilingualSaved = hasToggle("Bilingual");
    const closedSaved = hasToggle("ClosedInvoice");
    const hidePaymentsSaved = hasToggle("HidePaymentsOnPrint");
    const showFooterSaved = hasToggle("ShowFooter");

    return {
        ...group,
        category,
        type: group.type,
        title,
        customTitle: resolvedTitle,
        customTitleEn: meta?.customTitleEn || "",
        shipping: meta?.shipping || 0,
        footer: meta?.footer || "",
        // تُفضَّل القيمة المحفوظة في toggleStates ثم حقول الميتا القديمة ثم الافتراضي العام | Prefer the value in toggleStates, then legacy meta fields, then the global default
        bilingual: bilingualSaved !== undefined ? Boolean(bilingualSaved) : (meta?.bilingual || false),
        hidePaymentsOnPrint: hidePaymentsSaved !== undefined ? Boolean(hidePaymentsSaved) : (meta?.hidePaymentsOnPrint || false),
        showFooter: showFooterSaved !== undefined ? Boolean(showFooterSaved) : (meta?.showFooter !== undefined ? Boolean(meta.showFooter) : getPersistedShowFooter()),
        closed: closedSaved !== undefined ? Boolean(closedSaved) : (meta?.closed || false),
        toggleStates,
        documentNo: meta?.code || firstItemRef || defaultCode,
        defaultCode,
        party: meta?.party || realNameFromPhone || fallbackParty,
        partyAddress: meta?.partyAddress || "",
        phone,
        notes: meta?.notes || "",
        storeName: meta?.storeName || storeInfo.storeName,
        storeAddress: meta?.storeAddress || storeInfo.storeAddress,
        storePhone: meta?.storePhone || storeInfo.storePhone,
        taxNumber: meta?.taxNumber || storeInfo.taxNumber,
        logoUrl: meta?.logoUrl || storeInfo.logoUrl,
        isCreated: Boolean(meta),
        issueDate: meta?.issueDate || group.date || "",
        dueDate: meta?.dueDate || "",
        paymentTermsType: meta?.paymentTermsType || "net",
        paymentDays: meta?.paymentDays || 0,
        referenceTicked: meta?.referenceTicked || false,
        referenceAutoLike: meta?.referenceAutoLike || false,
        shippingAddress: meta?.shippingAddress || "",
        paidAmount: paymentSummary.paidAmount,
        remainingBalance: paymentSummary.remainingBalance,
        status: paymentSummary.status   // حقل واحد فقط | single field only
    };
}