import { getTaxCodes } from "@/features/documents/index.js";
import { getAllTransactions } from "@/data/db/db.js";
import { isFallbackMode, fallback, idbGetAll, STORE_PRODUCTS } from "@/data/db/db.js";
import { generateUniqueDocNo } from "@/features/documents/index.js";
import { escapeHtml, escapeAttr } from "./utils.js";
import { runBarcodeScanner, findProductByBarcode } from "../barcode/barcode-scanner.js";
import { saveProductFromDraft } from "@/features/products/products.js";
import { track } from "@/services/analytics/gtag.js";

/* نوع المستند للتقارير (بدون أي معرّفات) | Document type label for analytics (no identifiers) */
export function docTypeOf(ctx) {
  const kind = ctx?.config?.types?.docKind || ctx?.config?.docKind;
  return kind === "purchaseInvoices" ? "purchase_invoice" : "sales_invoice";
}

let reactSelectsModule = null;
function getReactSelectsModule() {
  if (!reactSelectsModule) {
    reactSelectsModule = import('@/components/ui/initReactSelects.js');
  }
  return reactSelectsModule;
}

/* ================= Toggles | التبديلات ================= */

export function getTogglesConfig(ctx) {
  const { q, qt } = ctx;
  return [
    { id: qt("ShowNum"),             rowId: q("DiscountTypeRow")?.id || null },
    { id: qt("ShowDesc"),            rowId: null },
    { id: qt("ShowQty"),             rowId: null },
    { id: qt("ShowDiscount"),        rowId: q("DiscountTypeRow")?.id || null },
    { id: qt("Bilingual"),           rowId: q("TitleEnRow")?.id      || null },
    { id: qt("InvTitle"),            rowId: q("TitleRow")?.id        || null },
    { id: qt("Description"),         rowId: q("DescRow")?.id         || null },
    { id: qt("ClosedInvoice"),       rowId: null },
    { id: qt("ShowFooter"),          rowId: q("FooterRow")?.id       || null },
    { id: qt("HidePaymentsOnPrint"), rowId: null },
    { id: qt("TaxInclusive"),        rowId: null },
  ].filter(t => t.id);
}

export function syncTogglesUI(ctx) {
  const { qt, config: { linePrefix } } = ctx;

  getTogglesConfig(ctx).forEach(({ id: toggle, rowId }) => {
    if (rowId) { const row = document.getElementById(rowId); if (row) row.style.display = toggle?.checked ? "" : "none"; }
  });

  const showNum = qt("ShowNum")?.checked;
  document.querySelectorAll(".d-none-col-num, ." + linePrefix + "-line-num")
    .forEach(el => el.classList.toggle("d-none", !showNum));

  const showDesc = qt("ShowDesc")?.checked;
  document.querySelectorAll(".d-none-col-desc").forEach(el => el.classList.toggle("d-none", !showDesc));

  /* الكمية: نماذج البيع/الشراء ليس فيها مفتاح ShowQty أصلاً (السند وحده لديه) | Qty: sales/purchase forms have no ShowQty toggle (only the voucher does)
     فغيابه ليس نية من المستخدم بإخفائها — نُبقيها ظاهرة | so its absence isn't a user intent to hide it — we keep it visible. */
  const showQtyToggle = qt("ShowQty");
  const showQty = showQtyToggle ? !!showQtyToggle.checked : true;
  document.querySelectorAll(".d-none-col-qty").forEach(el => el.classList.toggle("d-none", !showQty));
  document.querySelectorAll(`.${linePrefix}-qty`).forEach(el => el.closest("td")?.classList.toggle("d-none", !showQty));

  const showDiscount = qt("ShowDiscount")?.checked;
  document.querySelectorAll(".d-none-col-discount, ." + linePrefix + "-discount-cell")
    .forEach(el => el.classList.toggle("d-none", !showDiscount));
  document.querySelectorAll(`.${linePrefix}-discount`).forEach(el => el.closest("td")?.classList.toggle("d-none", !showDiscount));
}

/* ================= Due Date | تاريخ الاستحقاق ================= */

export function updateDueDateFromTerms(ctx) {
  const { q } = ctx;
  const terms     = q("PaymentTerms");
  const daysGroup = q("DaysGroup");
  const dueGroup  = q("DueDateGroup");
  if (!terms || !daysGroup || !dueGroup) return;

  const isOnAccount = terms.value === 'on';
  daysGroup.style.display = isOnAccount ? 'none' : '';
  dueGroup.style.display  = isOnAccount ? ''     : 'none';

  if (terms.value === 'net' && q("Date") && q("Days") && q("DueDate")) {
    const date = new Date(q("Date").value);
    date.setDate(date.getDate() + (Number(q("Days").value) || 0));
    q("DueDate").value = date.toISOString().slice(0, 10);
  }
}

/* ================= Account Cell | خلية الحساب ================= */

