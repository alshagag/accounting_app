import { getPersistedShowFooter } from "../shared/data/store-info.js";
import { buildDocumentHtml } from "../sales/invoice-html.js";
import { buildVoucherHtml } from "./voucher-html.js";

/* قوالب الطباعة/PDF — مطابقة لـ globals.css؛ Bootstrap RTL + أيقونات عبر CDN في SHARED_LINKS | Print/PDF templates — mirror globals.css; Bootstrap RTL + icons via CDN in SHARED_LINKS */
const INVOICE_CSS = `
/* Root vars — must match globals.css */
:root{--accent:#198754;--muted:#6c757d}

/* ---- Print reset ---- */
@page{size:A4;margin:15mm}
html,body{direction:rtl;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#222;margin:0;padding:0}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}

/* Invoice (globals mirror) */
.invoice-preview{direction:rtl;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#222;max-width:800px;margin:0 auto;border:2px solid var(--accent,#198754);border-radius:12px;padding:30px;background:#fff}
.invoice-preview-header{display:flex;flex-direction:column;align-items:center;text-align:center;border-bottom:3px solid var(--accent,#198754);padding-bottom:20px;margin-bottom:20px}
.invoice-preview-header > .d-flex{flex-direction:column;align-items:center;text-align:center}
.invoice-preview-header .invoice-business-name{margin:8px 0 4px}
.invoice-logo{max-height:100px;width:auto;border-radius:8px}
.invoice-business-name{font-size:1.1rem;font-weight:700;margin:0 0 4px}
.invoice-business-details{font-size:.85rem;color:var(--muted,#6c757d)}
/* بيانات المنشأة: تخطيط ثلاثي ثابت — إنجليزي يسار | القيمة وسط | عربي يمين (A4) */
.invoice-preview-header .invoice-business-name,
.invoice-preview-header .invoice-business-details{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;column-gap:6px;width:100%;direction:rtl}
.invoice-preview-header .invoice-business-name .receipt-tri-ar,
.invoice-preview-header .invoice-business-details .receipt-tri-ar{grid-column:1;text-align:right;font-weight:600;color:var(--muted,#6c757d);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invoice-preview-header .invoice-business-name .receipt-tri-val,
.invoice-preview-header .invoice-business-details .receipt-tri-val{grid-column:2;text-align:center;font-weight:700;min-width:0;overflow-wrap:anywhere;word-break:break-word}
.invoice-preview-header .invoice-business-name .receipt-tri-en,
.invoice-preview-header .invoice-business-details .receipt-tri-en,
.invoice-preview .receipt-tri-en{display:none}
.invoice-preview-header .invoice-business-name .receipt-tri-en,
.invoice-preview-header .invoice-business-details .receipt-tri-en{display:block;grid-column:3;text-align:left;direction:ltr;unicode-bidi:embed;font-size:.75em;font-weight:400;color:var(--muted,#6c757d);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invoice-preview-header .invoice-business-details i{display:none}
.invoice-barcode-top{margin:0 0 4mm;padding-bottom:1.5mm}
.invoice-barcode-wrap{display:inline-block;background:transparent;border:1px dashed var(--accent,#198754);border-radius:10px;padding:10px 14px;text-align:center;min-width:220px}
.invoice-number{font-weight:700;margin-bottom:6px;font-size:.95rem;color:var(--accent,#198754)}
.invoice-info-grid{display:flex;flex-wrap:wrap;gap:12px;margin:16px 0}
.info-tile{background:#f8f9fa;padding:10px;border-radius:8px;border:1px solid #e9ecef}
.info-tile-label{font-size:.85rem;color:var(--muted,#6c757d)}
.info-tile-value{font-weight:700;font-size:1.1rem}
.invoice-payment-summary{display:none}
.invoice-doc-title,.invoice-meta{display:none}
.invoice-status{padding:12px;border-radius:8px;min-height:82px;display:flex;align-items:center;justify-content:center;text-align:center}
.invoice-closed-badge{background:#dc3545;color:#fff;padding:4px 12px;border-radius:6px;font-size:.8rem;margin-right:8px;display:inline-block}
.invoice-info-grid-main{flex:1 1 55%;min-width:200px}
.invoice-info-grid-side{flex:0 0 35%;min-width:150px}
.invoice-info-grid-side-narrow{min-width:180px}
.invoice-table{width:100%;border-collapse:collapse;margin-bottom:16px}
.invoice-table th,.invoice-table td{border:1px solid #dee2e6;padding:8px;text-align:center}
.invoice-table thead th{background:var(--accent,#198754);color:#fff;border-color:#146c43}
.invoice-table tfoot th{font-weight:700}
.invoice-table tfoot .subtotal-row th{background:#f8f9fa;color:#222}
.invoice-table tfoot .total-row th{background:var(--accent,#198754);color:#fff;border-color:#146c43}
.invoice-table tfoot .subtotal-row th:first-child,.invoice-table tfoot .total-row th:first-child{text-align:right;padding-right:20px;font-weight:bold}
.invoice-notes{background:#fff3cd;border:1px solid #ffc107;border-radius:8px;padding:10px;margin-top:15px}
.invoice-footer{background:#e9ecef;border:1px solid #ced4da;border-radius:8px;padding:10px;margin-top:10px;font-size:.9rem}
.bilingual-en{font-size:.85em;opacity:.7;margin-inline-start:4px}
.invoice-barcode-wrap svg{display:block;margin:0 auto}

/* Invoice status variants */
.invoice-status.invoice-status-paid{background-color:#f1fff7;color:#198754;border:1px solid #198754}
.invoice-status.invoice-status-partial{background-color:#fff8e6;color:#fd7e14;border:1px solid #fd7e14}
.invoice-status.invoice-status-unpaid{background-color:#fff5f5;color:#dc3545;border:1px solid #dc3545}

/* Subtotal/Total — standalone selectors (vouchers reuse them) */
.subtotal-row th{background:#f8f9fa;color:#222;font-weight:700}
.total-row th{background:var(--accent,#198754);color:#fff;border-color:#146c43;font-weight:700}

/* Voucher (globals mirror) */
.voucher-print-container{direction:rtl;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#222;max-width:800px;margin:0 auto;border:1px solid #dee2e6;padding:20px;background:#fff}
.voucher-print-header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #333;padding-bottom:15px;margin-bottom:25px}
.voucher-print-header .logo{max-height:80px;width:auto}
.voucher-print-header .business-info{text-align:center}
.voucher-print-header .business-name{font-size:1.5rem;font-weight:700;margin:0}
.voucher-print-header .voucher-title-box{border:1px solid #ccc;padding:5px 15px;border-radius:8px;text-align:center}
.voucher-print-header .voucher-title-box h1{font-size:1.3rem;margin:0 0 5px}
.voucher-print-header .voucher-title-box p{margin:0;font-size:0.9rem}
.voucher-print-body .party-info,.voucher-print-body .amount-info,.voucher-print-body .amount-words-info{font-size:1.1rem;margin-bottom:15px;border:1px solid #eee;padding:10px;border-radius:4px}
.voucher-print-body .party-name,.voucher-print-body .amount-value{font-weight:bold;margin-right:10px}
.voucher-print-table{width:100%;border-collapse:collapse;margin:20px 0;font-size:0.95rem}
.voucher-print-table th,.voucher-print-table td{border:1px solid #ccc;padding:8px;text-align:start}
.voucher-print-table thead th{background-color:#f2f2f2;font-weight:bold}
.voucher-print-table .text-end{text-align:end}
.notes-section{margin-top:20px;font-size:0.9rem}
.notes-section p{padding:10px;border:1px solid #eee;min-height:40px;border-radius:4px}
.voucher-print-footer{display:flex;justify-content:space-around;margin-top:40px;padding-top:20px;border-top:1px solid #ccc;font-size:0.9rem}
.signature-box{text-align:center}
.signature-box p{margin:5px 0 25px}
.voucher-table th,.voucher-table td{white-space:nowrap}
.tax-value-display{color:#6c757d;font-size:0.9em}

/* Voucher status variants */
.voucher-print-container .invoice-status.invoice-status-paid{background-color:#f1fff7;color:#198754;border:1px solid #198754}
.voucher-print-container .invoice-status.invoice-status-partial{background-color:#fff8e6;color:#fd7e14;border:1px solid #fd7e14}
.voucher-print-container .invoice-status.invoice-status-unpaid{background-color:#fff5f5;color:#dc3545;border:1px solid #dc3545}

/* Print media */
@media print{
  .invoice-preview,.voucher-print-container{border:none!important;box-shadow:none!important;margin:0;max-width:100%;padding:0}
}
`;

