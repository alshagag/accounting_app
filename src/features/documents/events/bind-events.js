import { $  }           from "@/services/lib/utils.js";
import { getAllTransactions } from "@/data/db/db.js";
import { getAllVouchers, deleteVoucher } from "@/features/documents/invoices/vouchers/voucher-storage.js";
import { openDocumentDetails, fillDocumentEditor, saveDocumentEditor } from "@/features/documents/controllers/document-ui.js";
import { normalizeTransactionType } from "@/services/lib/helpers.js";
import { switchToVoucherTab } from "@/features/documents/invoices/table/rows.js";
import { latestDocuments, voucherSortConfig } from "../state.js";
import { findDocument }      from "../utils/find-document.js";
import { chainModals }       from "../utils/chain-modals.js";
import { printCurrentDocument, downloadPdfCurrentDocument } from "../invoices/vouchers/print.js";
import { openVoucherDetails, renderVouchers, sortVouchers } from "../components/voucher-panel.js";
import { openAllItemsModal } from "../components/modal-all-items.js";
import { renderDocuments }   from "../components/document-list.js";
import { updateDashboardStats } from "../components/dashboard.js";
import { setupInitialVoucherSort } from "./sort-setup.js";

export function initDocumentsModule() {
  bindDocumentEvents();
}

