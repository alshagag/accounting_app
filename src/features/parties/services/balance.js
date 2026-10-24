import { getAllTransactions } from "@/data/db/db.js";
import { getAllVouchers } from "@/features/documents/index.js";
import { normalizeTransactionType } from "@/services/lib/helpers.js";
import { getTransactionTotal } from "@/features/documents/index.js";
import { getMetaForTransaction } from "./transactions.js";

/* ================= خدمة رصيد الأطراف | Parties Balance Service ================= */
// حساب رصيد الطرف: تفضيل remainingBalance من الفواتير، وإلا الحساب من المعاملات والسندات | Calculate party balance: prefer invoice-based remainingBalance, else compute from transactions and vouchers
export async function calculatePartyBalance(party, invoices = null) {

    // المسار أ: استخدام قائمة الفواتير المبنية عند توفرها | Path A: use built invoices list when available
    if (invoices?.length) {
        const partyName = party.name.toLowerCase().trim();
        const partyInvoices = invoices.filter(
            inv => (inv.party || "").toLowerCase().trim() === partyName
        );
        const invoiced = partyInvoices.reduce((sum, inv) => sum + Number(inv.remainingBalance || 0), 0);

        /* مبلغ السند يُخصم من فاتورة فقط عند ربطه بها (getVouchersForInvoice يطابق invoiceKey + category)، وسند قبض/دفع مستقل بلا invoiceKey لا يظهر في أي remainingBalance فيبقى الطرف مديناً بالمبلغ كاملاً | A voucher is only subtracted from an invoice when linked to it (getVouchersForInvoice matches invoiceKey + category); a standalone receipt/payment voucher has no invoiceKey, so it never appears in any remainingBalance and the party stays owing the full amount
           تُخصم الدفعات غير المحتسبة داخل الفواتير دون ازدواج احتساب المحتسبة منها | Subtract payments not already counted inside the invoices, without double counting the ones that are */
        const countedInInvoices = new Set(partyInvoices.map(inv => `${inv.key}|${inv.category}`));
        const isAlreadyCounted = v => !!v.invoiceKey && countedInInvoices.has(`${v.invoiceKey}|${v.invoiceCategory}`);

        const paidOutsideInvoices = getAllVouchers()
            .filter(v => (v.party || "").toLowerCase().trim() === partyName)
            .filter(v => !isAlreadyCounted(v))
            .reduce((sum, v) => sum + Number(v.amount || 0), 0);

        return invoiced - paidOutsideInvoices;
    }

    // المسار ب: الحساب من المعاملات والسندات | Path B: compute from transactions and vouchers
    const allTransactions = await getAllTransactions();
    const allVouchers = getAllVouchers();
    const partyName = party.name.toLowerCase().trim();
    const partyPhone = (party.phone || "").trim();
    const isCustomer = party.type === "customers";

    // إجمالي الفواتير (بيع/شراء) | Total invoiced (sales/purchases)
    let totalInvoiced = 0;
    allTransactions.forEach(tx => {
        const meta = getMetaForTransaction(tx);
        const txName = (meta.party || (meta.partyPhone ? `عميل ${meta.partyPhone}` : null) || tx.customerName || tx.supplier || "").toLowerCase().trim();
        const txPhone = (meta.partyPhone || tx.customerPhone || "").trim();
        const matched = txName === partyName || (partyPhone && txPhone && txPhone === partyPhone);
        if (matched) totalInvoiced += getTransactionTotal(tx);
    });

    // إجمالي مبالغ السندات لهذا الطرف | Total vouchers amount for this party
    const totalPaid = allVouchers
        .filter(v => (v.party || "").toLowerCase().trim() === partyName)
        .reduce((sum, v) => sum + Number(v.amount || 0), 0);

    return totalInvoiced - totalPaid;
}