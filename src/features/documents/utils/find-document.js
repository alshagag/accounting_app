import { latestDocuments } from "../state.js";

/* يبحث في آخر قوائم الفواتير عن مستند بمفتاحه وفئته | Finds a document by key and category in the latest invoice lists */
export function findDocument(key, category) {
  return [
    ...(latestDocuments.salesInvoices    || []),
    ...(latestDocuments.purchaseInvoices || [])
  ].find(doc =>
    (doc.key === key || doc.documentNo === key) && doc.category === category
  ) || null;
}