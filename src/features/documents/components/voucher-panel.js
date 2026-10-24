import { $  }          from "@/services/lib/utils.js";
import { escapeHtml }  from "@/features/documents/controllers/utils/escape.js";
import { formatMoney } from "@/features/documents/controllers/utils/format.js";
import { getAllVouchers } from "@/features/documents/invoices/vouchers/voucher-storage.js";
import { buildVoucherHtml } from "@/features/documents/invoices/vouchers/voucher-html.js";
import { getVoucherRowHtml } from "@/features/documents/invoices/table/rows.js";
import { voucherSortConfig } from "../state.js";
import { VOUCHER_COLUMN_SORT_KEYS } from "../constants.js";
import { renderLimitedRows } from "./table-renderer.js";

/* ── ترتيب السندات | Sort vouchers ── */
export function sortVouchers(vouchers, key, order) {
  const dir = order === 'asc' ? 1 : -1;
  return [...vouchers].sort((a, b) => {
    if (key === 'amount') return (Number(a.amount || 0) - Number(b.amount || 0)) * dir;
    if (key === 'account') {
      const str = v => String(v.account || (v.accountType === 'cash' ? 'نقدي' : 'بنك')).toLowerCase();
      return str(a).localeCompare(str(b)) * dir;
    }
    return String(a[key] || '').toLowerCase().localeCompare(String(b[key] || '').toLowerCase()) * dir;
  });
}

/* ── تفاصيل سند | Voucher details ── */
export function openVoucherDetails(voucher) {
  if (!voucher) return;
  const modalEl = $('voucherDetailsModal');
  if (!modalEl) return;

  $('voucherDetailsTitle').textContent = `تفاصيل سند ${voucher.voucherType} رقم ${voucher.referenceNo || ''}`;
  $('voucherDetailsBody').innerHTML    = buildVoucherHtml(voucher);
  modalEl.dataset.voucherId            = voucher.id;

  const whatsappLink = $('whatsappLinkVoucherFromDetails');
  if (whatsappLink) {
    const msg = `مرحباً،\nإليك تفاصيل سند ${voucher.voucherType} رقم ${voucher.referenceNo || ''}:\n\nالمبلغ: ${formatMoney(voucher.amount)}\nالبيان: ${voucher.description || '-'}\nالتاريخ: ${voucher.date}`;
    whatsappLink.href = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }

  bootstrap.Modal.getOrCreateInstance(modalEl).show();
}

/* ── تحديث جداول السندات في لوحة التحكم | Refresh voucher tables in the dashboard ── */
export function renderVouchers() {
  const all      = getAllVouchers();
  const receipts = sortVouchers(all.filter(v => v.voucherType === "قبض"), voucherSortConfig.receipts.key, voucherSortConfig.receipts.order);
  const payments = sortVouchers(all.filter(v => v.voucherType === "صرف"), voucherSortConfig.payments.key, voucherSortConfig.payments.order);

  renderLimitedRows('salesReceiptsTbody',   receipts, getVoucherRowHtml, { limit: 5, emptyMessage: 'لا توجد سندات قبض', colspan: 7 });
  renderLimitedRows('purchasePaymentsTbody',payments, getVoucherRowHtml, { limit: 5, emptyMessage: 'لا توجد سندات صرف', colspan: 7 });

  const updateBadge = (target, count) => {
    const btn = document.querySelector(`[data-bs-target="${target}"]`);
    if (!btn) return;
    let badge = btn.querySelector('.ops-count-badge');
    if (!badge) { badge = document.createElement('span'); badge.className = 'badge bg-secondary rounded-pill ops-count-badge ms-1'; btn.appendChild(badge); }
    badge.textContent = count;
  };
  updateBadge('#salesReceiptsSubTab',   receipts.length);
  updateBadge('#purchasePaymentsSubTab', payments.length);

  updateVoucherSortHeaders();
}

/* ── أيقونات الترتيب في رأس الجدول | Sort icons in the table header ── */
export function updateVoucherSortHeaders() {
  const update = (tbodyId, type) => {
    const table = $(tbodyId)?.closest('table');
    if (!table) return;
    table.querySelectorAll('thead th').forEach((th, idx) => {
      const key  = VOUCHER_COLUMN_SORT_KEYS[idx];
      let   icon = th.querySelector('i.sort-indicator');
      if (!key) { icon?.remove(); return; }
      if (!icon) { th.insertAdjacentHTML('beforeend', ' <i class="bi bi-sort-down sort-indicator"></i>'); icon = th.querySelector('i.sort-indicator'); }
      const active = voucherSortConfig[type].key === key;
      icon.className = `bi sort-indicator ${active ? (voucherSortConfig[type].order === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-sort-down'}`;
    });
  };
  update('salesReceiptsTbody',   'receipts');
  update('purchasePaymentsTbody','payments');
}