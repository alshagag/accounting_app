import { $ } from "./utils.js";

let productFormEditId = null;

/* =========================
   Logging | التسجيل
========================= */
const log = (...args) => console.log("[PRODUCT]", ...args);

/* =========================
   Add / Edit Product | إضافة / تعديل المنتج
========================= */

async function onAddProductClick() {
  const saveButton = $("btnAddProduct");

  const name = $("productName")?.value?.trim();
  const price = parseFloat($("productPrice")?.value);

  log("AddClick:", { name, price, editId: productFormEditId });

  if (!name) {
    window.showGlobalAlert?.("الرجاء إدخال اسم المنتج", "warning");
    $("productName")?.focus();
    return;
  }

  if (isNaN(price) || price <= 0) {
    window.showGlobalAlert?.("الرجاء إدخال سعر صحيح", "warning");
    $("productPrice")?.focus();
    return;
  }

  try {
    window.setButtonLoading?.(
      saveButton,
      true,
      productFormEditId ? "جاري التحديث..." : "جاري الحفظ..."
    );

    /* Fallback storage | التخزين الاحتياطي */
    if (window.useFallback) {
      log("Using fallback mode");

      const arr = window.getFallbackProducts?.() || [];

      if (productFormEditId) {
        const idx = arr.findIndex(p => Number(p.id) === Number(productFormEditId));

        log("Editing fallback product:", { idx });

        if (idx !== -1) {
          arr[idx].name = name;
          arr[idx].price = price;
        }

        window.showGlobalAlert?.("تم تعديل المنتج", "success");
        productFormEditId = null;
        if ($("btnCancelProduct")) {
          $("btnCancelProduct").classList.add("d-none");
          $("btnCancelProduct").style.display = "none";
        }

      } else {
        arr.push({ id: Date.now(), name, price });
        window.showGlobalAlert?.("تم إضافة المنتج", "success");
      }

      window.setFallbackProducts?.(arr);
      await window.loadProductsToUI?.();
    }

    /* IndexedDB storage | تخزين IndexedDB */
    else {
      log("Using IndexedDB mode");

      if (!window.idbAdd || !window.idbPut) {
        throw new Error("DB functions not ready");
      }

      if (productFormEditId) {
        await window.idbPut(window.STORE_PRODUCTS, {
          id: productFormEditId,
          name,
          price
        });

        window.showGlobalAlert?.("تم تعديل المنتج", "success");
        productFormEditId = null;
        if ($("btnCancelProduct")) {
          $("btnCancelProduct").classList.add("d-none");
          $("btnCancelProduct").style.display = "none";
        }

      } else {
        await window.idbAdd(window.STORE_PRODUCTS, {
          name,
          price
        });

        window.showGlobalAlert?.("تم إضافة المنتج", "success");
      }

      await window.loadProductsToUI?.();
    }

  } catch (e) {
    console.error("addProduct error:", e);

    window.showGlobalAlert?.(
      "خطأ في النظام — تأكد من تشغيل قاعدة البيانات",
      "danger"
    );

  } finally {
    window.setButtonLoading?.(saveButton, false);

    $("productName").value = "";
    $("productPrice").value = "";

    $("btnAddProduct").innerHTML =
      '<i class="bi bi-plus-lg"></i> إضافة';
  }
}

/* =========================
   Cancel Edit | إلغاء التعديل
========================= */

function onCancelProduct() {
  log("Cancel edit");

  productFormEditId = null;

  const cancel = $("btnCancelProduct");
  if (cancel) {
    cancel.classList.add("d-none");
    cancel.style.display = "none";
  }

  $("productName").value = "";
  $("productPrice").value = "";

  $("btnAddProduct").innerHTML =
    '<i class="bi bi-plus-lg"></i> إضافة';
}

/* =========================
   Product Queries | استعلامات المنتجات
========================= */

async function getAllProducts() {
  log("getAllProducts");

  if (window.useFallback) {
    return window.getFallbackProducts?.() || [];
  }

  if (!window.idbGetAll) {
    console.warn("idbGetAll not ready yet");
    return [];
  }

  return await window.idbGetAll(window.STORE_PRODUCTS);
}

async function getProductById(id) {
  const products = await getAllProducts();
  return products.find(p => Number(p.id) === Number(id)) || null;
}

