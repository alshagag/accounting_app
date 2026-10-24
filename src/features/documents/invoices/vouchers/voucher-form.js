import { $, get, writable } from "@/services/lib/utils.js";
import { showGlobalAlert } from "@/components/ui.js";
import { confirmDelete } from "@/components/dialogs/confirm-dialog.js";
import { escapeHtml, formatMoney, calculateInvoiceTotals } from "@/features/documents/index.js";
import { escapeAttr } from "@/features/documents/controllers/utils/escape.js";
import { getTaxCodes } from "@/features/documents/controllers/services/tax-codes.js";
import { isFallbackMode, fallback, idbGetAll, STORE_PRODUCTS } from "@/data/db/db.js";
import { getAllVouchers, setAllVouchers, getVoucherLineTotalValue } from "./index.js";
import { getVoucherPartyOptions } from "@/features/parties/services/voucher-parties.js";

import { getInventoryMap } from "@/services/inventory.service.js";
import { runBarcodeScanner, findProductByBarcode } from "../shared/barcode/barcode-scanner.js";
import { saveProductFromDraft } from "@/features/products/products.js";
import { track, startOperation, operationDuration } from "@/services/analytics/gtag.js";

let editVoucherId = null;
let currentVoucherType = "قبض";
let products = [];
let inventoryMap = new Map();

/* حالة تحليلات السند لفتح واحد | Voucher analytics state for a single open */
let _voucherOp = null;
let _voucherOpSaved = false;

/* نوع السند للتقارير | Voucher type label for analytics */
function voucherTypeOf() {
    return currentVoucherType === "قبض" ? "receipt_voucher" : "payment_voucher";
}

function generateVoucherId() {
    return "v-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
}

function generateReferenceNo() {
    const prefix = currentVoucherType === "قبض" ? "R" : "P";
    const existing = getAllVouchers().filter(v => v.voucherType === currentVoucherType);
    const nums = existing.map(v => {
        const match = (v.referenceNo || "").match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
    });
    const nextNum = (nums.length > 0 ? Math.max(...nums) : 0) + 1;
    return `${prefix}-${String(nextNum).padStart(4, '0')}`;
}

async function loadVoucherProducts() {
    try {
        if (isFallbackMode()) {
            products = fallback.getProducts() || [];
        } else {
            products = await idbGetAll(STORE_PRODUCTS) || [];
        }
        inventoryMap = await getInventoryMap() || new Map();
    } catch (e) {
        console.warn("loadVoucherProducts error:", e);
        products = [];
        inventoryMap = new Map();
    }
    document.querySelectorAll(".voucher-line-product").forEach(sel => {
        populateVoucherProductSelect(sel);
    });
}

// مساعدات خفيفة لتركيب/إزالة AppSelect في حاوية | Lightweight helpers to mount/unmount AppSelect into a container
//
// AppSelect مكوّن مُتحكَّم فيه: يعرض فقط ما تقوله خاصية `value` | AppSelect is a controlled component: it only shows what its `value` prop says is selected
// التثبيت المباشر يرسمه مرة واحدة بقيمة ثابتة — اختيار المستخدم يُحدّث الحقل المخفي لكن النص لا يعكس القيمة الجديدة | a direct mount renders it once with a static `value` — choosing fires onChange (hidden input updates) but the label never reflects the new value
// لفه في مكوّن صغير يملك الاختيار كحالة محلية يُبقي `value` متزامنة مع كل اختيار/مسح | wrapping it in a tiny component that owns the selection as local state keeps `value` in sync with every selection/clear
async function mountAppSelect(container, options, initialValue, placeholder, onChange) {
    try {
        const [{ default: React }, { createRoot }] = await Promise.all([import('react'), import('react-dom/client')]);
        const AppSelect = (await import('@/components/ui/Select.jsx')).default;
        // التخلص من جذر سابق إن وُجد — بشكل غير متزامن لتجنب الإزالة أثناء رسم React | dispose any previous root — asynchronously to avoid unmounting during a React render
        if (container.__rs_root) {
            await new Promise(res => {
                setTimeout(() => {
                    try { container.__rs_root.unmount(); } catch (e) {}
                    try { delete container.__rs_root; } catch (e) {}
                    res();
                }, 0);
            });
        }
        const root = createRoot(container);

        // مطابقة المعرف المحفوظ مع خياره بالقيمة، فيُظهر إعادة فتح سند محفوظ | Match the saved id to its option by value so re-opening a saved
// اسم الطرف/الفاتورة بدل حقل فارغ | voucher shows the party/invoice name instead of a blank field.
        const initialOption = options.find(o => String(o.value) === String(initialValue)) || null;

        function ControlledAppSelect() {
            const [selected, setSelected] = React.useState(initialOption);

            return React.createElement(AppSelect, {
                initialOptions: options,
                value: selected,
                onChange: chosen => {
                    // 1) تحديث الحالة المحلية أولاً ليُظهر الحقل التسمية المختارة فورًا (أو العودة للـ placeholder عند X) | 1) Update local state first so the field immediately shows the chosen label (or clears back to the placeholder on X)
                    setSelected(chosen || null);
                    // 2) ثم تشغيل تأثيرات المستدعي (كتابة الحقل المخفي، تحديث قائمة الفواتير...) بنفس القيمة | 2) Then run the caller's side effects (write the hidden input, refresh the invoice list, etc.) with the same value
                    onChange && onChange(chosen);
                },
                placeholder: placeholder || '',
                isClearable: true,
                isSearchable: true,
                dir: document.dir || 'rtl'
            });
        }

        root.render(React.createElement(ControlledAppSelect));
        container.__rs_root = root;
    } catch (e) {
        console.warn('mountAppSelect failed', e);
    }
}

function disposeAppSelect(container) {
    try {
        if (container && container.__rs_root) {
            const root = container.__rs_root;
            // إزالة غير متزامنة لتجنب التداخل مع رسم React الحالي | unmount asynchronously to avoid interfering with the current React render
            setTimeout(() => {
                try { root.unmount(); } catch (e) {}
                try { if (container.__rs_root === root) delete container.__rs_root; } catch (e) {}
            }, 0);
        }
    } catch (e) { console.warn('disposeAppSelect', e); }
}

function populateVoucherProductSelect(selEl, selectedId) {
    const currentVal = selectedId || selEl.value;
    selEl.innerHTML = '<option value="">اختر المنتج</option>';
    products.forEach(p => {
        // القبض (receipt/بيع) → سعر البيع، الصرف (payment/شراء) → سعر الشراء (سعر التكلفة) | receipt (sale) → sale price, payment (purchase) → cost price
        const price = currentVoucherType === 'قبض'
            ? (p.salePrice ?? p.price ?? 0)
            : (p.costPrice ?? 0);
        const taxCode = p.defaultTaxCode || '';
        const selected = String(p.id) === String(currentVal) ? 'selected' : '';
        selEl.insertAdjacentHTML("beforeend",
            `<option value="${p.id}" data-price="${price}" data-tax-code="${taxCode}" ${selected}>${p.id} - ${escapeHtml(p.name)}</option>`
        );
    });
}

function addScannedProductToVoucher(product, qty = 1) {
    const tbody = $("voucherLinesBody");
    if (!tbody) return { status: "not-found" };

    const qtyAdd = Math.max(0, Number(qty) || 0);

    // 1) خط موجود بنفس productId → زيادة الكمية دون تغيير السعر | 1) existing line with the same productId → bump quantity without changing the price
    const rows = [...tbody.querySelectorAll("tr")];
    for (const row of rows) {
        const sel = row.querySelector(".voucher-line-product");
        if (sel && sel.value && String(sel.value) === String(product.id)) {
            const qtyEl = row.querySelector(".voucher-line-qty");
            const next = (Number(qtyEl?.value || 1) || 1) + (qtyAdd || 1);
            if (qtyEl) qtyEl.value = next;
            recalcVoucher();
            return { status: "added", message: `✓ تمت زيادة كمية ${product.name} إلى ${next}` };
        }
    }

    // 2) سطر جديد عبر createVoucherLine (بنفس مسار الإضافة اليدوية) | 2) new line via createVoucherLine (same path as manual adding)
    createVoucherLine({ productId: product.id, quantity: qtyAdd > 0 ? qtyAdd : 1 });
    const row = tbody.querySelector("tr:last-child");
    if (!row) return { status: "added", message: `✓ تمت إضافة ${product.name}` };

    // السعر حسب نوع السند: قبض → سعر البيع، صرف → سعر الشراء (مثل الاختيار اليدوي) | price by voucher type: receipt → sale price, payment → cost price (like manual selection)
    const amountEl = row.querySelector(".voucher-line-amount");
    const price = currentVoucherType === "قبض"
        ? (product.salePrice ?? product.price ?? 0)
        : (product.costPrice ?? 0);
    if (amountEl) amountEl.value = price || "";
    const taxSel = row.querySelector(".voucher-line-tax-code");
    if (taxSel && !taxSel.value && product.defaultTaxCode) taxSel.value = product.defaultTaxCode;
    recalcVoucher();

    return { status: "added", message: `✓ تمت إضافة ${product.name}` };
}

async function startVoucherScanner() {
    if (!Array.isArray(products) || !products.length) {
        await loadVoucherProducts();
    }
    await runBarcodeScanner({
        source: currentVoucherType === "قبض" ? "receipt_voucher" : "payment_voucher",
        onCode: async code => {
            const product = findProductByBarcode(code, products);
            if (!product) return { status: "not-found" };
            return { status: "found", product };
        },
        onEnsureProduct: draft => ensureScannedVoucherProduct(draft),
        onFinish: async items => {
            items.forEach(item => addScannedProductToVoucher(item.product, item.quantity));
        },
    });
}

/* ── إنشاء/جلب منتج محلي من بيانات عامة أو يدوية في محرر السند | Create/fetch a local product from public or manual data in the voucher editor ── */
async function ensureScannedVoucherProduct(draft) {
    try {
        const saved = await saveProductFromDraft(draft);
        if (!saved) return null;
        if (!products.some(p => String(p.id) === String(saved.id))) products.push(saved);
        document.querySelectorAll(".voucher-line-product").forEach(sel => {
            if (Array.from(sel.options || []).some(o => String(o.value) === String(saved.id))) return;
            const price = currentVoucherType === "قبض"
                ? (saved.salePrice ?? saved.price ?? 0)
                : (saved.costPrice ?? 0);
            sel.insertAdjacentHTML("beforeend",
                `<option value="${escapeAttr(String(saved.id))}" data-price="${price}" data-tax-code="${escapeAttr(saved.defaultTaxCode || '')}">${escapeHtml(saved.id)} - ${escapeHtml(saved.name)}</option>`
            );
        });
        return saved;
    } catch (e) {
        console.error("ensureScannedVoucherProduct error:", e);
        return null;
    }
}

