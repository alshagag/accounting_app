import { $ } from "./utils.js";
import { track } from "/analytics/gtag.js";

/* ================= Full Product Editor | محرر المنتج الكامل ================= */

const FullEditProductModule = (() => {
  /* Element IDs | معرفات العناصر */
  const ids = {
    modal: "fullEditProductModal",
    productId: "full_editProductId",
    productCode: "full_editProductCode",
    name: "full_editProductName",
    price: "full_editProductPrice",
    description: "full_editProductDesc",
    saveButton: "full_btnSaveEditProduct"
  };

  const selectors = {
    openButton: ".full-edit-product"
  };

  /* Field helpers | أدوات الحقول */
  function setFieldValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
  }

  // Local implementation of setButtonLoading to fix missing dependency
  const buttonLoadingState = new WeakMap();
  function setButtonLoading(button, isLoading, loadingText = "جاري الحفظ...") {
    if (!button) return;
    if (isLoading) {
      if (!buttonLoadingState.has(button)) {
        buttonLoadingState.set(button, button.innerHTML);
      }
      button.disabled = true;
      button.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> ${loadingText}`;
    } else {
      button.disabled = false;
      if (buttonLoadingState.has(button)) {
        button.innerHTML = buttonLoadingState.get(button);
        buttonLoadingState.delete(button);
      }
    }
  }

  /* Modal handling | إدارة النافذة */
  function getModal() {
    const modalElement = document.getElementById(ids.modal);
    if (!modalElement || !window.bootstrap) return null;

    return window.bootstrap.Modal.getOrCreateInstance(modalElement);
  }

  function showModal() {
    const editorModal = getModal();
    const productsModal = document.getElementById("productsModal");

    if (!editorModal) return;

    if (!productsModal?.classList.contains("show")) {
      editorModal.show();
      return;
    }

    productsModal.addEventListener("hidden.bs.modal", () => {
      editorModal.show();
    }, { once: true });

    window.bootstrap.Modal.getOrCreateInstance(productsModal)?.hide();
  }

  /* Open editor | فتح التعديل */
  async function open(productId) {
    const product = await window.getProductById(productId);
    if (!product) return;

    track("product_edit_started", { feature_name: "products", entry_point: "full_edit" });

    setFieldValue(ids.productId, product.id);
    setFieldValue(ids.productCode, product.code || product.id); // Fallback to id for old data
    setFieldValue(ids.name, product.name || "");
    setFieldValue(ids.price, product.price ?? "");
    setFieldValue(ids.description, product.description || "");

    showModal();
  }

  /* Save changes | حفظ التغييرات */
  async function save() {
    const saveButton = document.getElementById(ids.saveButton);

    const productId = document.getElementById(ids.productId)?.value;
    const code = document.getElementById(ids.productCode)?.value?.trim();
    const name = document.getElementById(ids.name)?.value?.trim();
    const price = parseFloat(document.getElementById(ids.price)?.value);
    const description = document.getElementById(ids.description)?.value?.trim() || "";

    if (!name || !code || isNaN(price)) {
      window.showGlobalAlert("يرجى إدخال بيانات المنتج بشكل صحيح", "warning");
      track("product_edit_failed", { feature_name: "products", entry_point: "full_edit", failure_reason: "validation" });
      return;
    }

    try {
      setButtonLoading(saveButton, true, "جاري تحديث المنتج...");

      const updated = await window.saveProductEdit(productId, { code, name, price, description });

      if (!updated) {
        window.showGlobalAlert("تعذر العثور على المنتج المطلوب", "warning");
        track("product_edit_failed", { feature_name: "products", entry_point: "full_edit", failure_reason: "not_found" });
        return;
      }

      await window.refreshProductsUI();

      track("product_edit_success", { feature_name: "products", entry_point: "full_edit" });

      window.showGlobalAlert("تم تحديث المنتج بنجاح", "success");
      getModal()?.hide();

    } catch (error) {
      console.error(error);
      track("product_edit_failed", { feature_name: "products", entry_point: "full_edit", failure_reason: "exception" });
      window.showGlobalAlert("حدث خطأ أثناء تحديث المنتج", "danger");

    } finally {
      setButtonLoading(saveButton, false);
    }
  }

  /* Events | الأحداث */
  function bind() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(selectors.openButton);
      if (!button) return;

      const productId = Number(button.dataset.id);
      if (productId) open(productId);
    });

    document
      .getElementById(ids.saveButton)
      ?.addEventListener("click", save);
  }

  return { bind };
})();

/* Auto start | تشغيل تلقائي */
document.addEventListener("DOMContentLoaded", () => {
  FullEditProductModule.bind();
});
