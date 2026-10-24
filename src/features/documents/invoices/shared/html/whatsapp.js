import { formatMoney } from "@/features/documents/controllers/utils/format.js";
import { getTransactionTotal } from "@/features/documents/controllers/services/transactions.js";

export function buildWhatsappText(documentData) {
  const lines = [
    documentData.title,
    `رقم المستند: ${documentData.documentNo}`,
    `التاريخ: ${documentData.date}`,
    `الطرف: ${documentData.party}`,
    "",
    "المنتجات:"
  ];
  documentData.items.forEach(item => {
    const qty   = Number(item.quantity ?? item.qty ?? 0);
    const price = Number(item.price || 0);
    lines.push(`- ${item.product}: ${qty} × ${price.toFixed(2)} = ${getTransactionTotal(item).toFixed(2)}`);
  });
  lines.push("", `الإجمالي: ${formatMoney(documentData.total)}`);
  return lines.join("\n");
}

export function normalizeWhatsappPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00"))               return digits.slice(2);
  if (digits.startsWith("0") && digits.length === 10) return `966${digits.slice(1)}`;
  return digits;
}

export function getWhatsappUrl(documentData) {
  const text  = encodeURIComponent(buildWhatsappText(documentData));
  const phone = normalizeWhatsappPhone(documentData.phone);
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}