function getTogglesConfig() {
    return [
        { id: "voucherToggleLineNo", headers: ["voucherLineNoHeader"] },
        { id: "voucherToggleStatement", headers: ["voucherLineStatementHeader"] },
        { id: "voucherToggleQuantity", headers: ["voucherLineQuantityHeader"] },
        { id: "voucherToggleDiscount", headers: ["voucherLineDiscountHeader"] },
        { id: "voucherToggleTaxAmount", headers: ["voucherLineTaxAmountHeader"] },
    ];
}

function recalcVoucher() {
    const rows = $("voucherLinesBody")?.querySelectorAll("tr") || [];
    const isTaxInclusive = $("voucherToggleTaxInclusive")?.checked || false;

    let totalSubtotal = 0;
    let totalTax = 0;

    rows.forEach(row => {
        const qty = Number(row.querySelector(".voucher-line-qty")?.value || 1);
        const amt = Number(row.querySelector(".voucher-line-amount")?.value || 0);
        const discountRaw = Number(row.querySelector(".voucher-line-discount")?.value || 0);
        const discountType = row.querySelector(".voucher-line-discount-type")?.value || "fixed";
        const taxSel = row.querySelector(".voucher-line-tax-code");
        const taxRate = Number(taxSel?.selectedOptions[0]?.dataset.rate || 0);

        const priceBeforeDiscount = qty * amt;
        const discountVal = discountType === "percent" ? priceBeforeDiscount * (discountRaw / 100) : discountRaw;
        const afterDiscount = Math.max(0, priceBeforeDiscount - discountVal);

        let lineSubtotal = afterDiscount;
        let taxVal = 0;

        if (taxRate > 0) {
            if (isTaxInclusive) {
                // السعر شامل الضريبة — نستخرج الضريبة من afterDiscount | Price includes tax. We need to extract tax from afterDiscount.
                taxVal = afterDiscount * taxRate / (100 + taxRate);
                lineSubtotal = afterDiscount - taxVal;
            } else {
                // السعر غير شامل الضريبة — نضيف الضريبة إلى afterDiscount | Price excludes tax. We add tax to afterDiscount.
                taxVal = afterDiscount * (taxRate / 100);
            }
        }

        const lineTotal = lineSubtotal + taxVal;

        totalSubtotal += lineSubtotal;
        totalTax += taxVal;

        const subtotalCell = row.querySelector(".voucher-line-subtotal");
        if (subtotalCell) subtotalCell.textContent = formatMoney(lineSubtotal);

        const totalCell = row.querySelector(".voucher-line-total");
        if (totalCell) totalCell.textContent = formatMoney(lineTotal);

        const taxAmountCell = row.querySelector(".voucher-line-tax-value");
        if (taxAmountCell) {
            taxAmountCell.textContent = taxVal.toFixed(2);
        }
    });

    const grandTotal = totalSubtotal + totalTax;

    const showTaxColumn = totalTax > 0;
    const taxHeader = $("voucherLineTaxAmountHeader");
    if (taxHeader) {
        taxHeader.classList.toggle("d-none", !showTaxColumn);
    }
    document.querySelectorAll(".voucher-line-tax-value").forEach(el => {
        el.closest("td")?.classList.toggle("d-none", !showTaxColumn);
    });

    const isFixedTotal = $("voucherToggleFixedTotal")?.checked || false;
    if (isFixedTotal) {
        $("voucherBalanceCurrent").textContent = formatMoney(grandTotal);
        const fixedTotal = Number($("voucherFixedTotal")?.value || 0);
        $("voucherBalanceFixed").textContent = formatMoney(fixedTotal);
        const remaining = fixedTotal - grandTotal;
        $("voucherBalanceRemaining").textContent = formatMoney(remaining);
        const statusEl = $("voucherBalanceStatus");
        if (Math.abs(remaining) < 0.01) {
            statusEl.textContent = "متوازن";
            statusEl.className = "input-group-text text-success";
        } else {
            statusEl.textContent = "غير متوازن";
            statusEl.className = "input-group-text text-danger";
        }
    } else {
        // إذا لم يكن المجموع ثابتًا، تُحدَّث شاشة الرصيد الرئيسية | If not a fixed total, update the main balance display
        $("voucherBalanceCurrent").textContent = formatMoney(grandTotal);
        $("voucherBalanceFixed").textContent = formatMoney(0);
        $("voucherBalanceRemaining").textContent = formatMoney(0);
    }
}

function syncToggleVisibility() {
    getTogglesConfig().forEach(t => {
        const checked = $(t.id)?.checked || false;
        t.headers.forEach(h => {
            const header = $(h);
            if (header) header.classList.toggle("d-none", !checked);
        });
        if (t.id === "voucherToggleLineNo") {
            document.querySelectorAll(".voucher-line-num").forEach(el => {
                el.classList.toggle("d-none", !checked);
            });
        }
        if (t.id === "voucherToggleStatement") {
            document.querySelectorAll(".voucher-line-statement").forEach(el => {
                el.closest("td")?.classList.toggle("d-none", !checked);
            });
        }
        if (t.id === "voucherToggleQuantity") {
            document.querySelectorAll(".voucher-line-qty").forEach(el => {
                el.closest("td")?.classList.toggle("d-none", !checked);
            });
        }
        if (t.id === "voucherToggleDiscount") {
            document.querySelectorAll(".voucher-line-discount").forEach(el => {
                el.closest("td")?.classList.toggle("d-none", !checked);
            });
        }
        if (t.id === "voucherToggleTaxAmount") {
            document.querySelectorAll(".voucher-line-tax-value").forEach(el => {
                el.closest("td")?.classList.toggle("d-none", !checked);
            });
        }
    });

    const fixedTotalChecked = $("voucherToggleFixedTotal")?.checked || false;
    const fixedContainer = $("voucherFixedTotalContainer");
    if (fixedContainer) fixedContainer.classList.toggle("d-none", !fixedTotalChecked);

    const customTitleChecked = $("voucherToggleCustomTitle")?.checked || false;
    const customTitleGroup = $("voucherCustomTitleGroup");
    if (customTitleGroup) customTitleGroup.classList.toggle("d-none", !customTitleChecked);

    const footerChecked = $("voucherToggleFooter")?.checked || false;
    const footerGroup = $("voucherFooterGroup");
    if (footerGroup) footerGroup.classList.toggle("d-none", !footerChecked);
}

/**
 * Updates the display of the account cell in a voucher line.
 * It can either show input fields or a formatted text string
 * based on the line's content (product or account).
 *
 * Visibility of the party ("العميل"/"المورد") and invoice ("الفاتورة") groups is
 * driven entirely by real state, not by a default CSS class:
 *   - party group shows only when the line's account type is customers/suppliers
 *   - invoice group is left alone here (managed by populateLineInvoiceSelect),
 *     since it depends on whether the selected party actually has invoices
 * @param {HTMLTableRowElement} row The table row element of the voucher line.
 */
function updateAccountCellDisplay(row) {
    if (!row) return;

    const accountWrapper = row.querySelector('.voucher-line-account-wrapper');
    if (!accountWrapper) return;
    // دعم البنية القديمة (account-inputs) والجديدة (حقول مخفية + حاويات React) | Support both legacy structure (account-inputs) and new structure (hidden inputs + react containers)
    const inputsDiv = accountWrapper.querySelector('.account-inputs');
    const productDisplayDiv = accountWrapper.querySelector('.product-account-display');
    const productAccountName = productDisplayDiv?.querySelector('.product-account-name');

    const acctContainer = row.querySelector('.voucher-line-account-type-container');
    const acctHidden = row.querySelector('.voucher-line-account-type');
    const partyContainer = row.querySelector('.voucher-line-party-container');
    const partyGroup = row.querySelector('.voucher-line-party-group');
    const partyHidden = row.querySelector('.voucher-line-party');
    const invoiceContainer = row.querySelector('.voucher-line-invoice-container');
    const invoiceGroup = row.querySelector('.voucher-line-invoice-group');
    const invoiceHidden = row.querySelector('.voucher-line-invoice');

    // إن لم توجد المدخلات القديمة ولا الحاويات الجديدة نخرج بأمان | If neither legacy inputs nor new containers/hidden inputs exist, bail out safely
    const hasLegacy = !!inputsDiv || !!productDisplayDiv;
    const hasNew = !!acctContainer || !!acctHidden || !!partyContainer || !!partyHidden || !!invoiceContainer || !!invoiceHidden;
    if (!hasLegacy && !hasNew) return;

    const productSelect = row.querySelector('.voucher-line-product');
    const productId = productSelect?.value;
    const selectedProduct = productId ? products.find(p => String(p.id) === productId) : null;

    // إخفاء عرض السطر القديم/المنتج أولاً | Hide legacy/product display first
    if (inputsDiv) inputsDiv.classList.add('d-none');
    if (productDisplayDiv) productDisplayDiv.classList.add('d-none');

    if (selectedProduct) {
        // عرض حساب المنتج للقراءة فقط | Show product account read-only display
        const accountName = currentVoucherType === 'قبض'
            ? (selectedProduct.defaultSalesAccount || 'المخزون - مبيعات')
            : (selectedProduct.defaultPurchaseAccount || 'المخزون الحالي');
        const stockQty = inventoryMap.get(String(selectedProduct.name)) || 0;
        if (productAccountName) productAccountName.textContent = accountName;
        productDisplayDiv?.classList.remove('d-none');

        // المنتج يحل محل عمود الحساب كليًا: إطواء كامل للطرف/الفاتورة (لا إخفاء نقطة التركيب فقط — بل المجموعة المعلَّمة كلها) | A product fully replaces the account column: fully collapse party/invoice (not just hiding the select mount point — hide the whole labeled group)
        if (partyGroup) partyGroup.style.display = 'none';
        if (invoiceGroup) invoiceGroup.style.display = 'none';
        if (partyContainer) { try { disposeAppSelect(partyContainer); } catch (e) {} }
        if (invoiceContainer) { try { disposeAppSelect(invoiceContainer); } catch (e) {} }
        if (partyHidden) { partyHidden.value = ''; partyHidden.dispatchEvent(new Event('change', { bubbles: true })); }
        if (invoiceHidden) { invoiceHidden.value = ''; invoiceHidden.dispatchEvent(new Event('change', { bubbles: true })); }
        if (acctContainer) acctContainer.style.display = 'none';

    } else if (inputsDiv) {
        // البنية القديمة: بلا منتج محدد — عرض المدخلات | Legacy structure: no product selected, show inputs
        inputsDiv.classList.remove('d-none');
    } else {
        // البنية الجديدة: بلا منتج محدد — استعادة ظهور حاوية نوع الحساب وتتبع مجموعة الطرف قيمة نوع الحساب الفعلية | New structure: no product selected — restore the account-type container visibility and let the party group follow the actual account-type value
        if (acctContainer) acctContainer.style.display = '';
        const acctVal = (acctHidden && acctHidden.value) || 'manual';
        const showParty = acctVal === 'customers' || acctVal === 'suppliers';

        if (partyGroup) partyGroup.style.display = showParty ? '' : 'none';

        if (!showParty) {
            if (partyContainer) { try { disposeAppSelect(partyContainer); } catch (e) {} }
            if (invoiceGroup) invoiceGroup.style.display = 'none';
            if (invoiceContainer) { try { disposeAppSelect(invoiceContainer); } catch (e) {} }
        }
    }
}

