import { $ } from "@/services/lib/utils.js";
import {
    isFallbackMode,
    fallback,
    idbGetAll,
    idbPut,
    idbAdd,
    idbDelete,
    STORE_PRODUCTS
} from "@/data/db/db.js";
import { showGlobalAlert, setButtonLoading } from "@/components/ui.js";
import { confirmDelete } from "@/components/dialogs/confirm-dialog.js";
import { getInventoryMap } from "@/services/inventory.service.js";
import { renderProductsModal } from "@/features/documents/transactions.js";
import { escapeHtml, escapeAttr } from "@/features/documents/controllers/utils/escape.js";
import { renderLimitedRows } from "@/features/documents/components/table-renderer.js";
import { startQuickProductBarcodeScanner } from "@/features/products/barcode-scanner.js";
import {
    resolveProductHints,
    applyProductHints,
    clearAutofillNote,
    markAutofillBaseline,
    AUTOFILL_SOURCE,
} from "@/services/product-autofill.js";
import { track, startOperation, operationDuration } from "@/services/analytics/gtag.js";


let productFormEditId = null;

/* عملية "إضافة منتج" الجارية لقياس المسار والمدة | Current "add product" operation to measure the funnel and duration */
let _productAddOp = null;
function ensureProductAddStarted(entryPoint) {
    if (!_productAddOp) {
        _productAddOp = { ...startOperation(), entryPoint };
        track("product_add_started", { feature_name: "products", entry_point: entryPoint, page_name: "products" });
    }
    return _productAddOp;
}
function takeProductAddOp() {
    const op = _productAddOp;
    _productAddOp = null;
    return op;
}

let productsSidebarSortConfig = { key: 'name', order: 'asc' };
const PRODUCTS_SIDEBAR_SORT_KEYS = { 0: 'name', 1: 'price', 2: 'stock' };

// يمنع ربط المستمعين أكثر من مرة | Prevents binding listeners more than once
let _productsBound = false;

/* توحيد اسم المنتج لكشف التكرارات | Normalize product name for duplicate detection */
function normalizeProductName(name) {
    return String(name || "").trim().toLowerCase();
}

/* كشف تكرار اسم المنتج بعد التطبيع | Detect a duplicate product name after normalization */
function isDuplicateName(products, name) {
    const normalized = normalizeProductName(name);
    return (products || []).some(p => normalizeProductName(p.name) === normalized);
}

/* ================= التسجيل | Logging ================= */
const log = (...args) => console.log("[PRODUCT]", ...args);

/* ================= إضافة / تعديل المنتج | Add / Edit Product ================= */

