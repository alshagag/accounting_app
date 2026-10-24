import { createInvoiceForm } from "../shared/invoice-form-base/Index.js";

/* ================= Purchase Invoice Form | نموذج فاتورة الشراء ================= */

const purchaseConfig = {
  prefix: "purchaseInv",
  togglePrefix: "purchaseToggle",
  bodyId: "purchaseInvLinesBody",
  types: {
    party: "suppliers",
    partyField: "supplier",
    txType: "شراء",
    priceField: "price",
    docKind: "purchaseInvoices",
    label: "المشتريات",
  },
  defaultTitle: "فاتورة شراء",
  modalId: "purchaseInvoiceModal",
  modalTitleSelector: "purchaseInvoiceModalTitle",
  partyLabel: "المورد",
  partyId: "purchaseInvSupplier",
  linePrefix: "purchase-inv",
  taxRowId: "purchaseInvTaxRow",
    taxLabelId: "purchaseInvTaxLabel",
    taxValueId: "purchaseInvTax",
    addLineBtnId: "purchaseInvAddLine",
  };

// تهيئة مستمعات النموذج | Initialize the form listeners
const { bind, openModal } = createInvoiceForm(purchaseConfig);
bind();

// دالة فتح مخصصة لفواتير الشراء | Create a specific open function for purchase invoices
export function openPurchaseInvoiceModal(documentData) {
  openModal(documentData);
}

// تعريضها على window للوصول الأوسع عند الحاجة | Assign to window for broader access if needed
if (typeof window !== "undefined") {
    window.openPurchaseInvoiceModal = openPurchaseInvoiceModal;
}
