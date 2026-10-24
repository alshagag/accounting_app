import { $ }          from "@/services/lib/utils.js";
import { escapeHtml } from "@/features/documents/controllers/utils/escape.js";

const PAGE_SIZE_OPTIONS = [10, 20, 30, 50, 100, 200];
const paginationStates = new WeakMap();

function getPaginationContainer(tbody, containerId) {
  if (containerId) {
    const container = $(containerId);
    container?.classList.add("table-pagination", "d-flex", "flex-wrap", "justify-content-between", "align-items-center", "gap-2", "mt-2");
    return container;
  }

  const table = tbody.closest("table");
  const wrapper = table?.closest(".table-responsive") || table;
  if (!wrapper?.parentElement) return null;

  const id = `${tbody.id || "table"}Pagination`;
  let container = document.getElementById(id);
  if (!container) {
    container = document.createElement("div");
    container.id = id;
    container.className = "table-pagination d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2";
    wrapper.insertAdjacentElement("afterend", container);
  }
  container.classList.add("table-pagination");
  return container;
}

function renderPaginationControls(state, total) {
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  state.currentPage = Math.min(Math.max(1, state.currentPage), totalPages);
  const firstRecord = total ? (state.currentPage - 1) * state.pageSize + 1 : 0;
  const lastRecord = Math.min(state.currentPage * state.pageSize, total);

  state.container.innerHTML = `
    <div class="d-flex flex-wrap align-items-center gap-2">
      <label class="small text-muted mb-0" for="${state.selectId}">سجلات لكل صفحة</label>
      <select id="${state.selectId}" class="form-select form-select-sm" aria-label="عدد السجلات لكل صفحة">
        ${PAGE_SIZE_OPTIONS.map(size => `<option value="${size}">${size}</option>`).join("")}
      </select>
      <span class="small text-muted">${firstRecord}–${lastRecord} من ${total} سجلًا</span>
    </div>
    <div class="d-flex flex-wrap align-items-center gap-1">
      <button type="button" class="btn btn-sm btn-outline-secondary" data-page-action="first" aria-label="الصفحة الأولى" ${state.currentPage === 1 ? "disabled" : ""}>الأولى</button>
      <button type="button" class="btn btn-sm btn-outline-secondary" data-page-action="previous" aria-label="الصفحة السابقة" ${state.currentPage === 1 ? "disabled" : ""}>السابقة</button>
      <span class="small text-muted px-1">صفحة ${state.currentPage} من ${totalPages}</span>
      <button type="button" class="btn btn-sm btn-outline-secondary" data-page-action="next" aria-label="الصفحة التالية" ${state.currentPage === totalPages ? "disabled" : ""}>التالية</button>
      <button type="button" class="btn btn-sm btn-outline-secondary" data-page-action="last" aria-label="الصفحة الأخيرة" ${state.currentPage === totalPages ? "disabled" : ""}>الأخيرة</button>
    </div>`;
  state.container.querySelector("select").value = String(state.pageSize);
}

function drawPage(state) {
  const { tbody, items, renderRow, emptyMessage, colspan } = state;
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / state.pageSize));
  state.currentPage = Math.min(Math.max(1, state.currentPage), totalPages);
  const pageItems = items.slice((state.currentPage - 1) * state.pageSize, state.currentPage * state.pageSize);

  tbody.innerHTML = pageItems.length
    ? pageItems.map(renderRow).join("")
    : `<tr><td colspan="${colspan}" class="text-muted text-center py-4">${escapeHtml(emptyMessage)}</td></tr>`;

  renderPaginationControls(state, total);
}

export function renderPaginatedRows(tbodyId, items, renderRowFunc, options = {}) {
  const { emptyMessage = "لا توجد سجلات", colspan = 1, containerId, resetPage = false } = options;
  const tbody = $(tbodyId);
  if (!tbody) return;

  const container = getPaginationContainer(tbody, containerId);
  if (!container) return;

  let state = paginationStates.get(tbody);
  if (!state) {
    state = {
      tbody,
      container,
      selectId: `${tbody.id || "table"}PageSize`,
      currentPage: 1,
      pageSize: 10,
      items: [],
      renderRow: renderRowFunc,
      emptyMessage,
      colspan,
    };
    paginationStates.set(tbody, state);
  }

  state.container = container;
  state.items = items || [];
  state.renderRow = renderRowFunc;
  state.emptyMessage = emptyMessage;
  state.colspan = colspan;
  if (resetPage) state.currentPage = 1;

  if (!container.dataset.paginationBound) {
    container.dataset.paginationBound = "true";
    container.addEventListener("change", event => {
      if (event.target.matches("select")) {
        state.pageSize = Number(event.target.value);
        state.currentPage = 1;
        drawPage(state);
      }
    });
    container.addEventListener("click", event => {
      const button = event.target.closest("[data-page-action]");
      if (!button || button.disabled) return;
      const totalPages = Math.max(1, Math.ceil(state.items.length / state.pageSize));
      const actions = {
        first: () => 1,
        previous: () => state.currentPage - 1,
        next: () => state.currentPage + 1,
        last: () => totalPages,
      };
      state.currentPage = actions[button.dataset.pageAction]?.() ?? state.currentPage;
      drawPage(state);
    });
  }

  drawPage(state);
}

export function renderLimitedRows(tbodyId, items, renderRowFunc, options = {}) {
  const { limit = 5, emptyMessage = "لا توجد سجلات", colspan = 1 } = options;
  const tbody = $(tbodyId);
  if (!tbody) return;

  document.getElementById(`${tbodyId}Pagination`)?.remove();
  const visibleItems = (items || []).slice(0, limit);
  tbody.innerHTML = visibleItems.length
    ? visibleItems.map(renderRowFunc).join("")
    : `<tr><td colspan="${colspan}" class="text-muted text-center py-4">${escapeHtml(emptyMessage)}</td></tr>`;
}
