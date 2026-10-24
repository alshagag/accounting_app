import { normalizeTransactionType } from "@/services/lib/helpers.js";
import { getAllVouchers, getVoucherLineTotalValue, getTransactionTotal, getTransactionsSafe } from "@/features/documents/index.js";
import { track } from "@/services/analytics/gtag.js";

function updatePeriodProfitUI(netProfit) {
    const format = (val) => (val || 0).toFixed(2);
    const el = document.getElementById("periodProfitValue");
    if (el) el.textContent = format(netProfit);
}


async function calculateStats(fromDate = null, toDate = null) {
    const transactions = await getTransactionsSafe();
    const vouchers = getAllVouchers();

    let totalRevenue = 0;
    let totalCost = 0;

    // 1. معالجة معاملات المنتجات (مبيعات ومشتريات) | Process product-based transactions (sales and purchases)
    transactions.forEach(tx => {
        if (fromDate && toDate) {
            if (!tx.date || tx.date < fromDate || tx.date > toDate) {
                return; // خارج نطاق الفترة | Skip if outside date range
            }
        }
        const total = getTransactionTotal(tx);
        if (normalizeTransactionType(tx.type) === 'بيع') {
            totalRevenue += total;
        } else if (normalizeTransactionType(tx.type) === 'شراء') {
            totalCost += total;
        }
    });

    // 2. معالجة الإيرادات والمصاريف العامة من السندات | Process general income and expenses from vouchers
    vouchers.forEach(voucher => {
        if (fromDate && toDate) {
            if (!voucher.date || voucher.date < fromDate || voucher.date > toDate) {
                return; // خارج نطاق الفترة | Skip if outside date range
            }
        }

        const isReceipt = voucher.voucherType === 'قبض';
        const isPayment = voucher.voucherType === 'صرف';
        const isTaxExclusive = voucher.toggleStates?.taxInclusive;

        voucher.lines?.forEach(line => {
            // سطور القيود العامة (اليدوية) فقط دون سطور سداد فواتير عميل/مورد محدد — تجنبًا للازدواج | Only manual general-ledger lines, not specific invoice payments, to avoid double-counting
            if (line.accountType === 'manual') {
                const lineValue = getVoucherLineTotalValue(line, isTaxExclusive);
                if (isReceipt) {
                    totalRevenue += lineValue;
                } else if (isPayment) {
                    totalCost += lineValue;
                }
            }
        });
    });

    const netProfit = totalRevenue - totalCost;

    return { totalRevenue, totalCost, netProfit };
}

/* ================= أرباح فترة محددة | Period Profit ================= */
export async function calculatePeriodProfit() {
    const fromDate = document.getElementById("profitFromDate")?.value;
    const toDate = document.getElementById("profitToDate")?.value;

    if (!fromDate || !toDate) {
        // بلا فترة: عرض إجمالي الأرباح أيضًا في قسم الفترة | Without a period, show total profit in the period section too
        const { netProfit } = await calculateStats();
        updatePeriodProfitUI(netProfit);
        const infoEl = document.getElementById("periodInfo");
        if (infoEl) {
            infoEl.textContent = "عرض كامل البيانات (كل السنوات)";
        }
        return;
    }

    localStorage.setItem("profitFromDate", fromDate);
    localStorage.setItem("profitToDate", toDate);

    const infoEl = document.getElementById("periodInfo");
    if (infoEl) {
        infoEl.textContent = `صافي الربح من ${fromDate} إلى ${toDate}`;
    }

    const { netProfit } = await calculateStats(fromDate, toDate);
    updatePeriodProfitUI(netProfit);
}

/* ================= عرض كامل البيانات | Full Range Loader ================= */
async function loadFullProfit() {
    localStorage.removeItem("profitFromDate");
    localStorage.removeItem("profitToDate");
    document.getElementById("profitFromDate").value = "";
    document.getElementById("profitToDate").value = "";
    await calculatePeriodProfit();
}


/* ================= ربط الأحداث | Event Binding ================= */
function bindProfitCalculator() {
    const btn = document.getElementById("btnCalculatePeriodProfit");
    btn?.addEventListener("click", () => {
        track("report_view", { feature_name: "reports", page_name: "period_profit", action_type: "calculate" });
        calculatePeriodProfit();
    });

    document.getElementById("btnResetStats")?.addEventListener("click", loadFullProfit);

    // تحميل الفترة المحفوظة عند الإقلاع | Load saved range on startup
    const savedFrom = localStorage.getItem("profitFromDate");
    const savedTo = localStorage.getItem("profitToDate");
    if (savedFrom && savedTo) {
        document.getElementById("profitFromDate").value = savedFrom;
        document.getElementById("profitToDate").value = savedTo;
        calculatePeriodProfit();
    }
}

function init() {
    if (document.readyState === 'loading') {
        document.addEventListener("DOMContentLoaded", bindProfitCalculator);
    } else {
        bindProfitCalculator();
    }
}

init();