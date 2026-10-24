// اختبار: تحديثات التطبيق المتزامنة يجب ألا تُكرِّر صفوف المنتجات | Test: overlapping app refreshes must not duplicate product rows.
//
// السيناريو: حفظ مستند يشغّل fullAppRefresh() (actions.js) بينما تُطلَق fullAppRefresh() من مصادر أخرى (حفظ TransactionForm.jsx، أحداث voucher-saved/voucher-deleted) دون انتظار، فيمكن أن يعمل loadProductsToUI() / renderProducts() بالتوازي | Scenario: a document save runs fullAppRefresh() (actions.js) while other triggers (TransactionForm.jsx save, voucher-saved/voucher-deleted events) also fire fullAppRefresh() without awaiting, so two loadProductsToUI() / renderProducts() calls can run in parallel.
// كانت كل دالة عرض تُفرّغ tbody قبل await getInventoryMap() وتُضيف الصفوف بعده، فتُضيف كلتاهما في نفس tbody فيظهر كل منتج مرتين في جدول «إضافة المنتج سريعاً» الجانبي (وكذلك في renderProductsModal لنافذة «عرض كل المنتجات») | Each renderer cleared the products tbody BEFORE await getInventoryMap() and appended rows AFTER it, so both renderers appended into the same tbody and every product appeared twice in the "إضافة المنتج سريعاً" sidebar table (and the same overlap existed in renderProductsModal for the "عرض كل المنتجات" modal).
// استبدال tbody بصفوف الصفحة في تعيين واحد بعد اكتمال القراءة يمنع تكرار المنتجات في التحديثات المتداخلة | Replacing tbody with the rendered page in one assignment after reads prevents duplicates during overlapping refreshes.
//
// Run with:  node tests/render-products-race.test.mjs

import assert from "node:assert/strict";
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./alias-loader.mjs", new URL(".", import.meta.url).href);

/* ── بدائل متصفح مصغّرة (لا DOM تحت Node) | Minimal browser stubs (no DOM available under Node) ─────────────────── */

const elements = new Map();

function createElementStub(id = "") {
  const listeners = new Map();
  const select = { value: "", addEventListener() {}, matches: (selector) => selector === "select" };
  const el = {
    id,
    children: [],
    _html: "",
    set innerHTML(v) {
      this._html = String(v);
      this.children = Array.from(this._html.matchAll(/<tr\b[^>]*>/g), ([html]) => ({ html }));
    },
    get innerHTML() { return this._html; },
    appendChild(node) { this.children.push(node); return node; },
    insertAdjacentHTML(position, html) {
      if (position === "beforeend") this.children.push({ html });
    },
    insertAdjacentElement(position, node) { elements.set(node.id, node); },
    closest(selector) {
      if (selector === "table") return this.table || null;
      if (selector === ".table-responsive") return this.wrapper || null;
      return null;
    },
    querySelector(selector) { return selector === "select" ? select : null; },
    querySelectorAll() { return []; },
    remove() {
      this.removed = true;
      elements.delete(this.id);
    },
    addEventListener(type, listener) {
      const registered = listeners.get(type) || [];
      registered.push(listener);
      listeners.set(type, registered);
    },
    dispatch(type, event) {
      for (const listener of listeners.get(type) || []) listener(event);
    },
    dataset: {},
    style: {},
    classList: {
      add() {},
      remove() {},
      toggle() {},
      contains() { return false; },
    },
  };
  if (id) elements.set(id, el);
  return el;
}

function createTableElements(tbodyId, tfootId) {
  const wrapper = createElementStub(`${tbodyId}Wrapper`);
  wrapper.parentElement = {};
  const table = createElementStub(`${tbodyId}Table`);
  table.querySelectorAll = () => [];
  table.closest = (selector) => selector === ".table-responsive" ? wrapper : null;
  const tbody = createElementStub(tbodyId);
  tbody.table = table;
  tbody.wrapper = wrapper;
  return {
    tbody,
    tfoot: tfootId ? createElementStub(tfootId) : null,
  };
}

const productsTable = createTableElements("productsTbody");
const modalProductsTable = createTableElements("modalProductsTbody", "modalProductsTfoot");
const productsTbody = productsTable.tbody;
const modalProductsTbody = modalProductsTable.tbody;
const modalProductsTfoot = modalProductsTable.tfoot;

globalThis.document = {
  getElementById(id) {
    return elements.get(id) || null;
  },
  createElement(tag) {
    return createElementStub();
  },
};

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
};

globalThis.window = globalThis;
globalThis.indexedDB = undefined; // فرض وضع التخزين الاحتياطي السريع عبر localStorage | force the fast localStorage fallback mode

/* ── تحميل وحدات التطبيق الحقيقية عبر محمّل المرادف @/ | Load the real app modules through the @/ alias loader ───────────────── */

const { openDatabase, fallback } = await import("@/data/db/db.js");
const { loadProductsToUI } = await import("@/features/products/products.js");
const { renderProductsModal } = await import("@/features/documents/transactions.js");
const { renderLimitedRows, renderPaginatedRows } = await import("@/features/documents/components/table-renderer.js");

await openDatabase();

const PRODUCTS = [
  { id: 1, name: "منتج أ", price: 10 },
  { id: 2, name: "منتج ب", price: 20 },
  { id: 3, name: "منتج ج", price: 30 },
];
fallback.setProducts(PRODUCTS);
fallback.setTransactions([]);

/* ── السيناريو 1: جدول «إضافة المنتج سريعاً» الجانبي | Scenario 1: sidebar "إضافة المنتج سريعاً" table ─────────────────────── */