async function onAddProductClick() {
    const saveButton = $("btnAddProduct");

    const name = $("productName")?.value?.trim();
    const price = parseFloat($("productPrice")?.value);
    const barcode = $("productBarcode")?.value?.trim() || "";

    // سعر البيع اختياري ويُخزن في salePrice دون تعديل price | Sale price is optional and stored in salePrice without modifying price
    const salePriceRaw = $("productSalePrice")?.value;
    const salePrice =
        salePriceRaw !== undefined && String(salePriceRaw).trim() !== ""
            ? parseFloat(salePriceRaw)
            : undefined;
    const salePriceField =
        salePrice !== undefined && !Number.isNaN(salePrice) && salePrice >= 0
            ? { salePrice }
            : {};

    log("AddClick:", { name, price, barcode, salePrice, editId: productFormEditId });

    if (!name) {
        showGlobalAlert?.("الرجاء إدخال اسم المنتج", "warning");
        $("productName")?.focus();
        return;
    }

    if (isNaN(price) || price <= 0) {
        showGlobalAlert?.("الرجاء إدخال سعر صحيح", "warning");
        $("productPrice")?.focus();
        return;
    }

    try {
        setButtonLoading?.(
            saveButton,
            true,
            productFormEditId ? "جاري التحديث..." : "جاري الحفظ..."
        );

        /* التخزين الاحتياطي | Fallback Storage */
        if (isFallbackMode()) {
            log("Using fallback mode");

            const arr = fallback.getProducts() || [];

            if (productFormEditId) {
                const idx = arr.findIndex(p => Number(p.id) === Number(productFormEditId));

                log("Editing fallback product:", { idx });

                if (idx !== -1) {
                    arr[idx] = { ...arr[idx], name, price, barcode, ...salePriceField };
                }

                showGlobalAlert?.("تم تعديل المنتج", "success");
                track("product_edit_success", { feature_name: "products", entry_point: "quick_form", method: "fallback" });
                productFormEditId = null;
                if ($("btnCancelProduct")) {
                    $("btnCancelProduct").classList.add("d-none");
                    $("btnCancelProduct").style.display = "none";
                }

            } else {
                const alreadyExists = isDuplicateName(arr, name);

                if (alreadyExists) {
                    showGlobalAlert?.("هذا المنتج موجود بالفعل", "warning");
                    track("product_add_failed", { feature_name: "products", failure_reason: "duplicate_name", entry_point: "quick_form" });
                } else {
                    arr.push({ id: Date.now(), name, price, barcode, ...salePriceField });
                    showGlobalAlert?.("تم إضافة المنتج", "success");
                    const op = takeProductAddOp();
                    track("product_add_success", {
                        feature_name: "products",
                        entry_point: op?.entryPoint || "quick_form",
                        method: "fallback",
                        operation_id: op?.id,
                        duration_ms: operationDuration(op),
                    });
                }
            }

            fallback.setProducts(arr);
            await loadProductsToUI();
        }

        /* تخزين IndexedDB | IndexedDB Storage */
        else {
            log("Using IndexedDB mode");

            if (!idbAdd || !idbPut) {
                throw new Error("DB functions not ready");
            }

            if (productFormEditId) {
                await idbPut(STORE_PRODUCTS, {
                    id: productFormEditId,
                    name,
                    price,
                    barcode,
                    ...salePriceField
                });

                showGlobalAlert?.("تم تعديل المنتج", "success");
                track("product_edit_success", { feature_name: "products", entry_point: "quick_form", method: "indexeddb" });
                productFormEditId = null;
                if ($("btnCancelProduct")) {
                    $("btnCancelProduct").classList.add("d-none");
                    $("btnCancelProduct").style.display = "none";
                }

            } else {
                const existingProducts = await getAllProducts();
                const alreadyExists = isDuplicateName(existingProducts, name);

                if (alreadyExists) {
                    showGlobalAlert?.("هذا المنتج موجود بالفعل", "warning");
                    track("product_add_failed", { feature_name: "products", failure_reason: "duplicate_name", entry_point: "quick_form" });
                } else {
                    await idbAdd(STORE_PRODUCTS, {
                        name,
                        price,
                        barcode,
                        ...salePriceField
                    });
                    showGlobalAlert?.("تم إضافة المنتج", "success");
                    const op = takeProductAddOp();
                    track("product_add_success", {
                        feature_name: "products",
                        entry_point: op?.entryPoint || "quick_form",
                        method: "indexeddb",
                        operation_id: op?.id,
                        duration_ms: operationDuration(op),
                    });
                }
            }

            await loadProductsToUI();
        }

    } catch (e) {
        console.error("addProduct error:", e);
        track(productFormEditId ? "product_edit_failed" : "product_add_failed", {
            feature_name: "products",
            failure_reason: "db_error",
            entry_point: "quick_form",
        });
        window.showGlobalAlert?.(
            "خطأ في النظام — تأكد من تشغيل قاعدة البيانات",
            "danger"
        );

    } finally {
        setButtonLoading?.(saveButton, false);

        $("productName").value = "";
        $("productPrice").value = "";
        $("productBarcode").value = "";
        if ($("productSalePrice")) $("productSalePrice").value = "";

        // تفريغ النموذج يتطلب إزالة ملاحظات التعبئة التلقائية | Clearing the form requires removing autofill notes
        clearAutofillNote("quickAutofillNote");
        markAutofillBaseline(QUICK_FORM_AUTOFILL_TARGETS);

        // إخفاء ملصقي السعر بعد الحفظ | Hide cost/sale labels after saving
        $("quickPriceLabels")?.classList.add("d-none");

        $("btnAddProduct").innerHTML =
            '<i class="bi bi-plus-lg"></i> إضافة';
    }
}

/* ================= إضافة منتج من نافذة "إضافة منتج جديد" | Add Product from Modal ================= */

