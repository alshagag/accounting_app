import { $ } from "./utils.js";

/* ================= State | الحالة العامة ================= */

window.editTransactionId = window.editTransactionId ?? null;
window.showAllSales = window.showAllSales ?? false;
window.showAllPurchases = window.showAllPurchases ?? false;

/* ================= Helpers | الأدوات المساعدة ================= */

function escapeHtml(str) {
  if (str === null || str === undefined) return "";

  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[s]));
}

function showGlobalAlert(message, type = "info", timeout = 4000) {
  const alert = $("globalAlert");
  if (!alert) return;

  alert.className = `alert alert-${type}`;
  alert.innerHTML = message;
  alert.style.display = "block";

  if (timeout > 0) {
    window.clearTimeout(showGlobalAlert.timer);
    showGlobalAlert.timer = window.setTimeout(() => {
      alert.style.display = "none";
    }, timeout);
  }
}

function normalizeTransactionType(type) {
  const value = String(type || "").trim();

  if (["بيع", "sale", "sales"].includes(value.toLowerCase())) return "بيع";
  if (["شراء", "purchase", "purchases"].includes(value.toLowerCase())) return "شراء";

  return value;
}

function isPurchaseType(type) {
  return normalizeTransactionType(type) === "شراء";
}

function isFallbackMode() {
  return Boolean(window.useFallback);
}

/* ================= Data Access | الوصول للبيانات ================= */

async function getAllTransactions() {
  if (isFallbackMode()) {
    return window.getFallbackTransactions?.() || [];
  }

  if (!window.idbGetAll || !window.STORE_TRANSACTIONS) {
    throw new Error("DB functions are not ready");
  }

  return await window.idbGetAll(window.STORE_TRANSACTIONS);
}

async function getTransactionById(id) {
  const transactionId = Number(id);
  const transactions = await getAllTransactions();

  return transactions.find(t => Number(t.id) === transactionId) || null;
}

/* ================= Form Values | قراءة بيانات النموذج ================= */

function getTransactionFormValues() {
  const type = normalizeTransactionType($("transType")?.value);
  const product = $("transProduct")?.value?.trim() || "";
  const quantity = Number($("transQty")?.value);
  const price = Number($("transPrice")?.value);
  const date = $("transDate")?.value || "";
  const supplier = isPurchaseType(type)
    ? $("transSupplier")?.value?.trim() || ""
    : "";

  return {
    type,
    product,
    quantity,
    price,
    total: Number((quantity * price).toFixed(2)),
    date,
    supplier
  };
}

/* ================= Validation | التحقق من البيانات ================= */

function validateTransaction(values) {
  if (!values.product) {
    showGlobalAlert("اختر منتجًا", "warning");
    $("transProduct")?.focus();
    return false;
  }

  if (!Number.isFinite(values.quantity) || values.quantity <= 0) {
    showGlobalAlert("أدخل كمية صحيحة", "warning");
    $("transQty")?.focus();
    return false;
  }

  if (!Number.isFinite(values.price) || values.price <= 0) {
    showGlobalAlert("أدخل سعرًا صحيحًا", "warning");
    $("transPrice")?.focus();
    return false;
  }

  if (!values.date) {
    showGlobalAlert("اختر تاريخ العملية", "warning");
    $("transDate")?.focus();
    return false;
  }

  if (isPurchaseType(values.type) && !values.supplier) {
    showGlobalAlert("أدخل اسم المورد", "warning");
    $("transSupplier")?.focus();
    return false;
  }

  return true;
}

/* ================= Form UI | واجهة النموذج ================= */

function setSupplierVisibility(type) {
  const supplierRow = $("supplierRow");
  if (!supplierRow) return;

  const show = isPurchaseType(type);
  supplierRow.classList.toggle("d-none", !show);
  supplierRow.style.display = show ? "block" : "none";

  if (!show && $("transSupplier")) {
    $("transSupplier").value = "";
  }
}

