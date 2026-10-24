import { escapeHtml } from "../../controllers/utils/escape.js";
import { formatMoney } from "../../controllers/utils/format.js";
import { getDefaultStoreInfo } from "../shared/data/store-info.js";
import { getDocumentMeta } from "../shared/data/document-meta.js";
import { getTaxCodes } from "../../controllers/services/tax-codes.js";
import { buildInvoiceBarcodeSvg } from "../shared/html/barcode.js";
import { findDocument } from "../../utils/find-document.js";
/**
 * Build a standard invoice-style <table> from header, body, and footer rows.
 * @param {{ headers: string[], rows: string[], footerRows: string[] }} opts
 */
function buildTableHtml({ headers = [], rows = [], footerRows = [] }) {
    const footerHtml = footerRows.length ? `<tfoot>${footerRows.join("")}</tfoot>` : "";
    return `<table class="invoice-table">
      <thead><tr>${headers.join("")}</tr></thead>
      <tbody>${rows.join("")}</tbody>
      ${footerHtml}
    </table>`;
}

export function buildVoucherHtml(voucher) {
    const storeInfo = getDefaultStoreInfo();
    const isReceipt = voucher.voucherType === "قبض";
    const accentColor = isReceipt ? "var(--accent, #198754)" : "#dc3545";
    const defaultTitle = isReceipt ? "سند قبض" : "سند صرف";
    /* ── partyLabel: يُشتق من partyType المحفوظ أو يتراجع إلى voucherType | partyLabel: derive from saved partyType, fall back to voucherType ── */
    const partyTypeLabels = { customers: "العملاء", suppliers: "الموردون", manual: "طرف يدوي" };
    const partyLabel = partyTypeLabels[voucher.partyType] || (isReceipt ? "العملاء" : "الموردون");
    const lines = voucher.lines || [];
    const hasAnyTax = lines.some(l => l.taxCodeId);
    const toggles = voucher.toggleStates || {};

    const showLineNo = !!toggles.lineNo;
    const showStatement = !!toggles.statement;
    const showQuantity = !!toggles.quantity;
    const showDiscount = !!toggles.discount;
    const showTaxAmount = !!toggles.taxAmount;
    const showTaxRate = showTaxAmount && hasAnyTax;
    const isTaxExclusive = !!toggles.taxInclusive;
    const voucherTitle = (toggles.customTitle && voucher.customTitle) ? voucher.customTitle : defaultTitle;

    const refNo = voucher.referenceNo || "";
    const refSvg = buildInvoiceBarcodeSvg(refNo);

    let partyAddr = "";
    let partyPhone = "";
    if (voucher.party) {
        try {
            const parties = JSON.parse(localStorage.getItem("accountingParties") || "[]");
            const match = parties.find(p => p.name === voucher.party);
            if (match) {
                partyAddr = match.address || "";
                partyPhone = match.phone || "";
            }
        } catch { }
    }

    function formatAccountDisplay(line) {
        if (line.accountName) return line.accountName;

        // بنود المنتج تُظهر المنتج نفسه (عبر عمود «البند») ولا ترث جهة السند مثل «الموردون — العامر» | Product lines must show the product itself (via the "البند" column), never inherit the voucher's party like "الموردون — العامر"
        if (line.productId) {
            const fallbackAccount = voucher.voucherType === "قبض" ? "المخزون - مبيعات" : "المخزون الحالي";
            return line.accountName || line.statement || fallbackAccount;
        }

        const isReceipt = voucher.voucherType === "قبض";
        let type = line.accountType;
        let partyName = line.partyName || line.partyId;

        // الأسطر دون جهة محددة ترث جهة السند الأصلي، ويُستنتج نوع الحساب إذا كان مفقوداً أو «يدوي» | Lines without a specific party inherit the main voucher's party; the account type is inferred when missing or 'manual'
        if (!partyName && voucher.party) {
            partyName = voucher.party;
        }
        if (!type || type === 'manual') {
            type = isReceipt ? 'customers' : 'suppliers';
        }

        if ((type === "customers" || type === "suppliers") && partyName) {
            const typeName = type === "customers" ? "العملاء" : "الموردون";
            const parts = [typeName, partyName].filter(Boolean);

            // invoiceKey مفتاح بحث داخلي لا قيمة عرض؛ تُحل الفاتورة المرتبطة ويُعرض رقمها الفعلي وتاريخها فقط | invoiceKey is an internal lookup key, never a display value; resolve the linked invoice and show only its real number and issue date
            const invoiceRef = line.invoiceKey || line.invoiceId || "";
            const linkedInvoice = invoiceRef ? findDocument(invoiceRef, "invoice") : null;
            const meta = invoiceRef ? getDocumentMeta(invoiceRef, "invoice") : null;
            const invoiceNo =
                line.invoiceNo || line.referenceNo || line.documentNo ||
                linkedInvoice?.documentNo || meta?.code || meta?.documentNo || "";
            const invoiceDate =
                line.invoiceDate || line.issueDate ||
                linkedInvoice?.issueDate || linkedInvoice?.date ||
                meta?.issueDate || meta?.date || "";

            if (invoiceNo) parts.push(invoiceNo);
            if (invoiceDate) parts.push(invoiceDate);

            return parts.join(" — ");
        }

        // السندات لا تعرض معلومات المنتج بل الحساب أو البيان فقط | Vouchers should not display product info, only account or statement
        return line.statement || "";
    }

    const taxCodes = getTaxCodes();
    const taxSummary = new Map();
    let subtotal = 0;
    let grandTotal = 0;

    const lineRows = lines.map((line, idx) => {
        const tax = taxCodes.find(t => t.id === line.taxCodeId);
        const taxRate = tax ? tax.rate : 0;
        const qty = Number(line.quantity || 1);
        const amt = Number(line.amount || 0);
        const discRaw = Number(line.discount || 0);
        const discVal = line.discountType === "percent" ? (qty * amt) * (discRaw / 100) : discRaw;
        const afterDisc = Math.max(0, qty * amt - discVal);
        let taxVal = 0;
        let total = afterDisc;

        if (showTaxAmount && taxRate > 0) {
            if (isTaxExclusive) { taxVal = afterDisc * (taxRate / 100); total = afterDisc + taxVal; }
            else { taxVal = afterDisc * taxRate / (100 + taxRate); }
        }

        subtotal += total - taxVal;
        grandTotal += total;
        if (tax && taxVal > 0) {
            if (!taxSummary.has(tax.id)) taxSummary.set(tax.id, { name: line.taxCodeName || tax.name, rate: tax.rate, total: 0 });
            taxSummary.get(tax.id).total += taxVal;
        }

        const hasItems = lines.some(l => l.lineName?.trim());
        const discText = discRaw > 0 ? (line.discountType === "percent" ? `${discRaw}%` : discRaw.toFixed(2)) : "-";
        const cells = [
            ...(showLineNo ? [`<td data-label="index">${idx + 1}</td>`] : []),
            ...(hasItems ? [`<td data-label="البند">${escapeHtml(line.lineName || "")}</td>`] : []),
            `<td data-label="الحساب">${escapeHtml(formatAccountDisplay(line))}</td>`,
            ...(showStatement ? [`<td data-label="البيان">${escapeHtml(line.statement || "")}</td>`] : []),
            ...(showQuantity ? [`<td data-label="الكمية">${qty}</td>`] : []),
            ...(isTaxExclusive ? [`<td data-label="المبلغ">${amt.toFixed(2)}</td>`] : []),
            ...(showDiscount ? [`<td data-label="الخصم">${discText}</td>`] : []),
            ...(showTaxRate ? [`<td data-label="الضريبة">${tax ? escapeHtml(tax.name) : "-"}</td>`] : []),
            ...(showTaxAmount ? [`<td style="text-align:right" data-label="مبلغ الضريبة">${taxVal.toFixed(2)}</td>`] : []),
            `<td style="text-align:right" data-label="الإجمالي">${total.toFixed(2)}</td>`
        ];
        return `<tr>${cells.join("")}</tr>`;
    }).join("");

    const hasDisplayableLines = lines.some(l => l.lineName?.trim() || (l.accountType && l.accountType !== "manual") || l.statement?.trim() || Number(l.amount || 0) !== 0);
    const hasItems = lines.some(l => l.lineName?.trim());
    const headerCells = [
        ...(showLineNo ? [`<th style="width:40px;">#</th>`] : []),
        ...(hasItems ? [`<th style="text-align:start">البند</th>`] : []),
        `<th style="text-align:start">الحساب</th>`,
        ...(showStatement ? [`<th style="text-align:start">البيان</th>`] : []),
        ...(showQuantity ? [`<th style="text-align:start">الكمية</th>`] : []),
        ...(isTaxExclusive ? [`<th style="text-align:start">المبلغ</th>`] : []),
        ...(showDiscount ? [`<th style="text-align:start">الخصم</th>`] : []),
        ...(showTaxRate ? [`<th style="text-align:start">الضريبة</th>`] : []),
        ...(showTaxAmount ? [`<th style="text-align:right">مبلغ الضريبة</th>`] : []),
        `<th style="text-align:right">الإجمالي</th>`
    ];
    const colspan = headerCells.length - 1;

    const footerRows = [];
    if (isTaxExclusive) {
        footerRows.push(`<tr class="subtotal-row"><th colspan="${colspan}" style="text-align:end;padding-inline-end:1rem;">المجموع الفرعي</th><th style="text-align:right">${formatMoney(subtotal)}</th></tr>`);
        if (showTaxAmount) {
            for (const tax of taxSummary.values())
                footerRows.push(`<tr class="subtotal-row"><th colspan="${colspan}" style="text-align:end;padding-inline-end:1rem;">${escapeHtml(tax.name)}</th><th style="text-align:right">${formatMoney(tax.total)}</th></tr>`);
        }
    }
    footerRows.push(`<tr class="total-row"><th colspan="${colspan}" style="text-align:end;padding-inline-end:1rem;">الإجمالي</th><th style="text-align:right">${formatMoney(grandTotal)}</th></tr>`);
    if (!isTaxExclusive && taxSummary.size > 0)
        for (const tax of taxSummary.values())
            footerRows.push(`<tr class="subtotal-row"><th colspan="${colspan}" style="text-align:end;padding-inline-end:1rem;">يشمل ${escapeHtml(tax.name)}</th><th style="text-align:right">${formatMoney(tax.total)}</th></tr>`);

    return `
    <div class="invoice-preview" style="border-color:${accentColor};">
      <div class="invoice-preview-header" style="border-bottom-color:${accentColor};">
        <div class="d-flex align-items-center gap-3">
          ${storeInfo.logoUrl ? `<img src="${escapeHtml(storeInfo.logoUrl)}" alt="شعار" class="invoice-logo">` : ""}
          <div>
            <h4 class="invoice-business-name"><span class="receipt-tri-ar">اسم المتجر</span><span class="receipt-tri-val">${escapeHtml(storeInfo.storeName)}</span><span class="receipt-tri-en">Store Name</span></h4>
            <div class="invoice-business-details"><span class="receipt-tri-ar">العنوان</span><span class="receipt-tri-val">${escapeHtml(storeInfo.storeAddress)}</span><span class="receipt-tri-en">Address</span></div>
            ${storeInfo.storePhone ? `<div class="invoice-business-details"><span class="receipt-tri-ar"><i class="bi bi-telephone"></i> رقم الجوال</span><span class="receipt-tri-val">${escapeHtml(storeInfo.storePhone)}</span><span class="receipt-tri-en">Phone</span></div>` : ""}
            ${storeInfo.taxNumber ? `<div class="invoice-business-details"><span class="receipt-tri-ar">الرقم الضريبي</span><span class="receipt-tri-val">${escapeHtml(storeInfo.taxNumber)}</span><span class="receipt-tri-en">VAT No.</span></div>` : ""}
          </div>
        </div>
        <div class="text-center">
          <div style="font-size:1.1rem;font-weight:700;color:${accentColor};margin-bottom:6px;">${escapeHtml(voucherTitle)}</div>
          <div class="invoice-barcode-wrap" style="border-color:${accentColor};">
            <div class="invoice-number" style="color:${accentColor};">${escapeHtml(refNo)}</div>
            ${refSvg}
          </div>
        </div>
      </div>

      <div class="invoice-info-grid">
        <div class="info-tile invoice-info-grid-main">
          <div class="info-tile-label">${partyLabel}</div>
          <div class="info-tile-value">${escapeHtml(voucher.party || "")}</div>
          ${partyAddr ? `<div class="info-tile-label">${escapeHtml(partyAddr)}</div>` : ""}
          ${partyPhone ? `<div class="info-tile-label"><i class="bi bi-telephone"></i> ${escapeHtml(partyPhone)}</div>` : ""}
        </div>
        <div class="d-flex flex-column gap-3 invoice-info-grid-side">
          <div class="invoice-status invoice-status-paid">
            <div><div class="info-tile-label">حالة السند</div><div class="fw-bold fs-6 mt-1">مدفوعة</div></div>
          </div>
          <div class="info-tile">
            <div class="info-tile-label">التاريخ</div>
            <div class="fw-bold">${escapeHtml(voucher.date || (voucher.createdAt ? new Date(voucher.createdAt).toISOString().slice(0, 10) : ""))}</div>
          </div>
        </div>
      </div>

      ${voucher.invoiceNo ? `<div class="info-tile" style="margin-bottom:16px;"><div class="info-tile-label">فاتورة مرتبطة</div><div class="fw-bold">${escapeHtml(voucher.invoiceNo)}</div></div>` : ""}
      ${toggles.fixedTotal && voucher.fixedTotal > 0 ? `<div class="info-tile" style="margin-bottom:16px;background-color:#fff3cd;"><div class="info-tile-label">مبلغ ثابت</div><div class="fw-bold">${formatMoney(voucher.fixedTotal)}</div></div>` : ""}

      ${hasDisplayableLines ? buildTableHtml({ headers: headerCells, rows: [lineRows], footerRows }) : ""}

      ${voucher.description ? `<div class="invoice-notes">${escapeHtml(voucher.description)}</div>` : ""}
      ${(toggles.footer && voucher.footer) ? `<div class="invoice-footer">${escapeHtml(voucher.footer)}</div>` : ""}
    </div>`;
}
