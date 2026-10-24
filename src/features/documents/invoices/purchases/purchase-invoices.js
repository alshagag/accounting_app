import { groupTransactions, toDocument } from "@/features/documents/index.js";

function buildPurchaseDocuments(transactions) {
    const purchaseGroups = groupTransactions(transactions, "شراء");
    return purchaseGroups.map(group => toDocument(group, "invoice", "فاتورة شراء"));
}

export { buildPurchaseDocuments };