/* إصدارات CDN — مطابقة لـ layout.js | CDN versions — mirror layout.js */
const SHARED_LINKS = `
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
`;

const HTML2PDF_CDN = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js";
const EXPORT_VIEWPORT_WIDTH = 900;
const PRINTABLE_A4_WIDTH = "180mm";

/* html2canvas يعرض وسائط الشاشة — نطبّق عرض A4 للطباعة صراحةً في PDF أيضًا | html2canvas renders screen media — apply the print A4 width explicitly in PDF too */
const PDF_EXPORT_CSS = `
@media screen {
  #document-export-root {
    width: ${PRINTABLE_A4_WIDTH};
    margin: 0 auto;
    direction: rtl;
  }
  #document-export-root .invoice-preview,
  #document-export-root .voucher-print-container {
    box-sizing: border-box;
    width: 100%;
    max-width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    box-shadow: none;
  }
}
`;

/* شريط الإيصال — مقصور على [data-layout="receipt"]؛ A4/Desktop يبقى كما هو | Receipt strip — scoped to [data-layout="receipt"]; A4/Desktop stays untouched */
/* ═══════════════════════════════════════════════════════════════════════
   إيصال حراري 80mm — نسخة الجوال/الطباعة الحرارية (مستقلة تماماً عن Desktop) | 80mm thermal receipt — mobile/thermal-print variant (fully independent of Desktop)
   أبيض/أسود بلا زخارف: شعار أعلى المنتصف ← اسم المتجر ← «فاتورة ضريبية مبسطة» ← | Plain black/white: centered logo ← store name ← "Simplified tax invoice" ←
   رقم/تاريخ/وقت ← بيانات المتجر ← العميل ← جدول (الصنف|الكمية|السعر|الضريبة|الإجمالي) | number/date/time ← store data ← customer ← table (item|qty|price|tax|total)
   ← الإجماليات ← حالة/طريقة الدفع ← الباركود | ← totals ← payment status/method ← barcode
   مقصورة على [data-layout="receipt"] فلا تمس معاينة Desktop ولا طباعة A4 القياسية | Scoped to [data-layout="receipt"] so it never touches the Desktop preview or standard A4 print
   QR/الباركود يُعرضان عند توفرهما في القالب | QR/barcode render when present in the template
   ═══════════════════════════════════════════════════════════════════════ */