/* ── بناء نموذج اختيار الحساب (نوع السطر = حساب) | Build the account-selection inputs (line type = account) ── */
function buildAccountInputsGroup(linePrefix) {
  const div = document.createElement('div');
  div.className = 'account-inputs-group input-group input-group-sm';
  div.innerHTML = `
    <select class="form-select ${linePrefix}-line-account-type" style="flex:0 0 120px;"><option value="customers">العملاء</option><option value="suppliers">الموردين</option></select>
    <select class="form-select ${linePrefix}-line-party" style="flex:1 1 150px;"><option value="">اختر الطرف</option></select>
    <select class="form-select ${linePrefix}-line-invoice" style="flex:1 1 180px;display:none;"><option value="">اختر الفاتورة</option></select>`;
  return div;
}

/* ── قراءة المنتج المحدد بطريقة تعمل مع النوعين | Read the selected product in a way that works with both ──
     عنصر <select> تقليدي (قيمة نصية) و React Select (كائن { value, label }) | a plain <select> (string value) and React Select (object { value, label }) */
function getSelectedProductValue(productSel) {
  const rawValue = productSel?.value;
  return (rawValue && typeof rawValue === 'object') ? (rawValue.value ?? '') : (rawValue ?? '');
}

export function updateAccountCellDisplay(ctx, row) {
  if (!row) return;
  const { config: { linePrefix, types } } = ctx;
  const cell        = row.querySelector(`td[data-account-cell]`);
  const productSel  = row.querySelector(`.${linePrefix}-product`);
  if (!cell) return;
  const productValue = getSelectedProductValue(productSel);
  const directOption = productSel?.selectedOptions?.[0];
  const fallbackOption = productSel?.options ? Array.from(productSel.options).find(o => String(o.value) === String(productValue) || String(o.textContent) === String(productValue)) : null;
  const option       = directOption || fallbackOption;
  const lineTypeEl   = row.querySelector(`.${linePrefix}-line-type`);
  // إذا كان السطر جديدًا ومعلَّمًا بإخفاء حقول الحساب، تُترك الخلية فارغة حتى اختيار منتج | If a fresh row is marked to hide account inputs, keep the cell empty until a product is chosen
  if (row.dataset && row.dataset.hideAccount === 'true' && !productValue) {
    cell.innerHTML = '';
    return;
  }

  // مسح أي واجهة حساب/منتج سابقة من الخلية قبل إعادة الرسم | Clear any previous account/product UI from the cell before re-rendering
  cell.innerHTML = '';

  // منتج محدد → عرض خانة حساب افتراضية واحدة للقراءة فقط | If a product is selected -> show a single read-only default account span
  // بلا منتج وغير سطر نوع حساب → تُترك الخلية فارغة | If no product and not an explicit account-type row, leave the cell empty
  const hasProduct = Boolean(productValue) || Boolean(option?.value);
  if (hasProduct) {
    const isSales = types.priceField === "salePrice";
    // محاولة اشتقاق اسم الحساب من option dataset أو من مخزون المنتجات | Try to derive the account name from the option dataset or the products cache
    let accountName = '';
    if (option && option.getAttribute) {
      accountName = option.getAttribute(isSales ? 'data-default-sales-account' : 'data-default-purchase-account') || '';
    }
    if (!accountName && ctx.products) {
      const match = ctx.products.find(p => String(p.id) === String(productValue) || p.name === productValue || String(p.id) === String((productValue && productValue.value) || ''));
      if (match) accountName = isSales ? (match.defaultSalesAccount || '') : (match.defaultPurchaseAccount || '');
    }
    if (!accountName) accountName = isSales ? 'المخزون - مبيعات' : 'المخزون الحالي';

    const span = document.createElement('span');
    span.className = 'input-group-text input-sm grow product-account-name w-100 text-start';
    span.textContent = accountName;
    cell.appendChild(span);
    return;
  }

  // بلا منتج: إن وُجد نوع سطر حساب صريح تُعرض حقول الحساب، وإلا تُترك فارغة | No product: if an explicit account line type exists show account inputs, otherwise leave empty
  if (lineTypeEl && lineTypeEl.value === 'account') {
    const inputs = buildAccountInputsGroup(linePrefix);
    cell.appendChild(inputs);
    const accountTypeSel = row.querySelector(`.${linePrefix}-line-account-type`);
    const partySel = row.querySelector(`.${linePrefix}-line-party`);
    const invoiceSel = row.querySelector(`.${linePrefix}-line-invoice`);
    if (accountTypeSel) {
      accountTypeSel.addEventListener('change', async () => {
        const show = accountTypeSel.value === 'customers' || accountTypeSel.value === 'suppliers';
        partySel?.closest('.input-group')?.classList.toggle('d-none', !show);
        invoiceSel?.closest('.input-group')?.classList.toggle('d-none', !show);
        if (show) await loadParties?.(ctx).catch(() => {});
      });
    }
  } else {
    // ضمان إفراغ الخلية عند غياب المنتج وعدم كون السطر حسابًا | Ensure empty when no product and not an account row
    cell.innerHTML = '';
  }
}

/* ================= Drag & Drop | السحب والإفلات ================= */