/* ================= Form Events | أحداث النموذج ================= */

function onTransTypeChange() {
  setSupplierVisibility($("transType")?.value);
}

async function onTransProductChange() {
  const chosen = $("transProduct")?.value;
  if (!chosen) return;

  try {
    const products = isFallbackMode()
      ? window.getFallbackProducts?.() || []
      : await window.idbGetAll(window.STORE_PRODUCTS);

    const product = products.find(p => p.name === chosen);
    if (product && $("transPrice")) {
      $("transPrice").value = product.price;
    }
  } catch (error) {
    console.error("onTransProductChange error:", error);
  }
}

/* ================= Create / Update | الإضافة والتحديث ================= */

async function addTransaction() {
  const saveButton = $("btnSaveTrans");
  const values = getTransactionFormValues();

  if (!validateTransaction(values)) return;

  try {
    window.setButtonLoading?.(saveButton, true, "جاري حفظ العملية...");

    if (isFallbackMode()) {
      const transactions = window.getFallbackTransactions?.() || [];
      transactions.push({ id: Date.now(), ...values });
      window.setFallbackTransactions?.(transactions);
    } else {
      await window.idbAdd(window.STORE_TRANSACTIONS, values);
    }

    await refreshTransactionsUI();
    clearTransactionForm();
    showGlobalAlert("تم حفظ العملية بنجاح", "success");
  } catch (error) {
    console.error("addTransaction error:", error);
    showGlobalAlert("تعذر حفظ العملية في قاعدة البيانات", "danger");
  } finally {
    window.setButtonLoading?.(saveButton, false);
  }
}

async function updateTransaction() {
  const saveButton = $("btnSaveTrans");
  const transactionId = Number(window.editTransactionId);
  const values = getTransactionFormValues();

  if (!transactionId || !validateTransaction(values)) return;

  try {
    window.setButtonLoading?.(saveButton, true, "جاري تحديث العملية...");

    const updated = await saveTransactionEdit(transactionId, values);
    if (!updated) {
      showGlobalAlert("تعذر العثور على العملية المطلوبة", "warning");
      return;
    }

    window.editTransactionId = null;
    $("btnCancelTrans")?.classList.add("d-none");
    if ($("btnCancelTrans")) $("btnCancelTrans").style.display = "none";
    if (saveButton) saveButton.innerHTML = '<i class="bi bi-save"></i> ارسل العملية';

    await refreshTransactionsUI();
    clearTransactionForm();
    showGlobalAlert("تم تحديث العملية بنجاح", "success");
  } catch (error) {
    console.error("updateTransaction error:", error);
    showGlobalAlert("حدث خطأ أثناء تحديث العملية", "danger");
  } finally {
    window.setButtonLoading?.(saveButton, false);
  }
}

async function saveTransactionEdit(id, values) {
  const transactionId = Number(id);
  const normalized = {
    ...values,
    type: normalizeTransactionType(values.type),
    quantity: Number(values.quantity),
    price: Number(values.price),
    total: Number((Number(values.quantity) * Number(values.price)).toFixed(2)),
    supplier: isPurchaseType(values.type) ? values.supplier || "" : ""
  };

  if (isFallbackMode()) {
    const transactions = window.getFallbackTransactions?.() || [];
    const index = transactions.findIndex(t => Number(t.id) === transactionId);
    if (index === -1) return false;

    transactions[index] = { ...transactions[index], ...normalized, id: transactionId };
    window.setFallbackTransactions?.(transactions);
    return true;
  }

  const current = await getTransactionById(transactionId);
  if (!current) return false;

  await window.idbPut(window.STORE_TRANSACTIONS, {
    ...current,
    ...normalized,
    id: transactionId
  });

  return true;
}

/* ================= Save Actions | إجراءات الحفظ ================= */

