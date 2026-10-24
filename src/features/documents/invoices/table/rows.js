import { escapeHtml, escapeAttr } from "../../controllers/utils/escape.js";
import { formatMoney } from "../../controllers/utils/format.js";
import { getInvoicePaymentStatusInfo } from "../shared/data/payment.js";

export function getInvoiceRowHtml(doc) {
  const statusInfo = getInvoicePaymentStatusInfo(doc.status || 'unpaid');
  // تحديد الكلاسات الصحيحة بناءً على فئة المستند | Pick the right classes based on document category
  // فواتير الشراء تتطلب كلاسات مخصصة (`view-purchase`, `edit-purchase`) لتشغيل معالجات الأحداث الخاصة بها | Purchase invoices need custom classes (`view-purchase`, `edit-purchase`) to drive their event handlers
  const isPurchase = doc.category === 'purchaseInvoices';
  const viewClass = isPurchase ? 'view-purchase view-document' : 'view-document';
  const editClass = isPurchase ? 'edit-purchase edit-document' : 'edit-document';

  return `
    <tr data-key="${escapeAttr(doc.key)}" data-category="${escapeAttr(doc.category)}">
      <td>
        <div class="d-flex gap-1 justify-content-center">
          <button class="btn btn-sm btn-outline-primary ${viewClass}" data-key="${escapeAttr(doc.key)}" data-category="${escapeAttr(doc.category)}" title="عرض">
            <i class="bi bi-eye"></i>
          </button>
          <button class="btn btn-sm btn-outline-warning ${editClass}" data-key="${escapeAttr(doc.key)}" data-category="${escapeAttr(doc.category)}" title="${doc.isCreated ? 'تعديل' : 'إنشاء'}">
            <i class="bi bi-pencil-square"></i>
          </button>
        </div>
      </td>
      <td>${escapeHtml(doc.issueDate || doc.date || '')}</td>
      <td>${escapeHtml(doc.documentNo || '')}</td>
      <td>${escapeHtml(doc.party || '')}</td>
      <td>${escapeHtml(doc.title || '')}</td>
      <td class="text-end">${formatMoney(doc.total || 0)}</td>
      <td class="text-end">${formatMoney(doc.remainingBalance || 0)}</td>
      <td><span class="${statusInfo.className}">${escapeHtml(statusInfo.label)}</span></td>
    </tr>`;
}

export function getVoucherRowHtml(voucher) {
  const accountDisplay = voucher.account || (voucher.accountType === 'cash' ? 'نقدي' : (voucher.accountType === 'bank' ? 'بنك' : ''));
  return `
    <tr data-id="${escapeAttr(voucher.id)}">
      <td>
        <div class="d-flex gap-1 justify-content-center">
          <button class="btn btn-sm btn-outline-primary view-voucher" data-voucher-id="${escapeAttr(voucher.id)}" data-invoice-key="${escapeAttr(voucher.invoiceKey || '')}" data-invoice-category="${escapeAttr(voucher.invoiceCategory || '')}" title="عرض">
            <i class="bi bi-eye"></i>
          </button>

          <button class="btn btn-sm btn-outline-warning edit-voucher" data-voucher-id="${escapeAttr(voucher.id)}" data-invoice-key="${escapeAttr(voucher.invoiceKey || '')}" data-invoice-category="${escapeAttr(voucher.invoiceCategory || '')}" title="تعديل">
            <i class="bi bi-pencil-square"></i>
          </button>
        </div>
      </td>
      <td>${escapeHtml(voucher.date || '')}</td>
      <td>${escapeHtml(voucher.referenceNo || '')}</td>
      <td>${escapeHtml(accountDisplay)}</td>
      <td>${escapeHtml(voucher.description || '')}</td>
      <td>${escapeHtml(voucher.party || '')}</td>
      <td class="fw-bold text-end">${formatMoney(voucher.amount || 0)}</td>
    </tr>`;
}

export function sortItems(items, key, order) {
  const dir = order === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    let va = a[key], vb = b[key];
    if (["total", "remainingBalance", "amount", "price", "quantity"].includes(key)) {
      return (Number(va || 0) - Number(vb || 0)) * dir;
    }
    if (key.toLowerCase().includes("date")) {
      const da = va ? new Date(va) : 0, db = vb ? new Date(vb) : 0;
      if (isNaN(da)) return dir;
      if (isNaN(db)) return -dir;
      return (da - db) * dir;
    }
    return String(va || "").toLowerCase().localeCompare(String(vb || "").toLowerCase()) * dir;
  });
}

export function switchToVoucherTab(voucherType) {
  if (typeof window === 'undefined' || !window.bootstrap) return;
  const isReceipt = voucherType === "قبض";
  const mainTarget = isReceipt ? "#salesTab"     : "#purchasesTab";
  const subTarget  = isReceipt ? "#salesReceiptsSubTab" : "#purchasePaymentsSubTab";
  try {
    const mainBtn = document.querySelector(`button[data-bs-target="${mainTarget}"]`);
    if (mainBtn) new window.bootstrap.Tab(mainBtn).show();
    setTimeout(() => {
      const subBtn = document.querySelector(`button[data-bs-target="${subTarget}"]`);
      if (subBtn) new window.bootstrap.Tab(subBtn).show();
    }, 50);
  } catch {}
}