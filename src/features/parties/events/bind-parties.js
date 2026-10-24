import { $  }         from "@/services/lib/utils.js";
import { setActivePartyType, setModalPartyType, editingPartyId, modalPartyType } from "../state.js";
import { getSavedParties, addSavedParty } from "../storage.js";
import { getTransactions, buildParties }  from "../services/transactions.js";
import { renderPartyFilters, renderPartyList } from "../components/sidebar.js";
import { renderModalPartiesTable } from "../components/modal-table.js";
import { resetPartyForm, updateAutoCode } from "../components/form.js";
import { onShowPartyDetails, copyPartyDetails, printPartyDetails, sendPartyWhatsApp } from "../components/details-modal.js";
import { onSaveParty, onEditParty, onDeleteSavedParty } from "../actions/crud.js";
import { openPartiesModal } from "../actions/open-modal.js";
import { initStatementModalEvents } from "../components/statement-modal.js";
import { track } from "@/services/analytics/gtag.js";

/* الدالة الرئيسية للعرض — تُعاد استخداماً في أماكن متعددة | Main render function — reused in multiple places */
async function renderParties() {
  const transactions = await getTransactions();
  const parties      = buildParties(transactions);
  renderPartyFilters(parties);
  renderPartyList(parties);
}

export function bindParties() {
  /* ── كشف الحساب | Account statement ── */
  initStatementModalEvents();

  /* ── أزرار تفاصيل الطرف | Party details buttons ── */
  $("btnPrintParty")?.addEventListener("click",    printPartyDetails);
  $("btnWhatsappParty")?.addEventListener("click", sendPartyWhatsApp);
  $("btnCopyParty")?.addEventListener("click",     copyPartyDetails);

  /* ── فلاتر الشريط الجانبي (تفويض) | Sidebar filters (delegation) ──
     أزرار الشريط الجانبي مُخرَجة من React ويستبدل عقد DOM عند كل إعادة عرض، فيفقد الربط المباشر المستمع بصمت | Sidebar buttons are rendered by React and it replaces DOM nodes on every re-render, so direct binding silently loses the listener
     يبقى التفويض صالحاً ما دام العنصر يحمل نفس الصنف/المعرّف | Delegation stays valid as long as the element keeps the same class/id */
  document.addEventListener("click", event => {
    const filterBtn = event.target?.closest?.(".party-filter");
    if (filterBtn) {
      setActivePartyType(filterBtn.dataset.partyType || "customers");
      renderParties();
      return;
    }
    if (event.target?.closest?.("#btnRefreshParties")) { renderParties(); window.showGlobalAlert?.("تم التحديث", "success"); return; }
    if (event.target?.closest?.("#btnMoreParties"))    { openPartiesModal({ tab: "list" }); return; }
  });

  /* ── فلاتر المودال | Modal filters ── */
  document.addEventListener("click", event => {
    const btn = event.target?.closest?.(".modal-party-filter");
    if (!btn) return;
    setModalPartyType(btn.dataset.partyType || "customers");
    document.querySelectorAll(".modal-party-filter").forEach(b => {
      const active = b.dataset.partyType === modalPartyType;
      b.classList.toggle("btn-success",         active);
      b.classList.toggle("btn-outline-success", !active);
    });
    renderModalPartiesTable();
  });

  /* ── أزرار ثابتة | Fixed buttons ── */
  $("btnSaveParty")?.addEventListener("click",      () => onSaveParty(renderParties));
  $("btnDeleteParty")?.addEventListener("click",    () => { if (editingPartyId) onDeleteSavedParty(editingPartyId, renderParties); });

  document.querySelector('#tabListParty')?.addEventListener("click", () => { resetPartyForm(); updateAutoCode(); });
  $("autoCode")?.addEventListener("change",    updateAutoCode);
  $("newPartyType")?.addEventListener("change", updateAutoCode);

  /* ── أحداث النقر المفوّضة | Delegated click events ── */
  document.addEventListener("click", event => {
    const t = event.target;

    /* عرض التفاصيل | Show details */
    const viewBtn = t.closest(".view-party-details");
    if (viewBtn) {
      const id     = viewBtn.dataset.id === "null" ? null : Number(viewBtn.dataset.id);
      const name   = viewBtn.dataset.name;
      const source = viewBtn.dataset.source;
      const action = () => onShowPartyDetails(id, name, source);

      const parentModalEl = t.closest('#partiesModal');
      if (parentModalEl && window.bootstrap) {
        const parentModal = bootstrap.Modal.getInstance(parentModalEl);
        if (parentModal) {
          parentModalEl.addEventListener('hidden.bs.modal', () => { window.__onNextModalHidden = () => setTimeout(() => parentModal.show(), 50); action(); }, { once: true });
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
          parentModal.hide();
          return;
        }
      }
      action();
      return;
    }

    /* تعديل | Edit */
    const editBtn = t.closest(".edit-saved-party");
    if (editBtn) {
      const id = Number(editBtn.dataset.id);
      if (id) { onEditParty(id); return; }

      /* طرف من العمليات فقط (غير محفوظ): يُحفظ أولاً بنفس بيانات العملية ثم يُفتح التعديل | Transaction-only party (unsaved): save it first with the transaction's data, then open the editor */
      const name = (editBtn.dataset.name || "").trim();
      if (name) {
        const saved    = getSavedParties().find(p => p.name.toLowerCase() === name.toLowerCase());
        const savedId  = saved ? saved.id : addSavedParty({
          type:  editBtn.dataset.partyType || modalPartyType,
          name,
          phone: editBtn.dataset.phone || "",
          city:  editBtn.dataset.city  || ""
        }).id;
        onEditParty(savedId);
      }
      return;
    }

    /* حذف | Delete */
    const deleteBtn = t.closest(".delete-saved-party");
    if (deleteBtn) { const id = Number(deleteBtn.dataset.id); if (id) onDeleteSavedParty(id, renderParties); return; }

    /* استخدام الطرف في نموذج المعاملات | Use the party in the transaction form */
    const useBtn = t.closest(".use-saved-party");
    if (useBtn) {
      const name  = useBtn.dataset.name  || "";
      const phone = useBtn.dataset.phone || "";
      const transParty = $("transParty");
      if (transParty) {
        const exists = [...transParty.options].some(o => o.value === name);
        if (!exists) { const opt = new Option(name, name, true, true); transParty.appendChild(opt); }
        else transParty.value = name;
      }
      if (phone && $("transCustomerPhone")) $("transCustomerPhone").value = phone;
      $("partiesModal") && window.bootstrap?.Modal.getInstance($("partiesModal"))?.hide();
      const ptype = useBtn.dataset.partyType;
      track("party_selected", {
        feature_name: "parties",
        party_type: ptype === "suppliers" ? "supplier" : (ptype === "customers" ? "customer" : "unknown"),
        entry_point: "transaction_form",
      });
      return;
    }

    /* حفظ طرف من معاملة | Save a party from a transaction */
    const saveTxBtn = t.closest(".save-tx-party");
    if (saveTxBtn) {
      const name = saveTxBtn.dataset.name || "";
      if (!name) return;
      if (getSavedParties().some(p => p.name.toLowerCase() === name.toLowerCase())) { window.showGlobalAlert?.("الطرف محفوظ مسبقاً", "warning"); return; }
      addSavedParty({ type: saveTxBtn.dataset.type || modalPartyType, name, phone: saveTxBtn.dataset.phone || "", city: saveTxBtn.dataset.city || "", address: "", email: "", notes: "" });
      window.showGlobalAlert?.("تم حفظ الطرف", "success");
      track((saveTxBtn.dataset.type || modalPartyType) === "customers" ? "customer_add_success" : "supplier_add_success", {
        feature_name: "parties",
        party_type: (saveTxBtn.dataset.type || modalPartyType) === "customers" ? "customer" : "supplier",
        entry_point: "transaction_list",
      });
      renderModalPartiesTable();
      renderParties();
      document.dispatchEvent(new Event("parties-changed"));
    }
  });

  /* ── العرض الأولي | Initial render ── */
  const tryRender = async (attempt = 1) => {
    try   { await renderParties(); }
    catch (e) { console.error("Initial render error:", e); if (attempt <= 3) setTimeout(() => tryRender(attempt + 1), 200); }
  };
  setTimeout(() => tryRender(), 0);
}