function createVoucherLine(data) {
    const tbody = $("voucherLinesBody");
    if (!tbody) return;

    const taxCodes = getTaxCodes();
    const taxOptions = taxCodes.map(tax =>
        `<option value="${escapeHtml(tax.id)}" data-rate="${tax.rate}">${escapeHtml(tax.name)}</option>`
    ).join('');

    const rowNum = (tbody.children.length || 0) + 1;
    const lineNoChecked = $("voucherToggleLineNo")?.checked || false;
    const statementChecked = $("voucherToggleStatement")?.checked || false;
    const quantityChecked = $("voucherToggleQuantity")?.checked || false;
    const discountChecked = $("voucherToggleDiscount")?.checked || false;
    const taxAmountChecked = $("voucherToggleTaxAmount")?.checked || false;

    // الظهور الابتدائي لمجموعتي الطرف/الفاتورة مشتق من بيانات السطر الفعلية لا من كلاس CSS افتراضي — وهذا ما يمنع ظهور تسمية "العميل"/"الفاتورة" شاردة بلا اختيار حقيقي | Initial visibility of the party/invoice groups is derived from the actual line data, not from a default CSS class — this keeps a stray "customer"/"invoice" label from ever being rendered without a real selection
    const initialAccountType = data?.accountType || 'manual';
    const showPartyGroupInit = initialAccountType === 'customers' || initialAccountType === 'suppliers';
    const showInvoiceGroupInit = showPartyGroupInit && !!(data?.partyId);

    const row = document.createElement("tr");
    row.draggable = true;
    row.innerHTML = `
        <td class="voucher-line-num text-center align-middle${lineNoChecked ? '' : ' d-none'}" data-label="index">${rowNum}</td>
        <td class="text-center align-middle" data-label="index" style="width:40px;cursor:grab;"><i class="bi bi-grip-vertical" style="opacity:.4"></i></td>
        <td class="align-middle" data-label="البند">
            <div class="d-flex align-items-center" style="gap:4px;">
                <div class="select-with-clear" style="flex:1 1 0;min-width:0;">
                    <select class="form-select form-select-sm voucher-line-product"></select>
                </div>
                <button type="button" class="btn btn-outline-secondary btn-sm voucher-line-scan-product" style="flex:0 0 auto;" title="مسح الباركود"><i class="bi bi-camera-fill"></i></button>
            </div>
        </td>
    <td class="align-middle" data-label="الحساب">
        <div class="voucher-line-account-wrapper">
            <div class="d-flex" style="gap:6px;align-items:stretch;">
                <div style="flex:0 0 120px;">
                    <div class="voucher-line-account-type-container"></div>
                    <input type="hidden" class="voucher-line-account-type" value="${initialAccountType}">
                </div>

                <div class="voucher-line-party-group" style="flex:1 1 1;display:${showPartyGroupInit ? '' : 'none'};">
                    <div class="input-group input-group-sm" style="align-items:stretch;">
                        <span class="input-group-text input-sm">${currentVoucherType === 'قبض' ? 'العميل' : 'المورد'}</span>
                        <div class="voucher-line-party-container" style="flex:1;"></div>
                        <input type="hidden" class="voucher-line-party" value="${escapeHtml(data?.partyId || '')}" data-party-id="${escapeAttr(data?.partySavedId || '')}">
                    </div>
                </div>

                <div class="voucher-line-invoice-group" style="flex:1 1 1;display:${showInvoiceGroupInit ? '' : 'none'};">
                    <div class="input-group input-group-sm" style="align-items:stretch;">
                        <span class="input-group-text input-sm">فاتورة</span>
                        <div class="voucher-line-invoice-container" style="flex:1;"></div>
                        <input type="hidden" class="voucher-line-invoice" value="${escapeHtml(data?.invoiceId || '')}" data-invoice-no="${escapeAttr(data?.invoiceNo || '')}" data-invoice-date="${escapeAttr(data?.invoiceDate || '')}">
                    </div>
                </div>
            </div>
            <div class="product-account-display d-none">
                <div class="input-group input-group-sm">
                    <span class="input-group-text product-account-name w-100 text-start"></span>
                </div>
            </div>
        </div>
    </td>
    <td class="${statementChecked ? '' : 'd-none'} align-middle" data-label="البيان"><textarea class="form-control form-control-sm voucher-line-statement" rows="1">${escapeHtml(data?.statement || '')}</textarea></td>
    <td class="${quantityChecked ? '' : 'd-none'} align-middle" data-label="الكمية"><input type="number" class="form-control form-control-sm voucher-line-qty" value="${data?.quantity || 1}" min="1"></td>
    <td class="align-middle" data-label="المبلغ"><input type="number" class="form-control form-control-sm voucher-line-amount" value="${data?.amount || 0}" min="0" step="0.01"></td>
    <td class="${discountChecked ? '' : 'd-none'} align-middle" data-label="الخصم"><input type="number" class="form-control form-control-sm voucher-line-discount" value="${data?.discount || 0}" min="0" step="0.01"><input type="hidden" class="voucher-line-discount-type" value="${data?.discountType || 'fixed'}"></td>
    <td class="align-middle" data-label="المجموع"><span class="input-group-text voucher-line-subtotal w-100 text-center">0.00</span></td>
    <td class="align-middle" data-label="الضريبة">
            <div class="select-with-clear">
                <select class="form-select form-select-sm voucher-line-tax-code">
                    <option value="" data-rate="0">لا توجد ضريبة</option>
                    ${taxOptions}
                </select>
            </div>
        </td>
    <td class="${taxAmountChecked ? '' : 'd-none'} align-middle text-center" data-label="ضريبة المبلغ"><span class="voucher-line-tax-value">0.00</span></td>
    <td class="align-middle text-center fw-bold" data-label="الإجمالي"><span class="voucher-line-total">0.00</span></td>
        <td class="text-center align-middle line-action-cell">
            <button type="button" class="btn btn-sm btn-outline-secondary voucher-line-copy" title="نسخ"><i class="bi bi-clipboard"></i></button>
        </td>
        <td class="text-center align-middle line-action-cell">
            <button type="button" class="btn btn-sm btn-outline-danger voucher-line-remove" title="حذف">&times;</button>
        </td>
  `;

    if (data?.taxCodeId) {
        const taxSel = row.querySelector(".voucher-line-tax-code");
        if (taxSel) taxSel.value = data.taxCodeId;
    }


    /* ── تعبئة قائمة المنتجات (خيارات الـ select الأساسي) | Populate product dropdown (underlying select options) ── */
    const productSel = row.querySelector(".voucher-line-product");
    if (productSel) {
        populateVoucherProductSelect(productSel, data?.productId || "");
    }

    // وسم الصفوف المستعادة من بيانات محفوظة حتى لا يستبدل معالج تغيير المنتج سعرها المحفوظ بسعر المنتج الافتراضي | Mark rows restored from saved data so the product-select change handler does not overwrite their saved unit price with the product's default
    if (data?.productId) row.dataset.voucherRestored = "1";

    tbody.appendChild(row);

    // زر الكاميرا → ماسح الباركود المشترك (إضافة بنفس مسار اختيار المنتج اليدوي) | Camera button → shared barcode scanner (adds via the same path as a manual product choice)
    row.querySelector(".voucher-line-scan-product")?.addEventListener("click", () => {
        startVoucherScanner();
    });

    // تركيب عناصر AppSelect مستقلة لنوع الحساب والطرف والفاتورة | Mount independent AppSelect controls for account-type, party and invoice
    (function () {
        (async () => {
            try {
                const acctHidden = row.querySelector('.voucher-line-account-type');
                const acctContainer = row.querySelector('.voucher-line-account-type-container');
                const partyContainer = row.querySelector('.voucher-line-party-container');
                const partyGroup = row.querySelector('.voucher-line-party-group');
                const partyHidden = row.querySelector('.voucher-line-party');
                const invoiceContainer = row.querySelector('.voucher-line-invoice-container');
                const invoiceGroup = row.querySelector('.voucher-line-invoice-group');
                const invoiceHidden = row.querySelector('.voucher-line-invoice');

                const accountOptions = [
                    { value: 'manual', label: 'يدوي' },
                    { value: 'customers', label: 'العملاء' },
                    { value: 'suppliers', label: 'الموردين' }
                ];

                const acctInitial = (acctHidden && acctHidden.value) || (data?.accountType || 'manual');

                // قائمة نوع الحساب تكتب قيمتها المخفية وتبث "change" فقط — ومعالج المستوى العام لـ ".voucher-line-account-type" يملك كل منطق إظهار/إخفاء الطرف/الفاتورة، فمصدر الحقيقة واحد | The account-type select only ever sets its own hidden value and dispatches "change" — the document-level ".voucher-line-account-type" handler owns all the party/invoice show/hide logic, so there's a single source of truth
                await mountAppSelect(acctContainer, accountOptions, acctInitial, 'نوع الحساب', val => {
                    const v = val ? (val.value ?? val) : '';
                    if (acctHidden) {
                        acctHidden.value = v;
                        acctHidden.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                });

                if (acctInitial === 'customers' || acctInitial === 'suppliers') {
                    if (partyGroup) partyGroup.style.display = '';
                    await populateLinePartySelect(row, acctInitial, data?.partyId || '');
                    const currentParty = (partyHidden && partyHidden.value) || data?.partyId || '';
                    // populateLineInvoiceSelect يملك ظهور مجموعة الفاتورة: لا تُعرض إلا بعد أن يملك الطرف فواتير فعلية — ونمرر بيانات السطر المحفوظة فيُعاد بناء فاتورة محفوظة غير موجودة في القائمة الحية (رقم + تاريخ) وتبقى مختارة | populateLineInvoiceSelect owns invoice-group visibility: it only shows the field once the party actually has invoices to pick from — pass the saved line data so a saved invoice missing from the live list can still be rebuilt (no + date) and stay selected
                    await populateLineInvoiceSelect(row, currentParty, data?.invoiceId || '', data || {});
                } else {
                    if (partyGroup) partyGroup.style.display = 'none';
                    if (invoiceGroup) invoiceGroup.style.display = 'none';
                }
            } catch (e) { console.warn('mounting AppSelects failed', e); }
        })();
    })();

    recalcVoucher();

    // لف قوائم السطر الأصلية (منتج، رمز ضريبة) في React Select لتطابق قوائم الحساب/الطرف/الفاتورة منذ البداية — يُنفَّذ لكل سطر، ابتدائيًا (setVoucherFormValues) وعند الإضافة (btnAddVoucherLine)، فالمساران يستخدمان المكوّن نفسه دائمًا | Wrap the row's native <select> elements (product, tax-code) in React Select so they match the account/party/invoice selects from the start — runs for every line, both initial (setVoucherFormValues) and newly added (btnAddVoucherLine), so both paths always use the same component
    try {
        import('@/components/ui/initReactSelects.js').then(m => m.initReactSelects(row)).catch(() => {});
    } catch (e) {}
}

function readVoucherRow(row) {
    const productId = row.querySelector('.voucher-line-product')?.value || '';
    const selectedProduct = productId ? products.find(p => String(p.id) === productId) : null;
    const accountType = row.querySelector('.voucher-line-account-type')?.value || 'manual';
    const partyId = row.querySelector('.voucher-line-party')?.value || '';
    const invoiceEl = row.querySelector('.voucher-line-invoice');
    const invoiceId = invoiceEl?.value || '';

    // تفضيل القيم المحمولة على السطر نفسه (المحفوظة عند إنشائه/تعديله) والتراجع عن البحث الحي فقط عند غيابها — يحافظ هذا على رقم المرجع وتاريخ الإصدار في دورة حفظ ← إعادة فتح ← حفظ حتى إن لم تُحمَّل قائمة المستندات | Prefer the values carried on the row itself (persisted when the row was created/edited) and only fall back to a live lookup when they're missing — this keeps the reference number and issue date from being lost during a save → reopen → save round-trip even if the document list isn't loaded
    const resolved = invoiceId ? resolveInvoiceInfo(invoiceId, accountType) : {};
    const invoiceNo = (invoiceEl && invoiceEl.dataset.invoiceNo) || resolved.invoiceNo || '';
    const invoiceDate = (invoiceEl && invoiceEl.dataset.invoiceDate) || resolved.invoiceDate || '';
    const partyPhone = resolved.partyPhone || '';

    const taxSel = row.querySelector('.voucher-line-tax-code');

    return {
        productId,
        // إبقاء اسم المنتج نفسه على السطر فيُظهر السند المحفوظ «بصل»/«طماطم» بدل الرجوع لاسم جهة السند | Keep the product's own name on the line so a saved voucher displays «بصل»/«طماطم» instead of falling back to the voucher's party name
        lineName: selectedProduct ? selectedProduct.name : "",
        accountType,
        partyId,
        partySavedId: row.querySelector('.voucher-line-party')?.dataset?.partyId || '',
        invoiceId,
        invoiceNo,
        invoiceDate,
        partyPhone,
        statement: row.querySelector('.voucher-line-statement')?.value || '',
        quantity: Number(row.querySelector('.voucher-line-qty')?.value || 1),
        amount: Number(row.querySelector('.voucher-line-amount')?.value || 0),
        discount: Number(row.querySelector('.voucher-line-discount')?.value || 0),
        discountType: row.querySelector('.voucher-line-discount-type')?.value || 'fixed',
        taxCodeId: taxSel?.value || '',
        taxCodeName: taxSel?.selectedOptions[0]?.textContent || '',
        taxRate: Number(taxSel?.selectedOptions[0]?.dataset.rate || 0),
    };
}

/*
 * يبني خيارات سجل الأطراف للسند (سجل محفوظ + فواتير مستمدة) ويقرأ السجل من localStorage ووثائق الفواتير من الويندوز — تهيئة فعلية مباشرة | Builds the voucher's party options (saved registry + derived invoices) reading the registry from localStorage and invoice docs from window — direct live init
 */
function getPartiesForVoucher(type) {
    let saved = [];
    try {
        saved = JSON.parse(localStorage.getItem("accountingParties") || "[]");
    } catch {}
    return getVoucherPartyOptions({
        type,
        savedParties: saved,
        latestDocuments: window.latestDocuments,
    });
}

function loadPartiesToVoucher() {
    const type = $("voucherPartyType")?.value || "manual";
    const partySelect = $("voucherParty");
    const manualInput = $("voucherPartyManual");
    const partySelectWrapper = partySelect?.closest(".select-with-clear");

    if (type === "manual") {
        /* إخفاء قائمة الطرف وإظهار الإدخال اليدوي | Hide party select, show manual input */
        if (partySelectWrapper) partySelectWrapper.classList.add("d-none");
        if (manualInput) manualInput.classList.remove("d-none");
        return;
    }

    /* إظهار قائمة الطرف، إخفاء الإدخال اليدوي ومسح قيمته | Show party select, hide manual input and clear its value */
    if (partySelectWrapper) partySelectWrapper.classList.remove("d-none");
    if (manualInput) {
        manualInput.classList.add("d-none");
        manualInput.value = "";
    }

    try {
        const parties = getPartiesForVoucher(type);
        const prevValue = partySelect.value;
        partySelect.innerHTML = '<option value="">اختر جهة</option>';
        parties.forEach(p => {
            partySelect.insertAdjacentHTML("beforeend",
                `<option value="${escapeHtml(p.name)}" data-id="${escapeAttr(p.id || '')}">${escapeHtml(p.name)}</option>`
            );
        });
        // الحفاظ على الطرف المحدد عبر إعادة البناء — غلاف React يعيد إطلاق هذه الدالة عند التركيب/التغيير، فبدون ذلك كان اختيار محفوظ يُمسح قبل إعادة التهيئة | Preserve the currently selected party across the rebuild — the React wrapper re-triggers this function on mount/change, so without this a saved selection would be wiped back to empty before re-initializing
        if (prevValue && parties.some(p => String(p.name) === prevValue)) {
            partySelect.value = prevValue;
        }
        try {
            import('@/components/ui/initReactSelects.js').then(m => {
                try { m.disposeReactSelect(partySelect); } catch (e) {}
                m.initReactSelects(partySelect);
            }).catch(() => {});
        } catch {}
    } catch { }
}

async function populateLinePartySelect(row, accountType, selectedPartyName) {
    const hiddenInput = row.querySelector('.voucher-line-party');
    const container = row.querySelector('.voucher-line-party-container');
    if (!container || !hiddenInput) return;

    const partyTypeFilter = accountType === 'customers' ? 'customers' : 'suppliers';
    const placeholder = accountType === 'customers' ? 'اختر العميل' : 'اختر المورد';

    try {
        const parties = getPartiesForVoucher(partyTypeFilter);
        const options = parties.map(p => ({ value: p.name, label: p.name, id: p.id || '' }));
        const initial = hiddenInput.value || selectedPartyName || '';
        // إبقاء الحقل المخفي متزامنًا مع ما يُعرض فعليًا، فيُحفظ الطرف الظاهر حتى في سطر يُعبأ برمجيًا | Keep the hidden input in sync with what's actually shown so a programmatically populated line still saves the displayed party
        if (initial) hiddenInput.value = initial;

        // الاستعادة بالمعرّف الحقيقي أولاً (قيمة الحقل المخفي هي dataset الخيار المحدد) ثم التراجع للاسم لأسطر حُفظت قبل تتبُّع المعرّفات أو لأطراف مشتقة غير مسجلة | Restore by real id first (the hidden input's value is the selected option's dataset), then fall back to the name for lines saved before ids were tracked or for derived (unregistered) parties
        let pickedId = hiddenInput.dataset.partyId || '';
        if (!pickedId && initial) {
            const nameMatch = parties.find(p => String(p.name).toLowerCase() === String(initial).toLowerCase());
            if (nameMatch) pickedId = nameMatch.id || '';
        }
        if (pickedId) hiddenInput.dataset.partyId = pickedId;
        else delete hiddenInput.dataset.partyId;

        await mountAppSelect(container, options, initial, placeholder, val => {
            const v = val ? (val.value ?? val) : '';
            hiddenInput.value = v;
            if (val && val.id) hiddenInput.dataset.partyId = val.id;
            else delete hiddenInput.dataset.partyId;
            hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        });
    } catch (e) {
        // إظهار خيار فارغ بإزالة التركيب ومسح الحقل المخفي | show empty option by unmounting and clearing the hidden input
        disposeAppSelect(container);
        hiddenInput.value = '';
        delete hiddenInput.dataset.partyId;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
}

/**
 * Get invoices for a given party name from the in-memory document list.
 * For receipt vouchers (قبض) → sales invoices, for payment vouchers (صرف) → purchase invoices.
 */
function getInvoicesForParty(partyKey, accountType) {
    if (!partyKey) return [];
    // استخدام accountType من السطر لتحديد الفواتير المطلوبة | Use accountType from the line to determine which invoices to fetch
    const isCustomer = accountType === 'customers';
    const allInvoices = isCustomer
        ? (window.latestDocuments?.salesInvoices || [])
        : (window.latestDocuments?.purchaseInvoices || []);
    const lowerCasePartyKey = String(partyKey).trim().toLowerCase();
    return allInvoices.filter(inv => inv.party && (
        String(inv.party).trim().toLowerCase() === lowerCasePartyKey ||
        String(inv.customerPhone).trim().toLowerCase() === lowerCasePartyKey
    ));
}

/**
 * Resolve the display values (reference number, issue date, party phone) of an
 * invoice from the in-memory document list, using the invoice's key (or its
 * document number) as the lookup key. This is what gets persisted on each
 * voucher line so the display and the edit form never depend on a live lookup.
 */
function resolveInvoiceInfo(invoiceId, accountType) {
    if (!invoiceId) return {};
    const lists = [];
    if (accountType === 'customers') {
        lists.push(window.latestDocuments?.salesInvoices || []);
    } else if (accountType === 'suppliers') {
        lists.push(window.latestDocuments?.purchaseInvoices || []);
    } else {
        lists.push(
            window.latestDocuments?.salesInvoices || [],
            window.latestDocuments?.purchaseInvoices || []
        );
    }
    const id = String(invoiceId);
    for (const list of lists) {
        const inv = list.find(i => String(i.key) === id || String(i.documentNo || '') === id);
        if (inv) {
            return {
                invoiceNo: inv.documentNo || inv.reference || inv.invoiceNo || '',
                invoiceDate: inv.issueDate || inv.date || '',
                partyPhone: inv.customerPhone || '',
            };
        }
    }
    return {};
}

/**
 * Populate the invoice dropdown in a voucher line for a given party.
 * If selectedInvoiceKey is provided, auto-select that invoice.
 *
 * This is the single owner of the invoice group's visibility: the "الفاتورة"
 * field (and its label) only ever appears once there is an actual party AND
 * that party actually has invoices to choose from — never based on a default
 * CSS class, and never left showing with nothing selectable in it.
 */
async function populateLineInvoiceSelect(row, partyName, selectedInvoiceKey, saved) {
    const hiddenInput = row.querySelector('.voucher-line-invoice');
    const container = row.querySelector('.voucher-line-invoice-container');
    const group = row.querySelector('.voucher-line-invoice-group');
    if (!container || !hiddenInput) return;

    if (!partyName) {
        disposeAppSelect(container);
        hiddenInput.value = '';
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        if (group) group.style.display = 'none';
        return;
    }

    const accountTypeSelect = row.querySelector('.voucher-line-account-type');
    const accountType = accountTypeSelect?.value;

    const invoices = getInvoicesForParty(partyName, accountType);

    if (invoices.length === 0) {
        // لا فواتير حية لهذا الطرف. إن ما زال السطر يحمل فاتورة محفوظة (رقم + تاريخ) يُعاد بناء خيار واحد من القيم المحفوظة فلا تُفرّغ فاتورة مختارة سابقًا عند إعادة الفتح | No live invoices for this party. If the line still carries a saved invoice (no + date), rebuild a single option from the saved values so reopening a voucher never blanks out a previously selected invoice
        if (selectedInvoiceKey && saved && (saved.invoiceNo || saved.invoiceDate)) {
            if (group) group.style.display = '';
            const options = [{
                value: selectedInvoiceKey,
                label: [saved.invoiceNo, saved.invoiceDate].filter(Boolean).join(' — ')
            }];
            const initial = hiddenInput.value || selectedInvoiceKey || '';
            if (initial) hiddenInput.value = initial;
            await mountAppSelect(container, options, initial, 'اختر الفاتورة', val => {
                const v = val ? (val.value ?? val) : '';
                hiddenInput.value = v;
                hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
            });
            return;
        }
        disposeAppSelect(container);
        hiddenInput.value = '';
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
        if (group) group.style.display = 'none';
        return;
    }

    if (group) group.style.display = '';

    // حقل الطرف المجاور لهذه القائمة يعرض مالك الفاتورة أصلًا، فكان تكرار "العملاء/الموردون — الطرف" في كل خيار زائدًا؛ نُظهر رقم الفاتورة وتاريخها فقط | The party field right next to this select already shows who the invoice belongs to, so repeating "customers/suppliers — party" in every option was redundant; show just the invoice reference and its date
    const options = invoices.map(inv => {
        const reference = inv.documentNo || inv.reference || inv.invoiceNo || inv.key || '';
        const date = inv.issueDate || inv.date || '';
        return { value: inv.key, label: [reference, date].filter(Boolean).join(' — ') };
    });

    // إن لم تكن الفاتورة المحفوظة ضمن الخيارات المبنية حديثًا (طرف لم يعد يطابق، أو المستند غير موجود) يُلحق خيار اصطناعي مبني من القيم المحفوظة ليستقر الاختيار | If the saved invoice is not among the freshly built options (party no longer matches, or the document list doesn't contain it), append a synthetic option built from the persisted values so the selection holds
    if (selectedInvoiceKey) {
        const alreadyThere = options.some(o => String(o.value) === String(selectedInvoiceKey));
        if (!alreadyThere && saved && (saved.invoiceNo || saved.invoiceDate)) {
            options.push({
                value: selectedInvoiceKey,
                label: [saved.invoiceNo, saved.invoiceDate].filter(Boolean).join(' — ')
            });
        }
    }

    const initial = hiddenInput.value || selectedInvoiceKey || '';
    if (initial) hiddenInput.value = initial;
    await mountAppSelect(container, options, initial, 'اختر الفاتورة', val => {
        const v = val ? (val.value ?? val) : '';
        hiddenInput.value = v;
        hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
    });
}

function resetVoucherForm() {
    editVoucherId = null;
    $("voucherModalTitle").textContent = `سند ${currentVoucherType} جديد`;
    $("voucherDate").value = new Date().toISOString().slice(0, 10);
    $("voucherReferenceNo").value = generateReferenceNo();
    $("voucherReferenceNoDisplay").classList.add("d-none");
    $("voucherReferenceNo").classList.remove("d-none");
    $("voucherAutoReference").checked = true;
    $("voucherPartyType").value = "manual";
    $("voucherPartyManual").value = "";
    $("voucherParty").value = "";
    $("voucherAccountType").value = "cash";
    $("voucherDescription").value = "";
    $("voucherLinesBody").innerHTML = "";
    $("btnDeleteVoucher")?.classList.add("d-none");
    $("voucherSaveButtonText").textContent = "إنشاء";

    $("voucherToggleLineNo").checked = false;
    $("voucherToggleStatement").checked = false;
    $("voucherToggleQuantity").checked = false;
    $("voucherToggleDiscount").checked = false;
    $("voucherToggleTaxAmount").checked = false;
    $("voucherToggleTaxInclusive").checked = false;
    $("voucherToggleFixedTotal").checked = false;
    $("voucherToggleCustomTitle").checked = false;
    $("voucherToggleFooter").checked = false;
    $("voucherCustomTitle").value = "";
    $("voucherFooter").value = "";
    $("voucherFixedTotal").value = "0";

    loadPartiesToVoucher();
    syncToggleVisibility();
    createVoucherLine();
    recalcVoucher();
}

/*
 * يختار الطرف في قائمة "جهة الاتصال" الرئيسية استناداً إلى المعرّف الفعلي أولاً (data-id على الخيار) ويرجع إلى الاسم فقط كحالة وراء — سندات قديمة أو أطراف مستمدة من معاملة لا معرّف لها | Picks the party in the main "contact" dropdown by the real id first (data-id on the option) and falls back to the name only as a backup — legacy vouchers or parties derived from a transaction have no id
 */
function selectVoucherPartyInDropdown(partyName, partyId) {
    const partySelect = $("voucherParty");
    if (!partySelect) return;
    let picked = null;
    if (partyId) {
        picked = Array.from(partySelect.options).find(
            o => o.dataset?.id && String(o.dataset.id) === String(partyId)
        );
    }
    if (!picked && partyName) {
        picked = Array.from(partySelect.options).find(
            o => o.value.trim().toLowerCase() === String(partyName).trim().toLowerCase()
        );
    }
    if (picked) partySelect.value = picked.value;
}

function setVoucherFormValues(voucher) {
    editVoucherId = voucher.id;
    currentVoucherType = voucher.voucherType;
    $("voucherModalTitle").textContent = `تعديل سند ${voucher.voucherType}`;
    $("voucherDate").value = voucher.date || "";
    $("voucherReferenceNo").value = voucher.referenceNo || "";
    $("voucherPartyManual").value = voucher.party || "";
    $("voucherAccountType").value = voucher.accountType || "cash";
    $("voucherDescription").value = voucher.description || "";
    $("btnDeleteVoucher")?.classList.remove("d-none");
    $("voucherSaveButtonText").textContent = "تحديث";

    const toggles = voucher.toggleStates || {};
    $("voucherAutoReference").checked = toggles.autoReference === true;
    $("voucherToggleLineNo").checked = toggles.lineNo === true;
    $("voucherToggleStatement").checked = toggles.statement === true;
    $("voucherToggleQuantity").checked = toggles.quantity === true;
    $("voucherToggleDiscount").checked = toggles.discount === true;
    $("voucherToggleTaxAmount").checked = toggles.taxAmount === true;
    $("voucherToggleTaxInclusive").checked = toggles.taxInclusive === true;
    $("voucherToggleFixedTotal").checked = toggles.fixedTotal === true;
    $("voucherToggleCustomTitle").checked = toggles.customTitle === true;
    $("voucherToggleFooter").checked = toggles.footer === true;
    $("voucherCustomTitle").value = voucher.customTitle || "";
    $("voucherFooter").value = voucher.footer || "";
    $("voucherFixedTotal").value = voucher.fixedTotal || "0";

    $("voucherLinesBody").innerHTML = "";

    // استعادة كل سطر من قيمه المحفوظة — لا نكتب فوق سطر بجهة/فاتورة السند؛ رابط السند يُستخدم فقط كتراجع لأسطر قديمة حُفظت بلا جهة/فاتورة خاصة | Restore each line from its own saved values — never overwrite a line's party/invoice with the voucher-level ones; the voucher-level link is only used as a fallback for legacy lines saved without their own party/invoice
    const linesToRestore = (voucher.lines || []).map(line => {
        const isPartyLine = line.accountType === 'customers' || line.accountType === 'suppliers';
        if (!isPartyLine) return line;
        const needsPartyFallback = !line.partyId && voucher.party;
        const needsInvoiceFallback = !line.invoiceId && voucher.invoiceKey;
        if (!needsPartyFallback && !needsInvoiceFallback) return line;
        return {
            ...line,
            partyId: needsPartyFallback ? voucher.party : line.partyId,
            partySavedId: needsPartyFallback ? (line.partySavedId || voucher.partyId || '') : line.partySavedId,
            invoiceId: needsInvoiceFallback ? voucher.invoiceKey : line.invoiceId,
        };
    });
    linesToRestore.forEach(line => createVoucherLine(line));

    /* استعادة نوع الطرف إن كان السند مرتبطًا بفاتورة | Restore party type if the voucher was linked to an invoice */
    if (voucher.invoiceKey) {
        const isReceipt = voucher.voucherType === "قبض";
        const partyType = isReceipt ? "customers" : "suppliers";
        $("voucherPartyType").value = partyType;
        loadPartiesToVoucher();

        /* اختيار الطرف تلقائيًا في قائمة الطرف الرئيسية | Auto-select party in the top-level party dropdown */
        selectVoucherPartyInDropdown(voucher.party, voucher.partyId);
    } else {
        /* استعادة partyType للسندات غير المرتبطة بفاتورة | Restore partyType for non-invoice vouchers */
        if (voucher.partyType) {
            $("voucherPartyType").value = voucher.partyType;
        }
        loadPartiesToVoucher();

        const currentType = $("voucherPartyType")?.value;
        if (currentType === "manual" && voucher.party) {
            /* استعادة اسم الطرف اليدوي | Restore manual party name */
            $("voucherPartyManual").value = voucher.party;
        } else if (currentType === "customers" || currentType === "suppliers") {
            /* اختيار الطرف تلقائيًا في القائمة وضمان إخفاء الإدخال اليدوي | Auto-select the party in the dropdown and ensure manual input is hidden */
            selectVoucherPartyInDropdown(voucher.party, voucher.partyId);
            /* إخفاء الإدخال اليدوي ومسح قيمته صراحةً | Explicitly hide manual input and clear its value */
            const manualInput = $("voucherPartyManual");
            if (manualInput) {
                manualInput.classList.add("d-none");
                manualInput.value = "";
            }
        }
    }

    syncToggleVisibility();
    recalcVoucher();
}

function readVoucherFormValues() {
    const lines = [];
    $("voucherLinesBody")?.querySelectorAll("tr").forEach(row => {
        const line = readVoucherRow(row);
        /* الشبكة ترسم دائمًا صفًا احتياطيًا واحدًا ليُضاف سطر جديد بلا زر؛ هذا الصف بلا منتج ولا طرف ولا فاتورة ولا بيان ولا مبلغ — ولا يُحفظ أبدًا وإلا نما كل سند محفوظ بسطر وهمي 0.00 | The grid always renders one spare row so a new line can be added without a button; that spare row carries no product, party, invoice, statement or amount — it must never be persisted, otherwise every saved voucher grows a phantom 0.00 line */
        const isEmptyLine = !line.productId && !line.lineName && !line.statement
            && !line.partyId && !line.partySavedId && !line.invoiceId
            && !Number(line.amount || 0);
        if (!isEmptyLine) lines.push(line);
    });

    /* استخراج رابط الفاتورة من أول سطر له فاتورة مختارة | Extract invoice link from the first line that has one selected */
    let invoiceKey = "";
    let invoiceCategory = "";
    let invoiceNo = "";
    let invoiceDate = "";
    for (const l of lines) {
        if (l.invoiceId) {
            invoiceKey = l.invoiceId;
            invoiceCategory = "invoice";
            invoiceNo = l.invoiceNo || "";
            invoiceDate = l.invoiceDate || "";
            break;
        }
    }

    return {
        id: editVoucherId || generateVoucherId(),
        voucherType: currentVoucherType,
        date: $("voucherDate")?.value || "",
        referenceNo: $("voucherReferenceNo")?.value || "",
        partyType: $("voucherPartyType")?.value || "manual",
        party: $("voucherPartyType")?.value === "manual" ? ($("voucherPartyManual")?.value || "") : ($("voucherParty")?.value || ""),
        // المعرف الفعلي للطرف من سجل الأطراف (data-id على الخيار المحدد)؛ يُخزَّن مع الاسم ويُستعمل للاسترجاع بدل الاعتماد على الاسم فقط | The party's real id from the party registry (data-id on the selected option); stored with the name and used for restore instead of relying on the name alone
        partyId: ($("voucherPartyType")?.value !== "manual" && $("voucherParty")?.selectedOptions?.[0]?.dataset?.id)
            ? String($("voucherParty").selectedOptions[0].dataset.id)
            : "",
        accountType: $("voucherAccountType")?.value || "cash",
        account: $("voucherAccountType")?.value === "cash" ? "نقدي" : "بنك",
        description: $("voucherDescription")?.value || "",
        invoiceKey,
        invoiceCategory,
        invoiceNo,
        invoiceDate,
        lines,
        toggleStates: {
            lineNo: !!$("voucherToggleLineNo")?.checked,
            statement: !!$("voucherToggleStatement")?.checked,
            quantity: !!$("voucherToggleQuantity")?.checked,
            discount: !!$("voucherToggleDiscount")?.checked,
            taxAmount: !!$("voucherToggleTaxAmount")?.checked,
            taxInclusive: !!$("voucherToggleTaxInclusive")?.checked,
            fixedTotal: !!$("voucherToggleFixedTotal")?.checked,
            customTitle: !!$("voucherToggleCustomTitle")?.checked,
            footer: !!$("voucherToggleFooter")?.checked,
            autoReference: !!$("voucherAutoReference")?.checked,
        },
        fixedTotal: Number($("voucherFixedTotal")?.value || 0),
        customTitle: $("voucherCustomTitle")?.value || "",
        footer: $("voucherFooter")?.value || "",
        amount: lines.reduce((sum, l) => sum + getVoucherLineTotalValue(l, !!$("voucherToggleTaxInclusive")?.checked), 0),
    };
}

async function saveVoucherFromForm() {
    const values = readVoucherFormValues();

    if (!values.date) {
        showGlobalAlert("أدخل التاريخ", "warning");
        trackVoucherSaveFail("missing_date");
        return;
    }
    if (!values.party) {
        showGlobalAlert("أدخل جهة الاتصال", "warning");
        trackVoucherSaveFail("missing_party");
        return;
    }
    if (values.lines.length === 0 || values.lines.every(l => !l.productId && !l.amount)) {
        showGlobalAlert("أضف بندًا واحدًا على الأقل يحتوي على منتج أو مبلغ", "warning");
        trackVoucherSaveFail("no_lines");
        return;
    }

    const allVouchers = getAllVouchers();
    const idx = allVouchers.findIndex(v => v.id === values.id);
    const isEdit = idx >= 0;

    if (isEdit) {
        allVouchers[idx] = values;
    } else {
        values.createdAt = new Date().toISOString();
        allVouchers.push(values);
    }

    setAllVouchers(allVouchers);

    _voucherOpSaved = true;
    const modal = $("voucherModal");
    if (modal && window.bootstrap) {
        window.bootstrap.Modal.getInstance(modal)?.hide();
    }

    document.dispatchEvent(new CustomEvent('voucher-saved', {
        detail: { voucherId: values.id, voucherType: currentVoucherType }
    }));

    showGlobalAlert(`تم حفظ سند ${currentVoucherType}`, "success");
    track(isEdit ? "voucher_edit_success" : "voucher_create_success", {
        feature_name: "vouchers",
        voucher_type: voucherTypeOf(),
        line_count: values.lines.length,
        operation_id: _voucherOp?.id,
        duration_ms: operationDuration(_voucherOp),
    });
}

/* فشل حفظ السند بسبب محدّد فقط (بلا بيانات مالية) | Voucher save failure with a specific reason only (no financial data) */
function trackVoucherSaveFail(reason) {
    track(editVoucherId ? "voucher_edit_failed" : "voucher_create_failed", {
        feature_name: "vouchers",
        voucher_type: voucherTypeOf(),
        failure_reason: reason,
    });
}

async function deleteVoucherFromForm() {
    if (!editVoucherId) return;
    const confirmed = await confirmDelete({
        title: `حذف سند ${currentVoucherType}`,
        message: "هل تريد حذف هذا السند؟",
        confirmText: "حذف السند"
    });
    if (!confirmed) return;

    const allVouchers = getAllVouchers().filter(v => v.id !== editVoucherId);
    setAllVouchers(allVouchers);

    const modal = $("voucherModal");
    if (modal && window.bootstrap) {
        window.bootstrap.Modal.getInstance(modal)?.hide();
    }

    document.dispatchEvent(new CustomEvent('voucher-deleted', {
        detail: { voucherId: editVoucherId }
    }));

    showGlobalAlert(`تم حذف سند ${currentVoucherType}`, "success");
    track("voucher_delete_success", { feature_name: "vouchers", voucher_type: voucherTypeOf() });
}

async function openVoucherModal(parentInvoice, voucherType, existingVoucherIdOrData) {
    currentVoucherType = voucherType;

    /* حالة تحليلات الفتح الحالي | Analytics state for the current open */
    const vType = voucherTypeOf();
    const isEditVoucher = !!existingVoucherIdOrData;
    _voucherOp = startOperation();
    _voucherOpSaved = false;

    const modalEl = $("voucherModal");
    if (!modalEl) {
        console.error("Voucher modal element not found");
        showGlobalAlert("خطأ: لم يتم العثور على نافذة السند", "danger");
        return;
    }

    await loadVoucherProducts();

    if (existingVoucherIdOrData && typeof existingVoucherIdOrData === "object") {
        setVoucherFormValues(existingVoucherIdOrData);
    } else if (existingVoucherIdOrData) {
        const voucher = getAllVouchers().find(v => v.id === existingVoucherIdOrData);
        if (voucher) {
            setVoucherFormValues(voucher);
        } else {
            resetVoucherForm();
        }
    } else {
        resetVoucherForm();
    }

    if (parentInvoice) {
        /* تحديد نوع الطرف من نوع الفاتورة: بيع → عملاء، شراء → موردون | Determine party type from invoice type: sale → customers, purchase → suppliers */
        const partyType = parentInvoice.type === "بيع" ? "customers" : "suppliers";

        if (!existingVoucherIdOrData) {
            /* تعيين نوع الطرف وتشغيل تحميل قائمة الأطراف | Set party type and trigger loading of party dropdown */
            $("voucherPartyType").value = partyType;
            loadPartiesToVoucher();

            /* اختيار الطرف تلقائيًا في قائمة الأطراف | Auto-select the party in the party dropdown */
            selectVoucherPartyInDropdown(parentInvoice.party, parentInvoice.partyId || "");

            $("voucherDescription").value = `سند مقابل ${parentInvoice.type === "بيع" ? "فاتورة بيع" : "فاتورة شراء"} ${parentInvoice.documentNo || ""}`;

            const { total } = calculateInvoiceTotals(parentInvoice);
            const firstLine = $("voucherLinesBody")?.querySelector("tr");
            if (firstLine) {
                const amountInput = firstLine.querySelector(".voucher-line-amount");
                if (amountInput) {
                    amountInput.value = total.toFixed(2);
                }
            }
            recalcVoucher();

            /* بعد رسم النافذة، تُعبَّأ الفاتورة وتُختار تلقائيًا في كل أسطر السند | After the modal renders, populate and auto-select the invoice in all voucher lines */
            setTimeout(() => {
                const rows = $("voucherLinesBody")?.querySelectorAll("tr") || [];
                rows.forEach(row => {
                    const acctHiddenEl = row.querySelector('.voucher-line-account-type');
                    const partySelectEl = row.querySelector('.voucher-line-party');
                    const invoiceSelectEl = row.querySelector('.voucher-line-invoice');

                    // "line" غير معرَّف في هذا النطاق أصلًا: لا توجد بيانات لكل سطر هنا، فقط parentInvoice/partyType المشتركان — وإبقاؤه كان يرمي ReferenceError ويوقف الحلقة كلها | "line" was never defined in this scope (there is no per-line data here, only the shared parentInvoice/partyType), which threw a ReferenceError and aborted this entire loop
                    if (acctHiddenEl) {
                        acctHiddenEl.value = partyType;
                    }

                    if (partySelectEl) {
                        /* إظهار وتعبئة قائمة طرف السطر | Show and populate line party dropdown */
                        const partyGroup = row.querySelector('.voucher-line-party-group');
                        if (partyGroup) partyGroup.style.display = '';
                        else partySelectEl.closest('.select-with-clear')?.classList.remove('d-none');
                        populateLinePartySelect(row, partyType, parentInvoice.party);
                    }
                    if (invoiceSelectEl) {
                        // populateLineInvoiceSelect تقرر بنفسها إن كان ينبغي إظهار مجموعة الفاتورة | populateLineInvoiceSelect decides on its own whether the invoice group should actually be shown
                        populateLineInvoiceSelect(row, parentInvoice.party, parentInvoice.key);
                    }
                    updateAccountCellDisplay(row);
                });
            }, 100);
        } else {
            /* سند قائم مرتبط بهذه الفاتورة — استعادة السياق فقط | Existing voucher that was linked to this invoice — just restore context */
            const currentPartyType = $("voucherPartyType")?.value;
            if (currentPartyType === "manual") {
                $("voucherPartyManual").value = parentInvoice.party || "";
            } else {
                /* ضمان إخفاء الإدخال اليدوي ومسحه حين يكون النوع عميلًا/موردًا | Ensure manual input is hidden and cleared when type is customer/supplier */
                const manualInput = $("voucherPartyManual");
                if (manualInput) {
                    manualInput.classList.add("d-none");
                    manualInput.value = "";
                }
            }
        }
    }

    /* تتبّع بدء السند + الإلغاء عند الإغلاق بلا حفظ (وضع الإنشاء فقط) | Voucher-start tracking + cancel on close without save (create mode only) */
    track(isEditVoucher ? "voucher_edit_started" : "voucher_create_started", {
        feature_name: "vouchers",
        voucher_type: vType,
        entry_point: parentInvoice ? "invoice" : "vouchers",
    });
    if (!isEditVoucher) {
        modalEl.addEventListener("hidden.bs.modal", () => {
            if (!_voucherOpSaved) {
                track("voucher_create_cancelled", {
                    feature_name: "vouchers",
                    voucher_type: vType,
                    operation_id: _voucherOp?.id,
                    duration_ms: operationDuration(_voucherOp),
                });
            }
        }, { once: true });
    }

    if (window.bootstrap) {
        if (window.__onNextModalHidden) {
            modalEl.addEventListener("hidden.bs.modal", window.__onNextModalHidden, { once: true });
            window.__onNextModalHidden = null;
        }
        // تهيئة React Select لأي form-select داخل النافذة. قوائم المستوى الأعلى تحتفظ بحالتها الداخلية عبر الفتحات (initReactSelects يتخطى القوائم المعرَّبة سابقًا)، لذا نفكّها أولًا — ثم تقرأ إعادة التهيئة أدناه القيم الأصلية التي كتبها setVoucherFormValues/resetVoucherForm للتو بدل عرض اختيار جلسة سابقة | Initialize React Select for any form-select inside the modal. The top-level selects keep their own internal React state across opens (initReactSelects skips already-reactized selects), so dispose them first — the re-init below then reads the native values that setVoucherFormValues/resetVoucherForm just wrote, instead of showing the previous session's stale selection
        try {
            import('@/components/ui/initReactSelects.js').then(mixer => {
                ['voucherAccountType', 'voucherPartyType', 'voucherParty'].forEach(id => {
                    const sel = document.getElementById(id);
                    if (sel) { try { mixer.disposeReactSelect(sel); } catch (e) {} }
                });
                mixer.initReactSelects(modalEl);
            }).catch(e => console.warn('initReactSelects modal failed:', e));
        } catch (e) { console.warn('initReactSelects import failed:', e); }

        window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
    }
}

// حارس يمنع initVoucherForm() من تسجيل مستمعي "click"/"change" العموميين أكثر من مرة | Guard so initVoucherForm() never registers its document-level "click"/"change" listeners more than once
// منطقي وحدة لا يكفي: قد يحمّل Turbopack الوحدة في أكثر من نسخة chunk (أو يعيد تقييمًا ساخنًا يصرف العلم بينما يبقى مستمع النسخة القديمة) | A module-level boolean is not enough: Turbopack can load this module in more than one chunk instance (or a hot re-eval resets the flag while the old instance's listener stays attached)
// فكل نسخة إضافية كانت تضيف مستمع click آخر فوق الموجود؛ فينفَّذ معالج النسخ N مرات (سطر لكل مستمع) وتُنفَّذ saveVoucherFormFrom()/حدث 'voucher-saved' مرات متعددة | so each extra instance blindly added ANOTHER click listener on top of the existing ones; a single click then ran the copy handler N times (one line copy per listener) and ran saveVoucherFormFrom()/the 'voucher-saved' event multiple times
// تعليق الحارس على خاصية window (لا حالة وحدة) يجعل التسجيل متماثلًا عبر كل النسخ: مستمع عام واحد بالضبط مهما تكرر تقييم الوحدة | Keying the guard on a window property (not module state) makes registration idempotent across every module instance: exactly ONE document-level listener exists no matter how many times the module is evaluated
const VOUCHER_FORM_BOUND_KEY = "app.voucher_form_bound";

function initVoucherForm() {
    if (typeof window !== "undefined" && window[VOUCHER_FORM_BOUND_KEY]) {
        console.log("initVoucherForm: already bound, skipping re-registration");
        return;
    }
    if (typeof window !== "undefined") {
        window[VOUCHER_FORM_BOUND_KEY] = true;
    }

    document.addEventListener("click", event => {
        if (event.target.closest("#btnAddVoucherLine")) {
            createVoucherLine();
            track("voucher_line_added", { feature_name: "vouchers", voucher_type: voucherTypeOf(), action_type: "add" });
        }

        if (event.target.closest("#btnSaveVoucher")) {
            saveVoucherFromForm();
        }

        if (event.target.closest("#btnDeleteVoucher")) {
            deleteVoucherFromForm();
        }

        if (event.target.closest(".voucher-line-remove")) {
            const row = event.target.closest("tr");
            if (row) {
                row.remove();
                recalcVoucher();
                $("voucherLinesBody")?.querySelectorAll("tr").forEach((r, i) => {
                    const numCell = r.querySelector(".voucher-line-num");
                    if (numCell) numCell.textContent = i + 1;
                });
                track("voucher_line_removed", { feature_name: "vouchers", voucher_type: voucherTypeOf() });
            }
        }

        if (event.target.closest(".voucher-line-copy")) {
            const row = event.target.closest('tr');
            if (!row) return;
            const data = readVoucherRow(row);
            createVoucherLine(data);
            recalcVoucher();
            $("voucherLinesBody")?.querySelectorAll("tr").forEach((r, i) => {
                const numCell = r.querySelector(".voucher-line-num");
                if (numCell) numCell.textContent = i + 1;
            });
        }

        // معالجة زر المسح في حقول القوائم | Handle the clear button on select fields
        if (event.target.classList.contains("select-clear-btn")) {
            const wrapper = event.target.closest(".select-with-clear");
            if (!wrapper) return;

            const select = wrapper.querySelector("select");
            if (select && select.selectedIndex !== 0) {
                select.selectedIndex = 0;
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    });

    document.addEventListener("change", async (event) => {
        if (event.target.id === "voucherPartyType") {
            loadPartiesToVoucher();
        }
        if (event.target.id === "voucherAutoReference") {
            if (event.target.checked) {
                $("voucherReferenceNo").value = generateReferenceNo();
            }
        }
        if (event.target.closest(".voucher-line-tax-code")) {
            recalcVoucher();
        }
        if (event.target.classList.contains("voucher-line-product")) {
            const row = event.target.closest("tr");
            if (!row) return;

            // بلا منتج محدد: يُطلق عند مسح المنتج وعندما يعيد غلاف React تهيئة هذه القائمة عند فتح النافذة. في الحالتين قد يكون السطر سطر طرف/فاتورة محفوظًا لا يجوز مسح قيمه المخفية — نحدّث عرض الحساب فقط فتظهر مدخلات اليدوي/الطرف وفق الحالة | No product selected: this fires both when the user clears a product and spuriously when the React wrapper re-initializes this select on modal open. In both cases the line may be a saved party/invoice line whose hidden values must NOT be wiped — just refresh the account display so the manual/party inputs reappear as appropriate
            if (!event.target.value) {
                updateAccountCellDisplay(row);
                return;
            }

            // اختير منتج للتو — استبدال عمود الحساب بعرض القراءة فقط للمنتج | A product was just selected — replace the account column with the product's read-only display
            const acctHidden = row.querySelector('.voucher-line-account-type');
            const partyGroup = row.querySelector('.voucher-line-party-group');
            const invoiceGroup = row.querySelector('.voucher-line-invoice-group');
            const partyContainer = row.querySelector('.voucher-line-party-container');
            const invoiceContainer = row.querySelector('.voucher-line-invoice-container');
            const partyHidden = row.querySelector('.voucher-line-party');
            const invoiceHidden = row.querySelector('.voucher-line-invoice');

            if (acctHidden) {
                acctHidden.value = 'manual';
                acctHidden.dispatchEvent(new Event('change', { bubbles: true }));
            }

            if (partyGroup) partyGroup.style.display = 'none';
            if (invoiceGroup) invoiceGroup.style.display = 'none';

            if (partyContainer) {
                try { disposeAppSelect(partyContainer); } catch (e) {}
            }
            if (invoiceContainer) {
                try { disposeAppSelect(invoiceContainer); } catch (e) {}
            }

            if (partyHidden) { partyHidden.value = ''; delete partyHidden.dataset.partyId; partyHidden.dispatchEvent(new Event('change', { bubbles: true })); }
            if (invoiceHidden) { invoiceHidden.value = ''; invoiceHidden.dispatchEvent(new Event('change', { bubbles: true })); }

            updateAccountCellDisplay(row);

            // ملء سعر وحدة السطر تلقائيًا من المنتج المحدد (قبض → سعر البيع، صرف → سعر الشراء). الصفوف المستعادة من سند محفوظ تحتفظ بمبلغها المحفوظ (العلم يُستهلك في أول حدث تغيير، وهو عند الاستعادة يأتي من إعادة تهيئة React-select) | Auto-fill the line's unit price from the selected product (receipt → sale price, payment → cost price). Rows restored from a saved voucher keep their saved amount (the flag is consumed on the first change event, which for restore comes from the React-select re-init)
            const wasRestored = row.dataset.voucherRestored === "1";
            delete row.dataset.voucherRestored;

            const amountInput = row.querySelector(".voucher-line-amount");
            const selectedOption = event.target.selectedOptions[0];
            if (selectedOption) {
                if (!wasRestored && amountInput) {
                    amountInput.value = selectedOption.dataset.price ?? "";
                }
                const taxSel = row.querySelector(".voucher-line-tax-code");
                if (taxSel && taxSel.value === "" && selectedOption.dataset.taxCode) {
                    taxSel.value = selectedOption.dataset.taxCode;
                }
            }
            recalcVoucher();
        }
        if (event.target.classList.contains("voucher-line-account-type")) {
            const acctHidden = event.target;
            const row = acctHidden.closest("tr");
            if (!row) return;

            const partyContainer = row.querySelector('.voucher-line-party-container');
            const invoiceContainer = row.querySelector('.voucher-line-invoice-container');
            const partyGroup = row.querySelector('.voucher-line-party-group');
            const invoiceGroup = row.querySelector('.voucher-line-invoice-group');
            const partyHidden = row.querySelector('.voucher-line-party');
            const invoiceHidden = row.querySelector('.voucher-line-invoice');
            const accountType = acctHidden.value;

            const showParty = accountType === 'customers' || accountType === 'suppliers';

            // تغيير نوع الحساب يعيد دائمًا ضبط الطرف/الفاتورة المختار سابقًا — ومجموعة الفاتورة خصوصًا لا تُعرض "مسبقًا"؛ إنما تظهر فقط بعد اختيار طرف فعلي | Changing the account type always resets whatever party/invoice was selected before — the invoice group in particular is never shown "in advance"; it only reappears once a party is actually chosen
            if (partyGroup) partyGroup.style.display = showParty ? '' : 'none';
            if (invoiceGroup) invoiceGroup.style.display = 'none';
            if (invoiceContainer) disposeAppSelect(invoiceContainer);
            if (invoiceHidden) { invoiceHidden.value = ''; invoiceHidden.dispatchEvent(new Event('change', { bubbles: true })); }

            if (showParty) {
                // نوع حساب مختلف يعني قائمة أطراف مختلفة — مسح الطرف المحدد سابقًا حتى لا ينتقل للجديد | A different account type means a different party list — clear any previously selected party so it doesn't carry over to the new one
                if (partyHidden) { partyHidden.value = ''; delete partyHidden.dataset.partyId; }
                await populateLinePartySelect(row, accountType);
            } else {
                if (partyContainer) disposeAppSelect(partyContainer);
                if (partyHidden) { partyHidden.value = ''; delete partyHidden.dataset.partyId; partyHidden.dispatchEvent(new Event('change', { bubbles: true })); }
            }

            updateAccountCellDisplay(row);
        }
        /* عند تغيير الطرف في سطر، تُعبَّأ قائمة الفواتير لذلك الطرف | When party changes in a line, populate the invoice dropdown for that party */
        if (event.target.classList.contains("voucher-line-party")) {
            const row = event.target.closest("tr");
            if (!row) return;
            const partyName = event.target.value || "";
            if (!partyName) {
                delete event.target.dataset.partyId;
            }
            // تغيير الطرف يُبطل الفاتورة المختارة سابقًا — مسحها (وقيم عرضها المحفوظة) حتى لا تتسرب الفاتورة القديمة إلى الحفظ التالي وتظهر عند إعادة الفتح | Changing the party invalidates the previously selected invoice — clear it (and its persisted display values) so the old invoice can never leak into the next save and reappear on reopen
            const invoiceHidden = row.querySelector('.voucher-line-invoice');
            if (invoiceHidden) {
                invoiceHidden.value = '';
                invoiceHidden.dataset.invoiceNo = '';
                invoiceHidden.dataset.invoiceDate = '';
            }
            // populateLineInvoiceSelect يملك ظهور مجموعة الفاتورة كليًا: يخفيها عند مسح الطرف، ويظهرها فقط إذا كانت للطرف فواتير للاختيار منها | populateLineInvoiceSelect fully owns invoice-group visibility: it hides the group when the party was cleared, and shows it only if the party actually has invoices to pick from
            populateLineInvoiceSelect(row, partyName);
        }
        if (event.target.classList.contains("voucher-line-invoice")) {
            const row = event.target.closest("tr");
            if (!row) return;
            // إبقاء قيم العرض المحفوظة في السطر متزامنة مع الفاتورة المختارة فينجو رقم المرجع وتاريخ الإصدار من الحفظ التالي دون اعتماد على بحث حي في المستندات | Keep the row's persisted display values in sync with the selected invoice so the reference number and issue date survive the next save without depending on a live document lookup
            const acctType = row.querySelector('.voucher-line-account-type')?.value || '';
            const info = resolveInvoiceInfo(event.target.value, acctType);
            event.target.dataset.invoiceNo = info.invoiceNo || '';
            event.target.dataset.invoiceDate = info.invoiceDate || '';
            // هذا الاستدعاء كان يسبب حلقة تكرارية؛ ومنطق عرض الحساب مُعالَج أصلًا عند تغيير المنتج أو نوع الحساب | This call was causing a recursive loop; the account display logic is already handled when the product or account type changes
        }

        // معالج عام لتبديل كلاس 'has-selection' في القوائم القابلة للمسح | Generic handler to toggle the 'has-selection' class for clearable selects
        if (event.target.tagName === 'SELECT') {
            const wrapper = event.target.closest('.select-with-clear');
            if (wrapper) {
                wrapper.classList.toggle('has-selection', !!event.target.value);
            }
        }
    });

    // السحب والإفلات لأسطر السند | Drag & Drop for voucher lines
    const bodyEl = $("voucherLinesBody");
    if (bodyEl) {
        let dragging = null;
        bodyEl.addEventListener('dragstart', e => { dragging = e.target; setTimeout(() => dragging?.classList.add('dragging'), 0); });
        bodyEl.addEventListener('dragend',   () => { dragging?.classList.remove('dragging'); dragging = null; renumber(); });
        bodyEl.addEventListener('dragover',  e => {
            e.preventDefault();
            if (!dragging) return;
            const after = [...bodyEl.querySelectorAll('tr:not(.dragging)')].reduce((closest, child) => {
                const offset = e.clientY - child.getBoundingClientRect().top - child.getBoundingClientRect().height / 2;
                return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
            }, { offset: Number.NEGATIVE_INFINITY }).element;
            after ? bodyEl.insertBefore(dragging, after) : bodyEl.appendChild(dragging);
        });
        function renumber() {
            bodyEl.querySelectorAll('tr').forEach((r, i) => {
                const n = r.querySelector('.voucher-line-num'); if (n) n.textContent = i + 1;
            });
            recalcVoucher();
        }
    }

    document.addEventListener("input", event => {
        if (event.target.closest(".voucher-line-amount") || event.target.closest(".voucher-line-qty") ||
            event.target.closest(".voucher-line-discount") || event.target.id === "voucherFixedTotal") {
            recalcVoucher();
        }
    });

    getTogglesConfig().forEach(t => {
        $(t.id)?.addEventListener?.("change", syncToggleVisibility);
    });

    $("voucherToggleFixedTotal")?.addEventListener?.("change", syncToggleVisibility);
    $("voucherToggleCustomTitle")?.addEventListener?.("change", syncToggleVisibility);
    $("voucherToggleFooter")?.addEventListener?.("change", syncToggleVisibility);

    window.openVoucherModal = openVoucherModal;
}

if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initVoucherForm);
    } else {
        initVoucherForm();
    }
}

export { openVoucherModal, saveVoucherFromForm, createVoucherLine, initVoucherForm, getInvoicesForParty };