function onSaveTransaction() {
  if (window.editTransactionId) {
    updateTransaction();
    return;
  }

  addTransaction();
}

function onCancelTransaction() {
  window.editTransactionId = null;

  const button = $("btnSaveTrans");
  const cancel = $("btnCancelTrans");

  if (cancel) {
    cancel.classList.add("d-none");
    cancel.style.display = "none";
  }

  if (button) {
    button.innerHTML = '<i class="bi bi-save"></i> ارسل العملية';
  }

  clearTransactionForm();
}

/* ================= Edit Form | نموذج التعديل ================= */

function clearTransactionForm() {
  if ($("transType")) $("transType").value = "بيع";
  if ($("transProduct")) $("transProduct").value = "";
  if ($("transQty")) $("transQty").value = "";
  if ($("transPrice")) $("transPrice").value = "";
  if ($("transSupplier")) $("transSupplier").value = "";

  setDefaultDate();
  setSupplierVisibility("بيع");
}

function selectTransactionProduct(productName) {
  const select = $("transProduct");
  if (!select) return;

  select.value = productName || "";
  if (productName && select.value !== productName) {
    const option = document.createElement("option");
    option.value = productName;
    option.textContent = productName;
    option.selected = true;
    select.appendChild(option);
  }
}

async function fillTransactionFormForEdit(id) {
  const transaction = await getTransactionById(id);
  if (!transaction) return;

  if ($("transType")) $("transType").value = normalizeTransactionType(transaction.type);
  selectTransactionProduct(transaction.product || "");
  if ($("transQty")) $("transQty").value = transaction.quantity ?? "";
  if ($("transPrice")) $("transPrice").value = transaction.price ?? "";
  if ($("transDate")) $("transDate").value = transaction.date || "";
  if ($("transSupplier")) $("transSupplier").value = transaction.supplier || "";

  window.editTransactionId = Number(transaction.id);
  setSupplierVisibility(transaction.type);

  const cancel = $("btnCancelTrans");
  if (cancel) {
    cancel.classList.remove("d-none");
    cancel.style.display = "inline-block";
  }

  const button = $("btnSaveTrans");
  if (button) {
    button.innerHTML = '<i class="bi bi-pencil-square"></i> تحديث';
  }

  ["salesModal", "purchasesModal"].forEach(modalId => {
    const modal = $(modalId);
    if (modal?.classList.contains("show") && window.bootstrap) {
      window.bootstrap.Modal.getOrCreateInstance(modal).hide();
    }
  });

  document.querySelector("#btnSaveTrans")?.scrollIntoView({
    behavior: "smooth",
    block: "center"
  });
}

/* ================= Delete Transaction | حذف العملية ================= */

async function onDeleteTransaction(id) {
  const confirmed = await window.confirmDelete?.({
    title: "حذف العملية",
    message: "هل تريد تأكيد حذف هذه العملية؟",
    detail: "سيتم حذف العملية من سجلات المبيعات والمشتريات ولا يمكن التراجع عنها.",
    confirmText: "حذف العملية"
  });

  if (!confirmed) return;

  try {
    if (isFallbackMode()) {
      const transactions = (window.getFallbackTransactions?.() || [])
        .filter(t => Number(t.id) !== Number(id));
      window.setFallbackTransactions?.(transactions);
    } else {
      await window.idbDelete(window.STORE_TRANSACTIONS, Number(id));
    }

    await refreshTransactionsUI();
    showGlobalAlert("تم حذف العملية بنجاح", "success");
  } catch (error) {
    console.error("onDeleteTransaction error:", error);
    showGlobalAlert("فشل حذف العملية", "danger");
  }
}

/* ================= Table Actions | أزرار الجداول ================= */