function readModalProductFile(file) {
    return new Promise((resolve) => {
        if (!file) return resolve("");
        const reader = new FileReader();
        reader.onload = (ev) => resolve(typeof ev.target?.result === "string" ? ev.target.result : "");
        reader.onerror = () => resolve("");
        reader.readAsDataURL(file);
    });
}

async function onAddProductModalSave() {
    const saveButton = $("btnSaveNewProduct");

    const name = $("addProductName")?.value?.trim();
    const unit = $("addProductUnit")?.value || "";
    const division = $("addProductDivision")?.value?.trim() || "";
    const description = $("addProductDesc")?.value?.trim() || "";
    const salePrice = parseFloat($("addProductSalePrice")?.value);
    const costPriceRaw = parseFloat($("addProductCostPrice")?.value);
    const sku = $("addProductSku")?.value?.trim() || "";
    const barcode = $("addProductBarcode")?.value?.trim() || "";
    const minStock = parseInt($("addProductMinStock")?.value, 10) || 0;
    const imageFile = $("addProductImage")?.files?.[0];

    if (!name) {
        showGlobalAlert?.("الرجاء إدخال اسم المنتج", "warning");
        $("addProductName")?.focus();
        return;
    }

    const price = Number.isFinite(salePrice) && salePrice >= 0 ? salePrice : 0;
    const costPrice = Number.isFinite(costPriceRaw) && costPriceRaw >= 0 ? costPriceRaw : 0;

    try {
        setButtonLoading?.(saveButton, true, "جاري الحفظ...");
        const image = await readModalProductFile(imageFile);

        const alreadyExists = isDuplicateName(await getAllProducts(), name);
        if (alreadyExists) {
            showGlobalAlert?.("هذا المنتج موجود بالفعل", "warning");
            track("product_add_failed", { feature_name: "products", failure_reason: "duplicate_name", entry_point: "add_product_modal" });
            return;
        }

        const record = {
            name,
            price,
            salePrice: price,
            costPrice,
            barcode,
            sku,
            unit,
            division,
            description,
            minStock,
        };
        if (image) record.image = image;

        if (isFallbackMode()) {
            const arr = fallback.getProducts() || [];
            arr.push({ id: Date.now(), ...record });
            fallback.setProducts(arr);
        } else {
            if (!idbAdd) throw new Error("DB functions not ready");
            await idbAdd(STORE_PRODUCTS, record);
        }

        showGlobalAlert?.("تم إضافة المنتج", "success");
        const op = takeProductAddOp();
        track("product_add_success", {
            feature_name: "products",
            entry_point: op?.entryPoint || "add_product_modal",
            method: isFallbackMode() ? "fallback" : "indexeddb",
            operation_id: op?.id,
            duration_ms: operationDuration(op),
        });
        // بعد حفظ المنتج، لم تعد ملاحظات التعبئة التلقائية صالحة | After saving the product, autofill notes are no longer valid
        clearAutofillNote("addAutofillNote");
        window.bootstrap?.Modal.getInstance?.($("addProductModal"))?.hide();
        await loadProductsToUI();
    } catch (e) {
        console.error("addProductFromModal error:", e);
        track("product_add_failed", { feature_name: "products", failure_reason: "db_error", entry_point: "add_product_modal" });
        showGlobalAlert?.("خطأ في النظام — تأكد من تشغيل قاعدة البيانات", "danger");
    } finally {
        setButtonLoading?.(saveButton, false);
        if ($("btnSaveNewProduct")) {
            $("btnSaveNewProduct").innerHTML = '<i class="bi bi-plus-lg me-1"></i>إضافة المنتج';
        }
    }
}

function updateAddImagePreview() {
    const input = $("addProductImage");
    const preview = $("addImagePreview");
    const img = $("addImagePreviewImg");
    if (!input || !preview || !img) return;

    const file = input.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            img.src = typeof ev.target?.result === "string" ? ev.target.result : "";
            preview.classList.remove("d-none");
        };
        reader.readAsDataURL(file);
    } else {
        img.src = "";
        preview.classList.add("d-none");
    }
}

/* ================= التعبئة التلقائية للبيانات | Product Autofill ================= */
// نفس منطق الفاتورة: باركود ← منتج محلي ← Open Food Facts | Same logic as invoice: barcode → local product → Open Food Facts
// لا يوجد تحليل صور؛ صورة النموذج للعرض فقط | No image analysis; full form image is display-only
// يتم ملء الحقول الفارغة فقط؛ لا يتم الحفظ قبل الضغط على زر الحفظ | Only empty fields are filled; nothing is saved before clicking Save

