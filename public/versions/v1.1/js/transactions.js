import { $ } from "./utils.js";
import { track } from "/analytics/gtag.js";

let editTransactionId = null;

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"']/g, s => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[s]));
}

function setDefaultDate() {
  const dateInput = $("transDate");
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().slice(0, 10);
  }
}

function onTransTypeChange() {
  const type = $("transType")?.value;
  const supplierRow = $("supplierRow");
  const customerPhoneRow = $("customerPhoneRow");

  if (supplierRow) supplierRow.style.display = type === 'شراء' ? 'block' : 'none';
  if (customerPhoneRow) customerPhoneRow.style.display = type === 'بيع' ? 'block' : 'none';
}

async function onTransProductChange() {
  const chosen = $("transProduct")?.value;
  if (!chosen) return;

  const products = window.useFallback ? window.getFallbackProducts?.() : await window.idbGetAll?.(window.STORE_PRODUCTS);
  const product = (products || []).find(p => p.name === chosen);
  if (product && $("transPrice")) {
    $("transPrice").value = product.price;
  }
}

function onSaveTransaction() {
  if (editTransactionId) {
    updateTransaction();
  } else {
    addTransaction();
  }
}

function clearTransactionForm() {
  if ($("transType")) $("transType").value = 'بيع';
  if ($("transProduct")) $("transProduct").value = '';
  if ($("transQty")) $("transQty").value = '';
  if ($("transPrice")) $("transPrice").value = '';
  if ($("transSupplier")) $("transSupplier").value = '';
  if ($("transCustomerPhone")) $("transCustomerPhone").value = '';
  setDefaultDate();
  onTransTypeChange();
}

function onCancelTransaction() {
  editTransactionId = null;
  const cancelBtn = $("btnCancelTrans");
  if (cancelBtn) cancelBtn.style.display = 'none';
  const saveBtn = $("btnSaveTrans");
  if (saveBtn) saveBtn.innerHTML = '<i class="bi bi-save"></i> ارسل العملية';
  clearTransactionForm();
}

async function addTransaction() {
  const type = $("transType")?.value;
  const product = $("transProduct")?.value;
  const quantity = parseFloat($("transQty")?.value);
  const price = parseFloat($("transPrice")?.value);
  const date = $("transDate")?.value;
  const supplier = type === 'شراء' ? $("transSupplier")?.value.trim() : '';
  const customerPhone = type === 'بيع' ? $("transCustomerPhone")?.value.trim() : '';

  if (!product) { window.showGlobalAlert?.('اختر منتج', 'warning'); return; }
  if (isNaN(quantity) || quantity <= 0) { window.showGlobalAlert?.('أدخل كمية صحيحة', 'warning'); return; }
  if (isNaN(price) || price <= 0) { window.showGlobalAlert?.('أدخل سعر صحيح', 'warning'); return; }
  if (!date) { window.showGlobalAlert?.('اختر تاريخ العملية', 'warning'); return; }

  const values = { type, product, quantity, price, total: +(quantity * price).toFixed(2), date, supplier, customerPhone };

  try {
    if (window.useFallback) {
      const arr = window.getFallbackTransactions?.() || [];
      arr.push({ id: Date.now(), ...values });
      window.setFallbackTransactions?.(arr);
    } else {
      await window.idbAdd(window.STORE_TRANSACTIONS, values);
    }
    window.showGlobalAlert?.('تم حفظ العملية', 'success');
    track("transaction_create_success", { feature_name: "transactions", doc_type: type === 'شراء' ? "purchase" : "sale", method: window.useFallback ? "fallback" : "indexeddb" });
    loadTransactionsToUI();
    clearTransactionForm();
  } catch (e) {
    console.error("addTransaction error:", e);
    track("transaction_create_failed", { feature_name: "transactions", failure_reason: "db_error", doc_type: type === 'شراء' ? "purchase" : "sale" });
    window.showGlobalAlert?.("خطأ في حفظ العملية", "danger");
  }
}

