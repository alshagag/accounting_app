import { escapeHtml } from "@/features/documents/controllers/utils/escape.js";

/* يطبع HTML داخل iframe مخفي بدون فتح نافذة جديدة | Prints HTML inside a hidden iframe without opening a new window */
export function printContent(htmlContent, title = 'Print') {
  const iframe = document.createElement('iframe');
  Object.assign(iframe.style, { position: 'absolute', width: '0', height: '0', border: 'none' });
  document.body.appendChild(iframe);

  iframe.contentWindow.document.write(`
    <html><head>
      <title>${escapeHtml(title)}</title>
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet">
      <link rel="stylesheet" href="/src/css/style.css">
      <style>
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .voucher-print-container, .invoice-preview { border: none !important; box-shadow: none !important; margin: 0; padding: 0; }
        }
      </style>
    </head>
    <body dir="rtl" onload="window.focus();window.print();">${htmlContent}</body></html>`);

  iframe.contentWindow.document.close();
  setTimeout(() => document.body.removeChild(iframe), 2000);
}