// نموذج الإضافة السريعة لا يحتوي على حقل وحدة أو وصف | Quick add form has no unit or description field
const QUICK_FORM_AUTOFILL_TARGETS = {
    name: "productName",
    barcode: "productBarcode",
    salePrice: "productSalePrice",
};

// نموذج الإضافة الكامل: جميع الحقول؛ سعر التكلفة لا يُملأ تلقائياً | Full add form: all fields; cost price is not auto-filled
const ADD_FORM_AUTOFILL_TARGETS = {
    name: "addProductName",
    barcode: "addProductBarcode",
    unit: "addProductUnit",
    division: "addProductDivision",
    description: "addProductDesc",
    salePrice: "addProductSalePrice",
};

let _autofillRun = 0;

// نقطة دخول مشتركة لجميع مسارات التعبئة التلقائية | Shared entry point for all autofill paths
async function runProductAutofill({ barcode, name, targets, noteId, entryPoint }) {
    const run = ++_autofillRun;

    /* إغلاق ثغرة القمع: التعبئة التلقائية/المسح يملأ الحقول برمجياً فلا يُطلق حدث input — نبدأ عملية الإضافة هنا | Close the funnel gap: autofill/scan fills fields programmatically without firing input — start the add operation here */
    if (entryPoint && !productFormEditId) {
        ensureProductAddStarted(entryPoint);
    }

    const result = await resolveProductHints({
        barcode,
        name,
        getProducts: getAllProducts,
    });

    // آخر عملية تنفذ هي التي تعرض نتائجها | The latest run determines which results are shown
    if (run !== _autofillRun) return;

    if (result.status === "empty") {
        clearAutofillNote(noteId);
        return;
    }

    const { applied } = applyProductHints(result.fields, { targets, noteId });

    if (applied.length) {
        track("product_autofill_applied", {
            feature_name: "products",
            source: result.source === AUTOFILL_SOURCE.PUBLIC
                ? "public_db"
                : (result.source === AUTOFILL_SOURCE.NAME ? "name_match" : "local"),
        });
    }

    // عرض رسالة توضح مصدر البيانات | Display a message explaining data source
    if (result.source === AUTOFILL_SOURCE.PUBLIC) {
        showGlobalAlert?.(
            "تم الحصول على البيانات من قاعدة عامة — السعر المقترح قابل للتعديل",
            "info",
        );
    } else if (result.source === AUTOFILL_SOURCE.NAME) {
        if (noteId) {
            const note = $(noteId);
            if (note) { note.textContent = result.message; note.classList.remove("d-none"); }
        }
    } else if (!applied.length && result.source === AUTOFILL_SOURCE.LOCAL) {
        showGlobalAlert?.("المنتج موجود مسبقاً بنفس الاسم", "warning");
    }
}

async function onQuickProductBarcodeChange() {
    const barcode = $("productBarcode")?.value?.trim();
    if (!barcode) return;
    await runProductAutofill({
        barcode,
        name: $("productName")?.value?.trim() || "",
        targets: QUICK_FORM_AUTOFILL_TARGETS,
        noteId: "quickAutofillNote",
        entryPoint: "quick_form",
    });
}

async function onQuickProductNameChange() {
    const name = $("productName")?.value?.trim();
    if (!name) return;
    await runProductAutofill({
        barcode: $("productBarcode")?.value?.trim() || "",
        name,
        targets: QUICK_FORM_AUTOFILL_TARGETS,
        noteId: "quickAutofillNote",
        entryPoint: "quick_form",
    });
}

async function onAddProductBarcodeChange() {
    const barcode = $("addProductBarcode")?.value?.trim();
    if (!barcode) return;
    await runProductAutofill({
        barcode,
        name: $("addProductName")?.value?.trim() || "",
        targets: ADD_FORM_AUTOFILL_TARGETS,
        noteId: "addAutofillNote",
        entryPoint: "add_product_modal",
    });
}

