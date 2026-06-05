/* =========================
   Imports | الاستيرادات
========================= */
import { initApp } from "./db.js";
import { initTags } from "./gtag.js";

import "./confirm-dialog.js";
import "./ui.js";
import "./products.js";
import "./transactions.js";
import "./product-quick-edit.js";
import "./product-full-edit.js";
import "./sale-full-edit.js";
import "./transaction-full-edit.js";
import "./data-transfer.js";
import "./api/email.js";



/* =========================
   Global Errors | معالجة الأخطاء العامة
========================= */
window.addEventListener("error", (e) => {
  console.error("Global Error:", e.message);

  window.showGlobalAlert?.(
    "حدث خطأ غير متوقع، راجع الكونسول",
    "danger"
  );
});

/* =========================
   App Startup | تشغيل التطبيق
========================= */
document.addEventListener("DOMContentLoaded", async () => {
  console.log("APP START");

  try {
    initTags();  
    await initApp();
    console.log("APP READY");
  } catch (e) {
    console.error("Init Error:", e);

    window.showGlobalAlert?.(
      "حدث خطأ أثناء تشغيل التطبيق",
      "danger"
    );
  }
});

/* =========================
   Search Helpers | أدوات البحث
========================= */
function setupTableSearch(inputId, tableSelector) {
  const input = document.getElementById(inputId);

  input?.addEventListener("input", function () {
    const value = this.value.toLowerCase();

    document.querySelectorAll(`${tableSelector} tr`).forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(value)
        ? "table-row"
        : "none";
    });
  });
}

setupTableSearch("salesSearch", "#modalSalesTbody");
setupTableSearch("purchaseSearch", "#modalPurchaseTbody");

/* =========================
   Clear Search | مسح البحث
========================= */
window.clearSalesSearch = function () {
  document.getElementById("salesSearch").value = "";
  document
    .querySelectorAll("#modalSalesTbody tr")
    .forEach(row => (row.style.display = "table-row"));
};

window.clearPurchaseSearch = function () {
  document.getElementById("purchaseSearch").value = "";
  document
    .querySelectorAll("#modalPurchaseTbody tr")
    .forEach(row => (row.style.display = "table-row"));
};

/* =========================
   Modal Loaders | تحميل بيانات النوافذ
========================= */
const salesModal = document.getElementById("salesModal");
const purchasesModal = document.getElementById("purchasesModal");
const productsModal = document.getElementById("productsModal");

salesModal?.addEventListener("show.bs.modal", async () => {
  const getAllTransactions = window.getAllTransactions;
  const renderSalesModal = window.renderSalesModal;

  if (!getAllTransactions || !renderSalesModal) return;

  const data = await getAllTransactions();

  const sales = data.filter(
    t => (window.normalizeTransactionType?.(t.type) || "").trim() === "بيع"
  );

  renderSalesModal(sales);
});

purchasesModal?.addEventListener("show.bs.modal", async () => {
  const getAllTransactions = window.getAllTransactions;
  const renderPurchasesModal = window.renderPurchasesModal;

  if (!getAllTransactions || !renderPurchasesModal) return;

  const data = await getAllTransactions();

  const purchases = data.filter(
    t => (window.normalizeTransactionType?.(t.type) || "").trim() === "شراء"
  );

  renderPurchasesModal(purchases);
});

productsModal?.addEventListener("show.bs.modal", async () => {
  const getAllProducts = window.getAllProducts;
  const renderProductsModal = window.renderProductsModal;

  if (!getAllProducts || !renderProductsModal) return;

  const products = await getAllProducts();
  renderProductsModal(products);
});
