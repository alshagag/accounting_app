import { getAllTransactions }    from "@/data/db/db.js";
import { getAllVouchers }        from "@/features/documents/index.js";
import { normalizeTransactionType } from "@/services/lib/helpers.js";
import { getTransactionTotal }  from "@/features/documents/index.js";
import { getMetaForTransaction } from "./transactions.js";

/* ================= خدمة كشف طرف | Party Statement Service ================= */
// بناء كشف مرتّب (فواتير + سندات) برصيد تراكمي لكل حركة | Build an ordered statement (invoices + vouchers) with running balance per entry
export async function buildPartyStatement(party) {
  const allTransactions = await getAllTransactions();
  const allVouchers     = getAllVouchers();
  const isCustomer      = party.type === "customers";
  const partyName       = party.name.toLowerCase().trim();
  const partyPhone      = (party.phone || "").trim();
  const entries         = [];

  // الفواتير من latestDocuments (تحتوي documentNo جاهزاً) | Invoices from latestDocuments (contain ready documentNo)
  const docs     = window.latestDocuments || {};
  const invoices = isCustomer
    ? (docs.salesInvoices    || [])
    : (docs.purchaseInvoices || []);

  invoices
    .filter(inv => (inv.party || "").toLowerCase().trim() === partyName)
    .forEach(inv => {
      const total = Number(inv.total || 0);
      entries.push({
        date:        inv.issueDate || inv.date || "",
        type:        isCustomer ? "فاتورة بيع" : "فاتورة شراء",
        docNo:       inv.documentNo || inv.defaultCode || "-",
        docKey:      inv.key,
        docCategory: inv.category,
        docKind:     "invoice",
        debit:       total,
        credit:      0
      });
    });

  // سندات القبض والصرف | Receipts and payments (vouchers)
  allVouchers
    .filter(v => (v.party || "").toLowerCase().trim() === partyName)
    .forEach(v => {
      const amount   = Number(v.amount || 0);
      const isReceipt= v.voucherType === "قبض";
      entries.push({
        date:        v.date || "",
        type:        isReceipt ? "سند قبض" : "سند صرف",
        docNo:       v.referenceNo || v.id || "-",
        docKey:      v.id,
        docCategory: null,
        docKind:     "voucher",
        debit:       0,
        credit:      amount
      });
    });

  // احتياطي: معاملات بلا فاتورة مبنية | Fallback: transactions that don't have a built invoice
  const builtKeys = new Set(invoices.map(i => i.key));
  allTransactions
    .filter(tx => {
      const meta     = getMetaForTransaction(tx);
      const txName   = (meta.party || (meta.partyPhone ? `عميل ${meta.partyPhone}` : null) || tx.customerName || tx.supplier || "").toLowerCase().trim();
      const txPhone  = (meta.partyPhone || tx.customerPhone || "").trim();
      const type     = normalizeTransactionType(tx.type);
      const typeOk   = isCustomer ? type === "بيع" : type === "شراء";
      const matched  = txName === partyName || (partyPhone && txPhone && txPhone === partyPhone);
      const txDate   = String(tx.date || "").slice(0, 10);
      const txKey    = `${type}-${txDate}`;
      return typeOk && matched && !builtKeys.has(txKey);
    })
    .forEach(tx => {
      const meta   = getMetaForTransaction(tx);
      const total  = getTransactionTotal(tx);
      const txDate = String(tx.date || "").slice(0, 10);
      const type   = normalizeTransactionType(tx.type);
      entries.push({
        date:        txDate,
        type:        isCustomer ? "فاتورة بيع" : "فاتورة شراء",
        docNo:       meta.code || tx.ref || "-",
        docKey:      `${type}-${txDate}`,
        docCategory: "invoice",
        docKind:     "invoice",
        debit:       total,
        credit:      0
      });
    });

  // الترتيب بالتاريخ وحساب الرصيد التراكمي | Sort by date and compute running balance
  entries.sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  let running = 0;
  return entries.map(e => {
    running += e.debit - e.credit;
    return { ...e, balance: running };
  });
}