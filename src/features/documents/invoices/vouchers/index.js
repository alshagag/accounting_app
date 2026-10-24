export { getAllVouchers, setAllVouchers, getVouchersForInvoice, deleteVoucher } from "./voucher-storage.js";
export { getTransactionTotal, getTransactionsSafe } from "../../controllers/services/transactions.js";
export { saveDocumentMeta, generateUniqueDocNo } from "@/features/documents/invoices/shared/data/document-meta.js";
export { getTaxCodes } from "@/features/documents/controllers/services/tax-codes.js";

export function getVoucherLineTotalValue(line, isTaxInclusive) {
    const qty = Number(line.quantity || 1);
    const amt = Number(line.amount || 0);
    const discountRaw = Number(line.discount || 0);
    const discountType = line.discountType || "fixed";
    const taxRate = Number(line.taxRate || 0);

    const priceBeforeDiscount = qty * amt;
    const discountVal = discountType === "percent" ? priceBeforeDiscount * (discountRaw / 100) : discountRaw;
    const afterDiscount = Math.max(0, priceBeforeDiscount - discountVal);

    if (taxRate > 0) {
        if (isTaxInclusive) {
            // afterDiscount هو الإجمالي شامل الضريبة وتُعاد قيمته | 'afterDiscount' is the total inclusive of tax; the function should return this total
            return afterDiscount;
        } else {
            // afterDiscount هو المجموع الفرعي ويجب إضافة الضريبة إليه | 'afterDiscount' is the subtotal; we need to add tax to it
            const taxVal = afterDiscount * (taxRate / 100);
            return afterDiscount + taxVal;
        }
    }

    return afterDiscount;
}
