import { $ } from "./utils.js";

// Helper functions that might not be global in v1.1
async function getTransactionById(id) {
  if (typeof window.getAllTransactions !== 'function') return null;
  const transactions = await window.getAllTransactions();
  return (transactions || []).find(t => t.id === Number(id)) || null;
}

function isPurchaseType(type) {
    const str = String(type || "").trim().toLowerCase();
    if (str === "sale" || str === "بيع") return false;
    if (str === "purchase" || str === "شراء") return true;
    return false;
}

async function saveTransactionEdit(id, values) {
    const transactionId = Number(id);
    if (window.useFallback) {
        const arr = window.getFallbackTransactions?.() || [];
        const idx = arr.findIndex(x => x.id === transactionId);
        if (idx !== -1) {
            arr[idx] = { ...arr[idx], ...values, id: transactionId };
            window.setFallbackTransactions?.(arr);
            return true;
        }
        return false;
    } else {
        if (typeof window.idbPut !== 'function') return false;
        const current = await getTransactionById(transactionId);
        if (!current) return false;
        await window.idbPut(window.STORE_TRANSACTIONS, { ...current, ...values, id: transactionId });
        return true;
    }
}

// Main module for the full transaction editor
const modalEl = $("fullEditTransactionModal");
const modal = modalEl ? new window.bootstrap.Modal(modalEl) : null;

async function openFullEditTransactionModal(id) {
  const tx = await getTransactionById(id);
  if (!tx) {
    window.showGlobalAlert?.("لم يتم العثور على العملية", "danger");
    return;
  }

  // Populate the modal fields
  $("full_tx_id").value = tx.id;
  $("full_tx_title").textContent = `تعديل شامل للعملية #${tx.id}`;
  $("full_tx_headerIcon").className = `bi fs-5 ${isPurchaseType(tx.type) ? 'bi-cart-check' : 'bi-receipt-cutoff'}`;
  
  const typePoster = $("full_tx_typePoster");
  if (typePoster) {
    typePoster.textContent = isPurchaseType(tx.type) ? 'شراء' : 'بيع';
    typePoster.className = `fw-bold ${isPurchaseType(tx.type) ? 'text-danger' : 'text-success'}`;
  }
  
  $("full_tx_totalPoster").textContent = (tx.total ?? (tx.quantity * tx.price)).toFixed(2);
  $("full_tx_datePoster").textContent = tx.date;

  $("full_tx_code").value = tx.id;
  $("full_tx_type").value = tx.type;
  $("full_tx_date").value = tx.date;
  $("full_tx_product").value = tx.product;
  $("full_tx_quantity").value = tx.quantity;
  $("full_tx_price").value = tx.price;
  $("full_tx_total").value = (tx.total ?? (tx.quantity * tx.price)).toFixed(2);

  const isPurchase = isPurchaseType(tx.type);
  $("full_tx_supplierRow").style.display = isPurchase ? '' : 'none';
  $("full_tx_phoneRow").style.display = isPurchase ? 'none' : '';
  $("full_tx_supplier").value = tx.supplier || '';
  $("full_tx_customerPhone").value = tx.customerPhone || '';
  $("full_tx_typeNotice").textContent = `نوع العملية الحالي: ${isPurchase ? 'شراء' : 'بيع'}`;

  modal?.show();
}

async function onSaveFullEdit() {
  const id = $("full_tx_id").value;
  if (!id) return;

  const values = {
    type: $("full_tx_type").value,
    date: $("full_tx_date").value,
    product: $("full_tx_product").value,
    quantity: Number($("full_tx_quantity").value),
    price: Number($("full_tx_price").value),
    supplier: $("full_tx_supplier").value,
    customerPhone: $("full_tx_customerPhone").value,
  };
  values.total = Number((values.quantity * values.price).toFixed(2));

  const button = $("full_tx_save");
  window.setButtonLoading?.(button, true, "جاري التحديث...");

  try {
    const success = await saveTransactionEdit(id, values);
    if (success) {
      // In v1.1, there is no fullAppRefresh, so we call the individual loaders
      if(typeof window.loadTransactionsToUI === 'function') await window.loadTransactionsToUI();
      if(typeof window.loadProductsToUI === 'function') await window.loadProductsToUI();

      modal?.hide();
      window.showGlobalAlert?.("تم تحديث العملية بنجاح", "success");
    } else {
      window.showGlobalAlert?.("فشل تحديث العملية، لم يتم العثور على العنصر.", "danger");
    }
  } catch (e) {
    console.error("Error saving full transaction edit:", e);
    window.showGlobalAlert?.("فشل تحديث العملية.", "danger");
  } finally {
    window.setButtonLoading?.(button, false);
  }
}

function recalcModalTotal() {
    const qty = Number($("full_tx_quantity")?.value || 0);
    const price = Number($("full_tx_price")?.value || 0);
    const total = qty * price;
    if ($("full_tx_total")) {
        $("full_tx_total").value = total.toFixed(2);
    }
}

// --- Event Listeners ---
document.body.addEventListener('click', e => {
  const editBtn = e.target.closest('.full-edit-transaction');
  if (editBtn && editBtn.dataset.id) {
    openFullEditTransactionModal(Number(editBtn.dataset.id));
  }
});

$("full_tx_save")?.addEventListener('click', onSaveFullEdit);
$("full_tx_quantity")?.addEventListener('input', recalcModalTotal);
$("full_tx_price")?.addEventListener('input', recalcModalTotal);

$("full_tx_type")?.addEventListener('change', (e) => {
    const isPurchase = isPurchaseType(e.target.value);
    $("full_tx_supplierRow").style.display = isPurchase ? '' : 'none';
    $("full_tx_phoneRow").style.display = isPurchase ? 'none' : '';
});
