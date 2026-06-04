

import { $ } from "./utils.js";

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
    total: "full_tx_total",
    title: "full_tx_title",
    headerIcon: "full_tx_headerIcon",
    typePoster: "full_tx_typePoster",
    totalPoster: "full_tx_totalPoster",
    datePoster: "full_tx_datePoster",
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

    supplierRow?.classList.toggle('d-none', !isPurchase);

    if (!isPurchase) {
      setValue(ids.supplier, "");
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
    setText(ids.datePoster, el(ids.date)?.value || "-");

    const icon = el(ids.headerIcon);
    if (icon) {
      icon.className = isPurchase
        ? "bi bi-bag-check fs-5"
        : "bi bi-graph-up-arrow fs-5";
    }
  }

  /* Open editor | فتح التعديل */
  async function open(transactionId) {
    if (typeof getTransactionById !== "function") return;

    const transaction = await getTransactionById(transactionId);
    if (!transaction) return;

    setValue(ids.id, transaction.id);
    setValue(ids.code, transaction.id);
    setValue(ids.type, transaction.type);
    setValue(ids.product, transaction.product);
    setValue(ids.quantity, transaction.quantity);
    setValue(ids.price, transaction.price);
    setValue(ids.date, transaction.date);
    setValue(ids.supplier, transaction.supplier || "");

    updateSupplierVisibility();
    updatePoster();
    updateTotal();
    showModal();
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
      supplier: el(ids.supplier)?.value?.trim() || ""
    };

    if (!values.product || !values.date || values.quantity <= 0 || values.price <= 0) {
      showGlobalAlert?.("يرجى إدخال بيانات العملية بشكل صحيح", "warning");
      return;
    }

    if (isPurchaseType(values.type) && !values.supplier) {
      showGlobalAlert?.("يرجى إدخال اسم المورد", "warning");
      return;
    }

    if (typeof saveTransactionEdit !== "function") return;

    try {
      setButtonLoading?.(saveButton, true, "جاري تحديث العملية...");

      const updated = await saveTransactionEdit(el(ids.id)?.value, values);

      if (!updated) {
        showGlobalAlert?.("تعذر العثور على العملية المطلوبة", "warning");
        return;
      }

      if (typeof refreshTransactionsUI === "function") {
        await refreshTransactionsUI();
      }

      showGlobalAlert?.("تم تحديث العملية بنجاح", "success");
      getModal()?.hide();

    } catch (error) {
      console.error(error);
      showGlobalAlert?.("حدث خطأ أثناء تحديث العملية", "danger");

    } finally {
      setButtonLoading?.(saveButton, false);
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

    el(ids.date)?.addEventListener("input", updatePoster);
    el(ids.quantity)?.addEventListener("input", updateTotal);
    el(ids.price)?.addEventListener("input", updateTotal);
    el(ids.save)?.addEventListener("click", save);
  }

  return { bind };

})();

/* Auto start | تشغيل تلقائي */
document.addEventListener("DOMContentLoaded", () => {
  FullEditTransactionModule.bind();
});
