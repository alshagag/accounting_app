

import { $ } from "./utils.js";
import { track } from "/analytics/gtag.js";

/* ================= Full Transaction Editor | محرر العملية الكامل ================= */

const FullEditTransactionModule = (() => {

  /* Element IDs | معرفات العناصر */
  const ids = {
    modal: "fullEditTransactionModal",
    id: "full_tx_id",
    code: "full_tx_code",
    type: "full_tx_type",
    product: "full_tx_product",
    quantity: "full_tx_quantity",
    price: "full_tx_price",
    date: "full_tx_date",
    supplier: "full_tx_supplier",
    supplierRow: "full_tx_supplierRow",
    customerPhone: "full_tx_customerPhone",
    phoneRow: "full_tx_phoneRow",
    total: "full_tx_total",
    title: "full_tx_title",
    delete: "full_tx_delete",
    headerIcon: "full_tx_headerIcon",
    typePoster: "full_tx_typePoster",
    totalPoster: "full_tx_totalPoster",
    datePoster: "full_tx_datePoster",
    typeNotice: "full_tx_typeNotice",
    save: "full_tx_save"
  };

  const selectors = {
    openButton: ".full-edit-transaction"
  };

  const el = (id) => document.getElementById(id);

  /* Basic setters | أدوات تعبئة الحقول */
  function setValue(id, value) {
    const element = el(id);
    if (element) element.value = value ?? "";
  }

  function setText(id, value) {
    const element = el(id);
    if (element) element.textContent = value ?? "";
  }

  /* Modal handling | إدارة النافذة */
  function getModal() {
    const modalElement = el(ids.modal);
    if (!modalElement || !window.bootstrap) return null;

    return bootstrap.Modal.getOrCreateInstance(modalElement);
  }

  function showModal() {
    const editorModal = getModal();
    if (!editorModal) return;

    const openedListModal = ["salesModal", "purchasesModal"]
      .map(id => el(id))
      .find(modal => modal?.classList.contains("show"));

    if (!openedListModal) {
      editorModal.show();
      return;
    }

    openedListModal.addEventListener("hidden.bs.modal", () => {
      editorModal.show();
    }, { once: true });

    bootstrap.Modal.getOrCreateInstance(openedListModal)?.hide();
  }

  /* Type helpers | أدوات نوع العملية */
  function isPurchaseType(value) {
    const type = typeof normalizeTransactionType === "function"
      ? normalizeTransactionType(value)
      : String(value || "").trim();

    return type === "شراء";
  }

  /* Form state | حالة النموذج */
  function updateSupplierVisibility() {
    const isPurchase = isPurchaseType(el(ids.type)?.value);
    const supplierRow = el(ids.supplierRow);
    const phoneRow = el(ids.phoneRow);

    supplierRow?.classList.toggle('d-none', !isPurchase);
    phoneRow?.classList.toggle('d-none', isPurchase);

    if (isPurchase) {
      setValue(ids.customerPhone, "");
    }
  }

  /* Totals and labels | الإجماليات والعناوين */
  function updateTotal() {
    const quantity = Number(el(ids.quantity)?.value) || 0;
    const price = Number(el(ids.price)?.value) || 0;
    const total = (quantity * price).toFixed(2);

    setValue(ids.total, total);
    setText(ids.totalPoster, `${total} ﷼`);
  }

  function updatePoster() {
    const type = el(ids.type)?.value || "-";
    const isPurchase = isPurchaseType(type);

    setText(ids.title, isPurchase ? "تعديل شامل للمشتريات" : "تعديل شامل للمبيعات");
    setText(ids.typePoster, type);
    setText(ids.typeNotice, `نوع العملية الحالي: ${type}`);
    setText(ids.datePoster, el(ids.date)?.value || "-");

    const icon = el(ids.headerIcon);
    if (icon) {
      icon.className = isPurchase
        ? "bi bi-bag-check fs-5"
        : "bi bi-graph-up-arrow fs-5";
    }
  }

  async function populateProductSelect(selectedValue) {
    const selectEl = el(ids.product);
    if (!selectEl) return;

    const products = window.useFallback ? window.getFallbackProducts?.() : await window.idbGetAll?.(window.STORE_PRODUCTS);
    if (!products) return;

    selectEl.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => {
      const option = document.createElement('option');
      option.value = p.name;
      option.textContent = p.name;
      option.dataset.price = p.price;
      selectEl.appendChild(option);
    });

    if (selectedValue) {
      selectEl.value = selectedValue;
    }
  }

  /* Open editor | فتح التعديل */
  async function open(transactionId) {
    const transactions = window.useFallback ? window.getFallbackTransactions?.() : await window.idbGetAll?.(window.STORE_TRANSACTIONS);
    const transaction = (transactions || []).find(t => t.id === Number(transactionId));

    if (!transaction) return;

    track("transaction_edit_started", { feature_name: "transactions", entry_point: "full_edit", doc_type: isPurchaseType(transaction.type) ? "purchase" : "sale" });

    await populateProductSelect(transaction.product);

    setValue(ids.id, transaction.id);
    setValue(ids.code, transaction.id);
    setValue(ids.type, transaction.type);
    setValue(ids.quantity, transaction.quantity);
    setValue(ids.price, transaction.price);
    setValue(ids.date, transaction.date);
    setValue(ids.supplier, transaction.supplier || "");
    setValue(ids.customerPhone, transaction.customerPhone || "");

    updateSupplierVisibility();
    updatePoster();
    updateTotal();
    showModal();
  }

  async function onProductChange() {
    const selectEl = el(ids.product);
    const priceEl = el(ids.price);
    if (!selectEl || !priceEl) return;

    const selectedOption = selectEl.options[selectEl.selectedIndex];
    const price = selectedOption?.dataset.price;

    if (price) {
      priceEl.value = price;
      updateTotal();
    }
  }
  /* Save changes | حفظ التغييرات */
  async function save() {
    const saveButton = el(ids.save);

    const values = {
      type: el(ids.type)?.value,
      product: el(ids.product)?.value?.trim() || "",
      quantity: Number(el(ids.quantity)?.value),
      price: Number(el(ids.price)?.value),
      date: el(ids.date)?.value,
      supplier: el(ids.supplier)?.value?.trim() || "",
      customerPhone: el(ids.customerPhone)?.value?.trim() || ""
    };

    if (!values.product || !values.date || values.quantity <= 0 || values.price <= 0) {
      showGlobalAlert?.("يرجى إدخال بيانات العملية بشكل صحيح", "warning");
      track("transaction_create_failed", { feature_name: "transactions", action_type: "update", entry_point: "full_edit", failure_reason: "validation" });
      return;
    }

    const transactionId = el(ids.id)?.value;

    try {
      setButtonLoading?.(saveButton, true, "جاري تحديث العملية...");

      if (window.useFallback) {
          const arr = window.getFallbackTransactions?.() || [];
          const idx = arr.findIndex(x => x.id === Number(transactionId));
          if (idx !== -1) arr[idx] = { ...arr[idx], ...values, id: Number(transactionId) };
          window.setFallbackTransactions?.(arr);
      } else {
          await window.idbPut(window.STORE_TRANSACTIONS, { id: Number(transactionId), ...values });
      }
      const updated = true; // Assume success if no error
      if (!updated) {
        showGlobalAlert?.("تعذر العثور على العملية المطلوبة", "warning");
        track("transaction_create_failed", { feature_name: "transactions", action_type: "update", entry_point: "full_edit", failure_reason: "not_found" });
        return;
      }

      if (typeof refreshTransactionsUI === "function") {
        await refreshTransactionsUI();
      }

      track("transaction_create_success", { feature_name: "transactions", action_type: "update", entry_point: "full_edit", doc_type: isPurchaseType(values.type) ? "purchase" : "sale" });

      showGlobalAlert?.("تم تحديث العملية بنجاح", "success");
      getModal()?.hide();

    } catch (error) {
      console.error(error);
      track("transaction_create_failed", { feature_name: "transactions", action_type: "update", entry_point: "full_edit", failure_reason: "exception" });
      showGlobalAlert?.("حدث خطأ أثناء تحديث العملية", "danger");

    } finally {
      setButtonLoading?.(saveButton, false);
    }
  }

  async function onDelete() {
    const transactionId = Number(el(ids.id)?.value);
    if (!transactionId) return;

    const confirmed = await window.confirmDelete?.({ title: "تأكيد الحذف", message: "هل أنت متأكد من حذف هذه العملية نهائيًا؟" });
    if (!confirmed) return;

    if (typeof window.onDeleteTransaction === "function") {
      getModal()?.hide();
      await window.onDeleteTransaction(transactionId);
    }
  }

  /* Events | الأحداث */
  function bind() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(selectors.openButton);
      if (!button) return;
      open(button.dataset.id);
    });

    el(ids.type)?.addEventListener("change", () => {
      updateSupplierVisibility();
      updatePoster();
    });

    el(ids.product)?.addEventListener("change", onProductChange);
    el(ids.date)?.addEventListener("input", updatePoster);
    el(ids.quantity)?.addEventListener("input", updateTotal);
    el(ids.price)?.addEventListener("input", updateTotal);
    el(ids.save)?.addEventListener("click", save);
    el(ids.delete)?.addEventListener("click", onDelete);
  }

  return { bind };

})();

/* Auto start | تشغيل تلقائي */
document.addEventListener("DOMContentLoaded", () => {
  FullEditTransactionModule.bind();
});
