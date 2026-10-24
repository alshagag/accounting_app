import { $ } from "@/services/lib/utils.js";
import { escapeHtml } from "@/features/documents/controllers/utils/escape.js";
import { normalizeTransactionType } from "@/services/lib/helpers.js";
import { getInvoiceRowHtml, getVoucherRowHtml, sortItems } from "@/features/documents/invoices/table/rows.js";
import { allItemsSortConfig } from "../state.js";
import { VOUCHER_COLUMN_SORT_KEYS, INVOICE_COLUMN_SORT_KEYS, SALES_TRANSACTION_COLUMN_SORT_KEYS } from "../constants.js";

/* ── عرض صف العملية في نافذة عرض الكل | Transaction row in the "Show All" modal ── */
function renderTransactionRow(t) {
  const total = Number(t.total ?? Number(t.quantity) * Number(t.price));
  const isPurchase = (normalizeTransactionType(t.type) === "شراء");
  const txDate = t.date || '';
    const invoiceKey = t.ref || (isPurchase ? `شراء-${txDate}` : `بيع-${txDate}`);
  return `
    <tr>
      <td>
        <div class="d-flex gap-1 justify-content-center">
          <button class="btn btn-sm btn-outline-secondary full-edit-transaction" data-id="${t.id}" title="تعديل شامل">
            <i class="bi bi-pencil-square"></i>
          </button>
          <button class="btn btn-sm btn-outline-primary view-linked-invoice" data-invoice-key="${invoiceKey}" title="عرض الفاتورة المرتبطة">
            <i class="bi bi-receipt"></i>
          </button>
        </div>
      </td>
      <td>${escapeHtml(t.ref || '')}</td>
      <td>${escapeHtml(txDate)}</td>
      <td>${escapeHtml(t.product || '')}</td>
      <td class="text-end">${Number(t.quantity)}</td>
      <td class="text-end">${Number(t.price).toFixed(2)}</td>
      <td class="text-end">${total.toFixed(2)}</td>
    </tr>`;
}

const SORT_IND = '<i class="bi bi-sort-down sort-indicator"></i>';

/* ── إعدادات كل نوع عنصر | Per-item-type configs ── */
const MODAL_CONFIGS = {
    salesInvoice: {
        icon: 'bi-receipt', desc: 'إدارة جميع فواتير البيع.', btn: 'فاتورة بيع جديدة', btnId: 'btnNewSalesInvoiceInModal',
        headers: `<th style="width:110px">الإجراءات</th><th>تاريخ الإصدار ${SORT_IND}</th><th>المرجع ${SORT_IND}</th><th>العميل/المورد ${SORT_IND}</th><th>البيان ${SORT_IND}</th><th class="text-end">مبلغ الفاتورة ${SORT_IND}</th><th class="text-end">الرصيد المستحق ${SORT_IND}</th><th>الحالة</th>`,
        render: getInvoiceRowHtml, colspan: 8, sortKeys: INVOICE_COLUMN_SORT_KEYS
    },
    purchaseInvoice: {
        icon: 'bi-cart-check', desc: 'إدارة جميع فواتير الشراء.', btn: 'فاتورة شراء جديدة', btnId: 'btnNewPurchaseInvoiceInModal',
        headers: `<th style="width:110px">الإجراءات</th><th>تاريخ الإصدار ${SORT_IND}</th><th>المرجع ${SORT_IND}</th><th>العميل/المورد ${SORT_IND}</th><th>البيان ${SORT_IND}</th><th class="text-end">مبلغ الفاتورة ${SORT_IND}</th><th class="text-end">الرصيد المستحق ${SORT_IND}</th><th>الحالة</th>`,
        render: getInvoiceRowHtml, colspan: 8, sortKeys: INVOICE_COLUMN_SORT_KEYS
    },
    receiptVoucher: {
        icon: 'bi-cash-stack', desc: 'إدارة سندات القبض.', btn: 'سند قبض جديد', btnId: 'btnNewReceiptVoucherInModal',
        headers: `<th style="width:110px">الإجراءات</th><th>التاريخ ${SORT_IND}</th><th>المرجع ${SORT_IND}</th><th>حساب القبض ${SORT_IND}</th><th>البيان ${SORT_IND}</th><th>جهة الدفع ${SORT_IND}</th><th class="text-end">المبلغ ${SORT_IND}</th>`,
        render: getVoucherRowHtml, colspan: 7, sortKeys: VOUCHER_COLUMN_SORT_KEYS
    },
    paymentVoucher: {
        icon: 'bi-bank2', desc: 'إدارة سندات الصرف.', btn: 'سند صرف جديد', btnId: 'btnNewPaymentVoucherInModal',
        headers: `<th style="width:110px">الإجراءات</th><th>التاريخ ${SORT_IND}</th><th>المرجع ${SORT_IND}</th><th>مدفوع من ${SORT_IND}</th><th>البيان ${SORT_IND}</th><th>المستفيد ${SORT_IND}</th><th class="text-end">المبلغ ${SORT_IND}</th>`,
        render: getVoucherRowHtml, colspan: 7, sortKeys: VOUCHER_COLUMN_SORT_KEYS
    },
    salesTransaction: {
        icon: 'bi-graph-up', desc: 'عمليات البيع التفصيلية.', btn: '', btnId: '',
        headers: `<th style="width:110px">الإجراءات</th><th>المستند ${SORT_IND}</th><th>التاريخ ${SORT_IND}</th><th>المنتج ${SORT_IND}</th><th class="text-end">الكمية ${SORT_IND}</th><th class="text-end">السعر ${SORT_IND}</th><th class="text-end">الإجمالي ${SORT_IND}</th>`,
        render: renderTransactionRow, colspan: 7, sortKeys: SALES_TRANSACTION_COLUMN_SORT_KEYS
    },
    purchaseTransaction: {
        icon: 'bi-cart-check', desc: 'عمليات الشراء التفصيلية.', btn: '', btnId: '',
        headers: `<th style="width:110px">الإجراءات</th><th>المستند ${SORT_IND}</th><th>التاريخ ${SORT_IND}</th><th>المنتج ${SORT_IND}</th><th class="text-end">الكمية ${SORT_IND}</th><th class="text-end">السعر ${SORT_IND}</th><th class="text-end">الإجمالي ${SORT_IND}</th>`,
        render: renderTransactionRow, colspan: 7, sortKeys: SALES_TRANSACTION_COLUMN_SORT_KEYS
    }
};