const RECEIPT_CSS = `
@page{size:80mm auto;margin:2mm}
@media screen{
  #document-export-root:has(.invoice-preview[data-layout="receipt"]){width:80mm}
}

.invoice-preview[data-layout="receipt"]{
  display:flex;flex-direction:column;align-items:stretch;gap:2px;
  box-sizing:border-box;width:76mm;max-width:76mm;margin:0 auto;
  padding:2mm 2.5mm 3mm;border:1px solid #000;border-radius:0;
  font-family:Arial,'Segoe UI',Tahoma,sans-serif;font-size:9px;line-height:1.3;
  color:#000;background:#fff;direction:rtl;overflow:hidden;
}
.invoice-preview[data-layout="receipt"] *{box-sizing:border-box;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}

/* ─── الرأس: الشعار ← اسم المتجر (منتصف) ← العنوان (منتصف) ← سجل/ضريبي/فرع/جوال (عربي يمين + إنجليزي يسار) ← الباركود مباشرة تحت الجوال ─── */
.invoice-preview[data-layout="receipt"] .invoice-preview-header,
.invoice-preview[data-layout="receipt"] .invoice-preview-header > .d-flex,
.invoice-preview[data-layout="receipt"] .invoice-preview-header > .d-flex > div{display:contents}
.invoice-preview[data-layout="receipt"] .invoice-logo{order:0;display:block;align-self:center;max-height:13mm;width:auto;margin:0 auto 1mm;border-radius:1mm}
.invoice-preview[data-layout="receipt"] .invoice-business-name{order:1;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;column-gap:1mm;width:100%;margin:0;font-size:12px;font-weight:800;color:#000;direction:rtl}
.invoice-preview[data-layout="receipt"] .invoice-business-name .receipt-tri-ar{grid-column:1;text-align:right;font-weight:400;font-size:7px;color:#555;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .invoice-business-name .receipt-tri-val{grid-column:2;text-align:center;font-size:12px;font-weight:800;color:#000;min-width:0;overflow-wrap:anywhere;word-break:break-word}
.invoice-preview[data-layout="receipt"] .invoice-business-name .receipt-tri-en{grid-column:3;text-align:left;direction:ltr;unicode-bidi:embed;font-size:6.5px;font-weight:400;color:#555;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .invoice-doc-title{order:3;display:block;width:100%;text-align:center;font-size:9.5px;font-weight:700;color:#000;background:transparent;border:none;border-top:1px solid #000;border-bottom:1px solid #000;border-radius:0;padding:1.2mm 0;margin:1mm 0 0}
.invoice-preview[data-layout="receipt"] .invoice-business-details{order:2;display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;column-gap:0.5mm;width:100%;margin:0;padding:0.5px 0;font-size:8px;color:#111;border:none;line-height:1.3;direction:rtl}
.invoice-preview[data-layout="receipt"] .invoice-business-details .receipt-tri-ar{grid-column:1;text-align:right;font-weight:600;color:#333;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .invoice-business-details .receipt-tri-val{grid-column:2;text-align:center;font-weight:700;color:#000;min-width:0;overflow-wrap:anywhere;word-break:break-word}
.invoice-preview[data-layout="receipt"] .invoice-business-details .receipt-tri-en{grid-column:3;text-align:left;direction:ltr;unicode-bidi:embed;font-size:6.5px;font-weight:400;color:#555;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .invoice-business-details i{display:none}
.invoice-preview[data-layout="receipt"] .tl-sep{display:none}

/* ─── بيانات الفاتورة الثلاثية: 3 أعمدة متساوية ثابتة — إنجليزية يسار | قيمة وسط | عربية يمين ─── */
.invoice-preview[data-layout="receipt"] .invoice-meta{order:4;display:flex;flex-direction:column;align-items:center;gap:0.5mm;width:100%;padding:0.8mm 0;border:none;font-size:9px;color:#000}
.invoice-preview[data-layout="receipt"] .invoice-meta .invoice-meta-item{display:grid;grid-template-columns:repeat(3,1fr);align-items:center;column-gap:1mm;width:100%;padding:0.6px 0;direction:rtl}
.invoice-preview[data-layout="receipt"] .receipt-tri-ar{display:block;grid-column:1;text-align:right;font-weight:700;font-size:8.5px;color:#333;min-width:0;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .receipt-tri-val{display:block;grid-column:2;text-align:center;font-weight:800;font-size:10px;color:#000;white-space:nowrap;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .receipt-tri-en{display:block;grid-column:3;text-align:left;direction:ltr;unicode-bidi:embed;font-size:7px;font-weight:400;color:#555;min-width:0;overflow:hidden;text-overflow:ellipsis}

/* ─── اسم المنتج بالإنجليزية تحت الاسم العربي ─── */
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="البند"] .bilingual-item-en{display:block;font-size:7px;font-weight:400;color:#555;margin-top:0.5px;direction:ltr;unicode-bidi:embed}

/* ─── العميل: العميل يمين | اسم العميل وسط | Customer يسار ─── */
.invoice-preview[data-layout="receipt"] .invoice-info-grid{display:contents}
.invoice-preview[data-layout="receipt"] .invoice-info-grid .info-tile{background:#fff!important;border:none!important;border-radius:0;padding:0.8mm 0}
.invoice-preview[data-layout="receipt"] .invoice-info-grid .invoice-info-grid-main{order:5;flex:1 1 100%;display:grid;grid-template-columns:repeat(3,1fr);align-items:center;column-gap:1mm;padding:0.6px 0;direction:rtl}
.invoice-preview[data-layout="receipt"] .invoice-info-grid .invoice-info-grid-main .info-tile-label{grid-column:1;text-align:right;font-size:8.5px;font-weight:700;color:#333;margin:0;min-width:0;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .invoice-info-grid .invoice-info-grid-main .info-tile-value{grid-column:2;text-align:center;font-size:10px;font-weight:800;color:#000;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .invoice-info-grid .invoice-info-grid-main .info-tile-label .bilingual-en{display:none}
.invoice-preview[data-layout="receipt"] .invoice-info-grid .invoice-info-grid-main > .info-tile-label:not(:first-child){grid-column:1/-1;text-align:center;font-size:7px;font-weight:400;color:#555}
.invoice-preview[data-layout="receipt"] .invoice-info-grid .invoice-info-grid-main .info-tile > .info-tile-label:not(:first-child){grid-column:1/-1;text-align:center;font-size:7px;font-weight:400;color:#555}
.invoice-preview[data-layout="receipt"] .invoice-info-grid-side{display:contents}
.invoice-preview[data-layout="receipt"] .invoice-info-grid-side .info-tile,
.invoice-preview[data-layout="receipt"] .invoice-info-grid .invoice-status,
.invoice-preview[data-layout="receipt"] .invoice-info-grid[style]{display:none!important}

/* ─── جدول البنود: البند|الكمية|سعر الوحدة|الضريبة|الإجمالي — Grid بتوزيع ثابت ─── */
.invoice-preview[data-layout="receipt"] .invoice-table{order:10;display:block;width:100%;margin:0.8mm 0 0;border-top:1px solid #000;background:transparent}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) thead{display:block;border-bottom:1px solid #000;padding-bottom:1px}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) thead tr{display:grid;grid-template-columns:minmax(0,38fr) minmax(0,10fr) minmax(0,16fr) minmax(0,15fr) minmax(0,19fr);column-gap:1mm;align-items:stretch}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) thead tr th{display:none!important;min-width:0;width:auto!important;padding:1px 0;border:none;font-size:8px;font-weight:700;line-height:1.3;color:#000!important;background:#eee!important;overflow-wrap:anywhere;word-break:break-word}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) thead tr th[data-label="البند"]{display:block!important;text-align:start;font-weight:800}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) thead tr th[data-label="الكمية"]{display:block!important;text-align:center}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) thead tr th[data-label="سعر الوحدة"]{display:block!important;text-align:end}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) thead tr th[data-label="الضريبة"]{display:block!important;text-align:end}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) thead tr th[data-label="الإجمالي"]{display:block!important;text-align:end}

.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody{display:block}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody tr{display:grid;grid-template-columns:minmax(0,38fr) minmax(0,10fr) minmax(0,16fr) minmax(0,15fr) minmax(0,19fr);column-gap:1mm;align-items:center;padding:1.5px 0;border:none;border-bottom:1px dotted #aaa;background:transparent;min-width:0}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td{display:none!important;min-width:0;width:auto!important;padding:0;border:none;background:transparent!important;font-size:8px;line-height:1.35;color:#000}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td:before{content:none}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="index"],
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="الخصم"],
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="القيمة"],
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="مبلغ الضريبة"]{display:none!important}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="البند"],
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="الكمية"],
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="سعر الوحدة"],
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="الضريبة"],
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="الإجمالي"]{display:block!important}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="البند"]{max-width:none;text-align:start;font-weight:700;overflow-wrap:anywhere;word-break:break-word}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="الكمية"]{text-align:center;white-space:nowrap}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="سعر الوحدة"]{text-align:end;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="الضريبة"]{text-align:end;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .invoice-table:has(tfoot) tbody td[data-label="الإجمالي"]{text-align:end;white-space:nowrap;font-weight:700}

/* ─── الإجماليات: قبل الضريبة ← الضريبة ← الإجمالي الشامل ─── */
.invoice-preview[data-layout="receipt"] .invoice-table tfoot{display:block;margin-top:0.8mm}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot tr{display:flex;justify-content:space-between;align-items:center;gap:2mm;padding:0.8px 0;border:none;background:transparent!important;border-radius:0!important;box-shadow:none!important}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot th{border:none;background:transparent!important;padding:0;font-size:8.5px;font-weight:600;color:#000;text-align:end}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot th:first-child{text-align:start}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot th:last-child{text-align:end;font-weight:700}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .subtotal-row th:first-child,
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .total-row th:first-child{font-size:8.5px;line-height:1.4}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .subtotal-row th:first-child::after,
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .total-row th:first-child::after{content:none}
/* صف الضريبة: تفاف النص الإنجليزي والنسبة */
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .tax-row{border-bottom:none;flex-wrap:wrap;min-height:2.6mm;overflow:visible;padding-top:0.25mm;padding-bottom:0.35mm;column-gap:1mm}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .tax-row th:first-child{flex:1 1 auto;min-width:0;line-height:1.5;white-space:normal;text-align:start;padding:0;overflow:visible}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .tax-row th:last-child{flex:0 0 auto;white-space:nowrap;text-align:end;padding:0}
/* الإجمالي النهائي: مثلثة — Total يسار | القيمة وسط | الإجمالي يمين */
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .total-row{display:grid;grid-template-columns:repeat(3,1fr);align-items:center;direction:rtl;margin-top:0.8mm;padding:1.5px 0;border-top:1px solid #000!important;gap:0}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .total-row th:first-child{display:contents;font-size:10.5px;font-weight:800;color:#000!important}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .total-row th:first-child .tl-sep{display:none}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .total-row th:first-child .bilingual-en{grid-column:3;display:block;text-align:left;direction:ltr;unicode-bidi:embed;font-size:7px;font-weight:400;color:#555;min-width:0;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .total-row th:last-child{grid-column:2;text-align:center;font-size:11px;font-weight:800;color:#000!important}
/* ضمان ثبات القيمة في المنتصف مهما طال النص في أعمدة الإجمالي */
.invoice-preview[data-layout="receipt"] .invoice-table tfoot .total-row th:last-child{min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

/* ─── حالة الدفع/طريقة الدفع: عربي يمين | القيمة وسط | إنجليزي يسار ─── */
.invoice-preview[data-layout="receipt"] .invoice-payment-summary{order:12;width:100%;max-width:100%;min-width:0;margin:0.8mm 0 0;padding:1.2mm 0 0.8mm;border:0!important;border-top:1px dashed #999!important;border-radius:0!important;background:transparent!important;display:flex;flex-direction:column;gap:0.8mm}
.invoice-preview[data-layout="receipt"] .invoice-payment-summary-item{display:grid;grid-template-columns:repeat(3,1fr);align-items:center;column-gap:1mm;min-width:0;padding:0.6px 0;font-size:8.5px;color:#000;direction:rtl}
.invoice-preview[data-layout="receipt"] .invoice-payment-summary-item .info-tile-label{grid-column:1;margin:0;font-size:8.5px;font-weight:700;color:#333;text-align:right}
.invoice-preview[data-layout="receipt"] .invoice-payment-summary-item .info-tile-label .bilingual-en{display:none}
.invoice-preview[data-layout="receipt"] .invoice-payment-status,
.invoice-preview[data-layout="receipt"] .invoice-payment-method{grid-column:2;text-align:center;font-size:10px;font-weight:800;color:#000!important;white-space:nowrap;min-width:0;max-width:100%}
.invoice-preview[data-layout="receipt"] .invoice-payment-status .bilingual-en,
.invoice-preview[data-layout="receipt"] .invoice-payment-method .bilingual-en{display:block;text-align:center;direction:ltr;unicode-bidi:embed;font-size:7px;font-weight:400;color:#555;white-space:nowrap;min-width:0;max-width:100%;overflow:hidden;text-overflow:ellipsis}
.invoice-preview[data-layout="receipt"] .text-success,
.invoice-preview[data-layout="receipt"] .text-warning,
.invoice-preview[data-layout="receipt"] .text-danger{color:#000!important}

/* ─── ملاحظات/تذييل/سجل: مدمجة ومضغوطة ─── */
.invoice-preview[data-layout="receipt"] .invoice-notes,
.invoice-preview[data-layout="receipt"] .invoice-footer{order:22;width:100%;margin-top:0.8mm;padding:1mm!important;border:none!important;border-radius:0!important;background:transparent!important;font-size:7.5px;color:#111}
.invoice-preview[data-layout="receipt"] .invoice-payment-history{order:21;width:100%;margin-top:1mm;padding-top:0.8mm;border-top:1px dashed #999;font-size:8px}
.invoice-preview[data-layout="receipt"] .invoice-payment-history > div[style*="display:flex"]{padding:0!important;gap:2mm!important;background:transparent!important;border:none!important;border-radius:0!important}

/* ─── الباركود/رقم الفاتورة: مباشرة تحت رقم الجوال ─── */
.invoice-preview[data-layout="receipt"] .invoice-preview-header > .text-center{order:2;width:100%;display:flex;flex-direction:column;align-items:center;padding-top:0.6mm;margin:0;text-align:center}
.invoice-preview[data-layout="receipt"] .invoice-closed-badge{display:block;background:#000;color:#fff;border-radius:999px;padding:1px 4px;font-size:7.5px;font-weight:700;margin:0 0 1mm;border:none}
.invoice-preview[data-layout="receipt"] .invoice-barcode-wrap{width:100%;min-width:0;padding:0;border:none;background:transparent}
.invoice-preview[data-layout="receipt"] .invoice-barcode-wrap svg{display:block;max-width:64mm;width:auto;height:auto;margin:0 auto}
.invoice-preview[data-layout="receipt"] .invoice-barcode-wrap .invoice-number{margin:0;padding:0;font-size:8.5px;color:#000}

/* ثنائية اللغة من نظام الترجمة بلا تكرار/تداخل — الإنجليزية سطر تحت العربية */
.invoice-preview[data-layout="receipt"] .bilingual-en{display:block;font-size:7px;font-weight:400;color:#333;line-height:1.2;direction:ltr;unicode-bidi:embed}
.invoice-preview[data-layout="receipt"] .invoice-meta .bilingual-en,
.invoice-preview[data-layout="receipt"] .invoice-payment-summary-item .info-tile-label .bilingual-en{display:none}
/* بيانات المنشأة في الإيصال تبقى كما كانت بلا الإنجليزية | Company data on the receipt stays as before without the English */
.invoice-preview[data-layout="receipt"] .invoice-preview-header .invoice-business-name .receipt-tri-en,
.invoice-preview[data-layout="receipt"] .invoice-preview-header .invoice-business-details .receipt-tri-en{display:none}

@media print{
  .invoice-preview[data-layout="receipt"]{border:none!important;box-shadow:none!important;margin:0;padding:0}
}
`;

