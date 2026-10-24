/**
 * index.js — re-exports everything for backward compatibility.
 * Import from here or directly from sub-modules.
 */

// أدوات | utils
export { escapeHtml } from "./controllers/utils/escape.js";
export { formatMoney, normalizeType } from "./controllers/utils/format.js";

// بيانات | data
export { calculateInvoiceTotals } from "./invoices/shared/invoice-form-base/utils.js";
export { getDefaultStoreInfo, getPersistedShowFooter, setPersistedShowFooter, setShowFooterToggleUI } from "./invoices/shared/data/store-info.js";
export { getDocumentMeta, saveDocumentMeta, generateUniqueDocNo, migrateDocumentNos } from "./invoices/shared/data/document-meta.js";
export { getTransactionById } from "./transactions.js";
export { getAllVouchers, setAllVouchers, getVouchersForInvoice, deleteVoucher } from "./invoices/vouchers/voucher-storage.js";
export { getInvoicePaymentStatusInfo, getInvoicePaymentSummary, updateInvoicePaymentMeta } from "./invoices/shared/data/payment.js";

// خدمات | services
export { getTaxCodes } from "./controllers/services/tax-codes.js";
export { getTransactionTotal, getTransactionsSafe, groupTransactions, getInventoryMap, toDocument } from "./controllers/services/transactions.js";

// مستندات مشتركة | documents-common
export { getVoucherLineTotalValue } from "./invoices/vouchers/index.js";

// HTML | html
export { buildInvoiceBarcodeSvg } from "./invoices/shared/html/barcode.js";
export { buildDocumentHtml } from "./invoices/sales/invoice-html.js";
export { buildVoucherHtml } from "./invoices/vouchers/voucher-html.js";
export { getWhatsappUrl } from "./invoices/shared/html/whatsapp.js";

// واجهة المستخدم | ui
export { currentDocumentData, setCurrentDocument, openDocumentDetails, fillDocumentEditor, saveDocumentEditor, renderDocumentList, toggleVoucherActionButtons } from "./controllers/document-ui.js";
export { printCurrentDocument, downloadPdfCurrentDocument } from "./invoices/vouchers/print.js";


// جدول | table
export { getInvoiceRowHtml, getVoucherRowHtml, sortItems, switchToVoucherTab } from "./invoices/table/rows.js";

// مكونات | components
export { renderLimitedRows } from "./components/table-renderer.js";
export { openAllItemsModal } from "./components/modal-all-items.js";
export { populateVoucherInvoiceSelect } from "./components/invoice-select.js";
export { updateDashboardStats } from "./components/dashboard.js";
export { renderDocuments } from "./components/document-list.js";
export { openVoucherDetails, sortVouchers, renderVouchers, updateVoucherSortHeaders } from "./components/voucher-panel.js";

// أدوات جديدة | new utils
export { findDocument } from "./utils/find-document.js";
export { chainModals } from "./utils/chain-modals.js";
export { printContent } from "./utils/print-content.js";

// أحداث | events
export { setupInitialVoucherSort } from "./events/sort-setup.js";
export { bindDocumentEvents } from "./events/bind-events.js"; // نسخة مستقلة تُستخدم بدلاً من initDocumentsModule | Standalone binding used in place of initDocumentsModule
export { initDocumentsModule } from "./documents.js";
