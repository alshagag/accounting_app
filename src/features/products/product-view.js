import { $ } from "@/services/lib/utils.js";
import { getProductById } from "./products.js";
import { getAllTransactions } from "@/data/db/db.js";
import { getInventoryMap } from "@/services/inventory.service.js";
import { normalizeTransactionType } from "@/services/lib/helpers.js";
import { track } from "@/services/analytics/gtag.js";

const ViewProductModule = (() => {
  const ids = {
    modal: "viewProductModal",
    productId: "viewProductId",
    name: "viewProductName",
    sku: "viewProductSku",
    barcode: "viewProductBarcode",
    unit: "viewProductUnit",
    division: "viewProductDivision",
    defaultDivision: "viewProductDefaultDivision",
    status: "viewProductStatus",
    minStock: "viewProductMinStock",
    minStockValue: "viewProductMinStockValue",
    stock: "viewProductStockValue", // الحاوية الأب | Parent container
    stockValueSpan: "viewProductStockValueSpan", // العنصر الذي يحمل القيمة | Element holding the value
    totalSold: "viewProductTotalSoldValue",
    costPrice: "viewProductCostPrice",
    salePrice: "viewProductSalePrice",
    lastMovement: "viewProductLastMovement",
    description: "viewProductDesc",
    createdAt: "viewProductCreatedAt",
    updatedAt: "viewProductUpdatedAt",
    image: "viewProductImage",
    imageSection: "viewImageSection",
    barcodeImage: "viewBarcodeImage",
    barcodeText: "viewBarcodeText",
    barcodeSection: "viewBarcodeSection",
    editButton: "btnEditFromView",
    stockCard: "viewStockCard",
  };

  const selectors = {
    openButton: ".view-product-btn",
  };

  function getModal() {
    const modalElement = document.getElementById(ids.modal);
    if (!modalElement || !window.bootstrap) return null;
    return window.bootstrap.Modal.getOrCreateInstance(modalElement);
  }

  function setFieldValue(id, value, isHtml = false) {
    const element = document.getElementById(id);
    if (element) {
        if (isHtml) {
            element.innerHTML = value;
        } else if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.value = value;
        } else {
            element.textContent = value;
        }
    }
  }

  async function open(productId) {
    const product = await getProductById(productId);
    if (!product) return;

    const allTransactions = await getAllTransactions() || [];
    const inventoryMap = await getInventoryMap() || new Map();

    const stock = Number(inventoryMap.get(product.name) || 0);
    const totalSold = allTransactions
      .filter(t => normalizeTransactionType(t.type) === "بيع" && t.product === product.name)
      .reduce((sum, t) => sum + Number(t.quantity || 0), 0);

    const lastMovement = allTransactions
        .filter(t => t.product === product.name)
        .sort((a,b) => new Date(b.date) - new Date(a.date))[0];

    setFieldValue(ids.productId, product.id);
    setFieldValue(ids.name, product.name || "—");
    setFieldValue(ids.sku, product.sku || "—");
    setFieldValue(ids.barcode, product.barcode || product.code || "—");
    setFieldValue(ids.unit, product.unit || "—");
    setFieldValue(ids.division, product.division || "—");
    setFieldValue(ids.defaultDivision, product.defaultDivision || "—");
    setFieldValue(ids.status, "نشط");
    setFieldValue(ids.minStock, product.minStock || 0);
    setFieldValue(ids.minStockValue, product.minStock || 0);
    setFieldValue(ids.stockValueSpan, stock); // استهداف العنصر الذي يحمل القيمة | Target element holding the value
    setFieldValue(ids.totalSold, totalSold);
    setFieldValue(ids.costPrice, product.costPrice || 0);
    setFieldValue(ids.salePrice, product.price || 0);
    setFieldValue(ids.description, product.description || "—");
    setFieldValue(ids.createdAt, product.createdAt ? new Date(product.createdAt).toLocaleString() : "—");
    setFieldValue(ids.updatedAt, product.updatedAt ? new Date(product.updatedAt).toLocaleString() : "—");
    setFieldValue(ids.lastMovement, lastMovement ? `${normalizeTransactionType(lastMovement.type)} - ${lastMovement.date}` : "—");

    const imageSection = document.getElementById(ids.imageSection);
    const imageEl = document.getElementById(ids.image);
    if (product.image && imageSection && imageEl) {
        imageSection.classList.remove("d-none");
        imageEl.src = product.image;
    } else if (imageSection) {
        imageSection.classList.add("d-none");
    }

    const barcodeSection = document.getElementById(ids.barcodeSection);
    const barcodeImageEl = document.getElementById(ids.barcodeImage);
    const barcodeTextEl = document.getElementById(ids.barcodeText);
    const barcodeValue = product.barcode || product.code;
    if (barcodeValue && barcodeSection && barcodeImageEl && barcodeTextEl && window.JsBarcode) {
        barcodeSection.classList.remove("d-none");
        try {
            window.JsBarcode(barcodeImageEl, barcodeValue, {
                format: "CODE128",
                displayValue: false,
                margin: 0,
                width: 2,
                height: 80,
            });
            barcodeTextEl.textContent = barcodeValue;
        } catch (e) {
            console.error("JsBarcode error:", e);
            barcodeSection.classList.add("d-none");
        }
    } else if (barcodeSection) {
        barcodeSection.classList.add("d-none");
    }

    // تلوين قيمة المخزون حسب القيمة | Color stock value based on quantity
    const stockValueSpanEl = document.getElementById(ids.stockValueSpan);
    if (stockValueSpanEl) {
        stockValueSpanEl.classList.remove('text-danger', 'text-success'); // إزالة الألوان السابقة | Remove previous colors
        if (stock < 0) {
            stockValueSpanEl.classList.add('text-danger');
        } else if (stock > 0) {
            stockValueSpanEl.classList.add('text-success');
        }
        // عند الصفر يبقى اللون الافتراضي | Color remains default when stock is zero
    }

    // بطاقة المخزون: إزالة التنسيقات الشرطية | Clear conditional styles from stock card
    const stockCard = document.getElementById(ids.stockCard);
    if (stockCard) {
        stockCard.classList.remove('bg-warning', 'bg-danger', 'text-white');
        // يبقى اللون الافتراضي | Keeps default color
    }

    const editButton = document.getElementById(ids.editButton);
    if(editButton) {
        editButton.dataset.id = productId;
    }

    const modal = getModal();
    if (modal) modal.show();
    track("product_view", { feature_name: "products", page_name: "product_details" });
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const button = event.target.closest(selectors.openButton);
      if (button) {
        const productId = Number(button.dataset.id);
        if (productId) {
            event.preventDefault();
            open(productId);
        }
      }

      const editBtn = event.target.closest("#" + ids.editButton);
      if(editBtn) {
          const productId = Number(editBtn.dataset.id);
          if (productId) {
              const viewModal = getModal();
              if (viewModal) viewModal.hide();
              
              // يعتمد على توفر FullEditProductModule عالمياً | Relies on FullEditProductModule being globally available
              const editModule = window.FullEditProductModule;
              if (editModule && typeof editModule.open === 'function') {
                editModule.open(productId);
              } else {
                console.warn("FullEditProductModule not found or 'open' method is missing.");
              }
          }
      }
    });
  }

  return { bind, open };
})();

ViewProductModule.bind();

// إتاحته عالمياً لزر التعديل | Made globally accessible for edit button
window.ViewProductModule = ViewProductModule;