function ensureHtml2Pdf(targetWindow) {
    if (!targetWindow) targetWindow = window;
    if (targetWindow.html2pdf) return Promise.resolve();
    const targetDocument = targetWindow.document;

    return new Promise((resolve, reject) => {
        if (targetDocument.querySelector(`script[src="${HTML2PDF_CDN}"]`)) {
            const check = setInterval(() => {
                if (targetWindow.html2pdf) { clearInterval(check); resolve(); }
            }, 100);
            setTimeout(() => { clearInterval(check); reject(new Error("html2pdf load timeout")); }, 10000);
            return;
        }
        const script = targetDocument.createElement("script");
        script.src = HTML2PDF_CDN;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load html2pdf"));
        targetDocument.head.appendChild(script);
    });
}

/* انتظار تحميل الموارد | Wait helpers */
function waitForStyles(doc, timeoutMs = 10000) {
    return new Promise((resolve) => {
        let done = false;
        const finish = () => { if (!done) { done = true; resolve(); } };
        try {
            const links = Array.from(doc.querySelectorAll("link[rel=stylesheet]"));
            let pending = links.length;
            if (pending === 0) { setTimeout(finish, 200); return; }
            links.forEach((link) => {
                if (link.sheet) { if (--pending <= 0) finish(); return; }
                link.addEventListener("load", () => { if (--pending <= 0) finish(); });
                link.addEventListener("error", () => { if (--pending <= 0) finish(); });
            });
        } catch { /* حماية | guard */ }
        setTimeout(finish, timeoutMs);
    });
}

