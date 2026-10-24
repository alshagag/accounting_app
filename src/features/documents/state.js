/* الحالة المشتركة بين جميع المكونات | Shared state between all components */

export const latestDocuments = {};
export function setLatestDocuments(docs) {
    for (const prop of Object.keys(latestDocuments)) {
        delete latestDocuments[prop];
    }
    Object.assign(latestDocuments, docs);
        if (typeof window !== 'undefined') {
        window.latestDocuments = docs;
    }
}

export let voucherSortConfig = {
    receipts: { key: 'date', order: 'desc' },
    payments: { key: 'date', order: 'desc' }
};

export let allItemsSortConfig = {
    salesInvoice: { key: 'issueDate', order: 'desc' },
    purchaseInvoice: { key: 'issueDate', order: 'desc' },
    receiptVoucher: { key: 'date', order: 'desc' },
    paymentVoucher: { key: 'date', order: 'desc' },
    salesTransaction: { key: 'date', order: 'desc' },
    purchaseTransaction: { key: 'date', order: 'desc' }
};