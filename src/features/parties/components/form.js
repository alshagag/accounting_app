import { $  }         from "@/services/lib/utils.js";
import { setEditingPartyId } from "../state.js";
import { generatePartyCode } from "../storage.js";

/* ================= نموذج الأطراف | Parties Form ================= */

export function readPartyForm() {
  const get = id => $(id)?.value?.trim() || "";
  return {
    type:    $("newPartyType")?.value || "customers",
    code:    get("newPartyCode"),
    name:    get("newPartyName"),
    phone:   get("newPartyPhone"),
    city:    get("newPartyCity"),
    address: get("newPartyAddress"),
    email:   get("newPartyEmail"),
    notes:   get("newPartyNotes")
  };
}

export function fillPartyForm(party) {
  const set = (id, val) => { const el = $(id); if (el) el.value = val || ""; };
  set("newPartyType",    party.type);
  set("newPartyCode",    party.code);
  set("newPartyName",    party.name);
  set("newPartyPhone",   party.phone);
  set("newPartyCity",    party.city);
  set("newPartyAddress", party.address);
  set("newPartyEmail",   party.email);
  set("newPartyNotes",   party.notes);
}

export function resetPartyForm() {
  ["newPartyCode","newPartyName","newPartyPhone","newPartyCity","newPartyAddress","newPartyEmail","newPartyNotes","editPartyId"]
    .forEach(id => { const el = $(id); if (el) el.value = ""; });

  if ($("newPartyType")) $("newPartyType").value = "customers";

  setEditingPartyId(null);
  if ($("btnSavePartyText")) $("btnSavePartyText").innerHTML = '<i class="bi bi-save me-1"></i>حفظ';
  $("btnDeleteParty")?.classList.add("d-none");
}

export function switchToAddTab()  { document.querySelector('#tabEditParty')?.click(); }
export function switchToListTab() { document.querySelector('[data-bs-target="#partiesListTab"]')?.click(); }

// تحديث الكود التلقائي: يُنادى عند تغيّر النوع أو تفعيل autoCode | Auto-code update: called when type changes or autoCode is enabled
export function updateAutoCode() {
  const autoCode  = $("autoCode");
  const codeInput = $("newPartyCode");
  if (!autoCode || !codeInput) return;

  if (autoCode.checked) {
    codeInput.value    = generatePartyCode($("newPartyType")?.value || "customers");
    codeInput.readOnly = true;
  } else {
    codeInput.readOnly   = false;
    codeInput.value      = "";
    codeInput.placeholder= "أدخل كود يدوياً";
  }
}