async function updateTransaction() {
    if (!editTransactionId) return;
    const type = $("transType")?.value;
    const product = $("transProduct")?.value;
    const quantity = parseFloat($("transQty")?.value);
    const price = parseFloat($("transPrice")?.value);
    const date = $("transDate")?.value;
    const supplier = type === 'شراء' ? $("transSupplier")?.value.trim() : '';
    const customerPhone = type === 'بيع' ? $("transCustomerPhone")?.value.trim() : '';

    if (!product || isNaN(quantity) || quantity <= 0 || isNaN(price) || price <= 0 || !date) {
        window.showGlobalAlert?.('يرجى تعبئة الحقول بشكل صحيح', 'warning');
        return;
    }

    const values = { type, product, quantity, price, total: +(quantity * price).toFixed(2), date, supplier, customerPhone };

    try {
        if (window.useFallback) {
            const arr = window.getFallbackTransactions?.() || [];
            const idx = arr.findIndex(x => x.id === editTransactionId);
            if (idx !== -1) {
                arr[idx] = { ...arr[idx], ...values, id: editTransactionId };
                window.setFallbackTransactions?.(arr);
            }
        } else {
            await window.idbPut(window.STORE_TRANSACTIONS, { id: editTransactionId, ...values });
        }
        window.showGlobalAlert?.('تم تحديث العملية', 'success');
        track("transaction_create_success", { feature_name: "transactions", action_type: "update", doc_type: type === 'شراء' ? "purchase" : "sale", method: window.useFallback ? "fallback" : "indexeddb" });
        onCancelTransaction();
        loadTransactionsToUI();
    } catch (e) {
        console.error("updateTransaction error:", e);
        track("transaction_create_failed", { feature_name: "transactions", action_type: "update", failure_reason: "db_error", doc_type: type === 'شراء' ? "purchase" : "sale" });
        window.showGlobalAlert?.("خطأ أثناء تحديث العملية", "danger");
    }
}

