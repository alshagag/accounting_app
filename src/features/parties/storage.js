/* ================= تخزين الأطراف | Parties Storage ================= */

const PARTIES_STORAGE_KEY = "accountingParties";

export function getSavedParties() {
  try   { return JSON.parse(localStorage.getItem(PARTIES_STORAGE_KEY) || "[]"); }
  catch { return []; }
}

export function saveSavedParties(parties) {
  localStorage.setItem(PARTIES_STORAGE_KEY, JSON.stringify(parties || []));
}

export function getSavedPartyById(id) {
  return getSavedParties().find(p => p.id === id) || null;
}

export function getSavedPartiesByType(type) {
  return getSavedParties().filter(p => p.type === type);
}

export function generatePartyCode(type) {
  const prefix = type === "customers" ? "CU" : "SU";
  const count  = getSavedParties().filter(p => p.type === type).length + 1;
  return `${prefix}-${String(count).padStart(4, "0")}`;
}

export function addSavedParty(party) {
  const parties  = getSavedParties();
  const newParty = {
    id:        Date.now(),
    code:      party.code || generatePartyCode(party.type),
    type:      party.type,
    name:      party.name.trim(),
    phone:     (party.phone    || "").trim(),
    city:      (party.city     || "").trim(),
    address:   (party.address  || "").trim(),
    email:     (party.email    || "").trim(),
    notes:     (party.notes    || "").trim(),
    createdAt: new Date().toISOString()
  };
  parties.push(newParty);
  saveSavedParties(parties);
  return newParty;
}

export function updateSavedParty(id, updates) {
  const parties = getSavedParties();
  const index   = parties.findIndex(p => p.id === id);
  if (index === -1) return false;
  parties[index] = { ...parties[index], ...updates };
  saveSavedParties(parties);
  return true;
}

export function deleteSavedParty(id) {
  saveSavedParties(getSavedParties().filter(p => p.id !== id));
}