await Promise.all([loadProductsToUI(), loadProductsToUI()]);

assert.equal(
  productsTbody.children.length,
  PRODUCTS.length,
  `overlapping refreshes must not duplicate sidebar product rows ` +
    `(got ${productsTbody.children.length}, expected ${PRODUCTS.length})`,
);

const homepagePreview = createTableElements("homepagePreviewTbody");
const staleHomepagePagination = createElementStub("homepagePreviewTbodyPagination");
renderLimitedRows(
  "homepagePreviewTbody",
  Array.from({ length: 12 }, (_, index) => index + 1),
  (id) => `<tr data-row-id="${id}"><td>${id}</td></tr>`,
  { limit: 3, colspan: 1 },
);
assert.equal(homepagePreview.tbody.children.length, 3, "homepage preview must preserve its limited rows");
assert.equal(elements.has("homepagePreviewTbodyPagination"), false, "homepage preview must not create pagination controls");
assert.equal(staleHomepagePagination.removed, true, "homepage preview must remove prior pagination controls");

/* ── السيناريو 2: جدول نافذة «عرض كل المنتجات» | Scenario 2: "عرض كل المنتجات" modal table ────────────────────────────── */

await Promise.all([renderProductsModal(PRODUCTS), renderProductsModal(PRODUCTS)]);

assert.equal(
  modalProductsTbody.children.length,
  PRODUCTS.length,
  `overlapping refreshes must not duplicate "all products" modal rows ` +
    `(got ${modalProductsTbody.children.length}, expected ${PRODUCTS.length})`,
);

/* ── خيارات الترقيم والتنقل وعدم فقد الصفوف | Page-size options, navigation, and row integrity ── */

const paginationTable = createTableElements("paginationTbody");
const paginationItems = Array.from({ length: 25 }, (_, index) => index + 1);
renderPaginatedRows(
  "paginationTbody",
  paginationItems,
  (id) => `<tr data-row-id="${id}"><td>${id}</td></tr>`,
  { emptyMessage: "لا توجد سجلات", colspan: 1 },
);

const paginationTbody = paginationTable.tbody;
const paginationControls = elements.get("paginationTbodyPagination");
const pageSizeSelect = paginationControls.querySelector("select");
const visibleIds = () => Array.from(
  paginationTbody.innerHTML.matchAll(/data-row-id="(\d+)"/g),
  ([, id]) => Number(id),
);

assert.deepEqual(
  Array.from(paginationControls.innerHTML.matchAll(/<option value="(\d+)"/g), ([, size]) => Number(size)),
  [10, 20, 30, 50, 100, 200],
);
assert.equal(visibleIds().length, 10, "default page size must be 10");

for (const size of [10, 20, 30, 50, 100, 200]) {
  pageSizeSelect.value = String(size);
  paginationControls.dispatch("change", { target: pageSizeSelect });
  assert.equal(visibleIds().length, Math.min(size, paginationItems.length), `page size ${size} must render the expected number of rows`);
}

pageSizeSelect.value = "10";
paginationControls.dispatch("change", { target: pageSizeSelect });
const firstPageIds = visibleIds();
paginationControls.dispatch("click", {
  target: { closest: () => ({ disabled: false, dataset: { pageAction: "last" } }) },
});
const lastPageIds = visibleIds();
assert.deepEqual(lastPageIds, [21, 22, 23, 24, 25], "last-page navigation must show the final records");
assert.match(paginationControls.innerHTML, /صفحة 3 من 3/);
paginationControls.dispatch("click", {
  target: { closest: () => ({ disabled: false, dataset: { pageAction: "previous" } }) },
});
const middlePageIds = visibleIds();
paginationControls.dispatch("click", {
  target: { closest: () => ({ disabled: false, dataset: { pageAction: "first" } }) },
});
assert.deepEqual(visibleIds(), firstPageIds, "first-page navigation must return to the first records");
paginationControls.dispatch("click", {
  target: { closest: () => ({ disabled: false, dataset: { pageAction: "next" } }) },
});
assert.deepEqual(visibleIds(), middlePageIds, "next-page navigation must show the middle records");
assert.equal(
  new Set([...firstPageIds, ...middlePageIds, ...lastPageIds]).size,
  paginationItems.length,
  "pagination must not duplicate or omit records across pages",
);

const filteredItems = paginationItems.filter((id) => id % 2 === 0);
renderPaginatedRows(
  "paginationTbody",
  filteredItems,
  (id) => `<tr data-row-id="${id}"><td>${id}</td></tr>`,
  { emptyMessage: "لا توجد سجلات", colspan: 1, resetPage: true },
);
assert.deepEqual(visibleIds(), filteredItems.slice(0, 10), "filter changes must return to the first page");
paginationControls.dispatch("click", {
  target: { closest: () => ({ disabled: false, dataset: { pageAction: "next" } }) },
});
assert.deepEqual(visibleIds(), filteredItems.slice(10), "filtered records must continue on the next page");

renderPaginatedRows(
  "paginationTbody",
  filteredItems.slice(0, 4),
  (id) => `<tr data-row-id="${id}"><td>${id}</td></tr>`,
  { emptyMessage: "لا توجد سجلات", colspan: 1 },
);
assert.deepEqual(visibleIds(), filteredItems.slice(0, 4), "shrinking data must clamp the current page without losing rows");

console.log("PASS: concurrent product renders never duplicate rows");
console.log("PASS: all page sizes, filtering, CRUD clamping, and page navigation preserve every row");
