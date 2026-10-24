import { $ } from "@/services/lib/utils.js";
import { escapeHtml } from "./utils/escape.js";
import { formatMoney, normalizeType } from "./utils/format.js";

import { getPersistedShowFooter, setShowFooterToggleUI } from "../invoices/shared/data/store-info.js";
import { saveDocumentMeta } from "../invoices/shared/data/document-meta.js";
import { buildDocumentHtml } from "../invoices/sales/invoice-html.js";
import { getWhatsappUrl } from "../invoices/shared/html/whatsapp.js";
import { printCurrentDocument, downloadPdfCurrentDocument } from "../invoices/vouchers/print.js";

/* حالة المستند الحالي — مصدر واحد، مُصدَّر للوحدات الأخرى | Current document state — single source, exported to other modules */
export let currentDocumentData = null;
export function setCurrentDocument(doc) {
  currentDocumentData = doc;
}

let detailsModalEventsBound = false;

function bindDocumentDetailsModalEvents() {
  if (detailsModalEventsBound) return;
  detailsModalEventsBound = true;

  const detailsModalEl = $("documentDetailsModal");
  if (detailsModalEl) {
    // تُعاد القوائم مخفية عند إغلاق النافذة حتى لا تظهر جاهزة عند الفتح التالي | Choosers are re-hidden on modal close so they do not appear ready on the next open
    detailsModalEl.addEventListener("hidden.bs.modal", () => {
      $("btnPrintChooser")?.classList.remove("open");
      $("btnPdfChooser")?.classList.remove("open");
    });
  }

  document.addEventListener("click", (event) => {
    const target = event.target;
    const modalEl = $("documentDetailsModal");
    if (!modalEl || !modalEl.contains(target)) return;

    const doc = currentDocumentData;
    if (!doc) return;

    // إغلاق قوائم اختيار الطباعة/PDF عند الضغط في أي مكان آخر | Close the print/PDF choosers when clicking anywhere else
    if (!target.closest("#btnPdfChooserWrap")) {
      const pdfChooser = $("btnPdfChooser");
      if (pdfChooser) pdfChooser.classList.remove("open");
    }
    if (!target.closest("#btnPrintChooserWrap")) {
      const printChooser = $("btnPrintChooser");
      if (printChooser) printChooser.classList.remove("open");
    }

    const parentModal = bootstrap.Modal.getInstance(modalEl);

    const chainAction = (childAction) => {
      if (parentModal) {
        const showParentAgain = () => parentModal.show();
        window.__onNextModalHidden = showParentAgain;
        modalEl.addEventListener('hidden.bs.modal', childAction, { once: true });
        // إبعاد التركيز قبل إخفاء المودال يمنع خطأ "Blocked aria-hidden..." | Blurring focus before hiding the modal prevents the "Blocked aria-hidden..." error
        if (modalEl.contains(document.activeElement)) document.activeElement.blur();
        parentModal.hide();
      } else {
        childAction();
      }
    };

    if (target.closest("#btnEditCurrentDocument")) {
      chainAction(() => fillDocumentEditor(doc));
    } else if (target.closest("#btnPrintCurrentDocument")) {
      const chooser = $("btnPrintChooser");
      if (chooser) chooser.classList.toggle("open");
    } else if (target.closest("#btnPrintDocumentTax")) {
      $("btnPrintChooser")?.classList.remove("open");
      printCurrentDocument(doc, null, { size: "receipt" });
    } else if (target.closest("#btnPrintDocumentFull")) {
      $("btnPrintChooser")?.classList.remove("open");
      printCurrentDocument(doc);
    } else if (target.closest("#btnPdfCurrentDocument")) {
      const chooser = $("btnPdfChooser");
      if (chooser) chooser.classList.toggle("open");
    } else if (target.closest("#btnPdfDocumentTax")) {
      $("btnPdfChooser")?.classList.remove("open");
      downloadPdfCurrentDocument(doc, null, { size: "receipt" });
    } else if (target.closest("#btnPdfDocumentFull")) {
      $("btnPdfChooser")?.classList.remove("open");
      downloadPdfCurrentDocument(doc);
    } else if (target.closest("#btnCloneCurrentDocument")) {
      const clonedDoc = { ...doc, id: null, key: null, documentNo: null, isCreated: false, status: 'unpaid', remainingBalance: doc.total };
      chainAction(() => fillDocumentEditor(clonedDoc));
    } else if (target.closest("#btnCreateReceiptVoucher")) {
      chainAction(() => window.openVoucherModal?.(doc, "قبض"));
    } else if (target.closest("#btnCreatePaymentVoucher")) {
      chainAction(() => window.openVoucherModal?.(doc, "صرف"));
    }
  });
}

