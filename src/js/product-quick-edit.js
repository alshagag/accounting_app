

import { $ } from "./utils.js";

const QuickEditProductModule = (() => {
  const selectors = {
    openButton: ".quick-edit-product"
  };

  async function open(productId) {
    if (typeof window.onEditProduct === "function") {
      await window.onEditProduct(Number(productId));

      document.getElementById("productName")?.focus();
    } else {
      console.warn("onEditProduct is not defined");
    }
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(selectors.openButton);
      if (!button) return;

      if (!button.dataset.id) return;

      open(button.dataset.id);
    });
  }

  return { bind };
})();

/* Auto start | تشغيل تلقائي */
document.addEventListener("DOMContentLoaded", () => {
  QuickEditProductModule.bind();
});