function waitForFonts(win, timeoutMs = 8000) {
    return new Promise((resolve) => {
        try {
            if (win?.document?.fonts?.ready) {
                win.document.fonts.ready.then(() => resolve());
                return;
            }
        } catch { /* حماية | guard */ }
        setTimeout(resolve, timeoutMs);
    });
}

/* الطباعة القياسية من الجوال → بطاقة/إيصال مطابق لمعاينة الجوال؛ Desktop تبقى A4 | Standard printing from mobile → a card/receipt matching the mobile preview; Desktop stays A4 */
function isMobileCardViewport() {
    return typeof window !== "undefined"
        && !!window.matchMedia
        && window.matchMedia("(max-width: 767px)").matches;
}

function shouldRenderCard(size) {
    return size !== "receipt" && isMobileCardViewport();
}

/* تجهيز محتوى الطباعة/PDF | Resolve content */
function resolveContent(documentData, voucherData, options = {}) {
    const { size = "a4" } = options;
    const card = shouldRenderCard(size);
    if (voucherData) {
        return {
            html: buildVoucherHtml(voucherData),
            title: voucherData.voucherType === "قبض" ? "سند قبض" : "سند صرف",
            fileName: `${voucherData.voucherType === "قبض" ? "سند_قبض" : "سند_صرف"}_${voucherData.referenceNo || ""}_${voucherData.date || ""}.pdf`.replace(/ /g, "_")
        };
    }
    if (documentData) {
        const showFooter = documentData.showFooter !== undefined
            ? Boolean(documentData.showFooter) : getPersistedShowFooter();
        const html = buildDocumentHtml(documentData, {
            showFooter,
            isPrinting: true,
            layout: card || size === "receipt" ? "receipt" : "standard"
        });
        const title = documentData.customTitle || documentData.title || "فاتورة";
        return {
            html,
            title,
            fileName: `${title}_${documentData.documentNo || ""}_${documentData.date || ""}.pdf`.replace(/ /g, "_")
        };
    }
    return null;
}

