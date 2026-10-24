import { $  }          from "@/services/lib/utils.js";
import { voucherSortConfig } from "../state.js";
import { VOUCHER_COLUMN_SORT_KEYS } from "../constants.js";
import { renderVouchers } from "../components/voucher-panel.js";

/* يُضيف أحداث النقر لترتيب جداول السندات في لوحة التحكم | Adds click events to sort voucher tables in the dashboard */
export function setupInitialVoucherSort() {
  const setup = (tbodyId, type) => {
    $(tbodyId)?.closest('table')?.querySelectorAll('thead th').forEach((th, idx) => {
      const key = VOUCHER_COLUMN_SORT_KEYS[idx];
      if (!key) return;
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const c = voucherSortConfig[type];
        c.order = c.key === key ? (c.order === 'asc' ? 'desc' : 'asc') : 'desc';
        c.key   = key;
        renderVouchers();
      });
    });
  };
  setup('salesReceiptsTbody',   'receipts');
  setup('purchasePaymentsTbody','payments');
}