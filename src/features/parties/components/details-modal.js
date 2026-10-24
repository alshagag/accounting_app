import { $  }         from "@/services/lib/utils.js";
import { escapeHtml } from "@/features/documents/index.js";
import { getAllTransactions } from "@/data/db/db.js";
import { getSavedPartyById } from "../storage.js";
import { buildParties }      from "../services/transactions.js";
import { modalPartyType }    from "../state.js";

/* ================= مودال تفاصيل الطرف | Party Details Modal ================= */
// عرض تفاصيل الطرف في نافذة (من البيانات المحفوظة أو المعاملات) | Show party details in a modal (from saved data or transactions)
export async function onShowPartyDetails(id, name, source) {
  let party = null;

  if (source === "transaction") {
    const transactions = await getAllTransactions();
    const txParties    = buildParties(transactions);
    party = (txParties[modalPartyType] || []).find(p => p.name === name);
    if (party) party = { ...party, source: "transaction" };
  } else {
    const saved = getSavedPartyById(id);
    if (saved) party = { ...saved, source: "saved" };
  }

  if (!party) return;

  const typeLabel = party.type === "customers" ? "عميل" : "مورد";
  const total     = Number(party.total) || 0;
  const paid      = Number(party.paid)  || 0;
  const balance   = total - paid;
  const isPaid    = total <= 0 || balance <= 0;

  const set = (id, val) => { const el = $(id); if (el) el.textContent = val; };
  set("detailPartyCode",    party.code  || "-");
  set("detailPartyType",    typeLabel);
  set("detailPartyName",    party.name  || "-");
  set("detailPartyPhone",   party.phone || "-");
  set("detailPartyCity",    party.city  || "-");
  set("detailPartyAddress", party.address || "-");
  set("detailPartyEmail",   party.email || "-");
  set("detailPartyCount",   party.count || 0);

  const balanceEl = $("detailPartyBalance");
  if (balanceEl) {
    balanceEl.textContent = Number(balance).toFixed(2);
    balanceEl.className   = `fw-bold fs-5 ${isPaid ? "text-success" : "text-danger"}`;
  }

  const statusEl = $("detailPartyStatus");
  if (statusEl) {
    statusEl.className   = `badge bg-${isPaid ? 'success' : 'danger'}`;
    statusEl.textContent = isPaid ? 'مدفوع' : 'غير مدفوع';
  }

  const notesRow = $("detailPartyNotesRow");
  if (notesRow) { notesRow.style.display = party.notes ? "" : "none"; }
  if (party.notes && $("detailPartyNotes")) $("detailPartyNotes").textContent = party.notes;

  // تخزين البيانات على النافذة لاستخدامها في الأزرار | Store data on the modal for its buttons
  const modal = $("partyDetailsModal");
  if (modal) { modal._party = party; modal._balance = balance; }

  if (modal && window.bootstrap) {
    if (window.__onNextModalHidden) {
      modal.addEventListener('hidden.bs.modal', window.__onNextModalHidden, { once: true });
      window.__onNextModalHidden = null;
    }
    window.bootstrap.Modal.getOrCreateInstance(modal).show();
  }
}

// إجراءات النافذة: نسخ، طباعة، إرسال واتساب | Modal actions: copy, print, send via WhatsApp
export function copyPartyDetails() {
  const modal   = $("partyDetailsModal");
  const party   = modal?._party;
  const balance = modal?._balance || 0;
  if (!party) return;

  const typeLabel = party.type === "customers" ? "عميل" : "مورد";
  const text = [
    `بيانات الطرف: ${party.name}`, `─────────────────`,
    `الكود: ${party.code || "-"}`,  `النوع: ${typeLabel}`,
    `الجوال: ${party.phone || "-"}`,`المدينة: ${party.city || "-"}`,
    `العنوان: ${party.address || "-"}`, `البريد: ${party.email || "-"}`,
    `الرصيد: ${Number(balance).toFixed(2)}`,
    party.notes ? `ملاحظات: ${party.notes}` : ""
  ].filter(Boolean).join("\n");

  navigator.clipboard.writeText(text)
    .then(()  => window.showGlobalAlert?.("تم نسخ البيانات", "success"))
    .catch(()  => window.showGlobalAlert?.("حدث خطأ أثناء النسخ", "danger"));
}

export function printPartyDetails() {
  const modal   = $("partyDetailsModal");
  const party   = modal?._party;
  const balance = modal?._balance || 0;
  if (!party) return;

  const typeLabel  = party.type === "customers" ? "عميل" : "مورد";
  const statusText = balance <= 0 ? "مدفوع" : "غير مدفوع";

  const html = `
    <html dir="rtl"><head><meta charset="UTF-8">
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      h2   { text-align: center; margin-bottom: 10px; }
      .info div { padding: 6px 0; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; }
      .label { color: #666; } .value { font-weight: bold; }
    </style></head><body>
    <h2>بيانات الطرف</h2>
    <div class="info">
      <div><span class="label">الكود:</span>    <span class="value">${escapeHtml(party.code)  || "-"}</span></div>
      <div><span class="label">النوع:</span>    <span class="value">${typeLabel}</span></div>
      <div><span class="label">الاسم:</span>    <span class="value">${escapeHtml(party.name)  || "-"}</span></div>
      <div><span class="label">الجوال:</span>   <span class="value">${escapeHtml(party.phone) || "-"}</span></div>
      <div><span class="label">المدينة:</span>  <span class="value">${escapeHtml(party.city)  || "-"}</span></div>
      <div><span class="label">العنوان:</span>  <span class="value">${escapeHtml(party.address) || "-"}</span></div>
      <div><span class="label">البريد:</span>   <span class="value">${escapeHtml(party.email) || "-"}</span></div>
      <div><span class="label">الرصيد:</span>   <span class="value">${Number(balance).toFixed(2)}</span></div>
      <div><span class="label">الحالة:</span>   <span class="value">${statusText}</span></div>
      ${party.notes ? `<div><span class="label">ملاحظات:</span><span class="value">${escapeHtml(party.notes)}</span></div>` : ""}
    </div>
    <script>window.onload=()=>window.print();<\/script>
    </body></html>`;

  const w = window.open("", "_blank", "width=600,height=700");
  w.document.write(html);
  w.document.close();
}

export function sendPartyWhatsApp() {
  const modal   = $("partyDetailsModal");
  const party   = modal?._party;
  const balance = modal?._balance || 0;
  if (!party?.phone) { window.showGlobalAlert?.("لا يوجد رقم جوال", "warning"); return; }

  const typeLabel  = party.type === "customers" ? "عميل" : "مورد";
  const statusText = balance <= 0 ? "مدفوع" : "غير مدفوع";
  const text = encodeURIComponent(`بيانات الطرف: ${party.name}\nالنوع: ${typeLabel}\nالكود: ${party.code || "-"}\nالرصيد: ${Number(balance).toFixed(2)}\nالحالة: ${statusText}`);

  let phone = party.phone.replace(/[^0-9]/g, "");
  if (phone.startsWith("0")) phone = "966" + phone.slice(1);
  window.open(`https://wa.me/${phone}?text=${text}`, "_blank");
}