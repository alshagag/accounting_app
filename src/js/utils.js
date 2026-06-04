export const $ = (id) => document.getElementById(id);

export function safeSet(id, value) {
  const el = $(id);
  if (!el) return;
  el.textContent = value ?? "";
}