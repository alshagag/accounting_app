import { getAllTransactions } from "@/data/db/db.js";
import { getInvoiceRowHtml }  from "@/features/documents/invoices/table/rows.js";
import { buildSalesDocuments }    from "@/features/documents/invoices/sales/sales-invoices.js";
import { buildPurchaseDocuments } from "@/features/documents/invoices/purchases/purchase-invoices.js";
import { setLatestDocuments } from "../state.js";
import { renderLimitedRows } from "./table-renderer.js";
import { renderVouchers }     from "./voucher-panel.js";

function renderTabBadge(targetSelector, count) {
    const btn = document.querySelector(`[data-bs-target="${targetSelector}"]`);
    if (!btn) return;
    let badge = btn.querySelector('.ops-count-badge');
    if (!badge) { badge = document.createElement('span'); badge.className = 'badge bg-secondary rounded-pill ops-count-badge ms-1'; btn.appendChild(badge); }
    badge.textContent = count;
}

/* يبني قوائم فواتير البيع والشراء ويعرضها، مع حفظ النتيجة في الحالة المشتركة لاستخدامها في "عرض الكل" | Builds sales/purchase invoice lists into the dashboard and stores the result in shared state for the "Show All" modal */
export async function renderDocuments(transactions) {
  if (!transactions) transactions = await getAllTransactions();

  const salesInvoices    = buildSalesDocuments(transactions);
  const purchaseInvoices = buildPurchaseDocuments(transactions);

  setLatestDocuments({ salesInvoices, purchaseInvoices });

  renderLimitedRows('salesInvoicesTbody',    salesInvoices,    getInvoiceRowHtml, { limit: 5, emptyMessage: 'لا توجد فواتير بيع',   colspan: 8 });
  renderLimitedRows('purchaseInvoicesTbody', purchaseInvoices, getInvoiceRowHtml, { limit: 5, emptyMessage: 'لا توجد فواتير شراء', colspan: 8 });
  renderTabBadge('#salesInvoicesSubTab',    salesInvoices.length);
  renderTabBadge('#purchaseInvoicesSubTab', purchaseInvoices.length);
  renderVouchers();
}