export function setupDragDrop(ctx) {
  const bodyEl = document.getElementById(ctx.config.bodyId);
  if (!bodyEl) return;
  let dragging = null;

  bodyEl.addEventListener('dragstart', e => { dragging = e.target; setTimeout(() => dragging?.classList.add('dragging'), 0); });
  bodyEl.addEventListener('dragend',   () => { dragging?.classList.remove('dragging'); dragging = null; renumberLines(ctx); });
  bodyEl.addEventListener('dragover',  e => {
    e.preventDefault();
    if (!dragging) return;
    const after = [...bodyEl.querySelectorAll('tr:not(.dragging)')].reduce((closest, child) => {
      const offset = e.clientY - child.getBoundingClientRect().top - child.getBoundingClientRect().height / 2;
      return offset < 0 && offset > closest.offset ? { offset, element: child } : closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
    after ? bodyEl.insertBefore(dragging, after) : bodyEl.appendChild(dragging);
  });
}
export async function loadProducts(ctx) {
  try {
    ctx.products = isFallbackMode() ? (fallback.getProducts() || []) : await idbGetAll(STORE_PRODUCTS) || [];
  } catch { ctx.products = []; }
  document.querySelectorAll(`.${ctx.config.linePrefix}-product`).forEach(sel => populateProductSelect(ctx, sel));
}

export function populateProductSelect(ctx, selEl) {
  const isSales = ctx.config.types.priceField === "salePrice";
  selEl.innerHTML = '<option value="">اختر منتج</option>';
  ctx.products.forEach(p => {
    const price = isSales ? (p.salePrice ?? p.price ?? 0) : (p.price || 0);
    selEl.insertAdjacentHTML("beforeend",
      `<option value="${escapeAttr(p.name)}" data-price="${price}" data-tax-code="${p.defaultTaxCode || ''}"
        data-default-sales-account="${p.defaultSalesAccount || ''}" data-default-purchase-account="${p.defaultPurchaseAccount || ''}"
      >${p.id ? p.id + " - " : ""}${escapeHtml(p.name)}</option>`
    );
  });
}

/* ================= Barcode Scanner | ماسح الباركود ================= */

async function startInvoiceScanner(ctx) {
  if (!ctx.products || !ctx.products.length) {
    await loadProducts(ctx).catch(() => {});
  }
  await runBarcodeScanner({
    source: docTypeOf(ctx),
    onCode: async code => {
      const product = findProductByBarcode(code, ctx.products);
      if (!product) return { status: "not-found" };
      return { status: "found", product };
    },
    onEnsureProduct: draft => ensureScannedProductLocal(ctx, draft),
    onFinish: async items => {
      items.forEach(item => addScannedProductToInvoice(ctx, item.product, item.quantity));
    },
  });
}

/* ── إنشاء/جلب منتج محلي من بيانات عامة أو يدوية في المحرر | Create/fetch a local product from public or manual data in the editor ── */
async function ensureScannedProductLocal(ctx, draft) {
  try {
    const saved = await saveProductFromDraft(draft);
    if (!saved) return null;
    ctx.products = Array.isArray(ctx.products) ? ctx.products : [];
    if (!ctx.products.some(p => String(p.id) === String(saved.id))) ctx.products.push(saved);
    document.querySelectorAll(`.${ctx.config.linePrefix}-product`).forEach(sel => {
      appendScannedProductOption(ctx, sel, saved);
    });
    return saved;
  } catch (e) {
    console.error("ensureScannedProductLocal error:", e);
    return null;
  }
}

/* ── إضافة خيار المنتج الجديد لكل قوائم المحرر (حتى يظهر فوراً للاختيار) | Append the new product option to every editor list (so it's instantly selectable) ── */
function appendScannedProductOption(ctx, sel, product) {
  if (!sel) return;
  if (Array.from(sel.options || []).some(o => String(o.value) === String(product.name))) return;
  const isSales = ctx.config.types.priceField === "salePrice";
  const price = isSales ? (product.salePrice ?? product.price ?? 0) : (product.price || 0);
  sel.insertAdjacentHTML("beforeend",
    `<option value="${escapeAttr(product.name)}" data-price="${price}" data-tax-code="${escapeAttr(product.defaultTaxCode || '')}" data-default-sales-account="${escapeAttr(product.defaultSalesAccount || '')}" data-default-purchase-account="${escapeAttr(product.defaultPurchaseAccount || '')}">${escapeHtml(product.id)} - ${escapeHtml(product.name)}</option>`
  );
}

/* ── تحويل قيمة سطر الفاتورة (اسم المنتج) إلى كائن المنتج | Resolve an invoice line value (product name) to the product object ── */
function resolveInvoiceRowProduct(ctx, row) {
  const sel = row.querySelector(`.${ctx.config.linePrefix}-product`);
  if (!sel || !sel.value) return null;
  const value = sel.value;
  const byName = (ctx.products || []).find(p => p.name === value);
  if (byName) return byName;
  return (ctx.products || []).find(p => String(p.id) === String(value)) || null;
}

/* ── سعر المسح حسب نوع المستند: بيع → سعر البيع، شراء → سعر الشراء | Scanned price by document type: sales → sale price, purchase → cost price ── */
function scannedInvoicePrice(ctx, product) {
  const isSales = ctx.config?.types?.priceField === "salePrice";
  if (isSales) return null; // السعر الافتراضي للمبيعات هو مصدر الفواتير الحالي | the default sales price is the current invoice source
  const cp = Number(product.costPrice);
  return Number.isFinite(cp) ? cp : null; // الشراء يستعمل سعر الشراء مع تراجع إن لم يوجد | purchases use cost price with a fallback if missing
}

function addScannedProductToInvoice(ctx, product, qty = 1) {
  const { config: { bodyId, linePrefix } } = ctx;
  const tbody = document.getElementById(bodyId);
  if (!tbody) return { status: "not-found" };

  const qtyAdd = Math.max(0, Number(qty) || 0);

  // 1) خط موجود بنفس productId → زيادة الكمية مع الإبقاء على السعر | 1) existing line with the same productId → bump quantity, keep the price
  const rows = [...tbody.querySelectorAll("tr")];
  for (const row of rows) {
    const existing = resolveInvoiceRowProduct(ctx, row);
    if (existing && String(existing.id) === String(product.id)) {
      const qtyEl = row.querySelector(`.${linePrefix}-qty`);
      const next = (Number(qtyEl?.value || 0) || 0) + (qtyAdd || 1);
      if (qtyEl) qtyEl.value = next;
      recalc(ctx);
      return { status: "added", message: `✓ تمت زيادة كمية ${product.name} إلى ${next}` };
    }
  }

  // 2) سطر جديد عبر addLine ثم اختيار المنتج بنفس معالج التغيير اليدوي | 2) new line via addLine, then pick the product through the same manual change handler
  addLine(ctx);
  const row = tbody.querySelector("tr:last-child");
  if (!row) return { status: "added", message: `✓ تمت إضافة ${product.name}` };

  const sel = row.querySelector(`.${linePrefix}-product`);
  const qtyEl = row.querySelector(`.${linePrefix}-qty`);
  if (qtyEl) qtyEl.value = qtyAdd > 0 ? qtyAdd : 1;

  if (sel) {
    sel.value = product.name;
    const scannedPrice = scannedInvoicePrice(ctx, product);
    if (scannedPrice !== null) {
      const opt = Array.from(sel.options || []).find(o => o.value === product.name);
      if (opt) opt.dataset.price = scannedPrice;
    }
    getReactSelectsModule()?.then(mixer => {
      try { if (typeof mixer.disposeReactSelect === "function") mixer.disposeReactSelect(sel); } catch (e) {}
      try { mixer.initReactSelects(row); recalc(ctx); } catch (e) { sel.dispatchEvent(new Event("change", { bubbles: true })); recalc(ctx); }
    }).catch(() => { sel.dispatchEvent(new Event("change", { bubbles: true })); recalc(ctx); });
  }

  recalc(ctx);
  return { status: "added", message: `✓ تمت إضافة ${product.name}` };
}

export async function loadParties(ctx) {
  const { partyId, partyLabel, types } = ctx.config;
  try {
    const saved  = JSON.parse(localStorage.getItem("accountingParties") || "[]");
    ctx.parties  = saved.filter(p => p.type === types.party);
  } catch { ctx.parties = []; }

  try {
    const txParties = window.buildParties?.(await getAllTransactions() || []);
    const txList    = txParties?.[types.party] || [];
    const names     = new Set(ctx.parties.map(p => p.name.toLowerCase()));
    txList.forEach(p => { if (!names.has(p.name.toLowerCase())) ctx.parties.push({ ...p, source: "transaction" }); });
  } catch {}

  const partySel = document.getElementById(partyId);
  if (!partySel) return;
  partySel.innerHTML = `<option value="">اختر ${partyLabel}</option>`;
  ctx.parties.forEach(p => partySel.insertAdjacentHTML("beforeend",
    `<option value="${escapeAttr(p.name)}" data-id="${p.id || ''}">${escapeHtml(p.name)}</option>`
  ));
  // عندما يتغير الطرف يُعبَّأ عنوان الشحن تلقائيًا | When the party changes, auto-fill the shipping address
  try { partySel.addEventListener('change', () => fillShippingAddress(ctx)); } catch (e) {}

  /* تتبّع اختيار الطرف — مستمع واحد فقط يبقى بعد كل فتح | Party selection analytics — a single listener survives every open.
     يُتجاهل الاستعادة البرمجية عند فتح وضع التعديل (النافذة ليست معروضة بعد) | the programmatic restore during edit open is ignored (modal not shown yet). */
  try {
    if (!partySel.dataset.partyAnalyticsBound) {
      partySel.dataset.partyAnalyticsBound = "1";
      partySel.addEventListener('change', () => {
        try {
          const val = partySel.value;
          const modalEl = document.getElementById(ctx.config.modalId);
          if (val && modalEl?.classList?.contains('show')) {
            track("invoice_party_selected", { feature_name: "invoices", doc_type: docTypeOf(ctx) });
          }
        } catch (_) {}
      });
    }
  } catch (e) {}
}

/* ================= Lines | إدارة البنود ================= */

export function addLine(ctx) {
  const { config: { bodyId, linePrefix } } = ctx;
  const tbody = document.getElementById(bodyId);
  if (!tbody) return;
  ctx.lineCounter++;

  const taxOptions = getTaxCodes().map(t =>
    `<option value="${escapeAttr(t.id)}" data-rate="${t.rate}">${escapeHtml(t.name)}</option>`
  ).join('');

  const row = document.createElement("tr");
  row.draggable = true;
  // إخفاء حقول الحساب افتراضيًا للصفوف المضافة حديثًا؛ الصفوف المستعادة تزيل هذه العلامة | Hide account inputs by default for new rows; restored rows remove this flag
  row.dataset.hideAccount = 'true';
  row.innerHTML = `
    <td class="text-center align-middle d-none-col-num" data-label="index" style="width:40px;"><span class="${linePrefix}-line-num"></span></td>
        <td class="text-center align-middle drag-handle" data-label="index" style="width:40px;cursor:grab;"><i class="bi bi-grip-vertical" style="opacity:.4;"></i></td>
    <td style="min-width:200px;" data-label="البند">
      <div class="d-flex align-items-center" style="gap:4px;">
        <div class="input-group input-group-sm" style="flex:1 1 0;min-width:0;">
          <select class="form-select ${linePrefix}-product"><option value="">اختر منتج</option></select>
        </div>
        <button type="button" class="btn btn-outline-secondary btn-sm ${linePrefix}-scan-product" style="flex:0 0 auto;" title="مسح الباركود"><i class="bi bi-camera-fill"></i></button>
      </div>
    </td>
    <td style="width:80px;" class="d-none-col-qty" data-label="الكمية"><div class="input-group input-group-sm"><input type="number" class="form-control ${linePrefix}-qty" value="1" min="0" step="any"></div></td>
    <td style="width:120px;" data-label="سعر الوحدة"><div class="input-group input-group-sm"><input type="number" class="form-control ${linePrefix}-price" value="" min="0" step="any"></div></td>
    <td style="min-width:150px;" data-account-cell data-label="الحساب"></td>
    <td style="width:180px;" class="d-none-col-desc d-none" data-label="البيان"><input type="text" class="form-control form-control-sm ${linePrefix}-desc" value=""></td>
    <td style="width:120px;" class="d-none-col-discount ${linePrefix}-discount-cell" data-label="الخصم">
      <div class="input-group input-group-sm">
        <input type="number" class="form-control ${linePrefix}-discount" value="0" min="0" step="any">
        <button type="button" class="btn btn-outline-secondary ${linePrefix}-discount-type-btn active" data-type="fixed">ر.س</button>
        <button type="button" class="btn btn-outline-secondary ${linePrefix}-discount-type-btn" data-type="percent">%</button>
      </div>
      <input type="hidden" class="${linePrefix}-discount-type" value="fixed">
    </td>
    <td style="width:120px;" data-label="الضريبة"><div class="input-group input-group-sm"><select class="form-select ${linePrefix}-line-tax-code"><option value="" data-rate="0">لا توجد ضريبة</option>${taxOptions}</select></div></td>
    <td style="width:120px;" data-label="المجموع"><span class="input-group-text ${linePrefix}-line-subtotal w-100 text-center">0.00</span></td>
    <td style="width:120px;" class="d-none-col-tax-amount d-none" data-label="ضريبة المبلغ"><span class="input-group-text ${linePrefix}-line-tax-value w-100 text-center">0.00</span></td>
    <td style="width:160px;" class="fw-bold" data-label="الإجمالي"><span class="input-group-text ${linePrefix}-line-total w-100 text-center">0.00</span></td>
    <td class="text-center align-middle line-action-cell" style="width:40px;"><button type="button" class="btn btn-sm btn-outline-secondary ${linePrefix}-toggle-enabled" title="تعطيل/تمكين">&#x25CB;</button></td>
    <td class="text-center align-middle line-action-cell" style="width:40px;"><button type="button" class="btn btn-sm btn-outline-primary ${linePrefix}-copy-line" title="نسخ"><i class="bi bi-clipboard"></i></button></td>
    <td class="text-center align-middle line-action-cell" style="width:40px;"><button type="button" class="btn btn-sm btn-outline-danger ${linePrefix}-remove-line" title="حذف">&times;</button></td>`;

  tbody.appendChild(row);

  // --- ربط مستمعات الأحداث لإعادة الاحتساب الفوري | Attach Event Listeners for Instant Recalculation ---
  const doRecalc = () => recalc(ctx);
  row.querySelector(`.${linePrefix}-qty`)?.addEventListener('input', doRecalc);
  row.querySelector(`.${linePrefix}-price`)?.addEventListener('input', doRecalc);
  row.querySelector(`.${linePrefix}-discount`)?.addEventListener('input', doRecalc);
  row.querySelector(`.${linePrefix}-line-tax-code`)?.addEventListener('change', doRecalc);

  row.querySelectorAll(`.${linePrefix}-discount-type-btn`).forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const newType = btn.dataset.type;
      row.querySelector(`.${linePrefix}-discount-type`).value = newType;
      row.querySelectorAll(`.${linePrefix}-discount-type-btn`).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      doRecalc();
    });
  });

  const productSelect = row.querySelector(`.${linePrefix}-product`);
  productSelect?.addEventListener('change', () => {
    // التفاعل مع تغيير المنتج فقط حين يكون نوع السطر 'product' | Only react to product changes when the line type is 'product'
    const lineTypeSel = row.querySelector(`.${linePrefix}-line-type`);
    if (lineTypeSel && lineTypeSel.value !== 'product') return;
    updateAccountCellDisplay(ctx, row);
    const selectedOption = productSelect.selectedOptions[0];
    if (selectedOption) {
      const priceInput = row.querySelector(`.${linePrefix}-price`);
      const taxInput = row.querySelector(`.${linePrefix}-line-tax-code`);
      if (priceInput) priceInput.value = selectedOption.dataset.price || 0;
      if (taxInput) taxInput.value = selectedOption.dataset.taxCode || "";
    }
    doRecalc();
  });

  // زر الكاميرا → ماسح الباركود المشترك (الإضافة عبر نفس مسار الاختيار اليدوي) | Camera button → shared barcode scanner (adds via the same path as manual selection)
  row.querySelector(`.${linePrefix}-scan-product`)?.addEventListener('click', () => {
    startInvoiceScanner(ctx);
  });

  // محدد نوع السطر: منتج مقابل حساب | Line type selector: product vs account
  const lineTypeSel = row.querySelector(`.${linePrefix}-line-type`);
  lineTypeSel?.addEventListener('change', () => {
    const val = lineTypeSel.value;
    const productWrapper = row.querySelector(`.${linePrefix}-product`);
    if (val === 'product') {
      // عرض قائمة المنتج، مع ترك حقول الحساب لـ updateAccountCellDisplay | show product select, account inputs handled by updateAccountCellDisplay
      if (productWrapper) productWrapper.closest('.input-group')?.classList.remove('d-none');
      updateAccountCellDisplay(ctx, row);
    } else {
      // اختير حساب: نُخفي قائمة المنتج ونُظهر حقول الحساب | account chosen: hide product select and show account inputs
      if (productWrapper) productWrapper.closest('.input-group')?.classList.add('d-none');
      updateAccountCellDisplay(ctx, row);
    }
    doRecalc();
  });

  // زر تمكين/تعطيل السطر | Enable/Disable toggle
  const toggleBtn = row.querySelector(`.${linePrefix}-toggle-enabled`);
  toggleBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    row.classList.toggle('line-disabled');
    toggleBtn.classList.toggle('active');
    // إشارة بصرية: تقليل الشفافية عند التعطيل | visual cue: reduced opacity when disabled
    if (row.classList.contains('line-disabled')) row.style.opacity = '0.5'; else row.style.opacity = '';
    doRecalc();
  });

  row.querySelector(`.${linePrefix}-remove-line`)?.addEventListener('click', () => {
    row.remove();
    recalc(ctx);
    renumberLines(ctx);
    track("invoice_line_removed", { feature_name: "invoices", doc_type: docTypeOf(ctx) });
  });

  // نسخ السطر الحالي: يكرر قيمه كلها في سطر جديد يليه مباشرة | Copy the current line: duplicates all its values into a new row right after it
  row.querySelector(`.${linePrefix}-copy-line`)?.addEventListener('click', () => {
    copyLine(ctx, row);
  });
  // --- نهاية مستمعات الأحداث | End Event Listeners ---

  populateProductSelect(ctx, productSelect);
  updateAccountCellDisplay(ctx, row);
  recalc(ctx);
  renumberLines(ctx);
  // ضمان احترام السطر الجديد للمفاتيح الحالية (كإظهار/إخفاء أرقام الأسطر) | Ensure the new row respects current toggles (e.g., hide/show line numbers)
  syncTogglesUI?.(ctx);

  // إن كان React Select محمّلًا في النافذة فلنُهيئ قائمة السطر الجديد فورًا | If React Select is loaded in the modal, initialize the new row's select immediately
  getReactSelectsModule()?.then(mixer => mixer.initReactSelects(row)).catch(e => console.warn('initReactSelects addLine failed:', e));
}

