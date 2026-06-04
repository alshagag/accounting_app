

import { $ } from "./utils.js";

/* ================= Full Sale Editor | محرر البيع الكامل ================= */

const FullEditSaleModule = (() => {

  /* Element IDs | معرفات العناصر */
  const ids = {
    modal: "fullEditSaleModal",
    id: "full_sale_id",
    type: "full_sale_type",
    product: "full_sale_product",
    quantity: "full_sale_quantity",
    price: "full_sale_price",
    date: "full_sale_date",
    total: "full_sale_total",
    codePoster: "full_sale_codePoster",
    totalPoster: "full_sale_totalPoster",
    datePoster: "full_sale_datePoster",
    save: "full_sale_save"
  };

  const selectors = {
    openButton: ".full-edit-sale"
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
    const salesModal = el("salesModal");

    if (!editorModal) return;

    if (!salesModal?.classList.contains("show")) {
      editorModal.show();
      return;
    }

    salesModal.addEventListener("hidden.bs.modal", () => {
      editorModal.show();
    }, { once: true });

    bootstrap.Modal.getOrCreateInstance(salesModal)?.hide();
  }

  /* Totals and labels | الإجماليات والعناوين */
  function updateTotal() {
    const quantity = Number(el(ids.quantity)?.value) || 0;
    const price = Number(el(ids.price)?.value) || 0;
    const total = (quantity * price).toFixed(2);

    setValue(ids.total, total);
    setText(ids.totalPoster, `${total} ﷼`);
  }

  function updatePosters() {
    setText(ids.codePoster, el(ids.id)?.value || "-");
    setText(ids.datePoster, el(ids.date)?.value || "-");
    updateTotal();
  }

  /* Open editor | فتح التعديل */
  async function open(saleId) {
    if (typeof getTransactionById !== "function") return;

    const sale = await getTransactionById(saleId);
    if (!sale) return;

    setValue(ids.id, sale.id);
    setValue(ids.type, "بيع");
    setValue(ids.product, sale.product);
    setValue(ids.quantity, sale.quantity);
    setValue(ids.price, sale.price);
    setValue(ids.date, sale.date);

    updatePosters();
    showModal();
  }

  /* Save changes | حفظ التغييرات */
  async function save() {
    const saveButton = el(ids.save);

    const values = {
      type: "بيع",
      product: el(ids.product)?.value?.trim(),
      quantity: Number(el(ids.quantity)?.value),
      price: Number(el(ids.price)?.value),
      date: el(ids.date)?.value,
      supplier: ""
    };

    if (!values.product || !values.date || values.quantity <= 0 || values.price <= 0) {
      showGlobalAlert?.("يرجى إدخال بيانات البيع بشكل صحيح", "warning");
      return;
    }

    if (typeof saveTransactionEdit !== "function") return;

    try {
      setButtonLoading?.(saveButton, true, "جاري تحديث البيع...");

      const updated = await saveTransactionEdit(el(ids.id)?.value, values);

      if (!updated) {
        showGlobalAlert?.("تعذر العثور على عملية البيع", "warning");
        return;
      }

      if (typeof refreshTransactionsUI === "function") {
        await refreshTransactionsUI();
      }

      showGlobalAlert?.("تم تحديث البيع بنجاح", "success");
      getModal()?.hide();

    } catch (error) {
      console.error(error);
      showGlobalAlert?.("حدث خطأ أثناء تحديث البيع", "danger");

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

    el(ids.quantity)?.addEventListener("input", updateTotal);
    el(ids.price)?.addEventListener("input", updateTotal);
    el(ids.date)?.addEventListener("input", updatePosters);
    el(ids.save)?.addEventListener("click", save);
  }

  return { bind };

})();

/* Auto start | تشغيل تلقائي */
document.addEventListener("DOMContentLoaded", () => {
  FullEditSaleModule.bind();
});
