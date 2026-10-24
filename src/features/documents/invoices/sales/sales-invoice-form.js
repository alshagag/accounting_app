import { createInvoiceForm } from "@/features/documents/invoices/shared/invoice-form-base/Index.js";

/* ================= Sales Invoice Form | نموذج فاتورة البيع ================= */

const salesInvoiceForm = createInvoiceForm({
  prefix: "saleInv",
  togglePrefix: "toggle",
  bodyId: "saleInvLinesBody",
  types: {
    party: "customers",
    partyField: "customerName",
    txType: "بيع",
    refPrefix: "S",
    priceField: "salePrice",
    docKind: "salesInvoices",
    label: "المبيعات",
  },
  defaultTitle: "فاتورة بيع",
  modalId: "salesInvoiceModal",
  modalTitleSelector: "#salesInvoiceModal .modal-title span",
  tabTargets: {
    main: "#salesTab",
    sub: "#salesInvoicesSubTab",
  },
  partyLabel: "العميل",
  partyId: "saleInvCustomer",
  accountLabel: "المخزون - مبيعات",
    linePrefix: "sale-inv",
    addLineBtnId: "saleInvLinesBodyAddLine",
  });

salesInvoiceForm.bind();

if (typeof window !== "undefined") {
  window.initSalesInvoiceForm = salesInvoiceForm.init;
  window.openSalesInvoiceModal = salesInvoiceForm.openModal;
}

export const { openModal: openSalesInvoiceModal, init: initSalesInvoiceForm } = salesInvoiceForm;