/* ================= Copy Line | نسخ السطر ================= */

/* يقرأ قيم السطر الحالي وينشئ سطرًا جديدًا بنفس القيم فورًا بعده | Reads the current line's values and creates a new row with the same values right after it
   نفس النمط المعتمد في استعادة التعديل (openModal): اختيار المنتج يضبط السعر/الضريبة الافتراضيين ثم نعيد فرض القيم المنسوخة فوقه | Same pattern as edit restore (openModal): picking the product sets default price/tax, then the copied values are re-applied on top */
export function copyLine(ctx, row) {
  const { config: { bodyId, linePrefix } } = ctx;
  const tbody = document.getElementById(bodyId);
  if (!row || !tbody) return;

  const readVal = (cls) => {
    const el = row.querySelector(`.${linePrefix}-${cls}`);
    return el?.value ?? "";
  };

  const productSel = row.querySelector(`.${linePrefix}-product`);
  const rawProduct = productSel?.value ?? "";
  const product = (rawProduct && typeof rawProduct === 'object') ? (rawProduct.value ?? "") : (rawProduct ?? "");
  const qty      = readVal("qty");
  const price    = readVal("price");
  const desc     = readVal("desc");
  const discount = readVal("discount");
  const discType = readVal("discount-type") || "fixed";
  const taxId    = readVal("line-tax-code");
  const enabled  = !row.classList.contains('line-disabled');

  addLine(ctx);
  const lastRow = tbody.lastElementChild;
  if (!lastRow) return;

  const newProductSel = lastRow.querySelector(`.${linePrefix}-product`);
  if (newProductSel && product) {
    newProductSel.value = product;
    if (newProductSel.value !== product) {
      const opt = new Option(product, product, true, true);
      newProductSel.appendChild(opt);
    }
    newProductSel.dispatchEvent(new Event('change', { bubbles: true }));
    // السطر المنسوخ يحمل بيانات حقيقية — إظهار واجهة الحساب كما يناسب | Copied row carries real data — reveal account UI as appropriate
    try { delete lastRow.dataset.hideAccount; } catch {}
  }

  const setRow = (cls, val) => { const el = lastRow.querySelector(`.${linePrefix}-${cls}`); if (el) el.value = val; };
  setRow("qty", qty);
  setRow("price", price);
  setRow("desc", desc);
  setRow("discount", discount);

  const discHidden = lastRow.querySelector(`.${linePrefix}-discount-type`);
  if (discHidden) discHidden.value = discType;
  lastRow.querySelectorAll(`.${linePrefix}-discount-type-btn`).forEach(b => b.classList.toggle("active", b.dataset.type === discType));

  const taxSel = lastRow.querySelector(`.${linePrefix}-line-tax-code`);
  if (taxSel) {
    if (taxId !== undefined && taxId !== "") taxSel.value = taxId;
    taxSel.dispatchEvent(new Event('change', { bubbles: true }));
  }

  const priceInput = lastRow.querySelector(`.${linePrefix}-price`);
  if (priceInput) priceInput.disabled = false;

  if (!enabled) {
    lastRow.classList.add('line-disabled');
    lastRow.style.opacity = '0.5';
    const toggleBtn = lastRow.querySelector(`.${linePrefix}-toggle-enabled`);
    if (toggleBtn) toggleBtn.classList.add('active');
  }

  recalc(ctx);
  renumberLines(ctx);
  syncTogglesUI?.(ctx);
}

