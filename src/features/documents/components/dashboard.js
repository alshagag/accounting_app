import { $  }          from "@/services/lib/utils.js";
import { getAllTransactions } from "@/data/db/db.js";
import { getAllVouchers }     from "@/features/documents/invoices/vouchers/voucher-storage.js";
import { normalizeTransactionType } from "@/services/lib/helpers.js";

/* يحسب الإجماليات نقدياً (السندات) وكميات المعاملات ويحدّث DOM مباشرة | Computes cash totals (vouchers) and transaction quantities, updating the DOM directly */
export async function updateDashboardStats(transactions, vouchers) {
  if (!transactions) transactions = await getAllTransactions();
  if (!vouchers)     vouchers     = getAllVouchers();

  const totalReceipts = vouchers.filter(v => v.voucherType === "قبض").reduce((s, v) => s + (Number(v.amount) || 0), 0);
  const totalPayments = vouchers.filter(v => v.voucherType === "صرف").reduce((s, v) => s + (Number(v.amount) || 0), 0);

  let salesQty = 0, purchasesQty = 0;
  for (const tx of transactions || []) {
    const type = normalizeTransactionType(tx.type);
    if      (type === 'بيع')  salesQty     += Number(tx.quantity || 0);
    else if (type === 'شراء') purchasesQty += Number(tx.quantity || 0);
  }

  const allOps = [
    ...transactions.map(t => ({ ...t, sortKey: t.id, opType: 'transaction' })),
    ...vouchers.map(v =>     ({ ...v, sortKey: v.id, opType: 'voucher'     }))
  ].sort((a, b) => (b.sortKey || 0) - (a.sortKey || 0));

  const lastOp   = allOps[0];
  const lastText = !lastOp ? "-"
    : lastOp.opType === 'transaction' ? `${normalizeTransactionType(lastOp.type)} - ${lastOp.product || ""}`
    : `سند ${lastOp.voucherType} - ${lastOp.party || ""}`;

  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  set("statSales",       totalReceipts.toFixed(2));
  set("statPurchases",   totalPayments.toFixed(2));
  set("statProfit",      (totalReceipts - totalPayments).toFixed(2));
  set("lastTransaction", lastText);
  set("totalSales",      salesQty);
  set("totalPurchases",  purchasesQty);
}