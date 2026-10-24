import { groupTransactions, toDocument } from "@/features/documents/index.js";

function buildSalesDocuments(transactions) {
    const saleGroups = groupTransactions(transactions, "بيع");
    return saleGroups.map(group => toDocument(group, "invoice", "فاتورة بيع"));
}

export { buildSalesDocuments };