export function renumberLines(ctx) {
  const { config: { linePrefix } } = ctx;
  const rows = document.getElementById(ctx.config.bodyId)?.querySelectorAll("tr") || [];
  const showNum = ctx.qt?.("ShowNum")?.checked || false;
  rows.forEach((row, i) => {
    const n = row.querySelector(`.${linePrefix}-line-num`);
    if (!n) return;
    n.textContent = showNum ? (i + 1) : "";
  });
}

/* ================= Read Lines | قراءة البنود من مصدر البيانات ================= */

/**
 * يقرأ بنود الجدول من مصدر البيانات الفعلي (صفوف <tbody>).
 * يعمل مع كلٍّ من:
 *  - عنصر <select> تقليدي (قيمة نصية)
 *  - React Select (كائن { value, label })
 * يعيد مصفوفة بنود، ويتم تجاهل الصفوف الفارغة لاحقاً في منطق الحفظ.
 */
export function getLines(ctx) {
  const { config: { bodyId, linePrefix } } = ctx;
  const tbody = document.getElementById(bodyId);
  if (!tbody) return [];

  return [...tbody.querySelectorAll("tr")].map(row => {
    const productEl = row.querySelector(`.${linePrefix}-product`);
    const qtyEl     = row.querySelector(`.${linePrefix}-qty`);
    const priceEl   = row.querySelector(`.${linePrefix}-price`);
    const descEl    = row.querySelector(`.${linePrefix}-desc`);
    const discEl    = row.querySelector(`.${linePrefix}-discount`);
    const discTypeEl= row.querySelector(`.${linePrefix}-discount-type`);
    const taxEl     = row.querySelector(`.${linePrefix}-line-tax-code`);
    const lineTypeEl= row.querySelector(`.${linePrefix}-line-type`);
    const accountTypeEl = row.querySelector(`.${linePrefix}-line-account-type`);
    const partyEl = row.querySelector(`.${linePrefix}-line-party`);
    const invoiceEl = row.querySelector(`.${linePrefix}-line-invoice`);

    // React Select: القيمة قد تكون كائنًا { value, label } أو نصًا | React Select: the value may be an object { value, label } or a string
    const product = productEl?.value ?? "";
    const taxCode = taxEl?.value ?? "";
    const lineType = lineTypeEl?.value || 'product';
    const enabled = !row.classList.contains('line-disabled');

    const out = {
      product,
      /* حقل فارغ = كمية واحدة (نفس سلوك السند)؛ بدونه كان الفارغ يُحفظ quantity: 0 | Empty field = quantity 1 (same as the voucher); without it an empty field saved quantity: 0
         ويُصفّر إجمالي السطر | and zeroed the line total */
      quantity: Number(qtyEl?.value || 1),
      price:    Number(priceEl?.value ?? 0),
      description: descEl?.value ?? "",
      discount: Number(discEl?.value ?? 0),
      discountType: discTypeEl?.value ?? "fixed",
      taxCodeId: taxCode,
      lineType,
      enabled,
    };

    if (lineType === 'account') {
      out.accountType = accountTypeEl?.value || 'manual';
      out.party = partyEl?.value || "";
      out.invoiceId = invoiceEl?.value || "";
    }

    return out;
  });
}