/* بناء مستند HTML مشترك | Build shared HTML document */
function buildFullDocument(title, bodyHtml, { printOnLoad = false, receipt = false } = {}) {
    const printHandler = printOnLoad
        ? ' onload="setTimeout(function(){ window.focus(); window.print(); }, 400);"'
        : "";
    const extraCss = receipt ? `\n${RECEIPT_CSS}` : "";

    return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><title>${title}</title>
${SHARED_LINKS}
<style>${INVOICE_CSS}\n${PDF_EXPORT_CSS}${extraCss}</style>
</head><body${printHandler}><main id="document-export-root">${bodyHtml}</main></body></html>`;
}

/* الطباعة عبر iframe خفي — يتجنب حظر النوافذ المنبثقة وينتظر أنماط CDN قبل print() | Print via hidden iframe — avoids popup blockers, waits for CDN styles before print() */
export function printCurrentDocument(documentData, voucherData, { size = "a4" } = {}) {
    const content = resolveContent(documentData, voucherData, { size });
    if (!content) return;
    const { html, title } = content;
    const receipt = size === "receipt" || shouldRenderCard(size);

    /* iframe خفي يحتوي الفاتورة فقط | Hidden iframe containing only the invoice */
    const iframe = document.createElement("iframe");
    iframe.style.cssText = "position:fixed;left:0;top:0;width:0;height:0;border:none;opacity:0;pointer-events:none;";
    document.body.appendChild(iframe);

    const win = iframe.contentWindow;
    const doc = win.document;
    doc.open();
    doc.write(buildFullDocument(title, html, { printOnLoad: false, receipt }));
    doc.close();

    /* print() من إطار المستند نفسه بعد تحميل الأنماط | print() called from the document's own frame after styles load */
    waitForStyles(doc)
        .then(() => win.focus())
        .then(() => win.print())
        .catch(() => { /* إلغاء أو منع المستخدم للطباعة مسموح ولا يكسر التدفق | user blocking/cancelling the print is allowed and must not break the flow */ })
        .finally(() => {
            setTimeout(() => {
                try { document.body.removeChild(iframe); } catch { /* أُزيل مسبقاً | already removed */ }
            }, 4000);
        });
}

/* PDF — لقطة في iframe مرئي لكن خارج الشاشة حتى يحافظ html2canvas على تشكيل RTL | PDF — capture in a visible-but-offscreen iframe so html2canvas keeps RTL glyph shaping */
export async function downloadPdfCurrentDocument(documentData, voucherData, { size = "a4" } = {}) {
    const content = resolveContent(documentData, voucherData, { size });
    if (!content) return;
    const { html, title, fileName } = content;
    const receipt = size === "receipt" || shouldRenderCard(size);

    window.showGlobalAlert?.(`جاري تحميل "${title}" كملف PDF …`, "info");

    try {
        await ensureHtml2Pdf();
    } catch (err) {
        console.error("html2pdf load failed:", err);
        window.showGlobalAlert?.("فشل تحميل مكتبة PDF — يرجى المحاولة لاحقاً", "danger");
        return;
    }

    /* مرئي لكن مزاح عند left:0 — html2canvas يقصّ محتوى RTL إذا أزحته جانبياً | visible but offset at left:0 — html2canvas crops RTL content if moved sideways */
    const iframe = document.createElement("iframe");
    iframe.style.cssText = `position:fixed;left:0;top:0;width:${receipt ? 400 : EXPORT_VIEWPORT_WIDTH}px;border:none;pointer-events:none;z-index:-1;opacity:0.01;`;
    document.body.appendChild(iframe);

    const fullDoc = buildFullDocument(title, html, { receipt });
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    iframeDoc.open();
    iframeDoc.write(fullDoc);
    iframeDoc.close();

    try {
        // html2pdf يستنسخ المحتوى في نافذته الخاصة — يُنفَّذ هنا ليحتفظ الاستنساخ بـ CSS القالب | html2pdf clones content in its own window — run it here so the clone keeps the template CSS
        await ensureHtml2Pdf(iframe.contentWindow);
    } catch (err) {
        console.error("html2pdf load failed in export frame:", err);
        document.body.removeChild(iframe);
        window.showGlobalAlert?.("فشل تحميل مكتبة PDF — يرجى المحاولة لاحقاً", "danger");
        return;
    }

    await waitForStyles(iframeDoc);
    await waitForFonts(iframe.contentWindow);
    await new Promise((r) => setTimeout(r, 600));

    let fullHeight = 400;
    try {
        fullHeight = Math.max(
            iframeDoc.documentElement.scrollHeight,
            iframeDoc.body.scrollHeight,
            400
        );
        iframe.style.height = fullHeight + "px";
        void iframe.offsetHeight;
    } catch { /* حماية عبر المجالات | cross-origin guard */ }

    await new Promise((r) => setTimeout(r, 200));

    const exportRoot = iframeDoc.getElementById("document-export-root");
    if (!exportRoot) {
        document.body.removeChild(iframe);
        return;
    }

    try {
        const receiptHeightMm = receipt
            ? Math.max(100, Math.ceil(fullHeight * (25.4 / 96)))
            : null;
        const pdfBlob = await iframe.contentWindow.html2pdf()
            .set({
                // القيم تطابق @page في القالب (A4 = 15mm، شريط الإيصال = 0) | Scalars match the template's @page (A4 = 15mm, receipt strip = 0)
                margin: receipt ? 0 : 15,
                filename: fileName,
                image: { type: "jpeg", quality: 0.98 },
                pagebreak: {
                    mode: ["css", "legacy"],
                    avoid: ["tr", ".invoice-preview-header", ".voucher-print-header"]
                },
                html2canvas: {
                    scale: receipt ? 1.5 : 2,
                    useCORS: true,
                    logging: false,
                    allowTaint: true,
                    backgroundColor: "#ffffff",
                    scrollX: 0,
                    scrollY: 0
                },
                jsPDF: receipt
                    ? { unit: "mm", format: [80, receiptHeightMm], orientation: "portrait" }
                    : { unit: "mm", format: "a4", orientation: "portrait" }
            })
            .from(exportRoot)
            .toPdf()
            .output("blob");

        // PDF يُعرض داخل iframe؛ لذا يجب أن يبدأ التنزيل من النافذة الرئيسية | PDF renders in the iframe; the download must start from the main window
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const downloadLink = document.createElement("a");
        downloadLink.href = downloadUrl;
        downloadLink.download = fileName;
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        downloadLink.remove();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);

        window.showGlobalAlert?.(`تم تحميل "${fileName}" بنجاح`, "success");
    } catch (err) {
        console.error("PDF generation error:", err);
        window.showGlobalAlert?.("خطأ في إنشاء ملف PDF", "danger");
    } finally {
        document.body.removeChild(iframe);
    }
}
