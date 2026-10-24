import { $ } from "@/services/lib/utils.js";
import { getTogglesConfig, syncTogglesUI, setupDragDrop, updateDueDateFromTerms, addLine, recalc, toggleAutoRef, updateAutoRef, getLines } from "./ui.js";
import { save, deleteInvoice, openModal } from "./actions.js";
import { track } from "@/services/analytics/gtag.js";

export { escapeHtml, escapeAttr, getTaxRate, calculateInvoiceTotals } from "./utils.js";

/**
 * createInvoiceForm
 *
 * config المطلوب:
 *   prefix, togglePrefix, bodyId, types, defaultTitle,
 *   modalId, modalTitleSelector, tabTargets,
 *   partyLabel, partyId, linePrefix,
 *   linesGetter  ← اسم دالة window أو دالة مباشرة لقراءة بنود React
 */
export function createInvoiceForm(config) {
  /* ── السياق المشترك (state + helpers) | Shared context (state + helpers) ── */
  const ctx = {
    config,
    q:   id => $(config.prefix       + id),
    qt:  id => $(config.togglePrefix + id),
    sel: s  => document.querySelector(s),
    lineCounter: 0, products: [], parties: [],
    editMode: false, editKey: "", editCategory: "",
    originalRef: "", originalTransactionIds: [],
  };

  /* ── ربط linesGetter بقراءة البنود من مصدر البيانات الفعلي (DOM) | Bind linesGetter to reading lines from the real data source (DOM) ──
     حتى يعمل التحقق قبل الحفظ على البيانات الحقيقية، وليس على مصفوفة فارغة. | so pre-save validation runs on real data, not an empty array. */
  if (!config.linesGetter) config.linesGetter = () => getLines(ctx);

  function init() {
    setupDragDrop(ctx);

    ctx.q("AutoRef")?.addEventListener("change", () => toggleAutoRef(ctx));
    ctx.q("Date")?.addEventListener("change",    () => { updateAutoRef(ctx); updateDueDateFromTerms(ctx); });
    ctx.q("PaymentTerms")?.addEventListener("change", () => updateDueDateFromTerms(ctx));
    ctx.q("Days")?.addEventListener("change",         () => updateDueDateFromTerms(ctx));
    ctx.q("Save")?.addEventListener("click",           () => save(ctx));
    ctx.q("Delete")?.addEventListener("click",         () => deleteInvoice(ctx));
    ctx.qt("TaxInclusive")?.addEventListener("change", () => recalc(ctx));

    /* ── زر "إضافة سطر": ينشئ صفاً جديداً بنفس الخصائص والأحداث | "Add line" button: creates a new row with the same properties and events ── */
    if (config.addLineBtnId) {
      document.addEventListener("click", event => {
        if (event.target.closest(`#${config.addLineBtnId}`)) {
        addLine(ctx);
        track("invoice_line_added", {
          feature_name: "invoices",
          doc_type: config.types?.docKind === "purchaseInvoices" ? "purchase_invoice" : "sales_invoice",
        });
      }
      });
    }

    document.addEventListener("change", e => {
      if (!getTogglesConfig(ctx).some(t => t.id === e.target)) return;
      syncTogglesUI(ctx);
      if (e.target === ctx.qt("ShowFooter")) {
        try {
          const doc  = window.__currentDocumentDetailsData;
          const body = $("documentDetailsBody");
          if (doc && body) body.innerHTML = window.buildDocumentHtml?.(doc, { showFooter: e.target.checked }) || "";
        } catch {}
      }
    });

    /* ── اسم ديناميكي للـ recalc بدل تثبيت "Sales" | Dynamic recalc name instead of hardcoding "Sales" ── */
    window[`recalc_${config.prefix}`] = () => recalc(ctx);
  }

  function activateTab() {
    try {
      const mainBtn = document.querySelector(`button[data-bs-target="${config.tabTargets.main}"]`);
      if (mainBtn) new window.bootstrap.Tab(mainBtn).show();
      const subBtn  = document.querySelector(`button[data-bs-target="${config.tabTargets.sub}"]`);
      if (subBtn)  new window.bootstrap.Tab(subBtn).show();
    } catch {}
  }

  function bind() {
    document.addEventListener("click", event => {
      const btn = event.target.closest(".create-document");
      if (btn?.dataset.docKind === config.types.docKind) openModal(ctx);
    });

    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", init);
    else
      init();
  }

  return {
    bind,
    openModal: doc => openModal(ctx, doc),
    addLine:   () => addLine(ctx),
    recalc:    () => recalc(ctx),
  };
}