window.onEditTransaction = async function(id) {
  const transactions = window.useFallback ? window.getFallbackTransactions?.() : await window.idbGetAll?.(window.STORE_TRANSACTIONS);
  const t = (transactions || []).find(x => x.id === id);
  if (t) {
    $("transType").value = t.type;
    $("transProduct").value = t.product;
    $("transQty").value = t.quantity;
    $("transPrice").value = t.price;
    $("transDate").value = t.date;
    $("transSupplier").value = t.supplier || '';
    $("transCustomerPhone").value = t.customerPhone || '';
    onTransTypeChange();
    editTransactionId = id;
    track("transaction_edit_started", { feature_name: "transactions", entry_point: "quick_form", doc_type: t.type === 'شراء' ? "purchase" : "sale" });

    const salesModalEl = $('salesModal');
    if (salesModalEl?.classList.contains('show') && window.bootstrap) {
      bootstrap.Modal.getInstance(salesModalEl)?.hide();
    }
    const purchasesModalEl = $('purchasesModal');
    if (purchasesModalEl?.classList.contains('show') && window.bootstrap) {
      bootstrap.Modal.getInstance(purchasesModalEl)?.hide();
    }
    $("btnCancelTrans").style.display = 'inline-block';
    $("btnSaveTrans").innerHTML = '<i class="bi bi-pencil-square"></i> تحديث';
    $("transType")?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function updateTransactionTables(transactions) {
  transactions.sort((a, b) => new Date(b.date) - new Date(a.date) || (b.id || 0) - (a.id || 0));

  const salesTbody = $("salesTbody");
  const purchaseTbody = $("purchaseTbody");
  salesTbody.innerHTML = '';
  purchaseTbody.innerHTML = '';

  let totalSalesValue = 0;
  let totalPurchasesValue = 0;
  let totalSalesQty = 0;
  let totalPurchasesQty = 0;

  const sales = transactions.filter(t => t.type === 'بيع');
  const purchases = transactions.filter(t => t.type === 'شراء');

  if (sales.length === 0) {
    salesTbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-3">لا توجد مبيعات</td></tr>`;
  } else {
    sales.forEach(t => {
      const itemTotal = (t.quantity || 0) * (t.price || 0);
      totalSalesValue += itemTotal;
      totalSalesQty += (t.quantity || 0);
      salesTbody.innerHTML += `<tr>
        <td>${escapeHtml(t.date)}</td>
        <td>${escapeHtml(t.product)}</td>
        <td>${t.quantity}</td>
        <td>${Number(t.price || 0).toFixed(2)}</td>
        <td>${itemTotal.toFixed(2)}</td>
        <td>${escapeHtml(t.customerPhone || '')}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="onEditTransaction(${t.id})" title="تعديل سريع"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger" onclick="onDeleteTransaction(${t.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
    });
  }

  if (purchases.length === 0) {
    purchaseTbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-3">لا توجد مشتريات</td></tr>`;
  } else {
    purchases.forEach(t => {
      const itemTotal = (t.quantity || 0) * (t.price || 0);
      totalPurchasesValue += itemTotal;
      totalPurchasesQty += (t.quantity || 0);
      purchaseTbody.innerHTML += `<tr>
        <td>${escapeHtml(t.date)}</td>
        <td>${escapeHtml(t.product)}</td>
        <td>${t.quantity}</td>
        <td>${Number(t.price || 0).toFixed(2)}</td>
        <td>${itemTotal.toFixed(2)}</td>
        <td>${escapeHtml(t.supplier || '')}</td>
        <td>
          <button class="btn btn-sm btn-warning" onclick="onEditTransaction(${t.id})" title="تعديل سريع"><i class="bi bi-pencil"></i></button>
          <button class="btn btn-sm btn-danger" onclick="onDeleteTransaction(${t.id})"><i class="bi bi-trash"></i></button>
        </td>
      </tr>`;
    });
  }

  // Update stats
  if ($("statSales")) $("statSales").textContent = totalSalesValue.toFixed(2);
  if ($("statPurchases")) $("statPurchases").textContent = totalPurchasesValue.toFixed(2);
  if ($("statProfit")) $("statProfit").textContent = (totalSalesValue - totalPurchasesValue).toFixed(2);

  // Update summary boxes
  if ($("totalSales")) $("totalSales").textContent = totalSalesQty;
  if ($("totalPurchases")) $("totalPurchases").textContent = totalPurchasesQty;

  let lastTransactionText = '-';
  if (transactions.length > 0) {
    const lastOp = transactions[0]; // Already sorted by date desc
    lastTransactionText = `${lastOp.type} - ${escapeHtml(lastOp.product || "")}`;
  }
  if ($("lastTransaction")) $("lastTransaction").textContent = lastTransactionText;
}

async function renderAllSalesModal() {
    const tbody = $("modalSalesTbody");
    if (!tbody) return;

    try {
        const transactions = window.useFallback ? window.getFallbackTransactions?.() : await window.idbGetAll(window.STORE_TRANSACTIONS);
        const sales = (transactions || []).filter(t => t.type === 'بيع').sort((a, b) => new Date(b.date) - new Date(a.date));

        if ($("salesCount")) $("salesCount").textContent = sales.length;

        if (sales.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-3">لا توجد مبيعات</td></tr>`;
            return;
        }

        tbody.innerHTML = sales.map(t => {
            const itemTotal = (t.quantity || 0) * (t.price || 0);
            return `<tr>
            <td>${escapeHtml(t.date)}</td>
            <td>${escapeHtml(t.product)}</td>
            <td>${t.quantity}</td>
            <td>${Number(t.price || 0).toFixed(2)}</td>
            <td>${itemTotal.toFixed(2)}</td>
            <td>${escapeHtml(t.customerPhone || '')}</td>
            <td class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-secondary full-edit-transaction" data-id="${t.id}" title="تعديل شامل"><i class="bi bi-pencil-square"></i></button>
              <button class="btn btn-sm btn-danger" onclick="onDeleteTransaction(${t.id})"><i class="bi bi-trash"></i></button>
            </td>
          </tr>`;
        }).join('');
    } catch (e) {
        console.error("renderAllSalesModal error:", e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-3">خطأ في تحميل البيانات</td></tr>`;
    }
}

async function renderAllPurchasesModal() {
    const tbody = $("modalPurchaseTbody");
    if (!tbody) return;

    try {
        const transactions = window.useFallback ? window.getFallbackTransactions?.() : await window.idbGetAll(window.STORE_TRANSACTIONS);
        const purchases = (transactions || []).filter(t => t.type === 'شراء').sort((a, b) => new Date(b.date) - new Date(a.date));

        if ($("purchasesCount")) $("purchasesCount").textContent = purchases.length;

        if (purchases.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted p-3">لا توجد مشتريات</td></tr>`;
            return;
        }

        tbody.innerHTML = purchases.map(t => {
            const itemTotal = (t.quantity || 0) * (t.price || 0);
            return `<tr>
            <td>${escapeHtml(t.date)}</td>
            <td>${escapeHtml(t.product)}</td>
            <td>${t.quantity}</td>
            <td>${Number(t.price || 0).toFixed(2)}</td>
            <td>${itemTotal.toFixed(2)}</td>
            <td>${escapeHtml(t.supplier || '')}</td>
            <td class="d-flex gap-1 justify-content-center">
              <button class="btn btn-sm btn-outline-secondary full-edit-transaction" data-id="${t.id}" title="تعديل شامل"><i class="bi bi-pencil-square"></i></button>
              <button class="btn btn-sm btn-danger" onclick="onDeleteTransaction(${t.id})"><i class="bi bi-trash"></i></button>
            </td>
          </tr>`;
        }).join('');
    } catch (e) {
        console.error("renderAllPurchasesModal error:", e);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger p-3">خطأ في تحميل البيانات</td></tr>`;
    }
}

window.onDeleteTransaction = async function(id) {
  const confirmed = await window.confirmDelete?.({
    title: "حذف العملية",
    message: "هل تريد تأكيد حذف هذه العملية؟",
    detail: "لا يمكن التراجع عن هذه العملية.",
    confirmText: "حذف"
  });
  if (!confirmed) return;

  try {
    if (window.useFallback) {
      const arr = (window.getFallbackTransactions?.() || []).filter(t => t.id !== id);
      window.setFallbackTransactions?.(arr);
    } else {
      await window.idbDelete(window.STORE_TRANSACTIONS, Number(id));
    }
    loadTransactionsToUI();
    track("transaction_delete_success", { feature_name: "transactions" });
    window.showGlobalAlert?.('تم حذف العملية', 'success');
  } catch (e) {
    console.error("onDeleteTransaction error:", e);
    window.showGlobalAlert?.("فشل حذف العملية", "danger");
  }
}

async function loadTransactionsToUI() {
  try {
    const transactions = window.useFallback ? window.getFallbackTransactions?.() : await window.idbGetAll(window.STORE_TRANSACTIONS);
    updateTransactionTables(transactions || []);
  } catch (e) {
    console.error("loadTransactionsToUI error:", e);
    window.showGlobalAlert?.('خطأ في تحميل العمليات', 'danger');
  }
}

function bindTransactionUI() {
  $("btnSaveTrans")?.addEventListener('click', onSaveTransaction);
  $("btnCancelTrans")?.addEventListener('click', onCancelTransaction);
  $("transType")?.addEventListener('change', onTransTypeChange);
  $("transProduct")?.addEventListener('change', onTransProductChange);
}

window.loadTransactionsToUI = loadTransactionsToUI;
window.setDefaultDate = setDefaultDate;

document.addEventListener('DOMContentLoaded', () => {
    bindTransactionUI();
    setDefaultDate();
    onTransTypeChange();
    $('salesModal')?.addEventListener('show.bs.modal', renderAllSalesModal);
    $('purchasesModal')?.addEventListener('show.bs.modal', renderAllPurchasesModal);
});

export { loadTransactionsToUI, setDefaultDate };
