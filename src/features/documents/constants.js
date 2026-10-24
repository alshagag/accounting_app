/* ثوابت الترتيب — رقم العمود → مفتاح البيانات | Sort constants — column number → data key */

export const VOUCHER_COLUMN_SORT_KEYS = {
  1: 'date', 2: 'referenceNo', 3: 'account', 4: 'description', 5: 'party', 6: 'amount'
};

export const INVOICE_COLUMN_SORT_KEYS = {
  1: 'issueDate', 2: 'documentNo', 3: 'party', 4: 'title',
  5: 'total', 6: 'remainingBalance', 7: 'status'
};

export const SALES_TRANSACTION_COLUMN_SORT_KEYS = {
  1: 'ref', 2: 'date', 3: 'product', 4: 'quantity', 5: 'price', 6: 'total'
};