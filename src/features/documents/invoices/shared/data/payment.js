import { getVouchersForInvoice } from "../../vouchers/voucher-storage.js";
import { getDocumentMeta, saveDocumentMeta } from "./document-meta.js";

export function getInvoicePaymentStatusInfo(status) {
  const normalized = String(status || "غير مدفوعة").trim();
  if (normalized === "مدفوعة")                return { label: "مدفوعة", className: "badge text-bg-success" };
  if (normalized === "مدفوعة جزئيًا")         return { label: "مدفوعة جزئيًا", className: "badge text-bg-warning" };
  if (normalized === "دفعة زائدة") return { label: "دفعة زائدة", className: "badge text-bg-info" };
  return { label: "غير مدفوعة", className: "badge text-bg-danger" };
}

export function getInvoicePaymentSummary(documentData, vouchers = null) {
  const total = Number(documentData.total || 0);
  const voucherList = vouchers || getVouchersForInvoice(documentData.key, documentData.category);
  const paidAmount = voucherList.reduce((sum, v) => sum + Number(v.amount || 0), 0);

  /* الرصيد المستحق هو الفرق الحقيقي (إجمالي الفاتورة - إجمالي المدفوع) | The outstanding balance is the real difference (invoice total - paid total)
     وعندما يتجاوز المدفوع قيمة الفاتورة يكون الرصيد سالبًا وهو يمثل الفائض | when payments exceed the invoice total the balance turns negative and represents the surplus */
  let remainingBalance = Math.round((total - paidAmount) * 100) / 100;
  if (remainingBalance === 0) remainingBalance = 0; // تجنّب عرض "-0" | avoid displaying "-0"
  const surplus = Math.round(Math.max(0, paidAmount - total) * 100) / 100;

  let status = "غير مدفوعة";
  if (paidAmount > 0) {
    if (remainingBalance > 0)      status = "مدفوعة جزئيًا";
    else if (remainingBalance < 0) status = "دفعة زائدة";
    else                           status = "مدفوعة";
  }

  return { paidAmount, remainingBalance, status, surplus };
}

export function updateInvoicePaymentMeta(documentData, vouchers = null) {
  const existingMeta = getDocumentMeta(documentData.key, documentData.category) || {};
  const summary = getInvoicePaymentSummary(documentData, vouchers);
  saveDocumentMeta(documentData.key, documentData.category, {
    ...existingMeta,
    ...summary,
    status: summary.status
  });
  return summary;
}