async function onAddProductNameChange() {
    const name = $("addProductName")?.value?.trim();
    if (!name) return;
    await runProductAutofill({
        barcode: $("addProductBarcode")?.value?.trim() || "",
        name,
        targets: ADD_FORM_AUTOFILL_TARGETS,
        noteId: "addAutofillNote",
        entryPoint: "add_product_modal",
    });
}

// اختيار الصورة في النموذج الكامل للمعاينة فقط | Selecting image in full form is for preview only
function onAddProductImageChange() {
    updateAddImagePreview();
}

/* ================= إلغاء التعديل | Cancel Edit ================= */

function onCancelProduct() {
    log("Cancel edit");

    productFormEditId = null;
    _productAddOp = null;

    const cancel = $("btnCancelProduct");
    if (cancel) {
        cancel.classList.add("d-none");
        cancel.style.display = "none";
    }

    $("productName").value = "";
    $("productPrice").value = "";
    $("productBarcode").value = "";
    if ($("productSalePrice")) $("productSalePrice").value = "";

    // إخفاء ملصقي السعر بعد إغلاق التعديل | Hide cost/sale labels after edit closes
    $("quickPriceLabels")?.classList.add("d-none");

    $("btnAddProduct").innerHTML =
        '<i class="bi bi-plus-lg"></i> إضافة';
}

/* ================= استعلامات المنتجات | Product Queries ================= */

async function getAllProducts() {
    log("getAllProducts");

    if (isFallbackMode()) {
        return fallback.getProducts() || [];
    }

    if (!idbGetAll) {
        console.warn("idbGetAll not ready yet");
        return [];
    }

    return await idbGetAll(STORE_PRODUCTS);
}

async function getProductById(id) {
    const products = await getAllProducts();
    return products.find(p => Number(p.id) === Number(id)) || null;
}

async function onEditProduct(id) {
    const product = await getProductById(id);

    if (!product) {
        showGlobalAlert?.("تعذر العثور على المنتج المطلوب", "warning");
        return;
    }

    productFormEditId = Number(product.id);

    track("product_edit_started", { feature_name: "products", entry_point: "quick_form" });

    if ($("productName")) $("productName").value = product.name || "";
    if ($("productPrice")) $("productPrice").value = product.price ?? "";
    if ($("productSalePrice")) $("productSalePrice").value = product.salePrice ?? "";
    if ($("productBarcode")) $("productBarcode").value = product.barcode || "";

    // إظهار ملصقي سعر التكلفة وسعر البيع أثناء التعديل | Show cost/sale field labels while editing
    $("quickPriceLabels")?.classList.remove("d-none");

    const cancel = $("btnCancelProduct");
    if (cancel) {
        cancel.classList.remove("d-none");
        cancel.style.display = "inline-block";
    }

    const save = $("btnAddProduct");
    if (save) {
        save.innerHTML = '<i class="bi bi-pencil-square"></i> تحديث';
    }

    const productsModal = $("productsModal");
    if (productsModal?.classList.contains("show") && window.bootstrap) {
        window.bootstrap.Modal.getOrCreateInstance(productsModal).hide();
    }

    $("productName")?.focus();
}

/* ================= حفظ التعديل الكامل | Save Full Edit ================= */

async function saveProductEdit(id, values) {
    log("saveProductEdit:", id, values);

    const productId = Number(id);

    if (isFallbackMode()) {
        const products = fallback.getProducts() || [];

        const index = products.findIndex(p => Number(p.id) === productId);
        if (index === -1) return false;

        products[index] = {
            ...products[index],
            sku: values.sku || "",
            barcode: values.barcode || "",
            name: values.name,
        price: Number(values.salePrice), // دعم الحقل القديم price | Legacy support for price field
            salePrice: Number(values.salePrice),
             costPrice: values.costPrice !== undefined ? Number(values.costPrice) : products[index].costPrice, // الاحتفاظ بالقيمة السابقة إذا لم يتم توفيرها | Keep existing value if not provided
            description: values.description || "",
            unit: values.unit || "",
            division: values.division || "",
            minStock: values.minStock ?? 0
        };
        if (values.image !== undefined) products[index].image = values.image;

        fallback.setProducts(products);
        return true;
    }

    const current = await getProductById(productId);
    if (!current) return false;

    await idbPut(STORE_PRODUCTS, {
        ...current,
        id: productId,
        sku: values.sku || "",
        barcode: values.barcode || "",
        name: values.name,
             price: Number(values.salePrice), // دعم الحقل القديم price | Legacy support for price field
        salePrice: Number(values.salePrice),
        costPrice: values.costPrice !== undefined ? Number(values.costPrice) : current.costPrice, // الاحتفاظ بالقيمة السابقة إذا لم يتم توفيرها | Keep existing value if not provided
        description: values.description || "",
        unit: values.unit || "",
        division: values.division || "",
        minStock: values.minStock ?? 0,
        image: values.image !== undefined ? values.image : current.image
    });


    return true;
}

