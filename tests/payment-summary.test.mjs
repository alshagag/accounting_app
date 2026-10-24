// اختبار: رصيد الفاتورة المتبقي يجب أن يعكس الفرق الحقيقي بين إجمالي الفاتورة وإجمالي كل السندات المرتبطة | Test: an invoice's remaining balance must reflect the TRUE difference between the invoice total and the total of ALL linked vouchers.
// عند زيادة المدفوع عن الإجمالي يبقى الرصيد المتبقي سالبًا (= الفائض/surplus) ولا يُقيَّد بصفر ولا يُخفى خلف Math.max(0, ...) | When paid > total the remaining balance stays NEGATIVE (= surplus) and is never clamped to 0 or hidden behind Math.max(0, ...).
//
//   node tests/payment-summary.test.mjs

import assert from "node:assert/strict";
import { register } from "node:module";

register("./alias-loader.mjs", new URL(".", import.meta.url).href);

/* ── بدائل متصفح مصغّرة | Minimal browser stubs ── */
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
};
globalThis.window = globalThis;

const { getInvoicePaymentSummary, getInvoicePaymentStatusInfo } = await import(
  "@/features/documents/invoices/shared/data/payment.js"
);
const {
  setAllVouchers,
  getAllVouchers,
  getVouchersForInvoice,
  deleteVoucher,
} = await import("@/features/documents/invoices/vouchers/voucher-storage.js");

const INVOICE = { key: "بيع-2026-01-01", category: "invoice", total: 100 };

function voucher(amount) {
  return {
    id: "v-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6),
    voucherType: "قبض",
    invoiceKey: INVOICE.key,
    invoiceCategory: "invoice",
    amount,
  };
}

function check(expected, paidVouchers) {
  const summary = getInvoicePaymentSummary(INVOICE, paidVouchers);
  assert.equal(summary.paidAmount, expected.paid, "paidAmount");
  assert.equal(summary.remainingBalance, expected.remaining, "remainingBalance");
  assert.equal(summary.surplus, expected.surplus ?? 0, "surplus");
  assert.equal(summary.status, expected.status, "status");
  return summary;
}

/* فاتورة 100 / مدفوع 0 ← مستحق 100 | invoice 100 / paid 0 → due 100 */
check({ paid: 0, remaining: 100, surplus: 0, status: "غير مدفوعة" }, []);

/* فاتورة 100 / مدفوع 50 ← مستحق 50 | invoice 100 / paid 50 → due 50 */
check({ paid: 50, remaining: 50, surplus: 0, status: "مدفوعة جزئيًا" }, [voucher(50)]);

/* فاتورة 100 / مدفوع 100 ← مستحق 0 | invoice 100 / paid 100 → due 0 */
check({ paid: 100, remaining: 0, surplus: 0, status: "مدفوعة" }, [voucher(100)]);

/* فاتورة 100 / مدفوع 103 ← مستحق -3 / فائض 3 | invoice 100 / paid 103 → due -3 / surplus 3 */
check({ paid: 103, remaining: -3, surplus: 3, status: "دفعة زائدة" }, [voucher(103)]);

/* فاتورة 100 بسندين: 60 + 43 = 103 ← إجمالي المدفوع 103 ← مستحق -3 | invoice 100 with two vouchers: 60 + 43 = 103 → paid total 103 → due -3 */
check(
  { paid: 103, remaining: -3, surplus: 3, status: "دفعة زائدة" },
  [voucher(60), voucher(43)]
);

/* فاتورة 100 بسندين: 40 + 20 = 60 ← مستحق 40 | invoice 100 with two vouchers: 40 + 20 = 60 → due 40 */
check(
  { paid: 60, remaining: 40, surplus: 0, status: "مدفوعة جزئيًا" },
  [voucher(40), voucher(20)]
);

/* حالة الفائض لها شارة عرض مناسبة | the surplus status maps to a suitable display badge */
const surplusInfo = getInvoicePaymentStatusInfo("دفعة زائدة");
assert.equal(surplusInfo.label, "دفعة زائدة", "surplus status label");
assert.ok(surplusInfo.className.includes("badge"), "surplus status maps to a badge");

/* ── إعادة الحساب عند حذف/تعديل سند | Recompute on voucher delete/edit ──
   فاتورة 100: سند 60 ثم سند 43 ← إجمالي 103 ← مستحق -3 | invoice 100: voucher 60 then voucher 43 → total 103 → due -3.
   حذف سند 43 ← المدفوع 60 ← مستحق 40. تعديل سند 60 إلى 100 ← مستحق 0 | delete voucher 43 → paid 60 → due 40. Edit voucher 60 to 100 → due 0. */
const v60 = voucher(60);
const v43 = voucher(43);
setAllVouchers([v60, v43]);

assert.equal(getInvoicePaymentSummary(INVOICE).remainingBalance, -3, "both vouchers → -3");
assert.equal(getInvoicePaymentSummary(INVOICE).status, "دفعة زائدة");

deleteVoucher(v43.id);
assert.equal(getInvoicePaymentSummary(INVOICE).remainingBalance, 40, "after deleting 43 → 40");
assert.equal(getInvoicePaymentSummary(INVOICE).status, "مدفوعة جزئيًا");

setAllVouchers(getAllVouchers().map(v => (v.id === v60.id ? { ...v, amount: 100 } : v)));
assert.equal(getInvoicePaymentSummary(INVOICE).remainingBalance, 0, "after editing 60→100 → 0");
assert.equal(getInvoicePaymentSummary(INVOICE).status, "مدفوعة");

setAllVouchers([]);
assert.equal(getInvoicePaymentSummary(INVOICE).remainingBalance, 100, "no vouchers → 100");
assert.equal(getInvoicePaymentSummary(INVOICE).status, "غير مدفوعة");

/* ── الدمج الكامل عبر toDocument (ما تعرضه الجداول فعليًا) | Full merge through toDocument (what the tables actually render) ── */
const { toDocument } = await import("@/features/documents/controllers/services/transactions.js");
const group = {
  key: INVOICE.key,
  type: "بيع",
  date: "2026-01-01",
  items: [{ quantity: 1, price: 100, customerPhone: "123" }],
  total: 100,
};
setAllVouchers([voucher(60), voucher(43)]);
const doc = toDocument(group, "invoice", "فاتورة بيع");
assert.equal(doc.remainingBalance, -3, "toDocument remainingBalance");
assert.equal(doc.status, "دفعة زائدة", "toDocument status");
assert.equal(getVouchersForInvoice(INVOICE.key, "invoice").length, 2, "vouchers still linked");

console.log("PASS: payment summary — overpayment keeps a negative remaining balance (surplus)");
