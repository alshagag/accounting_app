import { saveDocumentMeta, openDocumentDetails } from "@/features/documents/index.js";
import { isFallbackMode, fallback, idbAdd, idbDelete, STORE_TRANSACTIONS } from "@/data/db/db.js";
import { showGlobalAlert }  from "@/components/ui.js";
import { confirmDelete }    from "@/components/dialogs/confirm-dialog.js";
import {
  getTogglesConfig, syncTogglesUI, updateDueDateFromTerms,
  updateAccountCellDisplay, loadProducts, loadParties,
  addLine, recalc, updateAutoRef, generateReference, fillShippingAddress,
  docTypeOf
} from "./ui.js";
import { track, startOperation, operationDuration } from "@/services/analytics/gtag.js";

/* فشل حفظ الفاتورة (تحقق مسبق أو خطأ) بسبب محدّد فقط | Invoice save failure (validation or error) with a specific reason only */
function trackSaveFail(ctx, reason) {
  track(ctx.editMode ? "invoice_edit_failed" : "invoice_create_failed", {
    feature_name: "invoices",
    doc_type: docTypeOf(ctx),
    failure_reason: reason,
  });
}

/* ================= Save | الحفظ ================= */

export async function save(ctx) {
  const { q, qt, config: { partyId, partyLabel, modalId, defaultTitle, types, linesGetter } } = ctx;

  const date      = q("Date")?.value;
  const ref       = q("Ref")?.value;
  const partyElRaw = document.getElementById(partyId);
  const getElValue = (el) => {
    if (!el) return "";
    const v = el.value;
    if (v && typeof v === 'object') return v.value || v.label || "";
    return v ?? "";
  };
  const partyName = (getElValue(partyElRaw) || "").toString();

  if (!date)      { showGlobalAlert("أدخل التاريخ",             "warning"); trackSaveFail(ctx, "missing_date"); return; }
  if (!partyName) { showGlobalAlert(`اختر ${partyLabel}`,        "warning"); trackSaveFail(ctx, "missing_party"); return; }
  if (!ref)       { showGlobalAlert("رقم الفاتورة مطلوب.",       "warning"); q("Ref")?.focus(); trackSaveFail(ctx, "missing_ref"); return; }

  const toggleStates = {};
  getTogglesConfig(ctx).forEach(t => { toggleStates[t.id.id] = t.id.checked; });

  /* ── linesGetter ديناميكي من الـ config بدل تثبيته | Dynamic linesGetter from the config instead of hardcoding ── */
  const getLinesFunc = typeof linesGetter === 'function' ? linesGetter : window[linesGetter];
  const lineItems    = typeof getLinesFunc === 'function' ? getLinesFunc() : [];
  const isSales      = types.priceField === "salePrice";
  const transactions = [];

  for (const item of lineItems) {
    if (item.enabled === false) continue;

    const lineType = item.lineType || 'product';

    if (lineType === 'product') {
      const productKey = item.product?.value || item.product;
      const qty = Number(item.quantity) || 0;
      if (!productKey || qty <= 0) continue;

      // استخراج كائن المنتج من المنتجات المحمّلة للحصول على الحسابات الافتراضية | Derive the product object from loaded products to get default accounts
      const productObj = (ctx.products || []).find(p => String(p.id) === String(productKey) || p.name === productKey || String(p.id) === String((productKey && productKey.value) || ''));
      const accountName = isSales
        ? (productObj?.defaultSalesAccount    || 'المخزون - مبيعات')
        : (productObj?.defaultPurchaseAccount || 'المخزون الحالي');

      const tx = {
        type: types.txType,
        product: productKey,
        quantity: qty,
        price:        Number(item.price)    || 0,
        discount:     Number(item.discount) || 0,
        discountType: item.discountType     || "fixed",
        taxCodeId:    item.taxCodeId?.value || item.taxCodeId || "",
        date, ref: ref || "", description: item.description || "", accountName,
      };
      if (types.partyField === "customerName") tx.customerName = partyName;
      else                                      tx.supplier     = partyName;
      transactions.push(tx);
    } else if (lineType === 'account') {
      // سطر حساب فقط (بلا منتج) — يُضمَن إن كان بمبلغ موجب | Account-only line (no product). Include if it has a positive amount
      const qty = Number(item.quantity) || 0;
      const price = Number(item.price) || 0;
      const discount = Number(item.discount) || 0;
      const subtotal = Math.max(0, qty * price - (item.discountType === 'percent' ? (qty * price * (discount / 100)) : discount));
      const taxAmount = subtotal * ((Number(item.taxCodeId && (item.taxCodeId.rate || item.taxCodeId)) || 0) / 100);
      const totalAmount = subtotal + taxAmount;
      if (totalAmount <= 0) continue;

      const accountName = item.accountType === 'customers' ? (item.party || 'العملاء') : (item.accountType === 'suppliers' ? (item.party || 'الموردون') : 'حساب يدوي');

      const tx = {
        type: types.txType,
        product: null,
        quantity: qty,
        price,
        discount,
        discountType: item.discountType || 'fixed',
        taxCodeId: item.taxCodeId || "",
        date, ref: ref || "", description: item.description || "", accountName,
        amount: totalAmount,
      };
      if (types.partyField === "customerName") tx.customerName = partyName;
      else                                      tx.supplier     = partyName;
      transactions.push(tx);
    }
  }

  if (!transactions.length) { showGlobalAlert("أضف منتج واحد على الأقل", "warning"); trackSaveFail(ctx, "no_lines"); return; }

  const saveBtn      = q("Save");
  const originalHtml = saveBtn?.innerHTML;
  if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="bi bi-hourglass-split"></i> جاري الحفظ...'; }

  try {
    if (ctx.editMode && ctx.editKey) {
      if (isFallbackMode()) {
        const idSet = new Set(ctx.originalTransactionIds.map(Number));
        fallback.setTransactions((fallback.getTransactions() || []).filter(t => !idSet.has(Number(t.id))));
      } else {
        for (const id of ctx.originalTransactionIds) await idbDelete(STORE_TRANSACTIONS, id);
      }
    }

    for (const tx of transactions) {
      const record = { id: Date.now() + Math.floor(Math.random() * 1000), ...tx };
      if (isFallbackMode()) { const all = fallback.getTransactions() || []; all.push(record); fallback.setTransactions(all); }
      else await idbAdd(STORE_TRANSACTIONS, record);
    }

    // حل معرف الطرف بمرونة (يدعم select الأصلي و React Select) | Resolve the party id robustly (support native select or React Select wrapper)
    let savedPartyId = null;
    try {
      const partyEl = document.getElementById(partyId);
      if (partyEl) {
        // تفضيل selectedId الذي يعيّنه مُهيئ React Select عند التغيير | Prefer the selectedId set by the React Select initializer on change
        if (partyEl.dataset && partyEl.dataset.selectedId) savedPartyId = partyEl.dataset.selectedId;
        // تراجع إلى dataset id في الخيار المطابق | Fallback to the matched option dataset id
        if (!savedPartyId && partyEl.options && typeof partyEl.selectedIndex !== 'undefined') {
          const opt = partyEl.options[partyEl.selectedIndex];
          if (opt && opt.dataset && opt.dataset.id) savedPartyId = opt.dataset.id;
        }
      }
    } catch (e) { savedPartyId = null; }
    saveDocumentMeta(ref, "invoice", {
      code: ref, party: partyName,
      partyId: savedPartyId || null,
      notes:       q("Description")?.value   || "",
      customTitle: q("Title")?.value         || defaultTitle,
      customTitleEn: q("TitleEn")?.value     || "",
      footer:      q("Footer")?.value        || "",
      toggleStates,
      issueDate:        q("Date")?.value      || "",
      dueDate:          q("DueDate")?.value   || "",
      paymentTermsType: (() => { const v = q("PaymentTerms")?.value || "net"; return v === "days" ? "net" : v; })(),
      paymentDays:      Number(q("Days")?.value || 0) || 0,
      /* ── qt للمفاتيح، q للحقول العادية | qt for toggles, q for regular fields ── */
      referenceTicked:  Boolean(qt("RefGen")?.checked),
      referenceAutoLike:Boolean(q("AutoRef")?.checked),
      shippingAddress:  q("ShippingAddress")?.value || ""
    });

    ctx._opSaved = true;
    window.bootstrap?.Modal.getInstance(document.getElementById(modalId))?.hide();
    await window.fullAppRefresh?.();

    const savedDoc = window.findDocument?.(ref, "invoice");
    if (savedDoc) openDocumentDetails(savedDoc);
    showGlobalAlert(ctx.editMode ? "تم تحديث الفاتورة" : `تم حفظ الفاتورة (${transactions.length} أسطر)`, "success");

    track(ctx.editMode ? "invoice_edit_success" : "invoice_create_success", {
      feature_name: "invoices",
      doc_type: docTypeOf(ctx),
      entry_point: docTypeOf(ctx),
      line_count: transactions.length,
      operation_id: ctx._op?.id,
      duration_ms: operationDuration(ctx._op),
    });

  } catch (error) {
    console.error("Save invoice error:", error);
    track(ctx.editMode ? "invoice_edit_failed" : "invoice_create_failed", {
      feature_name: "invoices",
      doc_type: docTypeOf(ctx),
      failure_reason: "db_error",
    });
    showGlobalAlert("حدث خطأ أثناء الحفظ", "danger");
  } finally {
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.innerHTML = originalHtml || (ctx.editMode ? '<i class="bi bi-save"></i> تحديث الفاتورة' : '<i class="bi bi-save"></i> حفظ الفاتورة');
    }
  }
}

