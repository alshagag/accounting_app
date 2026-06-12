/* =========================
   Imports | الاستيرادات
========================= */
import { initApp } from "./db.js";
import { initTags } from "../utils/gtag.js";



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


/* =========================
   Period Profit | أرباح فترة محددة
   Date Range Profit
========================= */
async function calculatePeriodProfit() {

  console.log("START calculatePeriodProfit");

  const fromDate = document.getElementById("profitFromDate")?.value;
  const toDate = document.getElementById("profitToDate")?.value;

  console.log("INPUT DATES:", { fromDate, toDate });

  if (!fromDate || !toDate) {
    console.warn("MISSING DATES");

    // fallback: full range if empty | عرض كامل إذا بدون فترة
    return loadFullProfit();
  }

  // Save range | حفظ الفترة
  localStorage.setItem("profitFromDate", fromDate);
  localStorage.setItem("profitToDate", toDate);

  // Info text | نص المعلومات
  const infoEl = document.getElementById("periodInfo");
  if (infoEl) {
    infoEl.textContent =
      `قائمة الأرباح والخسائر من ${fromDate} إلى ${toDate}`;
  }

  const getAllTransactions = window.getAllTransactions;

  if (typeof getAllTransactions !== "function") {
    console.error("getAllTransactions NOT FOUND");
    return;
  }

  const data = await getAllTransactions();

  if (!Array.isArray(data)) {
    console.error("INVALID DATA");
    return;
  }

  let totalSales = 0;
  let totalPurchases = 0;

  let salesCount = 0;
  let purchasesCount = 0;
  let filteredCount = 0;

  for (const t of data) {

    if (!t?.date) continue;

    const date = String(t.date).slice(0, 10);

    if (date < fromDate || date > toDate) continue;

    filteredCount++;

    const type = (window.normalizeTransactionType?.(t.type) || "").trim();

    const price = Number(t.price) || 0;
    const qty = Number(t.quantity ?? t.qty ?? 0);

    const total = price * qty;

    if (type === "بيع") {
      totalSales += total;
      salesCount++;
    } 
    else if (type === "شراء") {
      totalPurchases += total;
      purchasesCount++;
    }
  }

  const profit = totalSales - totalPurchases;

  // =========================
  // Update UI | تحديث الواجهة
  // =========================

  updateUI(totalSales, totalPurchases, profit);

  console.log("FINAL RESULT:", {
    totalSales,
    totalPurchases,
    profit,
    salesCount,
    purchasesCount,
    filteredCount
  });
}


/* =========================
   Full Range Loader | عرض كامل البيانات
========================= */
async function loadFullProfit() {

  console.log("LOAD FULL RANGE");

  const getAllTransactions = window.getAllTransactions;
  const data = await getAllTransactions();

  let totalSales = 0;
  let totalPurchases = 0;

  for (const t of data || []) {

    const type = (window.normalizeTransactionType?.(t.type) || "").trim();

    const price = Number(t.price) || 0;
    const qty = Number(t.quantity ?? t.qty ?? 0);

    const total = price * qty;

    if (type === "بيع") totalSales += total;
    else if (type === "شراء") totalPurchases += total;
  }

  const profit = totalSales - totalPurchases;

  updateUI(totalSales, totalPurchases, profit);

  const infoEl = document.getElementById("periodInfo");
  if (infoEl) {
    infoEl.textContent = "عرض كامل البيانات (كل السنوات)";
  }

  // clear inputs | تنظيف الحقول
  document.getElementById("profitFromDate").value = "";
  document.getElementById("profitToDate").value = "";
}


/* =========================
   UI Update | تحديث الواجهة
========================= */
function updateUI(totalSales, totalPurchases, profit) {

  const salesEl = document.getElementById("statSales");
  const purchasesEl = document.getElementById("statPurchases");
  const profitEl = document.getElementById("statProfit");
  const periodEl = document.getElementById("periodProfitValue");

  if (salesEl) salesEl.textContent = totalSales.toFixed(2);
  if (purchasesEl) purchasesEl.textContent = totalPurchases.toFixed(2);
  if (profitEl) profitEl.textContent = profit.toFixed(2);
  if (periodEl) periodEl.textContent = profit.toFixed(2);

  console.log("UPDATED UI");
}


/* =========================
   Button Event | زر التشغيل
========================= */
document.addEventListener("DOMContentLoaded", () => {

  console.log("DOM READY");

  const btn = document.getElementById("btnCalculatePeriodProfit");

  if (!btn) {
    console.error("Button not found");
    return;
  }

  btn.addEventListener("click", () => {
    console.log("BUTTON CLICKED");
    calculatePeriodProfit();
  });

});

document.getElementById("btnResetStats")?.addEventListener("click", () => {

  console.log("RESET CLICKED");

  // clear inputs
  document.getElementById("profitFromDate").value = "";
  document.getElementById("profitToDate").value = "";

  // remove saved range
  localStorage.removeItem("profitFromDate");
  localStorage.removeItem("profitToDate");

  // load full data
  loadFullProfit();
});