import { $  }         from "@/services/lib/utils.js";
import { escapeHtml } from "@/features/documents/index.js";
import { modalPartyType } from "../state.js";
import { getSavedParties } from "../storage.js";
import { getTransactions, buildParties } from "../services/transactions.js";
import { calculatePartyBalance } from "../services/balance.js";
import { renderPaginatedRows } from "@/features/documents/components/table-renderer.js";

/* ================= جدول مودال الأطراف | Parties Modal Table ================= */

let renderedPartyType = null;

export async function renderModalPartiesTable() {
  const tbody = $("modalPartiesTbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="6" class="text-muted py-3">جاري تحميل البيانات...</td></tr>`;

  const saved       = getSavedParties().filter(p => p.type === modalPartyType);
  const transactions= await getTransactions();
  const txParties   = buildParties(transactions);
  const txFiltered  = (txParties[modalPartyType] || []).map(p => ({ ...p, id: null, source: "transaction" }));

  const savedNames  = new Set(saved.map(p => p.name.toLowerCase()));
  const uniqueTx    = txFiltered.filter(p => !savedNames.has(p.name.toLowerCase()));
  const all         = [...saved, ...uniqueTx].sort((a, b) => a.name.localeCompare(b.name));

  const countEl = $("modalCustomersCount");
  if (countEl) countEl.textContent = all.length;

  const resetPage = renderedPartyType !== modalPartyType;
  renderedPartyType = modalPartyType;
  if (!all.length) {
    renderPaginatedRows("modalPartiesTbody", [], () => "", {
      emptyMessage: modalPartyType === "customers" ? "لا يوجد عملاء" : "لا يوجد موردون",
      colspan: 5,
      resetPage,
    });
    return;
  }

  const invoices = modalPartyType === "customers"
    ? (latestDocuments.salesInvoices    || null)
    : (latestDocuments.purchaseInvoices || null);

  const rows = await Promise.all(all.map(async party => {
    const isSaved = party.id !== null && party.source !== "transaction";
    const balance = await calculatePartyBalance(party, invoices);
    const isPaid  = balance <= 0;

    // زر الرصيد (يفتح كشف الحساب) | Balance button (opens the statement)
    const balanceBtn = `
      <button class="btn btn-link btn-sm p-0 fw-bold open-party-statement ${isPaid ? 'text-success' : 'text-danger'}"
        data-party-name="${escapeHtml(party.name)}"
        data-party-type="${escapeHtml(party.type)}"
        data-party-phone="${escapeHtml(party.phone || '')}"
        title="عرض كشف الحساب"
        style="text-decoration:none;">
        ${balance.toFixed(2)}
        <i class="bi bi-box-arrow-up-left ms-1" style="font-size:.7rem;"></i>
      </button>`;

    return `
      <tr>
        <td class="text-center">
          <button class="btn btn-sm btn-outline-primary view-party-details"
            data-id="${party.id}" data-name="${escapeHtml(party.name)}"
            data-source="${isSaved ? 'saved' : 'transaction'}" title="عرض التفاصيل">
            <i class="bi bi-eye"></i>
          </button>
        </td>
        <td class="text-center">
          ${isSaved
            ? `<button class="btn btn-sm btn-outline-warning edit-saved-party" data-id="${party.id}" title="تعديل"><i class="bi bi-pencil-square"></i></button>`
            : `<button class="btn btn-sm btn-outline-warning edit-saved-party" data-name="${escapeHtml(party.name)}" data-phone="${escapeHtml(party.phone || '')}" data-city="${escapeHtml(party.city || '')}" data-party-type="${escapeHtml(party.type)}" title="حفظ الطرف وتعديله"><i class="bi bi-pencil-square"></i></button>`
          }
        </td>
        <td class="fw-bold">${escapeHtml(party.name)}</td>
        <td class="text-center">${balanceBtn}</td>
        <td class="text-center">
          <span class="badge bg-${isPaid ? 'success' : 'danger'}">${isPaid ? 'مدفوع' : 'غير مدفوع'}</span>
        </td>
      </tr>`;
  }));

  renderPaginatedRows("modalPartiesTbody", rows, row => row, {
    emptyMessage: modalPartyType === "customers" ? "لا يوجد عملاء" : "لا يوجد موردون",
    colspan: 5,
    resetPage,
  });
}