/* ================= Delete | الحذف ================= */

export async function deleteInvoice(ctx) {
  const { config: { modalId, types } } = ctx;

  if (!ctx.editMode || !ctx.editKey || !ctx.originalRef) {
    showGlobalAlert("تعذر حذف الفاتورة: بيانات غير مكتملة.", "warning");
    return;
  }

  const confirmed = await confirmDelete({
    title: `حذف فاتورة ${types.label}`, confirmText: "حذف الفاتورة",
    message: `هل تريد حذف فاتورة ${types.label} بالكامل؟`,
    detail: `سيتم حذف جميع منتجات الفاتورة من سجلات ${types.label}، ولا يمكن التراجع.`,
  });
  if (!confirmed) return;

  try {
    if (isFallbackMode()) {
      const idSet = new Set(ctx.originalTransactionIds.map(Number));
      fallback.setTransactions((fallback.getTransactions() || []).filter(t => !idSet.has(Number(t.id))));
    } else {
      for (const id of ctx.originalTransactionIds) await idbDelete(STORE_TRANSACTIONS, id);
    }

    try {
      const allMeta = JSON.parse(localStorage.getItem("accountingDocumentMeta") || "{}");
      delete allMeta["invoice:" + ctx.originalRef];
      localStorage.setItem("accountingDocumentMeta", JSON.stringify(allMeta));
    } catch {}

    window.bootstrap?.Modal.getInstance(document.getElementById(modalId))?.hide();
    await window.fullAppRefresh?.();
    showGlobalAlert(`تم حذف فاتورة ${types.label} بنجاح`, "success");
    track("invoice_delete_success", { feature_name: "invoices", doc_type: docTypeOf(ctx) });
  } catch (error) {
    console.error(`Delete ${types.label} invoice error:`, error);
    showGlobalAlert("حدث خطأ أثناء حذف الفاتورة", "danger");
  }
}