function buildModalHeader(title, cfg) {
    return `
    <div class="page-header">
      <div class="page-title">
        <i class="bi ${cfg.icon} page-title-icon"></i>
        <div>
          <h4 class="mb-1">${escapeHtml(title)}</h4>
          <p class="text-muted mb-0 small">${escapeHtml(cfg.desc)}</p>
        </div>
      </div>
      ${cfg.btn ? `<div class="page-header-actions"><button id="${cfg.btnId}" class="btn btn-success btn-lg"><i class="bi bi-plus-lg me-2"></i>${escapeHtml(cfg.btn)}</button></div>` : ''}
    </div>
    <div class="page-toolbar">
      <div class="input-group search-bar">
        <input id="allItemsSearchInput" type="search" class="form-control" placeholder="ابحث في ${escapeHtml(title)}...">
        <button class="btn btn-outline-secondary" type="button"><i class="bi bi-search"></i></button>
      </div>
    </div>`;
}

export function openAllItemsModal(title, items = [], itemType, renderOverride = null) { // NOSONAR
    const modalEl = $('allItemsModal');
    if (!modalEl) { window.showGlobalAlert?.('خطأ: نافذة العرض غير موجودة.', 'danger'); return; }

    const cfg = MODAL_CONFIGS[itemType];
    if (!cfg) { window.showGlobalAlert?.('نوع عنصر غير معروف.', 'danger'); return; }

    const renderRow = renderOverride || cfg.render;
    modalEl.querySelector('.modal-dialog')?.classList.add('modal-xl');
    modalEl.dataset.itemType = itemType;

    const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
    const bodyEl = $('allItemsModalBody');
    if (!bodyEl) return;

    if ($('allItemsModalTitle')) $('allItemsModalTitle').textContent = title;

    /* ── حالة الترقيم | Pagination state ── */
    let currentPageSize = 10;
    let currentPage = 1;

    bodyEl.innerHTML = `
    ${buildModalHeader(title, cfg)}
    <div class="all-items-table-container table-responsive">
      <table class="table table-hover text-center mb-0 all-items-table">
        <thead><tr>${cfg.headers}</tr></thead>
        <tbody id="allItemsModalTbody"></tbody>
      </table>
    </div>
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 px-3 py-2">
      <div class="d-flex align-items-center gap-2">
        <span id="allItemsTotalCount" class="text-muted small fw-semibold"></span>
        <label class="text-muted small mb-0">عرض</label>
        <select id="allItemsPageSize" class="form-select form-select-sm" style="width:auto;">
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="30">30</option>
          <option value="50">50</option>
          <option value="100">100</option>
          <option value="200">200</option>
        </select>
        <label class="text-muted small mb-0">سجلًا في الصفحة</label>
      </div>
      <div id="allItemsPaginationControls" class="d-flex align-items-center gap-2"></div>
    </div>`;

    const tbody = $('allItemsModalTbody');
    const searchInput = $('allItemsSearchInput');
    const table = bodyEl.querySelector('.all-items-table');
    const pageSizeSelect = $('allItemsPageSize');
    const paginationControls = $('allItemsPaginationControls');

    function getFilteredSorted() {
        const term = searchInput.value.toLowerCase().trim();
        const filtered = !term ? items : items.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(term)));
        const c = allItemsSortConfig[itemType];
        return sortItems(filtered, c.key, c.order);
    }

    function updatePagination(totalCount) {
        const totalPages = Math.max(1, Math.ceil(totalCount / currentPageSize));
        if (currentPage > totalPages) currentPage = totalPages;

        const prevDisabled = currentPage === 1 ? 'disabled' : '';
        const nextDisabled = currentPage === totalPages ? 'disabled' : '';
        const firstRecord = totalCount ? (currentPage - 1) * currentPageSize + 1 : 0;
        const lastRecord = Math.min(currentPage * currentPageSize, totalCount);
        paginationControls.innerHTML = `
          <button type="button" class="btn btn-sm btn-outline-secondary" id="allItemsFirstPage" ${prevDisabled}>الأولى</button>
          <button type="button" class="btn btn-sm btn-outline-secondary" id="allItemsPrevPage" ${prevDisabled}>
            السابقة
          </button>
          <span class="text-muted small">صفحة ${currentPage} / ${totalPages} · يعرض ${firstRecord}–${lastRecord} من ${totalCount}</span>
          <button type="button" class="btn btn-sm btn-outline-secondary" id="allItemsNextPage" ${nextDisabled}>
            التالية
          </button>
          <button type="button" class="btn btn-sm btn-outline-secondary" id="allItemsLastPage" ${nextDisabled}>الأخيرة</button>`;

        $('allItemsFirstPage')?.addEventListener('click', () => { currentPage = 1; renderPage(); });
        $('allItemsPrevPage')?.addEventListener('click', () => { if (currentPage > 1) { currentPage--; renderPage(); } });
        $('allItemsNextPage')?.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; renderPage(); } });
        $('allItemsLastPage')?.addEventListener('click', () => { currentPage = totalPages; renderPage(); });
    }

    function render(list) {
        const total = list.length;
        const start = (currentPage - 1) * currentPageSize;
        const pageItems = list.slice(start, start + currentPageSize);

        tbody.innerHTML = pageItems.length
            ? pageItems.map(renderRow).join('')
            : `<tr><td colspan="${cfg.colspan}" class="text-center p-3 text-muted">لا توجد نتائج.</td></tr>`;

        const countEl = $('allItemsTotalCount');
        if (countEl) countEl.textContent = total ? `عدد العمليات: ${total}` : '';
        updatePagination(total);
    }

    function renderPage() { render(getFilteredSorted()); }

    function updateSortHeaders() {
        table.querySelectorAll('thead th').forEach((th, idx) => {
            const key = cfg.sortKeys[idx];
            let icon = th.querySelector('i.sort-indicator');
            if (!key) { icon?.remove(); return; }
            if (!icon) { th.insertAdjacentHTML('beforeend', ' <i class="bi bi-sort-down sort-indicator"></i>'); icon = th.querySelector('i.sort-indicator'); }
            const c = allItemsSortConfig[itemType];
            icon.className = `bi sort-indicator ${c.key === key ? (c.order === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-sort-down'}`;
        });
    }

    modalEl.refreshData = (newItems) => { items = newItems; currentPage = 1; renderPage(); };

    table.querySelectorAll('thead th').forEach((th, idx) => {
        const key = cfg.sortKeys[idx];
        if (!key) return;
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
            const c = allItemsSortConfig[itemType];
            c.order = c.key === key ? (c.order === 'asc' ? 'desc' : 'asc') : 'desc';
            c.key = key;
            renderPage();
            updateSortHeaders();
        });
    });

    searchInput.addEventListener('input', () => { currentPage = 1; renderPage(); });
    pageSizeSelect?.addEventListener('change', () => {
        currentPageSize = Number(pageSizeSelect.value) || 10;
        currentPage = 1;
        renderPage();
    });
    renderPage();
    updateSortHeaders();

    // أزرار الإنشاء | Create buttons
    $('btnNewSalesInvoiceInModal')?.addEventListener('click', () => { modal.hide(); setTimeout(() => document.querySelector('.create-document[data-doc-kind="salesInvoices"]')?.click(), 200); });
    $('btnNewPurchaseInvoiceInModal')?.addEventListener('click', () => { modal.hide(); setTimeout(() => document.querySelector('.create-document[data-doc-kind="purchaseInvoices"]')?.click(), 200); });
    $('btnNewReceiptVoucherInModal')?.addEventListener('click', () => { modal.hide(); setTimeout(() => window.openVoucherModal(null, "قبض"), 200); });
    $('btnNewPaymentVoucherInModal')?.addEventListener('click', () => { modal.hide(); modal.addEventListener('hidden.bs.modal', () => window.openVoucherModal(null, "صرف"), { once: true }); });

    modal.show();
}
