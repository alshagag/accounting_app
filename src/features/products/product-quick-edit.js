import { $ } from "@/services/lib/utils.js";

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
    // ربط الأحداث يتم مركزيًا في initApp.js | Event binding is centralized in initApp.js
  }

  return { bind };
})();

/* التشغيل التلقائي والربط مركزيان في initApp.js | Auto-start and binding are centralized in initApp.js */
