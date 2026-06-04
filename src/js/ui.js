import { $ } from "./utils.js";

/* ================= Helpers | الأدوات المساعدة ================= */

function escapeHtml(text) {
  if (text == null) return '';

  return text.toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* Button loading state | حالة تحميل الأزرار */
const buttonLoadingState = new WeakMap();

function setButtonLoading(button, isLoading, loadingText = "ط¬ط§ط±ظٹ ط§ظ„ط­ظپط¸...") {
  if (!button) return;

  if (isLoading) {
    if (!buttonLoadingState.has(button)) {
      buttonLoadingState.set(button, button.innerHTML);
    }

    button.disabled = true;
    button.innerHTML = `
      <span class="spinner-border spinner-border-sm me-1"></span>
      ${loadingText}
    `;
    return;
  }

  button.disabled = false;

  if (buttonLoadingState.has(button)) {
    button.innerHTML = buttonLoadingState.get(button);
    buttonLoadingState.delete(button);
  }
}

/* ================= UI Binding | ربط عناصر الواجهة ================= */

function bindUI() {

  const addBtn = $('btnAddProduct');
  const cancelBtn = $('btnCancelProduct');

  const saveTrans = $('btnSaveTrans');
  const cancelTrans = $('btnCancelTrans');

  const transType = $('transType');
  const transProduct = $('transProduct');

  if (addBtn && typeof window.onAddProductClick === "function") {
    addBtn.addEventListener('click', window.onAddProductClick);
  }

  if (cancelBtn && typeof window.onCancelProduct === "function") {
    cancelBtn.addEventListener('click', window.onCancelProduct);
  }

  if (saveTrans && typeof window.onSaveTransaction === "function") {
    saveTrans.addEventListener('click', window.onSaveTransaction);
  }

  if (cancelTrans && typeof window.onCancelTransaction === "function") {
    cancelTrans.addEventListener('click', window.onCancelTransaction);
  }

  if (transType && typeof window.onTransTypeChange === "function") {
    transType.addEventListener('change', window.onTransTypeChange);
  }

  if (transProduct && typeof window.onTransProductChange === "function") {
    transProduct.addEventListener('change', window.onTransProductChange);
  }
}

/* ================= Dashboard Stats | إحصائيات لوحة التحكم ================= */

function updateDashboardStats(transactions = []) {

  let totalSalesQty = 0;
  let totalPurchasesQty = 0;

  let totalSalesValue = 0;
  let totalPurchasesValue = 0;

  let lastDate = null;
  let lastText = "-";

  transactions.forEach(t => {

    const type = window.normalizeTransactionType?.(t.type) || "";

    const qty = Number(t.quantity) || 0;
    const total = Number(t.total) || (qty * (Number(t.price) || 0));

    const date = t.date ? new Date(t.date) : null;

    if (type === "بيع") {
      totalSalesQty += qty;
      totalSalesValue += total;
    }

    if (type === "شراء") {
      totalPurchasesQty += qty;
      totalPurchasesValue += total;
    }

    if (date && !isNaN(date) && (!lastDate || date > lastDate)) {
      lastDate = date;
      lastText = `${type} - ${t.product || ""}`;
    }
  });

  const set = (id, value) => {
    const el = $(id);
    if (el) el.textContent = value;
  };

  set("totalSales", totalSalesQty);
  set("totalPurchases", totalPurchasesQty);

  set("statSales", totalSalesValue.toFixed(2));
  set("statPurchases", totalPurchasesValue.toFixed(2));

  set(
    "statProfit",
    (totalSalesValue - totalPurchasesValue).toFixed(2)
  );

  set("lastTransaction", lastText);
}

/* ================= Global Exports | التصدير العام ================= */

window.bindUI = bindUI;
window.updateDashboardStats = updateDashboardStats;
window.setButtonLoading = setButtonLoading;
