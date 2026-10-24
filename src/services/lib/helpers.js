/**
 * Escapes HTML special characters in a string.
 * @param {string | null | undefined} str The string to escape.
 * @returns {string} The escaped string.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return "";

  return String(str).replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[s]));
}

/**
 * Normalizes different transaction type strings to a standard "بيع" or "شراء".
 * @param {string} type The transaction type.
 * @returns {string} The normalized type.
 */
export function normalizeTransactionType(type) {
  const value = String(type || "").trim().toLowerCase();
  if (["بيع", "sale", "sales"].includes(value)) return "بيع";
  if (["شراء", "purchase", "purchases"].includes(value)) return "شراء";
  return String(type || "").trim();
}