

import { $ } from "./utils.js";

/* ================= Full Product Editor | ظ…ط­ط±ط± ط§ظ„ظ…ظ†طھط¬ ط§ظ„ظƒط§ظ…ظ„ ================= */

const FullEditProductModule = (() => {
  /* Element IDs | ظ…ط¹ط±ظپط§طھ ط§ظ„ط¹ظ†ط§طµط± */
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

  /* Field helpers | ط£ط¯ظˆط§طھ ط§ظ„ط­ظ‚ظˆظ„ */
  function setFieldValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
  }

  /* Modal handling | ط¥ط¯ط§ط±ط© ط§ظ„ظ†ط§ظپط°ط© */
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

  /* Open editor | ظپطھط­ ط§ظ„طھط¹ط¯ظٹظ„ */
  async function open(productId) {
    if (typeof getProductById !== "function") return;

    const product = await getProductById(productId);
    if (!product) return;

    setFieldValue(ids.productId, product.id);
    setFieldValue(ids.productCode, product.id);
    setFieldValue(ids.name, product.name || "");
    setFieldValue(ids.price, product.price ?? "");
    setFieldValue(ids.description, product.description || "");

    showModal();
  }

  /* Save changes | ط­ظپط¸ ط§ظ„طھط؛ظٹظٹط±ط§طھ */
  async function save() {
    const saveButton = document.getElementById(ids.saveButton);

    const productId = document.getElementById(ids.productId)?.value;
    const name = document.getElementById(ids.name)?.value?.trim();
    const price = parseFloat(document.getElementById(ids.price)?.value);
    const description = document.getElementById(ids.description)?.value?.trim() || "";

    if (!name || isNaN(price)) {
      window.showGlobalAlert?.("ظٹط±ط¬ظ‰ ط¥ط¯ط®ط§ظ„ ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ظ†طھط¬ ط¨ط´ظƒظ„ طµط­ظٹط­", "warning");
      return;
    }

    if (typeof saveProductEdit !== "function") return;

    try {
      window.setButtonLoading?.(saveButton, true, "ط¬ط§ط±ظٹ طھط­ط¯ظٹط« ط§ظ„ظ…ظ†طھط¬...");

      const updated = await saveProductEdit(productId, { name, price, description });

      if (!updated) {
        window.showGlobalAlert?.("طھط¹ط°ط± ط§ظ„ط¹ط«ظˆط± ط¹ظ„ظ‰ ط§ظ„ظ…ظ†طھط¬ ط§ظ„ظ…ط·ظ„ظˆط¨", "warning");
        return;
      }

      if (typeof refreshProductsUI === "function") {
        await refreshProductsUI();
      }

      window.showGlobalAlert?.("طھظ… طھط­ط¯ظٹط« ط§ظ„ظ…ظ†طھط¬ ط¨ظ†ط¬ط§ط­", "success");
      getModal()?.hide();

    } catch (error) {
      console.error(error);
      window.showGlobalAlert?.("ط­ط¯ط« ط®ط·ط£ ط£ط«ظ†ط§ط، طھط­ط¯ظٹط« ط§ظ„ظ…ظ†طھط¬", "danger");

    } finally {
      window.setButtonLoading?.(saveButton, false);
    }
  }

  /* Events | ط§ظ„ط£ط­ط¯ط§ط« */
  function bind() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(selectors.openButton);
      if (!button) return;

      open(button.dataset.id);
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

