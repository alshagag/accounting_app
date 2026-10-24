/* ================= حالة الأطراف | Parties State ================= */

export let activePartyType  = "customers";
export let modalPartyType   = "customers";
export let editingPartyId   = null;

export function setActivePartyType(type)  { activePartyType  = type; }
export function setModalPartyType(type)   { modalPartyType   = type; }
export function setEditingPartyId(id)     { editingPartyId   = id;   }