/* ================= تحديث الواجهة | UI Refresh ================= */

async function refreshProductsUI() {
    log("refreshProductsUI");
    // مبقي كغلاف للتوافق؛ المنطق الأساسي في loadProductsToUI | Kept as wrapper for compatibility; core logic in loadProductsToUI
    console.warn("refreshProductsUI is deprecated. Use window.fullAppRefresh() instead.");
    await loadProductsToUI();
}

/* ================= العرض | Rendering ================= */

async function renderProducts(products) {
    const tbody = $("productsTbody");
    if (!tbody) return;

    if (!products?.length) {
        renderLimitedRows("productsTbody", [], () => "", {
            emptyMessage: "لا توجد منتجات",
            colspan: 4,
        });
        return;
    }

    // استبدال الصفوف دفعة واحدة بعد قراءة المخزون لتفادي تكرار البيانات | Replace rows in one assignment after inventory loads to prevent duplicates
    const inventory = await getInventoryMap() || new Map();

    const sorted = [...products];
    const sKey = productsSidebarSortConfig.key;
    const sDir = productsSidebarSortConfig.order === 'asc' ? 1 : -1;
    if (sKey === 'name') sorted.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')) * sDir);
    else if (sKey === 'price') sorted.sort((a, b) => (Number(a.price || 0) - Number(b.price || 0)) * sDir);
    else if (sKey === 'stock') sorted.sort((a, b) => (Number(inventory.get(a.name) || 0) - Number(inventory.get(b.name) || 0)) * sDir);

    renderLimitedRows("productsTbody", sorted, p => {
        const stock = Number(inventory.get(p.name) || 0);
        const displayStock = Number.isInteger(stock) ? stock : Math.round(stock);
        // صفر: غير متوفر (أحمر)، سالب: رقم أحمر، موجب: رقم أخضر | Zero: unavailable (red), negative: red number, positive: green number
        const stockBadge = stock <= 0
            ? '<span class="badge" style="background:#dc3545;color:#fff;font-size:0.85rem;padding:4px 12px;border-radius:6px;">' + (stock === 0 ? 'غير متوفر' : displayStock) + '</span>'
            : '<span class="badge" style="background:#198754;color:#fff;font-size:0.85rem;padding:4px 12px;border-radius:6px;">' + displayStock + '</span>';

        return `      
      <tr>
        <td>${escapeHtml(p.name)}</td>
        <td>${Number(p.price).toFixed(2)}</td>
        <td>${stockBadge}</td>
        <td class="text-center">
          <div class="dropdown">
            <button
              class="btn btn-sm btn-link text-decoration-none dropdown"
              type="button"
              data-bs-toggle="dropdown"
              aria-expanded="false"
              title="إجراءات">
              <i class="bi bi-three-dots-vertical"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end">
              <li>
                <button class="dropdown-item quick-edit-product" type="button" data-id="${escapeAttr(p.id)}">
                  <i class="bi bi-pencil-square me-2"></i>
                  تعديل
                </button>
              </li>
              <li>
                <button class="dropdown-item text-danger delete-product" type="button" data-id="${escapeAttr(p.id)}">
                  <i class="bi bi-trash me-2"></i>
                  حذف
                </button>
              </li>
            </ul>
          </div>
        </td>
      </tr>`;
    }, { limit: 3, emptyMessage: "لا توجد منتجات", colspan: 4 });

    const sidebarTable = tbody.closest('table');
    if (sidebarTable) {
        sidebarTable.querySelectorAll('thead th').forEach((th, idx) => {
            const key = PRODUCTS_SIDEBAR_SORT_KEYS[idx];
            let icon = th.querySelector('i.sort-indicator');
            if (!key) { icon?.remove(); return; }
            if (!icon) { th.insertAdjacentHTML('beforeend', ' <i class="bi bi-sort-down sort-indicator"></i>'); icon = th.querySelector('i.sort-indicator'); }
            icon.className = `bi sort-indicator ${productsSidebarSortConfig.key === key ? (productsSidebarSortConfig.order === 'asc' ? 'bi-sort-up' : 'bi-sort-down') : 'bi-sort-down'}`;
            if (!th.dataset.sortListener) {
                th.dataset.sortListener = '1';
                th.style.cursor = 'pointer';
                th.addEventListener('click', () => {
                    productsSidebarSortConfig.order = productsSidebarSortConfig.key === key ? (productsSidebarSortConfig.order === 'asc' ? 'desc' : 'asc') : 'asc';
                    productsSidebarSortConfig.key = key;
                    loadProductsToUI();
                });
            }
        });
    }
}