function renderActionButtons(transaction, options = {}) {
  const editButton = options.fullEdit
    ? `
      <button class="btn btn-sm btn-outline-secondary action-square full-edit-transaction" data-id="${transaction.id}" title="تعديل كامل">
        <i class="bi bi-pencil-square"></i>
      </button>
    `
    : `
      <button class="btn btn-sm btn-warning me-1" onclick="onEditTransaction(${transaction.id})" title="تعديل سريع">
        <i class="bi bi-pencil"></i>
      </button>
    `;

  return `
    ${editButton}
    <button class="btn btn-sm btn-danger" onclick="onDeleteTransaction(${transaction.id})" title="حذف">
      <i class="bi bi-trash"></i>
    </button>
  `;
}

function setActionNote(tbody, text) {
  const tableWrap = tbody?.closest(".table-responsive");
  if (!tableWrap) return;

  let note = tableWrap.previousElementSibling;
  if (!note?.classList.contains("action-note")) {
    note = document.createElement("div");
    note.className = "action-note";
    tableWrap.parentElement.insertBefore(note, tableWrap);
  }

  note.textContent = text;
}

/* ================= Rendering | العرض ================= */

function renderEmptyRow(tbody, colspan, message) {
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}" class="text-muted py-3">${message}</td>
    </tr>
  `;
}

function renderTransactionsTable(transactions) {
  const salesTbody = $("salesTbody");
  const purchaseTbody = $("purchaseTbody");

  if (!salesTbody || !purchaseTbody) return;

  salesTbody.innerHTML = "";
  purchaseTbody.innerHTML = "";
  setActionNote(salesTbody, "القلم الأصفر: تعديل سريع.");
  setActionNote(purchaseTbody, "القلم الأصفر: تعديل سريع.");

  const sales = transactions.filter(t => normalizeTransactionType(t.type) === "بيع");
  const purchases = transactions.filter(t => normalizeTransactionType(t.type) === "شراء");

  if (!sales.length) {
    renderEmptyRow(salesTbody, 6, "لا توجد مبيعات");
  } else {
    sales.slice(0, 4).forEach(t => {
      const total = Number(t.total ?? Number(t.quantity) * Number(t.price));
      salesTbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${escapeHtml(t.date)}</td>
          <td>${escapeHtml(t.product)}</td>
          <td>${Number(t.quantity)}</td>
          <td>${Number(t.price).toFixed(2)}</td>
          <td>${total.toFixed(2)}</td>
          <td>${renderActionButtons(t)}</td>
        </tr>
      `);
    });
  }

  if (!purchases.length) {
    renderEmptyRow(purchaseTbody, 7, "لا توجد مشتريات");
  } else {
    purchases.slice(0, 4).forEach(t => {
      const total = Number(t.total ?? Number(t.quantity) * Number(t.price));
      purchaseTbody.insertAdjacentHTML("beforeend", `
        <tr>
          <td>${escapeHtml(t.date)}</td>
          <td>${escapeHtml(t.product)}</td>
          <td>${Number(t.quantity)}</td>
          <td>${Number(t.price).toFixed(2)}</td>
          <td>${total.toFixed(2)}</td>
          <td>${escapeHtml(t.supplier || "")}</td>
          <td>${renderActionButtons(t)}</td>
        </tr>
      `);
    });
  }
}