/* ================= Calculator | الحساب ================= */

export function recalc(ctx) {
  const { q, qt, config: { bodyId, linePrefix } } = ctx;
  const isTaxInclusive = qt("TaxInclusive")?.checked || false;
  const rows = document.getElementById(bodyId)?.querySelectorAll("tr") || [];
  let grandSubtotal = 0, grandTax = 0;

  rows.forEach(row => {
    if (row.classList.contains('line-disabled')) return;
    const qty         = parseFloat(row.querySelector(`.${linePrefix}-qty`)?.value)      || 1;
    const priceInput  = row.querySelector(`.${linePrefix}-price`);
    const price       = priceInput?.disabled ? 0 : (parseFloat(priceInput?.value) || 0);
    const discRaw     = parseFloat(row.querySelector(`.${linePrefix}-discount`)?.value)  || 0;
    const discType    = row.querySelector(`.${linePrefix}-discount-type`)?.value    || "fixed";
    const taxRate     = parseFloat(row.querySelector(`.${linePrefix}-line-tax-code`)?.selectedOptions[0]?.dataset.rate || 0);

    const unitPrice      = (isTaxInclusive && taxRate > 0) ? price / (1 + taxRate / 100) : price;
    const lineSubtotal   = qty * unitPrice;
    const discAmount     = discType === "percent" ? lineSubtotal * (discRaw / 100) : discRaw;
    const afterDiscount  = Math.max(0, lineSubtotal - discAmount);
    const taxAmount      = afterDiscount * (taxRate / 100);
    const lineTotal      = afterDiscount + taxAmount;

    const set = (cls, val) => { const el = row.querySelector(`.${linePrefix}-${cls}`); if (el) el.textContent = val.toFixed(2); };
    set("line-subtotal", afterDiscount);
    set("line-tax-value", taxAmount);
    set("line-total", lineTotal);

    grandSubtotal += afterDiscount;
    grandTax      += taxAmount;
  });

  const grandTotal = grandSubtotal + grandTax;
  if (q("Subtotal")) q("Subtotal").textContent = grandSubtotal.toFixed(2);
  /* العنصر الفعلي لإجمالي الضريبة هو prefix+"Tax" (saleInvTax/purchaseInvTax) وليس "TotalTax" | The real tax-total element is prefix+"Tax" (saleInvTax/purchaseInvTax), not "TotalTax"
     نكتب إليه مباشرة (fallback لـ TotalTax والـ config القديم) | we write to it directly (fallback to TotalTax and the legacy config) */
  const taxTotalEl = q("Tax") || q("TotalTax") || (ctx.config?.taxValueId && document.getElementById(ctx.config.taxValueId)) || null;
  if (taxTotalEl) taxTotalEl.textContent = grandTax.toFixed(2);
  if (q("Total"))    q("Total").textContent    = grandTotal.toFixed(2);

  const taxRow = q("TaxRow");
  if (taxRow) taxRow.style.display = grandTax > 0 ? 'flex' : 'none';
  
  document.querySelectorAll('.d-none-col-tax-amount').forEach(el => {
    el.classList.toggle('d-none', grandTax <= 0);
  });
}

/* ================= Reference | المرجع ================= */

export function toggleAutoRef(ctx) {
  const refEl = ctx.q("Ref");
  if (!refEl) return;
  const auto = ctx.q("AutoRef")?.checked;
  refEl.readOnly = Boolean(auto);
  if (auto) updateAutoRef(ctx);
  else refEl.value = "";
}

export function updateAutoRef(ctx) {
  if (!ctx.q("AutoRef")?.checked) return;
  const refEl = ctx.q("Ref");
  if (refEl) refEl.value = generateUniqueDocNo();
}

export function generateReference(ctx) {
  const refEl = ctx.q("Ref");
  if (refEl) refEl.value = generateUniqueDocNo();
}

export function fillShippingAddress(ctx) {
  const { q, config: { partyId } } = ctx;
  const partyName  = document.getElementById(partyId)?.value;
  const shippingEl = q("ShippingAddress");
  if (!shippingEl) return;
  if (!partyName)  { shippingEl.value = ""; return; }
  try {
    const match = JSON.parse(localStorage.getItem("accountingParties") || "[]").find(p => p.name === partyName);
    shippingEl.value = match?.address || match?.shippingAddress || match?.partyAddress || "";
  } catch { shippingEl.value = ""; }
}