async function onEditProduct(id) {
  const product = await getProductById(id);

  if (!product) {
    window.showGlobalAlert?.("تعذر العثور على المنتج المطلوب", "warning");
    return;
  }

  productFormEditId = Number(product.id);

  if ($("productName")) $("productName").value = product.name || "";
  if ($("productPrice")) $("productPrice").value = product.price ?? "";

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

/* =========================
   Save Full Edit | حفظ التعديل الكامل
========================= */

async function saveProductEdit(id, values) {
  log("saveProductEdit:", id, values);

  const productId = Number(id);

  if (window.useFallback) {
    const products = window.getFallbackProducts?.() || [];

    const index = products.findIndex(p => Number(p.id) === productId);
    if (index === -1) return false;

    products[index] = {
      ...products[index],
      name: values.name,
      price: Number(values.price),
      description: values.description || ""
    };

    window.setFallbackProducts?.(products);
    return true;
  }

  const current = await getProductById(productId);
  if (!current) return false;

  await window.idbPut(window.STORE_PRODUCTS, {
    ...current,
    id: productId,
    name: values.name,
    price: Number(values.price),
    description: values.description || ""
  });

  return true;
}

/* =========================
   UI Refresh | تحديث الواجهة
========================= */

async function refreshProductsUI() {
  log("refreshProductsUI");

  await window.loadProductsToUI?.();

  const modalEl = $("productsModal");

  if (modalEl?.classList.contains("show")) {
    const products = await getAllProducts();
    products.sort((a, b) => (b.id || 0) - (a.id || 0));
    window.renderProductsModal?.(products);
  }
}

/* =========================
   Rendering | العرض
========================= */

function renderProducts(products) {
  const tbody = $("productsTbody");
  const sel = $("transProduct");

  if (!tbody || !sel) return;

  tbody.innerHTML = "";
  sel.innerHTML = '<option value="">اختر منتج</option>';

  if (!products?.length) {
    tbody.innerHTML = `<tr><td colspan="3">لا توجد منتجات</td></tr>`;
    return;
  }

  products.forEach(p => {
    sel.insertAdjacentHTML(
      "beforeend",
      `<option value="${p.name}" data-price="${p.price}">
        ${p.name}
      </option>`
    );

    const row = document.createElement("tr");

    row.innerHTML = `
      <td>${p.name}</td>
      <td>${Number(p.price).toFixed(2)}</td>
      <td>
        <button class="btn btn-sm btn-warning quick-edit-product" data-id="${p.id}">
          <i class="bi bi-pencil"></i>
        </button>

        <button class="btn btn-sm btn-danger" onclick="onDeleteProduct(${p.id})">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;

    tbody.appendChild(row);
  });
}

/* =========================
   Delete Product | حذف المنتج
========================= */

window.onDeleteProduct = async function (id) {
  log("delete:", id);

  const confirmed = await window.confirmDelete?.({
    title: "حذف المنتج",
    message: "هل تريد تأكيد حذف هذا المنتج؟",
    detail: "سيتم حذف المنتج من القائمة. العمليات القديمة المرتبطة به ستبقى كما هي.",
    confirmText: "حذف المنتج"
  });

  if (!confirmed) return;

  if (window.useFallback) {
    const arr = (window.getFallbackProducts?.() || [])
      .filter(p => Number(p.id) !== Number(id));

    window.setFallbackProducts?.(arr);

  } else {
    try {
      await window.idbDelete(window.STORE_PRODUCTS, id);
    } catch (e) {
      console.error(e);
    }
  }

  await window.loadProductsToUI?.();
  window.showGlobalAlert?.("تم حذف المنتج", "success");
};

/* =========================
   Load Products UI | تحميل واجهة المنتجات
========================= */

async function loadProductsToUI() {
  try {
    log("loadProductsToUI");

    let products = window.useFallback
      ? window.getFallbackProducts?.() || []
      : await window.idbGetAll(window.STORE_PRODUCTS);

    products.sort((a, b) => (b.id || 0) - (a.id || 0));

    renderProducts(products.slice(0, 3));

  } catch (e) {
    console.error("loadProductsToUI error:", e);
  }
}

/* =========================
   Event Binding | ربط الأحداث
========================= */

function bindUI() {
  console.log("bindUI");

  // Safe listener helper | مساعد آمن لربط الأحداث
  const addListener = (selector, event, handler) => {
    const element = document.querySelector(selector);
    if (element) {
      element.addEventListener(event, handler);
    } else {
      console.warn(`Element not found: ${selector}`);
    }
  };

  // Register product events | تسجيل أحداث المنتجات
  addListener('#btnAddProduct', 'click', onAddProductClick);
  addListener('#btnCancelProduct', 'click', onCancelProduct);

  window.onEditProduct = onEditProduct;
}

/* Safe auto-bind | ربط تلقائي آمن */
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", bindUI);
} else {
  // DOM is ready | الصفحة جاهزة
  bindUI();
}

/* =========================
   Exports / Globals | التصدير العام
========================= */

window.onAddProductClick = onAddProductClick;
window.onCancelProduct = onCancelProduct;
window.loadProductsToUI = loadProductsToUI;
window.getAllProducts = getAllProducts;
window.getProductById = getProductById;
window.onEditProduct = onEditProduct;
window.saveProductEdit = saveProductEdit;
window.refreshProductsUI = refreshProductsUI;

export {
  onAddProductClick,
  onCancelProduct,
  loadProductsToUI,
  getAllProducts,
  getProductById,
  onEditProduct,
  saveProductEdit,
  refreshProductsUI
};