export function bindDocumentEvents() {
  setupInitialVoucherSort();

  $("btnSaveDocumentMeta")?.addEventListener("click", async () => {
    await saveDocumentEditor();
    await renderDocuments();
    await updateDashboardStats();
  });

  document.addEventListener("click", async event => {
    const t = event.target;

    /* ── مودال تفاصيل السند | Voucher details modal ── */
    const detailsModal = t.closest('#voucherDetailsModal');
    if (detailsModal) {
      const voucher = getAllVouchers().find(v => v.id === detailsModal.dataset.voucherId);
      if (!voucher) return;

      if (t.closest('#btnEditVoucherFromDetails'))  { chainModals(t, '#voucherDetailsModal', () => window.openVoucherModal(null, voucher.voucherType, voucher.id)); return; }
      if (t.closest('#btnCloneVoucherFromDetails')) { chainModals(t, '#voucherDetailsModal', () => window.openVoucherModal(null, voucher.voucherType, { ...voucher, id: null, referenceNo: null })); return; }
      if (t.closest('#btnPrintVoucherFromDetails')) {
        printCurrentDocument(null, voucher);
        return;
      }
      if (t.closest('#btnPdfVoucherFromDetails')) {
        downloadPdfCurrentDocument(null, voucher);
        return;
      }
    }

    /* ── أزرار "عرض الكل" | "Show All" buttons ── */
    if (t.closest('#btnShowAllSales'))     { openAllItemsModal('جميع فواتير البيع',   latestDocuments.salesInvoices    || [], 'salesInvoice');    return; }
    if (t.closest('#btnShowAllPurchases')) { openAllItemsModal('جميع فواتير الشراء', latestDocuments.purchaseInvoices || [], 'purchaseInvoice'); return; }
    if (t.closest('#btnShowAllReceipts'))  {
      openAllItemsModal('جميع سندات القبض', sortVouchers(getAllVouchers().filter(v => v.voucherType === "قبض"), voucherSortConfig.receipts.key, voucherSortConfig.receipts.order), 'receiptVoucher');
      return;
    }
    if (t.closest('#btnShowAllPayments')) {
      openAllItemsModal('جميع سندات الصرف', sortVouchers(getAllVouchers().filter(v => v.voucherType === "صرف"), voucherSortConfig.payments.key, voucherSortConfig.payments.order), 'paymentVoucher');
      return;
    }
        if (t.closest('#btnShowAllSalesOperations')) {
      const all = await getAllTransactions();
      openAllItemsModal('جميع عمليات البيع', all.filter(tx => normalizeTransactionType(tx.type) === "بيع"), 'salesTransaction');
      return;
    }
    if (t.closest('#btnShowAllPurchasesOperations')) {
      const all = await getAllTransactions();
      openAllItemsModal('جميع عمليات الشراء', all.filter(tx => normalizeTransactionType(tx.type) === "شراء"), 'purchaseTransaction');
      return;
    }

    /* ── إنشاء سند جديد | Create a new voucher ── */
    if (t.closest('#btnNewReceiptVoucher')) { window.openVoucherModal(null, "قبض"); return; }
    if (t.closest('#btnNewPaymentVoucher')) { window.openVoucherModal(null, "صرف"); return; }

    /* ── عرض / تعديل مستند | View / edit a document ── */
    const viewDocBtn = t.closest(".view-document, .view-purchase");
    if (viewDocBtn) {
      const doc = findDocument(viewDocBtn.dataset.key, viewDocBtn.dataset.category);
      if (doc) { const a = () => openDocumentDetails(doc); if (!chainModals(t, '#allItemsModal', a)) a(); }
      return;
    }
    const editDocBtn = t.closest(".edit-document, .edit-purchase");
    if (editDocBtn) {
      const doc = findDocument(editDocBtn.dataset.key, editDocBtn.dataset.category);
      if (doc) { const a = () => fillDocumentEditor(doc); if (!chainModals(t, '#allItemsModal', a)) a(); }
      return;
    }

    /* ── عرض / تعديل / حذف سند | View / edit / delete a voucher ── */
    const viewVoucherBtn = t.closest(".view-voucher");
    if (viewVoucherBtn) {
      const v = getAllVouchers().find(v => v.id === viewVoucherBtn.dataset.voucherId);
      if (v) { const a = () => openVoucherDetails(v); if (!chainModals(t, '#allItemsModal', a)) a(); }
      return;
    }
    const editVoucherBtn = t.closest(".edit-voucher");
    if (editVoucherBtn) {
      const v = getAllVouchers().find(v => v.id === editVoucherBtn.dataset.voucherId);
      if (!v) { window.showGlobalAlert?.("تعذر العثور على السند", "danger"); return; }
      const parent = v.invoiceKey ? findDocument(v.invoiceKey, v.invoiceCategory) : null;
      if (v.invoiceKey && !parent) { window.showGlobalAlert?.("تعذر العثور على الفاتورة الأصلية", "danger"); return; }
      const a = () => window.openVoucherModal(parent, v.voucherType, v.id);
      if (!chainModals(t, '#allItemsModal', a)) a();
      return;
    }
    const deleteVoucherBtn = t.closest('.delete-voucher');
    if (deleteVoucherBtn) {
      const confirmed = await window.confirmDelete?.({ title: "حذف السند", message: "هل تريد حذف هذا السند؟", confirmText: "حذف" });
      if (confirmed) { deleteVoucher(deleteVoucherBtn.dataset.voucherId); document.dispatchEvent(new CustomEvent('voucher-deleted', { detail: { voucherId: deleteVoucherBtn.dataset.voucherId } })); }
    }
  });

  /* ── أحداث حفظ / حذف السند | Voucher save/delete events ── */
  document.addEventListener('voucher-saved', async (e) => {
    await window.fullAppRefresh?.();
    const showParent = window.__onNextModalHidden;
    window.__onNextModalHidden = async () => {
      const fresh = getAllVouchers().find(v => v.id === e.detail.voucherId);
      if (!fresh) return;
      const detailsEl = $('voucherDetailsModal');
      if (showParent) detailsEl?.addEventListener('hidden.bs.modal', showParent, { once: true });
      openVoucherDetails(fresh);
      switchToVoucherTab(fresh.voucherType);
    };
  });

  document.addEventListener('voucher-deleted', async () => {
    await window.fullAppRefresh?.();
    const modal = $('allItemsModal');
    if (modal?.refreshData) {
      const type = modal.dataset.itemType;
      if (type === 'receiptVoucher' || type === 'paymentVoucher')
        modal.refreshData(getAllVouchers().filter(v => v.voucherType === (type === 'receiptVoucher' ? 'قبض' : 'صرف')));
    }
  });
}