function renderSalesModal(sales) {
  const tbody = $("modalSalesTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  setActionNote(tbody, "القلم الرمادي: تعديل كامل.");

  if (!sales?.length) {
    renderEmptyRow(tbody, 6, "لا توجد مبيعات");
    return;
  }

  sales.forEach(t => {
    const total = Number(t.total ?? Number(t.quantity) * Number(t.price));
    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${escapeHtml(t.date)}</td>
        <td>${escapeHtml(t.product)}</td>
        <td>${Number(t.quantity)}</td>
        <td>${Number(t.price).toFixed(2)}</td>
        <td>${total.toFixed(2)}</td>
        <td>${renderActionButtons(t, { fullEdit: true })}</td>
      </tr>
    `);
  });
}

function renderPurchasesModal(purchases) {
  const tbody = $("modalPurchaseTbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  setActionNote(tbody, "القلم الرمادي: تعديل كامل.");

  if (!purchases?.length) {
    renderEmptyRow(tbody, 7, "لا توجد مشتريات");
    return;
  }

  purchases.forEach(t => {
    const total = Number(t.total ?? Number(t.quantity) * Number(t.price));
    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${escapeHtml(t.date)}</td>
        <td>${escapeHtml(t.product)}</td>
        <td>${Number(t.quantity)}</td>
        <td>${Number(t.price).toFixed(2)}</td>
        <td>${total.toFixed(2)}</td>
        <td>${escapeHtml(t.supplier || "")}</td>
        <td>${renderActionButtons(t, { fullEdit: true })}</td>
      </tr>
    `);
  });
}

function renderProductsModal(products) {
  const tbody = $("modalProductsTbody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!products?.length) {
    renderEmptyRow(tbody, 3, "لا توجد منتجات");
    return;
  }

  products.forEach(product => {
    tbody.insertAdjacentHTML("beforeend", `
      <tr>
        <td>${escapeHtml(product.name)}</td>
        <td>${Number(product.price).toFixed(2)}</td>
        <td>
          <button class="btn btn-sm btn-warning full-edit-product" data-id="${product.id}" title="تعديل">
            <i class="bi bi-pencil"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="onDeleteProduct(${product.id})" title="حذف">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `);
  });
}

/* ================= UI Refresh | تحديث الواجهة ================= */

async function loadTransactionsToUI() {
  try {
    const transactions = await getAllTransactions();
    transactions.sort((a, b) => {
      const dateCompare = new Date(b.date || 0) - new Date(a.date || 0);
      return dateCompare || (Number(b.id) || 0) - (Number(a.id) || 0);
    });

    renderTransactionsTable(transactions);
    updateDashboardStats(transactions);
  } catch (error) {
    console.error("loadTransactionsToUI error:", error);
    showGlobalAlert("خطأ في تحميل العمليات", "danger");
  }
}

async function refreshTransactionsUI() {
  await loadTransactionsToUI();

  const transactions = await getAllTransactions();

  if ($("salesModal")?.classList.contains("show")) {
    renderSalesModal(transactions.filter(t => normalizeTransactionType(t.type) === "بيع"));
  }

  if ($("purchasesModal")?.classList.contains("show")) {
    renderPurchasesModal(transactions.filter(t => normalizeTransactionType(t.type) === "شراء"));
  }
}

/* ================= Defaults | القيم الافتراضية ================= */

function setDefaultDate() {
  const dateInput = $("transDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
}

/* ================= Global Exports | التصدير العام ================= */

window.showGlobalAlert = showGlobalAlert;
window.normalizeTransactionType = normalizeTransactionType;
window.onTransTypeChange = onTransTypeChange;
window.onTransProductChange = onTransProductChange;
window.onSaveTransaction = onSaveTransaction;
window.onCancelTransaction = onCancelTransaction;
window.addTransaction = addTransaction;
window.updateTransaction = updateTransaction;
window.loadTransactionsToUI = loadTransactionsToUI;
window.refreshTransactionsUI = refreshTransactionsUI;
window.getAllTransactions = getAllTransactions;
window.getTransactionById = getTransactionById;
window.saveTransactionEdit = saveTransactionEdit;
window.onEditTransaction = fillTransactionFormForEdit;
window.onDeleteTransaction = onDeleteTransaction;
window.renderSalesModal = renderSalesModal;
window.renderPurchasesModal = renderPurchasesModal;
window.renderProductsModal = renderProductsModal;
window.setDefaultDate = setDefaultDate;

export {
  addTransaction,
  updateTransaction,
  loadTransactionsToUI,
  refreshTransactionsUI,
  getAllTransactions,
  getTransactionById,
  saveTransactionEdit
};
