import { $  }         from "@/services/lib/utils.js";
import { resetPartyForm, switchToAddTab, switchToListTab } from "../components/form.js";
import { renderModalPartiesTable } from "../components/modal-table.js";
import { track } from "@/services/analytics/gtag.js";

/* ================= مودال الأطراف | Parties Modal ================= */
// فتح نافذة الأطراف واختيار التبويب المناسب | Open the parties modal and select the appropriate tab
export function openPartiesModal(options = {}) {
  renderModalPartiesTable();

  if      (options.tab === "add")  {
    resetPartyForm(); switchToAddTab();
    track("party_add_started", { feature_name: "parties", entry_point: options.entryPoint || "add_form" });
  }
  else if (options.tab === "list") { switchToListTab(); track("party_list_view", { feature_name: "parties" }); }
  else if (options.tab === "edit") { document.querySelector('#tabEditParty')?.click(); }

  const modal = $("partiesModal");
  if (modal && window.bootstrap) window.bootstrap.Modal.getOrCreateInstance(modal).show();
}