/* ================= حذف المنتج | Delete Product ================= */

async function onDeleteProduct(id, suppressUIRefresh = false) {
    log("delete:", id);

    const confirmed = await confirmDelete?.({
        title: "حذف المنتج",
        message: "هل تريد تأكيد حذف هذا المنتج؟",
        detail: "سيتم حذف المنتج من القائمة. العمليات القديمة المرتبطة به ستبقى كما هي.",
        confirmText: "حذف المنتج"
    });

    if (!confirmed) return false;

    if (isFallbackMode()) {
        const arr = (fallback.getProducts() || [])
            .filter(p => Number(p.id) !== Number(id));

        fallback.setProducts(arr);

    } else {
        try {
            await idbDelete(STORE_PRODUCTS, id);
        } catch (e) {
            console.error("onDeleteProduct error:", e);
            showGlobalAlert?.("تعذر حذف المنتج — حاول مرة أخرى", "danger");
            return false;
        }
    }

    if (!suppressUIRefresh) {
        await window.fullAppRefresh?.();
        showGlobalAlert?.("تم حذف المنتج", "success");
    }
    track("product_delete_success", { feature_name: "products" });
    return true;
};

/* ================= إنشاء منتج من بيانات مسودة | Save Product from Draft ================= */
// يستخدمه الماسح الموحد عند عدم وجود المنتج محلياً | Used by unified scanner when product not found locally
// السعر قيمة مرجعية أدخلها المستخدم | Price is a reference value entered by user

export async function saveProductFromDraft(draft) {
    const name = String(draft?.name || "").trim();
    const barcode = String(draft?.barcode || "").trim();
    if (!name) return null;

    const all = await getAllProducts();

    // منع التكرار: إرجاع المنتج الموجود في حال تطابق الباركود أو الاسم | Prevent duplicates: return existing product if barcode or name matches
    if (barcode) {
        const byBarcode = all.find(p => String(p.barcode || "").trim() === barcode);
        if (byBarcode) return byBarcode;
    }
    const normName = normalizeProductName(name);
    const byName = all.find(p => normalizeProductName(p.name) === normName);
    if (byName) return byName;

    const priceRaw = Number(draft?.price);
    const salePrice = Number.isFinite(priceRaw) && priceRaw > 0 ? priceRaw : 0;

    const record = {
        name,
        price: salePrice,
        salePrice,
        costPrice: Number.isFinite(Number(draft?.costPrice)) ? Number(draft?.costPrice) : 0,
        barcode,
        sku: String(draft?.sku || "").trim(),
        unit: String(draft?.unit || "").trim(),
        division: String(draft?.division || "").trim(),
        description: String(draft?.description || "").trim(),
    };

    let id;
    if (isFallbackMode()) {
        const arr = fallback.getProducts() || [];
        const rec = { id: Date.now(), ...record };
        arr.push(rec);
        fallback.setProducts(arr);
        id = rec.id;
    } else {
        if (!idbAdd) throw new Error("DB functions not ready");
        id = await idbAdd(STORE_PRODUCTS, record);
    }

    return { id, ...record };
}