/* أزرار السندات | Voucher action buttons */
export function toggleVoucherActionButtons(documentData) {
  const receiptBtn = $("btnCreateReceiptVoucher");
  const paymentBtn = $("btnCreatePaymentVoucher");
  if (!receiptBtn || !paymentBtn) return;
  const isSales = documentData && (documentData.type === "بيع" || documentData.type === "استلام بضائع");
  const isPurchase = documentData && documentData.type === "شراء";
  receiptBtn.classList.toggle("d-none", !isSales);
  paymentBtn.classList.toggle("d-none", !isPurchase);
}

/* فتح تفاصيل المستند | Open details modal */
export function openDocumentDetails(documentData) {
  window.__currentVoucherData      = null;
  bindDocumentDetailsModalEvents();
  setCurrentDocument(documentData);

  const showFooter = documentData.showFooter !== undefined
    ? Boolean(documentData.showFooter)
    : getPersistedShowFooter();

  setShowFooterToggleUI(showFooter);
  toggleVoucherActionButtons(documentData);

  const normalizedTypeForTitle = normalizeType(documentData?.type);

  const invoiceTitleLabel =
    normalizedTypeForTitle === "بيع" || normalizedTypeForTitle === "استلام بضائع"
      ? "فاتورة بيع"
      : normalizedTypeForTitle === "شراء"
      ? "فاتورة شراء"
      : documentData.customTitle || documentData.title || "فاتورة";


  const title    = $("documentDetailsTitle");
  const body     = $("documentDetailsBody");
  const whatsapp = $("documentWhatsappLink");

  if (title)    title.textContent = `${invoiceTitleLabel} - ${documentData.documentNo}`;
  if (body)     body.innerHTML    = buildDocumentHtml(documentData, { showFooter });
  if (whatsapp) whatsapp.href     = getWhatsappUrl(documentData);

  const modal = $("documentDetailsModal");
  if (modal && window.bootstrap) {
    // القوائم تُفتح فقط بعد الضغط على الأيقونة — إعادة ضبط عند كل فتح | Choosers open only after the icon click; reset on every open
    $("btnPrintChooser")?.classList.remove("open");
    $("btnPdfChooser")?.classList.remove("open");
    if (window.__onNextModalHidden) {
      modal.addEventListener("hidden.bs.modal", window.__onNextModalHidden, { once: true });
      window.__onNextModalHidden = null;
    }
    window.bootstrap.Modal.getOrCreateInstance(modal).show();
  }
}

export function refreshInvoicePreview(documentData) {
    const body = $("documentDetailsBody");
    if (!body) return;

    // لا يُحدَّث إلا إذا كان مودال التفاصيل ظاهراً | Only refresh if the details modal is currently visible
    const modal = $("documentDetailsModal");
    if (!modal || modal.style.display === "none") return;
    
    // نفس منطق openDocumentDetails لتحديد ظهور التذييل | Use the same logic as openDocumentDetails to determine footer visibility
    const showFooter = documentData.toggleStates?.['saleToggleShowFooter'] || getPersistedShowFooter();

    body.innerHTML = buildDocumentHtml(documentData, { showFooter });
    
    const title = $("documentDetailsTitle");
    if (title) title.textContent = `${documentData.title} - ${documentData.documentNo}`;

    const whatsapp = $("documentWhatsappLink");
    if (whatsapp) whatsapp.href     = getWhatsappUrl(documentData);
    }

    if(typeof window !== 'undefined') {
    window.refreshInvoicePreview = refreshInvoicePreview;
}

    /* تعبئة محرر المستند | Fill editor modal */
    export function fillDocumentEditor(documentData) {
  const normalizedType = normalizeType(documentData?.type);

  // يُبقى الربط مطابقاً للمبيعات مع تحمّل اختلافات النوع | Keep mapping identical to sales, but tolerate type variations.
  if (documentData.category === "invoice" && normalizedType === "بيع") {
    window.openSalesInvoiceModal?.(documentData);
    return;
  }
  if (documentData.category === "invoice" && normalizedType === "شراء") {
    window.openPurchaseInvoiceModal?.(documentData);
    return;
  }


  const set = (id, val) => { const el = $(id); if (el) el.value = val || ""; };
  set("documentEditKey",          documentData.key);
  set("documentEditCategory",     documentData.category);
  set("documentEditCode",         documentData.documentNo || documentData.defaultCode);
  set("documentEditStoreName",    documentData.storeName);
  set("documentEditLogo",         documentData.logoUrl);
  set("documentEditStoreAddress", documentData.storeAddress);
  set("documentEditStorePhone",   documentData.storePhone);
  set("documentEditTaxNumber",    documentData.taxNumber);
  set("documentEditParty",        documentData.party);
  set("documentEditPartyAddress", documentData.partyAddress);
  set("documentEditNotes",        documentData.notes);

  const title = $("documentEditorTitle");
  if (title) title.textContent = `${documentData.isCreated ? "تعديل" : "إنشاء"} ${documentData.title}`;

  const modal = $("documentEditorModal");
  if (modal && window.bootstrap) {
    if (window.__onNextModalHidden) {
      modal.addEventListener("hidden.bs.modal", window.__onNextModalHidden, { once: true });
      window.__onNextModalHidden = null;
    }
    window.bootstrap.Modal.getOrCreateInstance(modal).show();
  }
}

