import { $  } from "@/services/lib/utils.js";
import { escapeHtml } from "@/features/documents/index.js";
import { editingPartyId, setEditingPartyId, modalPartyType } from "../state.js";
import { addSavedParty, updateSavedParty, deleteSavedParty, getSavedPartyById } from "../storage.js";
import { readPartyForm, fillPartyForm, resetPartyForm, switchToListTab } from "../components/form.js";
import { renderModalPartiesTable } from "../components/modal-table.js";
import { openPartiesModal } from "./open-modal.js";
import { track } from "@/services/analytics/gtag.js";
/* ================= إجراءات الأطراف (CRUD) | Parties Actions (CRUD) ================= */

// حفظ الطرف أو تعديله | Save or update a party
export function onSaveParty(renderParties) {
  const form = readPartyForm();
  if (!form.name) { window.showGlobalAlert?.("يرجى إدخال اسم الطرف", "warning"); $("newPartyName")?.focus(); return; }

  if (editingPartyId) {
    updateSavedParty(editingPartyId, form);
    window.showGlobalAlert?.("تم تحديث الطرف بنجاح", "success");
    track("party_edit_success", { feature_name: "parties", party_type: form.type === "customers" ? "customer" : "supplier", entry_point: "parties_modal" });
  } else {
    addSavedParty(form);
    window.showGlobalAlert?.(form.type === "customers" ? "تم إضافة العميل بنجاح" : "تم إضافة المورد بنجاح", "success");
    track(form.type === "customers" ? "customer_add_success" : "supplier_add_success", {
      feature_name: "parties",
      party_type: form.type === "customers" ? "customer" : "supplier",
      entry_point: "parties_modal",
    });
  }

  resetPartyForm();
  renderModalPartiesTable();
  renderParties?.();
  document.dispatchEvent(new Event("parties-changed"));
  switchToListTab();
}

// تعديل طرف | Edit a party
export function onEditParty(id) {
  const party = getSavedPartyById(id);
  if (!party) return;

  setEditingPartyId(id);
  fillPartyForm(party);
  if ($("editPartyId"))     $("editPartyId").value = id;
  if ($("btnSavePartyText")) $("btnSavePartyText").innerHTML = '<i class="bi bi-save me-1"></i>تحديث';
  $("btnDeleteParty")?.classList.remove("d-none");

  track("party_edit_started", { feature_name: "parties", party_type: party.type === "customers" ? "customer" : "supplier", entry_point: "parties_modal" });

  openPartiesModal({ tab: "edit" });
}

// حذف طرف محفوظ مع التأكيد | Delete a saved party (with confirmation)
export async function onDeleteSavedParty(id, renderParties) {
  const party = getSavedPartyById(id);
  if (!party) return;

  const confirmed = await window.confirmDelete?.({
    title:       "حذف الطرف",
    message:     `هل أنت متأكد من حذف "${escapeHtml(party.name)}"؟`,
    detail:      "سيتم حذف الطرف من القائمة المحفوظة. العمليات القديمة ستبقى كما هي.",
    confirmText: "حذف الطرف"
  });
  if (!confirmed) return;

  deleteSavedParty(id);
  resetPartyForm();
  renderModalPartiesTable();
  renderParties?.();
  document.dispatchEvent(new Event("parties-changed"));
  window.showGlobalAlert?.("تم حذف الطرف بنجاح", "success");
  track("party_delete_success", { feature_name: "parties", party_type: party.type === "customers" ? "customer" : "supplier" });
}