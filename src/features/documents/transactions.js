"use client";

import { $ } from "@/services/lib/utils.js";
import { showGlobalAlert, setButtonLoading } from "@/components/ui.js";
import { escapeHtml, normalizeTransactionType } from "@/services/lib/helpers.js";
import { chainModals } from "./utils/chain-modals.js";
import {
    isFallbackMode,
    fallback,
    idbGetAll,
    idbPut,
    idbAdd,
    idbDelete,
    STORE_TRANSACTIONS,
    STORE_PRODUCTS,
    getAllTransactions,
} from "@/data/db/db.js";
import { confirmDelete } from "@/components/dialogs/confirm-dialog.js";
import { getInventoryMap } from "@/services/inventory.service.js";
import { sortItems } from "@/features/documents/invoices/table/rows.js";
import {
    renderLimitedRows,
    renderPaginatedRows,
} from "@/features/documents/components/table-renderer.js";
import { track } from "@/services/analytics/gtag.js";

/* نوع العملية للتقارير | Transaction type label for analytics */
function txTypeOf(values) {
    return normalizeTransactionType(values?.type) === "شراء" ? "purchase" : "sale";
}

/* ================= State | الحالة العامة ================= */

let editTransactionId = null;

let salesModalSortConfig = { key: 'date', order: 'desc' };
let purchasesModalSortConfig = { key: 'date', order: 'desc' };
const SALES_MODAL_SORT_KEYS = { 0: 'date', 1: 'product', 2: 'quantity', 3: 'price', 4: 'total', 5: 'customerPhone' };
const PURCHASES_MODAL_SORT_KEYS = { 0: 'date', 1: 'product', 2: 'quantity', 3: 'price', 4: 'total', 5: 'supplier' };

let productsModalSortConfig = { key: 'name', order: 'asc' };
const PRODUCTS_MODAL_SORT_KEYS = { 1: 'name', 2: 'stock', 3: 'avgCost', 4: 'totalCost' };

/* ================= Helpers | الأدوات المساعدة ================= */

function isPurchaseType(type) {
    return normalizeTransactionType(type) === "شراء";
}

/* ================= Data Access | الوصول للبيانات ================= */

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
    const partyName = $("transParty")?.value?.trim() || "";
    const supplier = isPurchaseType(type) ? partyName : "";
    const customerPhone = isPurchaseType(type)
        ? ""
        : $("transCustomerPhone")?.value?.trim() || "";

    return {
        type,
        product,
        quantity,
        price,
        total: Number((quantity * price).toFixed(2)),
        date,
        supplier,
        customerPhone
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

    return true;
}

/* ================= Form UI | واجهة النموذج ================= */

async function setSupplierVisibility(type) {
    const isPurchase = isPurchaseType(type);

    // تعبئة transParty بالعملاء أو الموردين حسب نوع العملية | Populate transParty with customers or suppliers
    const partySelect = $("transParty");
    if (partySelect) {
        const saved = JSON.parse(localStorage.getItem("accountingParties") || "[]");
        const savedFiltered = saved.filter(p => p.type === (isPurchase ? "suppliers" : "customers"));

                const transactions = await getAllTransactions();
        const txParties = (typeof window !== 'undefined' && window.buildParties?.(transactions)) || { customers: [], suppliers: [] };
        const txFiltered = isPurchase ? txParties.suppliers : txParties.customers;

        const savedNames = new Set(savedFiltered.map(p => p.name.toLowerCase()));
        const uniqueTx = txFiltered.filter(p => !savedNames.has(p.name.toLowerCase())).map(p => ({ name: p.name, phone: p.phone || "" }));

        const all = [...savedFiltered, ...uniqueTx];

        partySelect.innerHTML = '<option value="">' + (isPurchase ? 'اختر مورد' : 'اختر عميل') + '</option>';
        all.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.name;
            const code = p.code ? p.code + " " : "";
            const phone = p.phone ? " (" + p.phone.slice(-4) + ")" : "";
            opt.textContent = code + p.name + phone;
            if (p.id) opt.dataset.id = p.id;
            partySelect.appendChild(opt);
        });
    }

    const customerPhoneRow = $("customerPhoneRow");

    if (customerPhoneRow) {
        customerPhoneRow.classList.toggle("d-none", isPurchase);
        customerPhoneRow.style.display = isPurchase ? "none" : "block";
    }

    if (isPurchase && $("transCustomerPhone")) {
        $("transCustomerPhone").value = "";
    }
}

/* ================= Form Events | أحداث النموذج ================= */

async function onTransPartyChange() {
    const party = $("transParty")?.value || "";
    const type = $("transType")?.value || "";
    const linkInvoiceToggle = $("transLinkInvoice");

    // ─── تعبئة بيانات الجهة من الأطراف المحفوظة | Auto-fill party data from saved parties ───
    if (party) {
        try {
            const saved = JSON.parse(localStorage.getItem("accountingParties") || "[]");
            const partyData = saved.find(p => p.name === party);
            if (partyData) {
                // تعبئة رقم الجوال تلقائياً من بيانات الجهة المحفوظة | Auto-fill the phone from the saved party data
                if ($("transCustomerPhone")) {
                    $("transCustomerPhone").value = partyData.phone || "";
                }
            }
        } catch { /* تجاهل أخطاء التحليل | ignore parse errors */ }
    }

    if (linkInvoiceToggle) {
        linkInvoiceToggle.disabled = !party;
        if (!party) {
            linkInvoiceToggle.checked = false;
            // تشغيل حدث change يدوياً لإخفاء صف القائمة | Manually trigger change to hide the select row
            linkInvoiceToggle.dispatchEvent(new Event('change'));
        }
    }

    // إعادة تعبئة القائمة للجهة الجديدة عند تفعيل المفتاح | Repopulate the list for the new party when the toggle is on
    if (linkInvoiceToggle?.checked && party) {
        await window.populateInvoiceLinkSelect?.(type, party);
    }
}

