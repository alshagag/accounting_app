import { normalizeTransactionType } from "@/services/lib/helpers.js";

export function formatMoney(value) {
  return `${Number(value || 0).toFixed(2)} ريال`;
}

export function normalizeType(type) {
  return normalizeTransactionType(type) || String(type || "").trim();
}