import { latestDocuments } from "../state.js";

/* يملأ قائمة الفواتير داخل نموذج السند بناءً على اسم الجهة ونوع السند | Populates the invoice list in the voucher form based on the party name and voucher type */
export async function populateVoucherInvoiceSelect(partyName, selectElement, selectedValue = "", voucherType = "قبض") {
  if (!selectElement) return;

  const currentValue = selectedValue || selectElement.value;

  if (!partyName) {
    selectElement.innerHTML = '<option value="">اختر فاتورة...</option>';
    return;
  }

  const isReceipt   = voucherType === "قبض";
  const allInvoices = isReceipt ? (latestDocuments.salesInvoices || []) : (latestDocuments.purchaseInvoices || []);
  const party       = allInvoices.filter(inv => inv.party.trim().toLowerCase() === partyName.trim().toLowerCase());

  if (!party.length) {
    selectElement.innerHTML = `<option value="" disabled selected>${isReceipt ? "لا توجد فواتير لهذا العميل" : "لا توجد فواتير لهذا المورد"}</option>`;
    return;
  }

  selectElement.innerHTML = '<option value="">اختر فاتورة...</option>';
  const seen            = new Set();
  const accountTypeText = isReceipt ? 'العملاء' : 'الموردين';

  party.forEach(inv => {
    if (!inv.documentNo || seen.has(inv.documentNo)) return;
    seen.add(inv.documentNo);
    const opt       = document.createElement('option');
    opt.value       = inv.key;
    opt.textContent = [accountTypeText, partyName, inv.documentNo, inv.issueDate || inv.date || ""].filter(Boolean).join(' — ');
    selectElement.appendChild(opt);
  });

  if (currentValue && [...selectElement.options].some(o => o.value === currentValue)) {
    selectElement.value = currentValue;
  }
}