/* ================= Open Modal | فتح النافذة ================= */

export async function openModal(ctx, documentData = null) {
  const { q, qt, sel, config: { modalId, modalTitleSelector, bodyId, linePrefix, partyId, defaultTitle } } = ctx;

  const modalEl = document.getElementById(modalId);
  if (!modalEl) { console.warn("openModal: modal not found:", modalId); return; }

  try {
    window.__currentVoucherData = null;

    /* ── إعادة تعيين الحالة | Reset state ── */
    Object.assign(ctx, { lineCounter: 0, editMode: false, editKey: "", editCategory: "", originalRef: "", originalTransactionIds: [] });

    /* ── حالة التحليلات لفتح واحد: معرّف عملية + علم الحفظ | Analytics state per open: operation id + saved flag ── */
    ctx._op = startOperation();
    ctx._opSaved = false;

    /* ── إعادة تعيين الحقول | Reset fields ── */
    const setVal = (el, val) => { if (el) el.value = val; };
    setVal(q("Date"), new Date().toISOString().slice(0, 10));
    setVal(q("Ref"),  ""); if (q("AutoRef")) { q("AutoRef").checked = true; q("Ref").readOnly = true; }
    setVal(document.getElementById(partyId), "");
    setVal(q("Title"),           defaultTitle);
    setVal(q("Description"),     "");
    setVal(q("Footer"),          "");
    setVal(q("ShippingAddress"), "");
    setVal(q("LineDiscountType"), "fixed");

    getTogglesConfig(ctx).forEach(t => { if (t.id) t.id.checked = false; });
    if (qt("ShowQty")) qt("ShowQty").checked = true;

    setVal(q("PaymentTerms"), "net");
    if (q("Days")) { q("Days").value = 0; q("Days").disabled = false; }
    setVal(q("DueDate"), "");
    updateDueDateFromTerms(ctx);
    if (q("DueDateGroup")) q("DueDateGroup").style.display = "none";

    ["d-none-col-tax-amount","d-none-col-num","d-none-col-discount","d-none-col-desc"]
      .forEach(cls => document.querySelectorAll(`.${cls}`).forEach(el => el.classList.add("d-none")));
    document.querySelectorAll(`.${linePrefix}-line-num`).forEach(el => el.classList.add("d-none"));

    const tbodyEl = document.getElementById(bodyId);
    if (tbodyEl) tbodyEl.innerHTML = "";

    const deleteBtn = q("Delete");
    if (deleteBtn) deleteBtn.classList.add("d-none");

    await loadProducts(ctx).catch(e => console.warn("loadProducts:", e));
    await loadParties(ctx).catch(e => console.warn("loadParties:", e));

    if (documentData) {
      /* ── وضع التعديل | Edit mode ── */
      Object.assign(ctx, {
        editMode: true, editKey: documentData.key, editCategory: documentData.category,
        originalRef: documentData.documentNo,
        originalTransactionIds: (documentData.items || []).map(i => i.id).filter(Boolean)
      });

      if (deleteBtn) deleteBtn.classList.remove("d-none");
      setVal(q("Date"),    documentData.issueDate || documentData.date || "");
      setVal(q("DueDate"), documentData.dueDate   || "");
      setVal(q("PaymentTerms"), documentData.paymentTermsType || "net");
      if (q("Days")) q("Days").value = Number(documentData.paymentDays) || 0;
      setVal(q("Ref"),          documentData.documentNo      || "");
      setVal(q("Description"),  documentData.notes           || "");
      setVal(q("Title"),        documentData.customTitle     || defaultTitle);
      setVal(q("TitleEn"),      documentData.customTitleEn   || "");
      setVal(q("Footer"),       documentData.footer          || "");
      setVal(q("ShippingAddress"), documentData.shippingAddress || "");

      // استعادة اختيار الطرف عبر partyId المحفوظ (يفضّل المطابقة بالمعرّف ويتحول للاسم) | Restore party selection by saved partyId (prefer id match, fallback to name)
      try {
        const partyEl = document.getElementById(partyId);
        if (partyEl) {
          // تفضيل الاستعادة عبر partyId؛ نخزنه مؤقتًا ليلتقطه مُهيئ React Select | Prefer restoring by partyId; store it temporarily so the React Select initializer can pick it
          if (documentData.partyId) partyEl.dataset.preselectedId = documentData.partyId;
          // ومن ثم نتراجع إلى الاسم عندما لا يوجد معرّف | Also fallback to name when id is not present
          if (documentData.party) partyEl.value = documentData.party;
          partyEl.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } catch (e) { /* تجاهل | ignore */ }

      /* ── qt للمفاتيح | qt for toggles ── */
      if (qt("RefGen")) qt("RefGen").checked = Boolean(documentData.referenceTicked);
      if (q("AutoRef")) q("AutoRef").checked = false;
      if (q("Ref"))     q("Ref").readOnly    = false;

      for (const [key, val] of Object.entries(documentData.toggleStates || {})) {
        const el = document.getElementById(key);
        if (el && typeof el.checked !== 'undefined') el.checked = val;
      }

      // ترتيب documentData.items قبل المعالجة | Sort documentData.items before processing
      const sortedItems = (documentData.items || []).sort((a, b) => {
        // بافتراض أن 'id' رقم؛ إن كان نصًا يُستخدم localeCompare | Assuming 'id' is a number; if string, use localeCompare
        return (a.id || 0) - (b.id || 0);
      });

      for (const item of sortedItems) {
        addLine(ctx);
        const lastRow = document.getElementById(bodyId)?.lastElementChild;
        if (!lastRow) continue;

        const productSel = lastRow.querySelector(`.${linePrefix}-product`);
        if (productSel) {
          productSel.value = item.product || "";
          if (item.product && productSel.value !== item.product) {
            const opt = new Option(item.product, item.product, true, true);
            productSel.appendChild(opt);
          }
          productSel.dispatchEvent(new Event('change', { bubbles: true }));
          // الصف المحمّل يُظهر واجهة الحساب كما يناسب (لا نُبقي علامة إخفاء السطر الجديد) | Loaded row should reveal account UI as appropriate (don't keep the new-row hide flag)
          try { delete lastRow.dataset.hideAccount; } catch {}
        }

        const setRow = (cls, val) => { const el = lastRow.querySelector(`.${linePrefix}-${cls}`); if (el) el.value = val; };
        setRow("qty",      item.quantity ?? item.qty ?? 1);
        setRow("price",    item.price    || 0);
        setRow("desc",     item.description || "");
        setRow("discount", item.discount || 0);

        const discType   = item.discountType || "fixed";
        const discHidden = lastRow.querySelector(`.${linePrefix}-discount-type`);
        if (discHidden) discHidden.value = discType;
        lastRow.querySelectorAll(`.${linePrefix}-discount-type-btn`).forEach(b => b.classList.toggle("active", b.dataset.type === discType));

        const accountSpan = lastRow.querySelector('.product-account-name');
        if (accountSpan && item.accountName) accountSpan.textContent = item.accountName;

        const taxSel = lastRow.querySelector(`.${linePrefix}-line-tax-code`);
        if (taxSel) {
          if (item.taxCodeId !== undefined) taxSel.value = item.taxCodeId;
          taxSel.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const priceInput = lastRow.querySelector(`.${linePrefix}-price`);
        if (priceInput) priceInput.disabled = false;
      }

      const titleEl = sel(modalTitleSelector);
      if (titleEl) titleEl.textContent = `تعديل ${documentData.title || defaultTitle}`;
      if (q("Save")) q("Save").innerHTML = '<i class="bi bi-save"></i> تحديث الفاتورة';

    } else {
      addLine(ctx);
      const titleEl = sel(modalTitleSelector);
      if (titleEl) titleEl.textContent = `${defaultTitle} جديدة`;
      if (q("Save")) q("Save").innerHTML = '<i class="bi bi-save"></i> حفظ الفاتورة';
    }

    updateDueDateFromTerms(ctx);
    /* ── qt للمفاتيح | qt for toggles ── */
    if (qt("RefGen")?.checked && !q("Ref")?.value) generateReference(ctx);
    fillShippingAddress(ctx);
    updateAutoRef(ctx);
    recalc(ctx);
    syncTogglesUI(ctx);

    // تهيئة واجهة React Select لأي <select class="form-select"> داخل النافذة | Initialize React Select UI for any <select class="form-select"> inside the modal
    try {
      const mod = document.getElementById(modalId);
      if (mod) {
        const mixer = await import('@/components/ui/initReactSelects.js');
        mixer.initReactSelects(mod);
      }
    } catch (e) { console.warn('initReactSelects import failed:', e); }

    /* تتبّع بدء الفاتورة + الإلغاء عند الإغلاق بلا حفظ (وضع الإنشاء فقط) | Invoice-start tracking + cancel on close without save (create mode only) */
    if (ctx.editMode) {
      track("invoice_edit_started", { feature_name: "invoices", doc_type: docTypeOf(ctx), entry_point: docTypeOf(ctx) });
    } else {
      track("invoice_create_started", { feature_name: "invoices", doc_type: docTypeOf(ctx), entry_point: docTypeOf(ctx) });
      modalEl.addEventListener('hidden.bs.modal', () => {
        if (!ctx._opSaved) {
          track("invoice_create_cancelled", {
            feature_name: "invoices",
            doc_type: docTypeOf(ctx),
            operation_id: ctx._op?.id,
            duration_ms: operationDuration(ctx._op),
          });
        }
      }, { once: true });
    }

    if (window.bootstrap && modalEl) {
      if (window.__onNextModalHidden) {
        modalEl.addEventListener('hidden.bs.modal', window.__onNextModalHidden, { once: true });
        window.__onNextModalHidden = null;
      }
      window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }

  } catch (e) {
    console.error("openModal error:", e);
    try { window.bootstrap?.Modal.getOrCreateInstance(modalEl)?.show(); } catch {}
  }
}