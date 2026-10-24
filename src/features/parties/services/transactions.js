import { getAllTransactions }    from "@/data/db/db.js";
import { normalizeTransactionType } from "@/services/lib/helpers.js";
import { getTransactionTotal }  from "@/features/documents/index.js";
import { getSavedParties } from "@/features/parties/storage.js";

/* ================= معاملات الأطراف | Parties Transactions ================= */
// أدوات مبنية لاشتقاق الأطراف من المعاملات | Helpers and builders for parties derived from transactions
function normalizeType(type) {
  return normalizeTransactionType(type) || String(type || "").trim();
}

function readDocumentMeta() {
  try   { return JSON.parse(localStorage.getItem("accountingDocumentMeta") || "{}"); }
  catch { return {}; }
}

export function getMetaForTransaction(transaction) {
  const date  = String(transaction.date || "").slice(0, 10);
  const type  = normalizeType(transaction.type);
  const key   = `${type}-${date}`;
  const meta  = readDocumentMeta();
  return meta[`invoice:${key}`] || meta[`voucher:${key}`] || {};
}

export async function getTransactions() {
  try   { return await getAllTransactions() || []; }
  catch (e) { console.error("getTransactions parties error:", e); return []; }
}

// تحديث/إدراج: تجميع الإجماليات والبيانات الوصفية لكل مفتاح طرف | Upsert helper: aggregate totals and metadata per party key
function upsertParty(map, key, data) {
  if (!key) return;
  const current = map.get(key) || { key, name: data.name || key, phone: data.phone || "", city: data.city || "", type: data.type, total: 0, count: 0, lastDate: "" };
  current.name  = data.name  || current.name;
  current.phone = data.phone || current.phone;
  current.city  = data.city  || current.city;
  current.total += data.total || 0;
  current.count += 1;
  if (data.date && (!current.lastDate || data.date > current.lastDate)) current.lastDate = data.date;
  map.set(key, current);
}

// المُنشئ الرئيسي: إنتاج قوائم العملاء والموردين من المعاملات | Main builder: produce customers and suppliers lists from transactions
export function buildParties(transactions) {
  const customers = new Map();
  const suppliers = new Map();

  // 1. إضافة الأطراف المحفوظة أولاً لضمان تضمينها | 1. Add saved parties first to ensure they are included
  const savedParties = getSavedParties();
  savedParties.forEach(party => {
    const data = { ...party, total: 0, count: 0, lastDate: party.createdAt || "" };
    if (party.type === 'customers') {
      upsertParty(customers, party.name, data);
    } else if (party.type === 'suppliers') {
      upsertParty(suppliers, party.name, data);
    }
  });

  transactions.forEach(tx => {
    const type  = normalizeType(tx.type);
    const date  = String(tx.date || "").slice(0, 10);
    const total = getTransactionTotal(tx);
    const meta  = getMetaForTransaction(tx);

    if (type === "بيع") {
      const phone = meta.partyPhone || tx.customerPhone || "";
      const name  = meta.party || (phone ? `عميل ${phone}` : "عميل بدون رقم");
      upsertParty(customers, name, { type: "customers", name, phone, city: meta.partyCity || meta.partyAddress || "", total, date });
    }

    if (type === "شراء") {
      const name = meta.party || tx.supplier || "مورد غير محدد";
      upsertParty(suppliers, name, { type: "suppliers", name, phone: meta.partyPhone || "", city: meta.partyCity || meta.partyAddress || "", total, date });
    }
  });

  const sort = (a, b) => (b.lastDate || "").localeCompare(a.lastDate || "") || (b.total - a.total);
  return {
    customers: [...customers.values()].sort(sort),
    suppliers: [...suppliers.values()].sort(sort)
  };
}