/* حفظ بيانات المستند | Save editor */
function readDocumentEditorValues() {
  const get = id => $(id)?.value?.trim() || "";
  return {
    key:          get("documentEditKey"),
    category:     get("documentEditCategory"),
    code:         get("documentEditCode"),
    storeName:    get("documentEditStoreName"),
    logoUrl:      get("documentEditLogo"),
    storeAddress: get("documentEditStoreAddress"),
    storePhone:   get("documentEditStorePhone"),
    taxNumber:    get("documentEditTaxNumber"),
    party:        get("documentEditParty"),
    partyAddress: get("documentEditPartyAddress"),
    notes:        get("documentEditNotes")
  };
}

export async function saveDocumentEditor() {
  const values = readDocumentEditorValues();
  if (!values.key || !values.category) { window.showGlobalAlert?.("تعذر تحديد المستند", "warning"); return; }
  if (!values.code)                     { window.showGlobalAlert?.("أدخل رمز المستند", "warning"); $("documentEditCode")?.focus(); return; }

  localStorage.setItem("documentStoreName",    values.storeName);
  localStorage.setItem("documentStoreAddress", values.storeAddress);
  localStorage.setItem("documentStorePhone",   values.storePhone);
  localStorage.setItem("documentTaxNumber",    values.taxNumber);
  localStorage.setItem("documentLogoUrl",      values.logoUrl);

  saveDocumentMeta(values.key, values.category, values);
  const editorModalEl = $("documentEditorModal");
  if (editorModalEl?.contains(document.activeElement)) document.activeElement.blur();
  window.bootstrap?.Modal.getInstance($("documentEditorModal"))?.hide();
  window.showGlobalAlert?.("تم حفظ بيانات المستند", "success");
}

/* عرض قائمة المستندات | Render document list */
export function renderDocumentList(containerId, documents, emptyMessage) {
  const container = $(containerId);
  if (!container) return;
  container.innerHTML = "";

  if (!documents.length) {
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }

  documents.forEach(doc => {
    container.insertAdjacentHTML("beforeend", `
      <div class="document-card border rounded p-3 mb-2">
        <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
          <div>
            <div class="fw-bold">${escapeHtml(doc.title)} - ${escapeHtml(doc.documentNo)}</div>
            <div class="text-muted small">${escapeHtml(doc.date)} | ${escapeHtml(doc.party)} | ${doc.items.length} صنف</div>
            <span class="badge ${doc.isCreated ? "text-bg-success" : "text-bg-secondary"} mt-2">
              ${doc.isCreated ? "تم الإنشاء" : "مسودة تلقائية"}
            </span>
          </div>
          <div class="text-start">
            <div class="fw-bold">${formatMoney(doc.total)}</div>
            <div class="d-flex flex-wrap gap-1 justify-content-end mt-2">
              <button class="btn btn-sm btn-outline-primary view-document"
                data-key="${escapeHtml(doc.key)}" data-category="${escapeHtml(doc.category)}">
                <i class="bi bi-eye"></i> عرض
              </button>
              <button class="btn btn-sm btn-outline-secondary edit-document"
                data-key="${escapeHtml(doc.key)}" data-category="${escapeHtml(doc.category)}">
                <i class="bi bi-pencil-square"></i> ${doc.isCreated ? "تعديل" : "إنشاء"}
              </button>
            </div>
          </div>
        </div>
      </div>`);
  });
}