async function loadProductsToUI() {
    try {
        log("loadProductsToUI");

        let products = await getAllProducts();

        products.sort((a, b) => (b.id || 0) - (a.id || 0));

        await renderProducts(products);

        // تحديث نافذة جميع المنتجات إذا كانت مفتوحة | Refresh "All Products" modal if open
        const modalEl = $("productsModal");
        if (modalEl?.classList.contains("show")) {
            // المنتجات تم جلبها وفرزها مسبقاً | Products already fetched and sorted
            renderProductsModal?.(products);
        }

    } catch (e) {
        console.error("loadProductsToUI error:", e);
    }
}

/* ================= ربط الأحداث | Event Binding ================= */

function bindUI() {
    // منع تكرار ربط الأحداث عند استدعاء bindUI عدة مرات | Prevent duplicate event binding if bindUI is called multiple times
    if (_productsBound) {
        log("bindUI: already bound, skipping re-registration");
        return;
    }

    log("bindUI: binding product UI events");

    // استخدام تفويض الأحداث على document لأن عناصر القائمة تُحدث DOM بشكل متكرر | Use event delegation on document as sidebar elements are re-rendered by React
    const delegated = (document.__productDelegation ||= {});
    const addListener = (selector, event, handler) => {
        const key = `${event}|${selector}`;
        if (delegated[key]) return;
        delegated[key] = true;
        document.addEventListener(event, (e) => {
            const el = e.target?.closest?.(selector);
            if (el) handler(e);
        });
    };

    // تسجيل أحداث المنتجات | Register product events
    addListener('#btnAddProduct', 'click', onAddProductClick);
    addListener('#btnCancelProduct', 'click', onCancelProduct);
    addListener('#btnSaveNewProduct', 'click', onAddProductModalSave);
    addListener('#addProductImage', 'change', onAddProductImageChange);

    // ربط أحداث التعبئة التلقائية للباركود والاسم | Bind autofill events for barcode and name
    addListener('#productBarcode', 'change', onQuickProductBarcodeChange);
    addListener('#productName', 'change', onQuickProductNameChange);
    addListener('#addProductBarcode', 'change', onAddProductBarcodeChange);
    addListener('#addProductName', 'change', onAddProductNameChange);

    addListener('#btnDeleteAddImage', 'click', () => {
        const input = $("addProductImage");
        if (input) input.value = "";
        updateAddImagePreview();
    });
    addListener('#btnScanProductBarcode', 'click', () => {
        startQuickProductBarcodeScanner({
            onDetected: (raw) => {
                const input = $("productBarcode");
                if (input) input.value = raw;
                // الباركود الممسوح يقوم بتشغيل التعبئة التلقائية | Scanned barcode triggers autofill
                onQuickProductBarcodeChange();
            }
        });
    });
    addListener('#btnScanBarcodeAdd', 'click', () => {
        startQuickProductBarcodeScanner({
            onDetected: (raw) => {
                const input = $("addProductBarcode");
                if (input) input.value = raw;
                onAddProductBarcodeChange();
            }
        });
    });

    // استخدام قيم النموذج الحالية كخط أساس للتعبئة التلقائية | Use current form values as baseline for autofill
    markAutofillBaseline(QUICK_FORM_AUTOFILL_TARGETS);

    // بدء مسار «إضافة منتج» عند أول إدخال | Start the "add product" funnel on first input
    addListener('#productName', 'input', () => ensureProductAddStarted('quick_form'));
    addListener('#addProductName', 'input', () => ensureProductAddStarted('add_product_modal'));

    /* أحداث النوافذ: عرض قائمة المنتجات وفتح نافذة إضافة منتج — أحداث Bootstrap تنتشر إلى document فتبقى صالحة بعد إعادة رسم React | Modal events: products list view and add-product open — Bootstrap events bubble to document so they survive React re-renders */
    if (!document.__productsAnalyticsBound) {
        document.__productsAnalyticsBound = true;
        document.addEventListener('shown.bs.modal', (e) => {
            if (e.target.id === 'productsModal') {
                track('product_list_view', { feature_name: 'products', page_name: 'products' });
            }
            if (e.target.id === 'addProductModal') {
                ensureProductAddStarted('add_product_modal');
            }
        });
    }

    _productsBound = true;
}

/* ================= التصدير العام | Exports / Globals ================= */

export {
    onAddProductClick,
    onCancelProduct,
    loadProductsToUI,
    getAllProducts,
    getProductById,
    onEditProduct,
    saveProductEdit,
    refreshProductsUI,
    onDeleteProduct,
    bindUI
};