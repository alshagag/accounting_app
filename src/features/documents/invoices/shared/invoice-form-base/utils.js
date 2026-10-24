/* دوال مساعدة خالصة | Pure helper functions */

/* نسخة واحدة مشتركة لتهريب HTML/السمات بدل تكرار التنفيذ | Single shared HTML/attribute escaping implementation instead of a duplicate */
export { escapeHtml, escapeAttr } from "@/features/documents/controllers/utils/escape.js";

export function getTaxRate() {
  try { const r = Number(localStorage.getItem("taxRate")); return isNaN(r) || r < 0 ? 15 : r; }
  catch { return 15; }
}

export function calculateInvoiceTotals(invoice) {
  if (!invoice) return { subtotal: 0, tax: 0, total: 0 };
  const taxRate  = getTaxRate();
  const shipping = Number(invoice.shipping) || 0;
  let subtotal = 0;
  (invoice.items || []).forEach(item => {
    const qty = Number(item.quantity ?? item.qty ?? 0);
    const lineTotal = Number(item.total);
    subtotal += isNaN(lineTotal) ? qty * Number(item.price || 0) : lineTotal;
  });
  const tax = subtotal * (taxRate / 100);
  return { subtotal, tax, total: subtotal + tax + shipping };
}