async function onTransTypeChange() {
    await setSupplierVisibility($("transType")?.value);
    const partySelect = $("transParty");
    if (partySelect) {
        // تشغيل حدث change يدوياً لإعادة ضبط مفتاح ربط الفاتورة | Manually trigger change to reset the link invoice toggle
        partySelect.dispatchEvent(new Event('change'));
    }
}

async function onTransProductChange() {
    const chosen = $("transProduct")?.value;
    if (!chosen) return;

    try {
        const products = isFallbackMode()
            ? fallback.getProducts() || []
            : await idbGetAll(STORE_PRODUCTS);

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

    if (!validateTransaction(values)) {
        track("transaction_create_failed", { feature_name: "transactions", failure_reason: "validation", doc_type: txTypeOf(values) });
        return;
    }

    const linkInvoiceToggle = $("transLinkInvoice");
    const linkInvoiceSelect = $("transLinkInvoiceSelect");
    const isLinking = linkInvoiceToggle?.checked && linkInvoiceSelect?.value;

    if (isLinking) {
        const invoiceKey = linkInvoiceSelect.value;
        const doc = window.findDocument?.(invoiceKey, 'invoice');

        if (!doc) {
            showGlobalAlert("الفاتورة المختارة كوجهة غير موجودة.", "danger");
            return;
        }

        // إنشاء عملية جديدة تابعة للفاتورة المختارة | Create a new transaction that belongs to the selected invoice
        const newTx = {
            ...values,
            date: doc.date, // تاريخ الفاتورة | Use invoice date
            ref: doc.documentNo, // رقم الفاتورة كمرجع | Use the invoice document number as reference
        };

        // محاذاة الجهة مع جهة الفاتورة | Also align the party with the invoice's party
        if (isPurchaseType(doc.type)) {
            newTx.supplier = doc.party;
            newTx.customerPhone = "";
        } else {
            newTx.supplier = "";
            newTx.customerPhone = doc.phone;
        }

        try {
            setButtonLoading?.(saveButton, true, "جاري الإضافة...");

            if (isFallbackMode()) {
                const transactions = fallback.getTransactions() || [];
                transactions.push({ id: Date.now() + Math.random(), ...newTx });
                fallback.setTransactions(transactions);
            } else {
                await idbAdd(STORE_TRANSACTIONS, newTx);
            }

            await window.fullAppRefresh?.();

            // مسح حقول البند فقط مع إبقاء الفاتورة الوجهة محددة | Clear only item-specific fields, keeping the invoice target selected
            if ($("transProduct")) $("transProduct").value = "";
            if ($("transQty")) $("transQty").value = "";
            if ($("transPrice")) $("transPrice").value = "";
            $("transProduct")?.focus(); // التركيز على المنتج للإدخال التالي | Focus on the product for the next entry

            showGlobalAlert("تمت إضافة البند إلى الفاتورة بنجاح.", "success");
            track("transaction_create_success", { feature_name: "transactions", doc_type: txTypeOf(values), action_type: "linked_invoice", source: "transaction_form" });

        } catch (error) {
            console.error("addTransaction to invoice error:", error);
            showGlobalAlert("تعذر إضافة البند للفاتورة.", "danger");
            track("transaction_create_failed", { feature_name: "transactions", failure_reason: "db_error", doc_type: txTypeOf(values), action_type: "linked_invoice" });
        } finally {
            setButtonLoading?.(saveButton, false);
        }
    } else {
        // المنطق الأصلي لإنشاء عملية مستقلة | Original logic for creating a standalone transaction
        try {
            setButtonLoading?.(saveButton, true, "جاري حفظ العملية...");

            if (isFallbackMode()) {
                const transactions = fallback.getTransactions() || [];
                transactions.push({ id: Date.now(), ...values });
                fallback.setTransactions(transactions);
            } else {
                await idbAdd(STORE_TRANSACTIONS, values);
            }

            await window.fullAppRefresh?.();
            await clearTransactionForm();
            showGlobalAlert("تم حفظ العملية بنجاح", "success");
            track("transaction_create_success", { feature_name: "transactions", doc_type: txTypeOf(values), source: "transaction_form" });
        } catch (error) {
            console.error("addTransaction error:", error);
            showGlobalAlert("تعذر حفظ العملية في قاعدة البيانات", "danger");
            track("transaction_create_failed", { feature_name: "transactions", failure_reason: "db_error", doc_type: txTypeOf(values) });
        } finally {
            setButtonLoading?.(saveButton, false);
        }
    }
}

async function updateTransaction() {
    const saveButton = $("btnSaveTrans");
    const transactionId = Number(editTransactionId);
    const values = getTransactionFormValues();

    if (!transactionId || !validateTransaction(values)) return;

    try {
        setButtonLoading?.(saveButton, true, "جاري تحديث العملية...");

        const updated = await saveTransactionEdit(transactionId, values);
        if (!updated) {
            showGlobalAlert("تعذر العثور على العملية المطلوبة", "warning");
            return;
        }

        editTransactionId = null;
        $("btnCancelTrans")?.classList.add("d-none");
        if ($("btnCancelTrans")) $("btnCancelTrans").style.display = "none";
        if (saveButton) saveButton.innerHTML = '<i class="bi bi-save"></i> ارسل العملية';

        await window.fullAppRefresh?.();
        await clearTransactionForm();
        showGlobalAlert("تم تحديث العملية بنجاح", "success");
        track("transaction_create_success", { feature_name: "transactions", doc_type: txTypeOf(values), action_type: "update", source: "transaction_form" });
    } catch (error) {
        console.error("updateTransaction error:", error);
        showGlobalAlert("حدث خطأ أثناء تحديث العملية", "danger");
        track("transaction_create_failed", { feature_name: "transactions", failure_reason: "db_error", action_type: "update", doc_type: txTypeOf(values) });
    } finally {
        setButtonLoading?.(saveButton, false);
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
        supplier: values.supplier || "",
        customerPhone: isPurchaseType(values.type) ? "" : values.customerPhone || ""
    };

    if (isFallbackMode()) {
        const transactions = fallback.getTransactions() || [];
        const index = transactions.findIndex(t => Number(t.id) === transactionId);
        if (index === -1) return false;

        transactions[index] = { ...transactions[index], ...normalized, id: transactionId };
        fallback.setTransactions(transactions);
        return true;
    }

    const current = await getTransactionById(transactionId);
    if (!current) return false;

    await idbPut(STORE_TRANSACTIONS, {
        ...current,
        ...normalized,
        id: transactionId
    });

    return true;
}

/* ================= Save Actions | إجراءات الحفظ ================= */

function onSaveTransaction() {
    if (editTransactionId) {
        updateTransaction();
        return;
    }

    addTransaction();
}

async function onCancelTransaction() {
    editTransactionId = null;

    const button = $("btnSaveTrans");
    const cancel = $("btnCancelTrans");

    if (cancel) {
        cancel.classList.add("d-none");
        cancel.style.display = "none";
    }

    if (button) {
        button.innerHTML = '<i class="bi bi-save"></i> ارسل العملية';
    }

    await clearTransactionForm();
}

/* ================= Edit Form | نموذج التعديل ================= */

async function clearTransactionForm() {
    if ($("transType")) $("transType").value = "بيع";
    if ($("transProduct")) $("transProduct").value = "";
    if ($("transQty")) $("transQty").value = "";
    if ($("transPrice")) $("transPrice").value = "";
    if ($("transParty")) $("transParty").value = "";
    if ($("transCustomerPhone")) $("transCustomerPhone").value = "";

    setDefaultDate();
    await setSupplierVisibility("بيع");
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

async function onEditTransaction(id) {
    const transaction = await getTransactionById(id);
    if (!transaction) return;

    if ($("transType")) $("transType").value = normalizeTransactionType(transaction.type);
    selectTransactionProduct(transaction.product || "");
    if ($("transQty")) $("transQty").value = transaction.quantity ?? "";
    if ($("transPrice")) $("transPrice").value = transaction.price ?? "";
    if ($("transDate")) $("transDate").value = transaction.date || "";
    if ($("transCustomerPhone")) $("transCustomerPhone").value = transaction.customerPhone || "";

    editTransactionId = Number(transaction.id);
    await setSupplierVisibility(transaction.type);

    const isPurchase = isPurchaseType(transaction.type);
    const partyVal = isPurchase ? (transaction.supplier || "") : "";
    if (partyVal && $("transParty")) {
        $("transParty").value = partyVal;
    }

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

/* ================= Full Transaction Editor | محرر التعديل الشامل ================= */

async function openFullEditTransactionModal(id, options = {}) {
    const transaction = await getTransactionById(id);
    if (!transaction) {
        showGlobalAlert("تعذر العثور على العملية المطلوبة.", "warning");
        return;
    }
    window._currentFullEditOptions = options;
    track("transaction_edit_started", { feature_name: "transactions", doc_type: isPurchaseType(transaction.type) ? "purchase" : "sale", entry_point: "full_editor" });

    const isPurchase = isPurchaseType(transaction.type);
    const total = Number(transaction.total ?? Number(transaction.quantity) * Number(transaction.price));
    const setValue = (elementId, value) => {
        const element = $(elementId);
        if (element) element.value = value ?? "";
    };

    const productSel = $("full_tx_product");
    if (productSel) {
      try {
        const products = isFallbackMode()
          ? fallback.getProducts() || []
          : await idbGetAll(STORE_PRODUCTS) || [];
        productSel.innerHTML = '<option value="">اختر منتج</option>';
        products.forEach(p => {
          productSel.insertAdjacentHTML("beforeend",
            `<option value="${escapeHtml(p.name)}" data-price="${escapeHtml(p.price)}">${escapeHtml(p.name)}</option>`
          );
        });
      } catch (e) {
        console.warn("populate full_tx_product error:", e);
      }
    }

    setValue("full_tx_id", transaction.id);
    setValue("full_tx_code", transaction.id);
    setValue("full_tx_type", normalizeTransactionType(transaction.type));
    setValue("full_tx_date", transaction.date);
    setValue("full_tx_product", transaction.product);
    setValue("full_tx_quantity", transaction.quantity);
    setValue("full_tx_price", transaction.price);
    setValue("full_tx_total", total.toFixed(2));
    setValue("full_tx_supplier", transaction.supplier);
    setValue("full_tx_customerPhone", transaction.customerPhone);

    if ($("full_tx_title")) $("full_tx_title").textContent = `تعديل شامل للعملية #${transaction.id}`;
    if ($("full_tx_headerIcon")) $("full_tx_headerIcon").className = `bi fs-5 ${isPurchase ? "bi-cart-check" : "bi-receipt-cutoff"}`;
    if ($("full_tx_typePoster")) {
        $("full_tx_typePoster").textContent = isPurchase ? "شراء" : "بيع";
        $("full_tx_typePoster").className = `fw-bold ${isPurchase ? "text-danger" : "text-success"}`;
    }
    if ($("full_tx_totalPoster")) $("full_tx_totalPoster").textContent = total.toFixed(2);
    if ($("full_tx_datePoster")) $("full_tx_datePoster").textContent = transaction.date || "";
    if ($("full_tx_supplierRow")) $("full_tx_supplierRow").style.display = isPurchase ? "" : "none";
    if ($("full_tx_phoneRow")) $("full_tx_phoneRow").style.display = isPurchase ? "none" : "";
    if ($("full_tx_typeNotice")) $("full_tx_typeNotice").textContent = `نوع العملية الحالي: ${isPurchase ? "شراء" : "بيع"}`;

    const modalElement = $("fullEditTransactionModal");
    if (modalElement && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

function recalculateFullTransactionTotal() {
    const quantity = Number($("full_tx_quantity")?.value || 0);
    const price = Number($("full_tx_price")?.value || 0);
    if ($("full_tx_total")) $("full_tx_total").value = (quantity * price).toFixed(2);
}

async function saveFullEditTransaction() {
    const id = Number($("full_tx_id")?.value);
    if (!id) return;

    const values = {
        // الحفاظ على النوع الأصلي من دون تغييره من هذا المودال لتجنّب تعقيد ربط الفاتورة | Keep the original type fixed here to avoid invoice-association complexities
        type: (await getTransactionById(id))?.type || "",
        date: $("full_tx_date")?.value || "",
        product: $("full_tx_product")?.value?.trim() || "",
        quantity: Number($("full_tx_quantity")?.value || 0),
        price: Number($("full_tx_price")?.value || 0),
        supplier: $("full_tx_supplier")?.value?.trim() || "",
        customerPhone: $("full_tx_customerPhone")?.value?.trim() || ""
    };
    if (!validateTransaction(values)) {
        track("transaction_create_failed", { feature_name: "transactions", failure_reason: "validation", action_type: "update", doc_type: txTypeOf(values) });
        return;
    }

    const button = $("full_tx_save");
    try {
        setButtonLoading(button, true, "جاري التحديث...");
        if (!await saveTransactionEdit(id, values)) {
            showGlobalAlert("تعذر العثور على العملية المطلوبة.", "warning");
            return;
        }

        const modalInstance = window.bootstrap?.Modal.getInstance($("fullEditTransactionModal"));
        modalInstance?.hide();

        if (window._currentFullEditOptions?.onSaveCallback) {
            window._currentFullEditOptions.onSaveCallback();
        }

        await window.fullAppRefresh?.();
        showGlobalAlert("تم تحديث العملية بنجاح", "success");
        track("transaction_create_success", { feature_name: "transactions", doc_type: txTypeOf(values), action_type: "update", source: "full_editor" });
    } catch (error) {
        console.error("saveFullEditTransaction error:", error);
        showGlobalAlert("تعذر تحديث العملية.", "danger");
        track("transaction_create_failed", { feature_name: "transactions", failure_reason: "db_error", action_type: "update", doc_type: txTypeOf(values) });
    } finally {
        setButtonLoading(button, false);
    }
}

/* ================= Delete Transaction | حذف العملية ================= */

async function onDeleteTransaction(id) {
    const confirmed = await confirmDelete?.({
        title: "حذف العملية",
        message: "هل تريد تأكيد حذف هذه العملية؟",
        detail: "سيتم حذف العملية من سجلات المبيعات والمشتريات ولا يمكن التراجع عنها.",
        confirmText: "حذف العملية"
    });

    if (!confirmed) return;

    try {
        if (isFallbackMode()) {
            const transactions = (fallback.getTransactions() || [])
                .filter(t => Number(t.id) !== Number(id));
            fallback.setTransactions(transactions);
        } else {
            await idbDelete(STORE_TRANSACTIONS, Number(id));
        }

        await window.fullAppRefresh?.();
        showGlobalAlert("تم حذف العملية بنجاح", "success");
        track("transaction_delete_success", { feature_name: "transactions" });
    } catch (error) {
        console.error("onDeleteTransaction error:", error);
        showGlobalAlert("فشل حذف العملية", "danger");
    }
}

/* ================= Table Actions | أزرار الجداول ================= */

function renderActionButtons(transaction, options = {}) {
    const editButton = options.fullEdit
        ? `
      <button class="btn btn-sm btn-outline-warning full-edit-transaction" data-id="${transaction.id}" data-bs-toggle="tooltip" title="تعديل كامل">
        <i class="bi bi-pencil-square"></i>
      </button>
    `
        : `
      <button class="btn btn-sm btn-outline-warning quick-edit-transaction" data-id="${transaction.id}" data-bs-toggle="tooltip" title="تعديل سريع">
        <i class="bi bi-pencil"></i>
      </button>
    `;

    let secondaryButton = `
    <button class="btn btn-sm btn-outline-danger delete-transaction" data-id="${transaction.id}" data-bs-toggle="tooltip" title="حذف">
      <i class="bi bi-trash"></i>
    </button>
  `;

    if (options.context === 'sales-dashboard') {
        // جرّب مرجع العملية (documentNo) أولاً ثم مفتاح التاريخ كاحتياط | Try the transaction ref (documentNo) first, then fall back to the date-based key
        const invoiceKey = transaction.ref || `بيع-${transaction.date}`;
        secondaryButton = `<button class="btn btn-sm btn-outline-primary view-linked-invoice" data-invoice-key="${escapeHtml(invoiceKey)}" data-bs-toggle="tooltip" title="عرض الفاتورة المرتبطة"><i class="bi bi-receipt"></i></button>`;
    } else if (options.context === 'purchase-dashboard') {
        const invoiceKey = transaction.ref || `شراء-${transaction.date}`;
        secondaryButton = `<button class="btn btn-sm btn-outline-primary view-linked-invoice" data-invoice-key="${escapeHtml(invoiceKey)}" data-bs-toggle="tooltip" title="عرض الفاتورة المرتبطة"><i class="bi bi-receipt"></i></button>`;
    }

    return `
    <div class="d-flex gap-1 justify-content-center">
      ${editButton}
      ${secondaryButton}
    </div>
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

function setTextContent(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
}

function initTooltips(container) {
    try {
        const triggers = (container || document).querySelectorAll('[data-bs-toggle="tooltip"]');
        triggers.forEach(el => { if (!el._tooltip) el._tooltip = new window.bootstrap.Tooltip(el); });
    } catch (e) { /* التلميحات غير حرجة | tooltips are non-critical */ }
}

function renderTransactionsTable(transactions) {
    const salesTbody = $("salesTbody");
    const purchaseTbody = $("purchaseTbody");

    if (!salesTbody || !purchaseTbody) return;

    window._lastTxData = transactions;

    setActionNote(salesTbody, "القلم الأصفر: تعديل سريع.");
    setActionNote(purchaseTbody, "القلم الأصفر: تعديل سريع.");

    const sales = transactions.filter(t => normalizeTransactionType(t.type) === "بيع");
    const purchases = transactions.filter(t => normalizeTransactionType(t.type) === "شراء");

    // --- جدول المبيعات | Sales Table ---
    function renderMainSales(items) {
        document.getElementById("salesOpsPagination")?.remove();
        renderLimitedRows("salesTbody", items, t => {
            const tTotal = Number(t.total ?? Number(t.quantity) * Number(t.price));
            return `
        <tr>
          <td>${renderActionButtons(t, { context: 'sales-dashboard' })}</td>
          <td>${escapeHtml(t.date)}</td>
          <td class="col-product">${escapeHtml(t.product)}</td>
          <td>${Number(t.quantity)}</td>
          <td>${Number(t.price).toFixed(2)}</td>
          <td>${tTotal.toFixed(2)}</td>
        </tr>
      `;
        }, { limit: 10, emptyMessage: "لا توجد مبيعات", colspan: 6 });
        const tabBtn = document.querySelector('[data-bs-target="#salesOperationsSubTab"]');
        if (tabBtn) tabBtn.innerHTML = `<i class="bi bi-clock-history"></i> عمليات البيع السابقة <span class="badge bg-secondary rounded-pill">${items.length}</span>`;
    }
    renderMainSales(sales);

    // --- جدول المشتريات | Purchases Table ---
    function renderMainPurchases(items) {
        document.getElementById("purchaseOpsPagination")?.remove();
        renderLimitedRows("purchaseTbody", items, t => {
            const tTotal = Number(t.total ?? Number(t.quantity) * Number(t.price));
            return `
        <tr>
          <td>${renderActionButtons(t, { context: 'purchase-dashboard' })}</td>
          <td>${escapeHtml(t.date)}</td>
          <td class="col-product">${escapeHtml(t.product)}</td>
          <td>${Number(t.quantity)}</td>
          <td>${Number(t.price).toFixed(2)}</td>
          <td>${tTotal.toFixed(2)}</td>
        </tr>
      `;
        }, { limit: 10, emptyMessage: "لا توجد مشتريات", colspan: 6 });
        const tabBtn = document.querySelector('[data-bs-target="#purchaseOperationsSubTab"]');
        if (tabBtn) tabBtn.innerHTML = `<i class="bi bi-clock-history"></i> عمليات الشراء السابقة <span class="badge bg-secondary rounded-pill">${items.length}</span>`;
    }
    renderMainPurchases(purchases);
}

function renderSalesModal(sales) {
    const tbody = $("modalSalesTbody");
    if (!tbody) return;

    setTextContent("salesCount", sales?.length || 0);
    setActionNote(tbody, "القلم الرمادي: تعديل كامل.");

    const table = tbody.closest('table');

    function updateSalesSortHeaders() {
        if (!table) return;
        table.querySelectorAll('thead th').forEach((th, index) => {
            const sortKey = SALES_MODAL_SORT_KEYS[index];
            let icon = th.querySelector('i.sort-indicator');
            if (!sortKey) {
                if (icon) icon.remove();
                return;
            }
            if (!icon) {
                th.insertAdjacentHTML('beforeend', ' <i class="bi bi-sort-down sort-indicator"></i>');
                icon = th.querySelector('i.sort-indicator');
            }
            icon.className = `bi sort-indicator ${salesModalSortConfig.key === sortKey ? (salesModalSortConfig.order === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-sort-down'}`;
        });
    }

    function render(items) {
        renderPaginatedRows("modalSalesTbody", items, t => {
            const total = Number(t.total ?? Number(t.quantity) * Number(t.price));
            return `
      <tr>
        <td>${escapeHtml(t.date)}</td>
        <td>${escapeHtml(t.product)}</td>
        <td>${Number(t.quantity)}</td>
        <td>${Number(t.price).toFixed(2)}</td>
        <td>${total.toFixed(2)}</td>
        <td>${escapeHtml(t.customerPhone || "")}</td>
        <td>${renderActionButtons(t, { fullEdit: true, context: 'sales-dashboard' })}</td>
        </tr>
        `;
        }, { emptyMessage: "لا توجد مبيعات", colspan: 7 });
    }

        table.querySelectorAll('thead th').forEach((th, index) => {
        const sortKey = SALES_MODAL_SORT_KEYS[index];
        if (!sortKey) return;
        th.style.cursor = 'pointer';
        // تُستخدم علامة لمنع إضافة المستمع أكثر من مرة عند إعادة فتح المودال | Use a flag to avoid adding the listener more than once when the modal reopens
        if (!th.dataset.sortListener) {
            th.dataset.sortListener = 'true';
            th.addEventListener('click', () => {
                if (salesModalSortConfig.key === sortKey) {
                    salesModalSortConfig.order = salesModalSortConfig.order === 'asc' ? 'desc' : 'asc';
                } else {
                    salesModalSortConfig.key = sortKey;
                    salesModalSortConfig.order = 'desc';
                }
                render(sortItems(sales, salesModalSortConfig.key, salesModalSortConfig.order));
                updateSalesSortHeaders();
            });
        }
    });

    render(sortItems(sales, salesModalSortConfig.key, salesModalSortConfig.order));
    updateSalesSortHeaders();
}

function renderPurchasesModal(purchases) {
    const tbody = $("modalPurchaseTbody");
    if (!tbody) return;

    setTextContent("purchasesCount", purchases?.length || 0);
    setActionNote(tbody, "القلم الرمادي: تعديل كامل.");

    const table = tbody.closest('table');
    const searchInput = $("purchaseSearch");
    const clearSearchButton = $("btnClearPurchaseSearch");

    function getFilteredPurchases() {
        const term = searchInput?.value?.trim().toLocaleLowerCase() || "";
        return term
            ? purchases.filter(purchase => Object.values(purchase).some(value =>
                String(value ?? "").toLocaleLowerCase().includes(term)))
            : purchases;
    }

    function updatePurchasesSortHeaders() {
        if (!table) return;
        table.querySelectorAll('thead th').forEach((th, index) => {
            const sortKey = PURCHASES_MODAL_SORT_KEYS[index];
            let icon = th.querySelector('i.sort-indicator');
            if (!sortKey) {
                if (icon) icon.remove();
                return;
            }
            if (!icon) {
                th.insertAdjacentHTML('beforeend', ' <i class="bi bi-sort-down sort-indicator"></i>');
                icon = th.querySelector('i.sort-indicator');
            }
            icon.className = `bi sort-indicator ${purchasesModalSortConfig.key === sortKey ? (purchasesModalSortConfig.order === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-sort-down'}`;
        });
    }

    function render(items, resetPage = false) {
        renderPaginatedRows("modalPurchaseTbody", items, t => {
            const total = Number(t.total ?? Number(t.quantity) * Number(t.price));
            return `
      <tr>
        <td>${escapeHtml(t.date)}</td>
        <td>${escapeHtml(t.product)}</td>
        <td>${Number(t.quantity)}</td>
        <td>${Number(t.price).toFixed(2)}</td>
        <td>${total.toFixed(2)}</td>
        <td>${escapeHtml(t.supplier || "")}</td>
        <td>${renderActionButtons(t, { fullEdit: true, context: 'purchase-dashboard' })}</td>
        </tr>
        `;
        }, { emptyMessage: "لا توجد مشتريات", colspan: 7, resetPage });
    }

    table._getFilteredPurchases = getFilteredPurchases;
    table._renderPurchaseRows = render;

    if (searchInput && !searchInput.dataset.paginationSearchBound) {
        searchInput.dataset.paginationSearchBound = "true";
        searchInput.addEventListener("input", () => {
            const filtered = table._getFilteredPurchases();
            table._renderPurchaseRows(sortItems(filtered, purchasesModalSortConfig.key, purchasesModalSortConfig.order), true);
        });
    }

    if (clearSearchButton && !clearSearchButton.dataset.paginationSearchBound) {
        clearSearchButton.dataset.paginationSearchBound = "true";
        clearSearchButton.addEventListener("click", () => {
            if (!searchInput) return;
            searchInput.value = "";
            const filtered = table._getFilteredPurchases();
            table._renderPurchaseRows(sortItems(filtered, purchasesModalSortConfig.key, purchasesModalSortConfig.order), true);
        });
    }

        table.querySelectorAll('thead th').forEach((th, index) => {
        const sortKey = PURCHASES_MODAL_SORT_KEYS[index];
        if (!sortKey) return;
        th.style.cursor = 'pointer';
        if (!th.dataset.sortListener) {
            th.dataset.sortListener = 'true';
            th.addEventListener('click', () => {
                if (purchasesModalSortConfig.key === sortKey) {
                    purchasesModalSortConfig.order = purchasesModalSortConfig.order === 'asc' ? 'desc' : 'asc';
                } else {
                    purchasesModalSortConfig.key = sortKey;
                    purchasesModalSortConfig.order = 'desc';
                }
                const filtered = table._getFilteredPurchases();
                table._renderPurchaseRows(sortItems(filtered, purchasesModalSortConfig.key, purchasesModalSortConfig.order));
                updatePurchasesSortHeaders();
            });
        }
    });

    render(sortItems(getFilteredPurchases(), purchasesModalSortConfig.key, purchasesModalSortConfig.order));
    updatePurchasesSortHeaders();
}

async function renderProductsModal(products) {
    const tbody = $("modalProductsTbody");
    const tfoot = $("modalProductsTfoot");
    if (!tbody) return;

    if (!products?.length) {
        renderPaginatedRows("modalProductsTbody", [], () => "", {
            emptyMessage: "لا توجد منتجات",
            colspan: 6,
        });
        if (tfoot) tfoot.innerHTML = "";
        return;
    }

    const inventory = await getInventoryMap() || new Map();
    const allTransactions = await getAllTransactions() || [];

    const avgCostMap = new Map();
    allTransactions.forEach(t => {
        const type = normalizeTransactionType(t.type);
        if (type === "شراء" || type === "استلام بضائع") {
            const productName = String(t.product || "").trim();
            const qty = Number(t.quantity ?? t.qty ?? 0) || 0;
            const price = Number(t.price) || 0;
            const existing = avgCostMap.get(productName) || { totalQty: 0, totalCost: 0 };
            existing.totalQty += qty;
            existing.totalCost += qty * price;
            avgCostMap.set(productName, existing);
        }
    });

    let summaryTotalStock = 0;
    let summaryTotalCost = 0;

    const computed = products.map(product => {
        const stock = Number(inventory.get(product.name) || 0);
        const costData = avgCostMap.get(product.name) || { totalQty: 0, totalCost: 0 };
        const avgCost = costData.totalQty > 0 ? costData.totalCost / costData.totalQty : 0;
        const totalCost = stock * avgCost;
        return { product, stock, avgCost, totalCost };
    });

    const sKey = productsModalSortConfig.key;
    const sDir = productsModalSortConfig.order === 'asc' ? 1 : -1;
    if (sKey === 'name') computed.sort((a, b) => String(a.product.name || '').localeCompare(String(b.product.name || '')) * sDir);
    else if (sKey === 'stock') computed.sort((a, b) => (a.stock - b.stock) * sDir);
    else if (sKey === 'avgCost') computed.sort((a, b) => (a.avgCost - b.avgCost) * sDir);
    else if (sKey === 'totalCost') computed.sort((a, b) => (a.totalCost - b.totalCost) * sDir);

    computed.forEach(({ stock, totalCost }) => {
        summaryTotalStock += stock;
        summaryTotalCost += totalCost;
    });

    renderPaginatedRows("modalProductsTbody", computed, ({ product, stock, avgCost, totalCost }) => {
        const displayStock = Number.isInteger(stock) ? stock : Math.round(stock);
        // صفر → أحمر «غير متوفر»؛ سالب → أحمر مع رقم؛ موجب → أخضر مع رقم | Zero → red "unavailable"; negative → red with number; positive → green with number
        const badgeBg = stock <= 0 ? "#dc3545" : "#198754";
        const stockText = stock === 0 ? "غير متوفر" : displayStock;

        return `
      <tr>
        <td class="product-thumbnail-cell text-center align-middle">
          ${product.image
            ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" class="product-table-thumb" />`
            : `<span class="product-thumbnail-placeholder text-muted" title="لا توجد صورة"><i class="bi bi-box-seam"></i></span>`}
        </td>
        <td>${escapeHtml(product.name)}</td>
        <td><span class="badge" style="background:${badgeBg};color:#fff;font-size:0.85rem;padding:4px 12px;border-radius:6px;">${stockText}</span></td>
        <td>${avgCost.toFixed(2)}</td>
        <td>${totalCost.toFixed(2)}</td>
        <td>
          <div class="d-flex gap-1 justify-content-center">
            <button class="btn btn-sm btn-outline-secondary view-product-btn" data-id="${product.id}" title="عرض">
              <i class="bi bi-eye"></i>
            </button>
            <button class="btn btn-sm btn-outline-primary full-edit-product" data-id="${product.id}" title="تعديل">
              <i class="bi bi-pencil-square"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
    }, { emptyMessage: "لا توجد منتجات", colspan: 6 });

    if (tfoot) {
        tfoot.innerHTML = `
      <tr class="table-light fw-bold">
        <td></td>
        <td>الإجمالي</td>
        <td><span class="badge" style="background:#0d6efd;color:#fff;font-size:0.85rem;padding:4px 12px;border-radius:6px;">${Number.isInteger(summaryTotalStock) ? summaryTotalStock : summaryTotalStock.toFixed(2)}</span></td>
        <td>-</td>
        <td>${summaryTotalCost.toFixed(2)}</td>
        <td></td>
      </tr>
    `;
    }

    const productsTable = tbody.closest('table');
    if (productsTable) {
        productsTable.querySelectorAll('thead th').forEach((th, idx) => {
            const key = PRODUCTS_MODAL_SORT_KEYS[idx];
            let icon = th.querySelector('i.sort-indicator');
            if (!key) { icon?.remove(); return; }
            if (!icon) { th.insertAdjacentHTML('beforeend', ' <i class="bi bi-sort-down sort-indicator"></i>'); icon = th.querySelector('i.sort-indicator'); }
            icon.className = `bi sort-indicator ${productsModalSortConfig.key === key ? (productsModalSortConfig.order === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-sort-down'}`;
            if (!th.dataset.sortListener) {
                th.dataset.sortListener = '1';
                th.style.cursor = 'pointer';
                th.addEventListener('click', () => {
                    productsModalSortConfig.order = productsModalSortConfig.key === key ? (productsModalSortConfig.order === 'asc' ? 'desc' : 'asc') : 'asc';
                    productsModalSortConfig.key = key;
                    renderProductsModal(products);
                });
            }
        });
    }
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
        await window.updateDashboardStats?.();

        // تحديث المودالات المفتوحة لضمان التحديثات اللحظية | Also refresh open modals to ensure real-time updates
        if ($("salesModal")?.classList.contains("show")) {
            renderSalesModal(transactions.filter(t => normalizeTransactionType(t.type) === "بيع"));
        }
        if ($("purchasesModal")?.classList.contains("show")) {
            renderPurchasesModal(transactions.filter(t => normalizeTransactionType(t.type) === "شراء"));
        }

        initTooltips();
    } catch (error) {
        console.error("loadTransactionsToUI error:", error);
        showGlobalAlert("خطأ في تحميل العمليات", "danger");
    }
}

async function refreshTransactionsUI() {
    // غلاف توافق يوجّه إلى loadTransactionsToUI للمتصلين القدامى | Compatibility wrapper that delegates to loadTransactionsToUI for legacy callers
    console.warn("refreshTransactionsUI is deprecated. Use window.fullAppRefresh() instead.");
    await loadTransactionsToUI();
}

/* ================= Defaults | القيم الافتراضية ================= */

function setDefaultDate() {
    const dateInput = $("transDate");
    if (dateInput && !dateInput.value) {
        dateInput.value = new Date().toISOString().slice(0, 10);
    }
}

/* ================= Event Binding | ربط الأحداث ================= */
function bindTransactionUI() {
    const addListener = (selector, event, handler) => {
        const element = document.querySelector(selector);
        if (element) element.addEventListener(event, handler);
    };

    addListener('#btnCancelTrans', 'click', onCancelTransaction);
    addListener('#full_tx_save', 'click', saveFullEditTransaction);
    addListener('#full_tx_quantity', 'input', recalculateFullTransactionTotal);
    addListener('#full_tx_price', 'input', recalculateFullTransactionTotal);
    addListener('#full_tx_type', 'change', () => {
        const isPurchase = isPurchaseType($("full_tx_type")?.value);
        if ($("full_tx_supplierRow")) $("full_tx_supplierRow").style.display = isPurchase ? "" : "none";
        if ($("full_tx_phoneRow")) $("full_tx_phoneRow").style.display = isPurchase ? "none" : "";
    });

    document.addEventListener('click', event => {
        const viewInvoiceBtn = event.target.closest('.view-linked-invoice');
        if (viewInvoiceBtn) {
            const invoiceKey = viewInvoiceBtn.dataset.invoiceKey;
            if (!invoiceKey) {
                showGlobalAlert("معرف الفاتورة غير موجود.", "warning");
                return;
            }

            if (typeof window.findDocument !== 'function' || typeof window.openDocumentDetails !== 'function') {
                showGlobalAlert("وظيفة عرض الفاتورة غير متاحة.", "danger");
                return;
            }

            const documentData = window.findDocument(invoiceKey);
            if (documentData) {
                const openFn = () => window.openDocumentDetails(documentData);
                // اكتشاف أقرب مودال مفتوح ديناميكياً (allItemsModal, salesModal, purchasesModal...) | Detect the closest open modal dynamically (allItemsModal, salesModal, purchasesModal, etc.)
                const parentModalEl = viewInvoiceBtn.closest('.modal.show') || viewInvoiceBtn.closest('#allItemsModal');
                if (parentModalEl) {
                    if (!chainModals(viewInvoiceBtn, parentModalEl.id ? `#${parentModalEl.id}` : '.modal.show', openFn)) openFn();
                } else {
                    openFn();
                }
            } else {
                showGlobalAlert("تعذر العثور على الفاتورة المرتبطة.", "warning");
            }
        }

    });

    // ─── تحديث #transParty عند إضافة/تعديل/حذف الأطراف | Refresh #transParty when parties are added, edited or deleted ───
    document.addEventListener("parties-changed", () => {
    });
}

/* ================= Global Exports | التصدير العام ================= */

export {
    addTransaction,
    updateTransaction,
    loadTransactionsToUI,
    refreshTransactionsUI,
    getTransactionById,
    saveTransactionEdit,
    renderSalesModal,
    renderPurchasesModal,
    renderProductsModal,
    setDefaultDate,
    onEditTransaction,
    openFullEditTransactionModal,
    onDeleteTransaction,
    normalizeTransactionType,
    bindTransactionUI
};
