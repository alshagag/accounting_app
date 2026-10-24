import { escapeHtml } from "../../controllers/utils/escape.js";
import { formatMoney } from "../../controllers/utils/format.js";
import { getDefaultStoreInfo } from "../shared/data/store-info.js";
import { getInvoicePaymentStatusInfo, getInvoicePaymentSummary } from "../shared/data/payment.js";
import { getVouchersForInvoice } from "../vouchers/voucher-storage.js";
import { getTaxCodes } from "@/features/documents/controllers/services/tax-codes.js";
import { getTransactionTotal } from "@/features/documents/controllers/services/transactions.js";
import { buildInvoiceBarcodeSvg } from "@/features/documents/invoices/shared/html/barcode.js";

export function buildDocumentHtml(documentData, options = {}) {
    const { isPrinting = false, showFooter: showFooterOpt = true, layout = "standard" } = options;
    const receiptLayout = layout === "receipt";
    const storeInfo = getDefaultStoreInfo();

    const logo = documentData.logoUrl || storeInfo.logoUrl;
    const businessName = documentData.storeName || storeInfo.storeName;
    const businessAddr = documentData.storeAddress || storeInfo.storeAddress;
    const businessPhone = documentData.storePhone || storeInfo.storePhone;
    const businessTax = documentData.taxNumber || storeInfo.taxNumber;
    const businessCr = documentData.commercialRegistration || documentData.cr || storeInfo.commercialReg || "";
    const businessBranch = documentData.branch || storeInfo.branch || "";

    let partyName = documentData.party || "";
    let partyPhone = documentData.phone || "";
    let partyAddr = documentData.partyAddress || "";

    if (!partyName && documentData.items?.length) {
        const first = documentData.items[0];
        partyName = first.customerName || first.supplier || "";
        partyPhone = first.customerPhone || "";
    }

    if (!partyName || !partyAddr) {
        try {
            const parties = JSON.parse(localStorage.getItem("accountingParties") || "[]");
            const match = parties.find(p => p.name === partyName);
            if (match) {
                partyName = partyName || match.name;
                partyAddr = partyAddr || match.address || "";
                partyPhone = partyPhone || match.phone || "";
            }
        } catch { }
    }

    const isBi = documentData.bilingual;
    const tl = (ar, en) => isBi ? `${ar}<span class="tl-sep"> / </span><span class="bilingual-en">${en}</span>` : ar;
    const isPurchaseType = documentData.type === "شراء" || documentData.type === "استلام بضائع";
    const isSalesType = documentData.type === "بيع" || documentData.type === "استلام بضائع";

    const partyLabel = tl(isPurchaseType ? "المورد" : "العميل", isPurchaseType ? "Supplier" : "Customer");

    const docTypeLabel = documentData.customTitle || documentData.title ||
        (isPurchaseType ? "فاتورة شراء" : "فاتورة بيع");
    const docTypeEnLabel = documentData.customTitleEn ||
        (isPurchaseType ? "Purchase Invoice" : "Sales Invoice");

    const toggles = documentData.toggleStates || {};
    const showDiscount = !!(toggles.toggleShowDiscount || toggles.purchaseToggleShowDiscount || toggles.saleToggleShowDiscount);
    const showTaxAmount = !!(toggles.toggleShowTaxAmount || toggles.purchaseToggleShowTaxAmount || toggles.saleToggleShowTaxAmount);
    const savedDescState = documentData.toggleStates?.["toggleShowDesc"] ?? documentData.toggleStates?.["purchaseToggleShowDesc"] ?? documentData.toggleStates?.["saleToggleShowDesc"];
    const showDesc = savedDescState !== undefined ? Boolean(savedDescState) : true;
    const isTaxExclusive = !(documentData.toggleStates?.taxInclusive ?? documentData.toggleStates?.toggleTaxInclusive);

    let calculatedSubtotal = 0;
    let calculatedTotalTax = 0;
    const taxCodes = getTaxCodes();
    /* كل ضريبة تُحسب مستقلّة وتُجمع في سطر ملخص خاص بها | Each tax is computed independently and accumulated in its own summary line */
    const taxSummary = new Map();

    const rows = documentData.items.map((item, idx) => {
        const tax = taxCodes.find(t => t.id === item.taxCodeId);
        const taxRate = tax ? tax.rate : 0;
        const quantity = Number(item.quantity ?? item.qty ?? 0);
        const price = Number(item.price || 0);
        const lineSub = quantity * price;
        const discRaw = Number(item.discount) || 0;
        const discType = item.discountType || "fixed";
        const discVal = discType === "percent" ? lineSub * (discRaw / 100) : discRaw;
        const afterDisc = Math.max(0, lineSub - discVal);
        let taxVal = 0;
        let total = afterDisc;

        if (taxRate > 0) {
            if (isTaxExclusive) {
                taxVal = afterDisc * (taxRate / 100);
                total = afterDisc + taxVal;
            } else { // الضريبة داخلة في السعر | Tax is inclusive in the price
                taxVal = afterDisc * taxRate / (100 + taxRate);
            }
        }
        const discText = discRaw > 0 ? (discType === "percent" ? `${discRaw}%` : discRaw.toFixed(2)) : "-";

        calculatedSubtotal += total - taxVal;
        calculatedTotalTax += taxVal;

        if (tax && taxVal > 0) {
            if (!taxSummary.has(tax.id)) taxSummary.set(tax.id, { name: tax.name, rate: tax.rate, total: 0 });
            taxSummary.get(tax.id).total += taxVal;
        }

        return `
      <tr>
        <td data-label="index">${idx + 1}</td>
        <td class="text-start-override" data-label="البند">${escapeHtml(item.product)}${item.productEn ? `<span class="bilingual-item-en">${escapeHtml(item.productEn)}</span>` : ""}</td>
        <td data-label="الكمية">${quantity}</td>
        <td data-label="سعر الوحدة">${price.toFixed(2)}</td>
        ${showDiscount ? `<td data-label="الخصم">${discText}</td>` : ""}
        <td data-label="القيمة">${(total - taxVal).toFixed(2)}</td>
        <td class="text-start-override" data-label="الضريبة">${tax ? escapeHtml(tax.name) : ""}</td>
        ${showTaxAmount ? `<td data-label="مبلغ الضريبة">${taxVal.toFixed(2)}</td>` : ""}
        <td data-label="الإجمالي">${total.toFixed(2)}</td>
      </tr>`;
    }).join("");

    const calculatedTotal = calculatedSubtotal + calculatedTotalTax;

    const linkedVouchers = (isSalesType || isPurchaseType) ? getVouchersForInvoice(documentData.key, documentData.category) : [];
    /* الرصيد الحقيقي من المنطق المركزي — قد يكون سالبًا (فائض) | Real balance from the central logic — may be negative (surplus) */
    const summary = getInvoicePaymentSummary(
        { key: documentData.key, category: documentData.category, total: calculatedTotal },
        linkedVouchers
    );
    const dynamicPaid = summary.paidAmount;
    const dynamicRemaining = summary.remainingBalance;
    const surplus = summary.surplus;
    const effectiveStatus = getInvoicePaymentStatusInfo(summary.status);
    const statusKey = effectiveStatus.label === "مدفوعة جزئيًا" ? "partial"
        : effectiveStatus.label === "غير مدفوعة" ? "unpaid"
        : "paid";

    /* حالة الدفع وطريقة الدفع مشتقتان من السندات المرتبطة — لا بيانات مركّبة | Payment status/method are derived from linked vouchers — no duplicated data */
    const statusEnMap = { "مدفوعة": "Paid", "مدفوعة جزئيًا": "Partially Paid", "غير مدفوعة": "Unpaid", "دفعة زائدة": "Overpaid" };
    const methodEnMap = { "نقدي": "Cash", "بنك": "Bank" };
    const paidVouchers = (linkedVouchers || []).filter(v => Number(v.amount || 0) > 0);
    const payMethods = [...new Set(
        paidVouchers.map(v => v.account || (v.accountType === "cash" ? "نقدي" : (v.accountType === "bank" ? "بنك" : ""))).filter(Boolean)
    )];
    const paymentMethodText = payMethods.length
        ? payMethods.map(m => tl(m, methodEnMap[m] || m)).join("، ")
        : tl("بلا بعد", "Not yet");
    const statusText = tl(effectiveStatus.label, statusEnMap[effectiveStatus.label] || "Unknown");
    const paymentStatusColor = statusKey === "partial" ? "warning" : statusKey === "unpaid" ? "danger" : "success";
    const paymentSummaryHtml = `
      <div class="invoice-payment-summary">
        <div class="invoice-payment-summary-item">
          <span class="info-tile-label">${tl("حالة الدفع", "Payment Status")}</span>
          <span class="invoice-payment-status text-${paymentStatusColor} fw-bold">${statusText}</span>
          <span class="receipt-tri-en">Payment Status</span>
        </div>
        <div class="invoice-payment-summary-item">
          <span class="info-tile-label">${tl("طريقة الدفع", "Payment Method")}</span>
          <span class="invoice-payment-method fw-bold">${paymentMethodText}</span>
          <span class="receipt-tri-en">Payment Method</span>
        </div>
      </div>`;

    /* حالة الفاتورة في العمود الجانبي على Desktop؛ تُخفى على الجوال/الإيصال وتُعرض ضمن كتلة الدفع أسفل المبالغ | Invoice status shown in the Desktop side column; hidden on mobile/receipt and shown inside the payment block below the amounts */
    const invoiceStatusHtml = `
      <div class="invoice-status invoice-status-${statusKey}">
        <div>
          <div class="info-tile-label">${tl("حالة الفاتورة", "Invoice Status")}</div>
          <div class="fw-bold fs-6 mt-1">${statusText}</div>
        </div>
      </div>`;

    const paymentHistoryRows = linkedVouchers
        .filter(v => Number(v.amount || 0) > 0)
        .sort((a, b) => (a.date || "").localeCompare(b.date || ""))
        .map(v => `
      <tr>
        <td data-label="النوع">${escapeHtml(v.voucherType === "قبض" ? "سند قبض" : "سند صرف")}</td>
        <td data-label="التاريخ">${escapeHtml(v.date || "")}</td>
        <td data-label="المرجع">${escapeHtml(v.referenceNo || "")}</td>
        <td class="text-danger fw-bold" data-label="المبلغ">-${Number(v.amount || 0).toFixed(2)}</td>
      </tr>`).join("");

    const closedBadge = documentData.closed ? '<span class="invoice-closed-badge">مغلقة</span>' : "";
    const showPayments = (!isPrinting || !documentData.hidePaymentsOnPrint) && paymentHistoryRows;
    const footer = documentData.footer || "";
    const invoiceNumberValue = documentData.documentNo || documentData.defaultCode || "00000000";
    const barcodeSvg = buildInvoiceBarcodeSvg(invoiceNumberValue);

    const headerCells = [
        `<th data-label="index" style="width: 30px;">#</th>`,
        `<th data-label="البند" style="width: 200px;">${tl("البند","Item")}</th>`,
        `<th data-label="الكمية" style="width: 70px;">${tl("الكمية","Qty")}</th>`,
        `<th data-label="سعر الوحدة" style="width: 100px;">${tl("سعر الوحدة","Price")}</th>`,
        ...(showDiscount ? [`<th data-label="الخصم" style="width: 70px;">${tl("الخصم", "Discount")}</th>`] : []),
        `<th data-label="القيمة" style="width: 120px;">${tl("القيمة","Subtotal")}</th>`,
        `<th data-label="الضريبة" style="width: 90px;">${tl("الضريبة","Tax Code")}</th>`,
        ...(showTaxAmount ? [`<th data-label="مبلغ الضريبة" style="width: 70px;">${tl("مبلغ الضريبة", "Tax Value")}</th>`] : []),
        `<th data-label="الإجمالي" style="width: 130px;">${tl("الإجمالي", "Total")}</th>`
    ];
    const colCount = headerCells.length;

    /* سطر منفصل لكل ضريبة: عربي + نسبة، وإنجليزي في الوضع ثنائي اللغة، ثم المبلغ | Separate row per tax: Arabic + rate, English in bilingual mode, then the amount
       (سجل الضرائب لا يحمل اسمًا إنجليزيًا منفصلًا — يُعرض إنجليزي عام "Tax %") | (The tax ledger has no separate English name — generic "Tax %" is shown) */
    const taxRowLabelHtml = (name, rate) => {
        const ar = escapeHtml(name);
        return isBi ? `${ar}<span class="tl-sep"> / </span><span class="bilingual-en">Tax ${rate}%</span>` : ar;
    };
    const taxRowsHtml = [...taxSummary.values()].map(t => `
            <tr class="tax-row">
              <th colspan="${colCount - 1}">${taxRowLabelHtml(t.name, t.rate)}</th>
              <th>${formatMoney(t.total)}</th>
            </tr>`).join("");
    /* عند وجود أكثر من ضريبة: صف صريح بإجمالي الضريبة = مجموع مبالغ جميع الضرائب | When more than one tax exists: an explicit Total Tax row = sum of all tax amounts */
    const aggregateTaxRow = taxSummary.size > 1 ? `
            <tr class="tax-row">
              <th colspan="${colCount - 1}">${tl("إجمالي الضريبة", "Total Tax")}</th>
              <th>${formatMoney(calculatedTotalTax)}</th>
            </tr>` : "";

    return `
    <div class="invoice-preview"${receiptLayout ? ' data-layout="receipt"' : ""}>
      <div class="invoice-preview-header">
        ${receiptLayout ? "" : `<div class="text-center invoice-barcode-top">
          <div class="invoice-barcode-wrap">
            <div class="invoice-number">${escapeHtml(invoiceNumberValue)}</div>
            ${barcodeSvg}
          </div>
        </div>`}
        <div class="invoice-doc-title">${tl("فاتورة ضريبية مبسطة", "Simplified Tax Invoice")}</div>
        <div class="d-flex align-items-center gap-3">
          ${logo ? `<img src="${escapeHtml(logo)}" alt="شعار" class="invoice-logo">` : ""}
          <div>
            <h4 class="invoice-business-name"><span class="receipt-tri-ar">اسم المتجر</span><span class="receipt-tri-val">${escapeHtml(businessName)}</span><span class="receipt-tri-en">Store Name</span></h4>
            <div class="invoice-business-details"><span class="receipt-tri-ar">العنوان</span><span class="receipt-tri-val">${escapeHtml(businessAddr)}</span><span class="receipt-tri-en">Address</span></div>
            ${businessCr ? `<div class="invoice-business-details"><span class="receipt-tri-ar">السجل التجاري</span><span class="receipt-tri-val">${escapeHtml(businessCr)}</span><span class="receipt-tri-en">CR</span></div>` : ""}
            ${businessTax ? `<div class="invoice-business-details"><span class="receipt-tri-ar">الرقم الضريبي</span><span class="receipt-tri-val">${escapeHtml(businessTax)}</span><span class="receipt-tri-en">VAT No.</span></div>` : ""}
            ${businessBranch ? `<div class="invoice-business-details"><span class="receipt-tri-ar">الفرع</span><span class="receipt-tri-val">${escapeHtml(businessBranch)}</span><span class="receipt-tri-en">Branch</span></div>` : ""}
            ${businessPhone ? `<div class="invoice-business-details"><span class="receipt-tri-ar"><i class="bi bi-telephone"></i> رقم الجوال</span><span class="receipt-tri-val">${escapeHtml(businessPhone)}</span><span class="receipt-tri-en">Phone</span></div>` : ""}
          </div>
        </div>
        <div class="invoice-meta">
          <span class="invoice-meta-item"><span class="receipt-tri-ar">رقم الفاتورة</span><span class="receipt-tri-val">${escapeHtml(invoiceNumberValue)}</span><span class="receipt-tri-en">Invoice No.</span></span>
          <span class="invoice-meta-item"><span class="receipt-tri-ar">التاريخ</span><span class="receipt-tri-val">${escapeHtml(documentData.issueDate || documentData.date || "")}</span><span class="receipt-tri-en">Date</span></span>
        </div>
        <div class="text-center">
          ${closedBadge}
          ${receiptLayout ? `<div class="invoice-barcode-wrap">
            <div class="invoice-number">${escapeHtml(invoiceNumberValue)}</div>
            ${barcodeSvg}
          </div>` : ""}
        </div>
      </div>

      <div class="invoice-info-grid">
        <div class="info-tile invoice-info-grid-main">
          <div class="info-tile-label">${partyLabel}</div>
          <div class="info-tile-value">${escapeHtml(partyName)}</div>
          <span class="receipt-tri-en">${isPurchaseType ? "Supplier" : "Customer"}</span>
          ${partyAddr ? `<div class="info-tile-label">${escapeHtml(partyAddr)}</div>` : ""}
          ${partyPhone ? `<div class="info-tile-label"><i class="bi bi-telephone"></i> ${escapeHtml(partyPhone)}</div>` : ""}
        </div>
        <div class="d-flex flex-column gap-3 invoice-info-grid-side">
          ${invoiceStatusHtml}
          <div class="info-tile">
            <div class="info-tile-label">${tl("تاريخ الإصدار", "Issue Date")}</div>
            <div class="fw-bold">${escapeHtml(documentData.issueDate || documentData.date || "")}</div>
          </div>
        </div>
      </div>

      <div class="invoice-info-grid" style="margin:-4px 0 16px;">
        <div class="info-tile invoice-info-grid-main">
          <div class="info-tile-label">${tl("عنوان التسليم", "Shipping Address")}</div>
          <div class="fw-bold">${escapeHtml(documentData.shippingAddress || "")}</div>
        </div>
        <div class="info-tile invoice-info-grid-side invoice-info-grid-side-narrow">
          <div class="info-tile-label">${tl("تاريخ الاستحقاق", "Due Date")}</div>
          <div class="fw-bold">${escapeHtml(documentData.dueDate || "")}</div>
        </div>
      </div>

      <table class="invoice-table">
        <thead><tr>${headerCells.join("")}</tr></thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr class="subtotal-row">
            <th colspan="${colCount - 1}">${tl("المجموع قبل الضريبة", "Subtotal")}</th>
            <th>${formatMoney(calculatedSubtotal)}</th>
          </tr>
          ${taxRowsHtml}
          ${aggregateTaxRow}
          <tr class="total-row">
            <th colspan="${colCount - 1}">${tl("الإجمالي النهائي", "Total")}</th>
            <th>${formatMoney(calculatedTotal)}</th>
          </tr>
        </tfoot>
      </table>

      ${paymentSummaryHtml}

      ${showPayments ? `
      <div class="invoice-payment-history" style="margin-top:20px;border-top:2px dashed var(--accent,#198754);padding-top:16px;">
        <div class="fw-bold mb-2" style="font-size:1rem;color:var(--accent,#198754);"><i class="bi bi-cash-stack me-1"></i> سجل المدفوعات</div>
        <table class="invoice-table" style="margin-bottom:12px;">
          <thead><tr><th>النوع</th><th>التاريخ</th><th>المرجع</th><th>المبلغ</th></tr></thead>
          <tbody>${paymentHistoryRows}</tbody>
        </table>
        <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;">
          <div><span style="color:var(--muted,#6c757d);font-size:.85rem;">الإجمالي</span> <span class="fw-bold ms-2">${formatMoney(calculatedTotal)}</span></div>
          <div><span style="color:var(--muted,#6c757d);font-size:.85rem;">المدفوع</span> <span class="fw-bold ms-2 text-success">${formatMoney(dynamicPaid)}</span></div>
          <div><span style="color:var(--muted,#6c757d);font-size:.85rem;">الرصيد المستحق</span> <span class="fw-bold ms-2 ${dynamicRemaining > 0 ? "text-danger" : "text-success"}" style="font-size:1.1rem;">${formatMoney(dynamicRemaining)}</span></div>
          ${surplus > 0 ? `<div><span style="color:var(--muted,#6c757d);font-size:.85rem;">الفائض</span> <span class="fw-bold ms-2 text-success" style="font-size:1.1rem;">${formatMoney(surplus)}</span></div>` : ""}
        </div>
      </div>` : ""}

      ${documentData.notes ? `<div class="invoice-notes">${escapeHtml(documentData.notes)}</div>` : ""}
      ${showFooterOpt && footer ? `<div class="invoice-footer">${escapeHtml(footer)}</div>` : ""}
    </div>`;
}