import { $  }         from "@/services/lib/utils.js";
import { escapeHtml } from "@/features/documents/index.js";
import { activePartyType } from "../state.js";
import { getSavedParties } from "../storage.js";
/* ================= الشريط الجانبي للأطراف | Parties Sidebar ================= */
// تحديث أعداد الفلاتر وأزرار التبويب في الشريط الجانبي | Update filter counts and tab buttons in the sidebar
export function renderPartyFilters(parties) {
  const customersCount = $("customersCount");
  const suppliersCount = $("suppliersCount");
  if (customersCount) customersCount.textContent = parties.customers.length;
  if (suppliersCount) suppliersCount.textContent = parties.suppliers.length;

  document.querySelectorAll(".party-filter").forEach(btn => {
    const isActive = btn.dataset.partyType === activePartyType;
    btn.classList.toggle("btn-success",         isActive);
    btn.classList.toggle("btn-outline-success", !isActive);
  });
}

// عرض أحدث طرف في قائمة الشريط الجانبي | Render the latest party in the sidebar list
export function renderPartyList(parties) {
  const list = $("partiesList");
  if (!list) return;

  const rows      = parties[activePartyType] || [];
  const emptyText = activePartyType === "customers" ? "لا يوجد عملاء بعد" : "لا يوجد موردون بعد";

  if (!rows.length) { list.innerHTML = `<div class="empty-state">${emptyText}</div>`; return; }

  const saved       = getSavedParties();
  const last        = rows[0];
  const matchedSaved= saved.find(p => p.type === activePartyType && p.name.toLowerCase() === last.name.toLowerCase());
  const partyId     = matchedSaved?.id || null;

  list.innerHTML = `
    <div class="party-item border rounded p-2">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <div class="text-muted small mb-1">${activePartyType === "customers" ? "آخر عميل" : "آخر مورد"}</div>
          <div class="fw-bold">${escapeHtml(last.name)}</div>
          ${last.phone ? `<div class="text-muted small"><i class="bi bi-telephone"></i> ${escapeHtml(last.phone)}</div>` : ""}
          ${last.city  ? `<div class="text-muted small"><i class="bi bi-geo-alt"></i> ${escapeHtml(last.city)}</div>`   : ""}
          <div class="text-muted small">${last.count} عملية | آخر تاريخ: ${escapeHtml(last.lastDate || "-")}</div>
        </div>
        <div class="text-start"><div class="fw-bold">${Number(last.total || 0).toFixed(2)}</div></div>
      </div>
      <div class="d-flex gap-1 mt-2">
        <button class="btn btn-sm btn-outline-primary view-party-details"
          data-id="${partyId}" data-name="${escapeHtml(last.name)}" data-source="${partyId ? 'saved' : 'transaction'}" title="عرض">
          <i class="bi bi-eye"></i>
        </button>
        <button class="btn btn-sm btn-outline-warning edit-saved-party"
          data-id="${partyId}" data-name="${escapeHtml(last.name)}" data-source="${partyId ? 'saved' : 'transaction'}"
          data-phone="${escapeHtml(last.phone || '')}" data-city="${escapeHtml(last.city || '')}"
          data-party-type="${activePartyType}" title="تعديل">
          <i class="bi bi-pencil-square"></i>
        </button>
      </div>
    </div>`;
}