import { getTransactions, buildParties } from "./services/transactions.js";
import { renderPartyFilters, renderPartyList } from "./components/sidebar.js";
import { openPartiesModal } from "./actions/open-modal.js";
import { addSavedParty }   from "./storage.js";
import { resetPartyForm }  from "./components/form.js";
import { bindParties }     from "./events/bind-parties.js";

async function renderParties() {
  const transactions = await getTransactions();
  const parties      = buildParties(transactions);
  renderPartyFilters(parties);
  renderPartyList(parties);
}

window.renderParties   = renderParties;
window.buildParties    = buildParties;
window.resetPartyForm  = resetPartyForm;
window.openPartiesModal= openPartiesModal;
window.addSavedParty   = addSavedParty;

export { renderParties, bindParties };