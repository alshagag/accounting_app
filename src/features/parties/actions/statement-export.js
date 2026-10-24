import { $ } from "@/services/lib/utils.js";
import { escapeHtml } from "@/features/documents/controllers/utils/escape.js";

/* تصدير كشف الحساب — طباعة / PDF / Excel | Party statement export */

const SHARED_LINKS = `
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.rtl.min.css" rel="stylesheet" />
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet" />
`;

const STATEMENT_CSS = `
@page{size:A4;margin:15mm}
html,body{direction:rtl;font-family:'Segoe UI',Tahoma,Arial,sans-serif;color:#222;margin:0;padding:0}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
.statement-sheet{direction:rtl;max-width:800px;margin:0 auto;border:2px solid #198754;border-radius:12px;padding:24px;background:#fff}
.statement-sheet .sheet-head{display:flex;justify-content:space-between;align-items:center;border-bottom:3px solid #198754;padding-bottom:12px;margin-bottom:16px}
.statement-sheet h1{font-size:1.25rem;margin:0;color:#198754}
.statement-sheet .sheet-sub{color:#6c757d;font-size:.9rem}
.statement-sheet table{width:100%;border-collapse:collapse;font-size:.9rem;margin-bottom:16px}
.statement-sheet th,.statement-sheet td{border:1px solid #dee2e6;padding:7px;text-align:center}
.statement-sheet thead th{background:#198754;color:#fff;border-color:#146c43}
.statement-sheet .balance-summary{display:flex;flex-wrap:wrap;gap:12px;justify-content:flex-end;background:#f8f9fa;border:1px solid #dee2e6;border-radius:8px;padding:10px 12px;font-size:.9rem}
.statement-sheet .balance-summary > div{text-align:center}
.statement-sheet .balance-summary .label{color:#6c757d;font-size:.8rem}
.statement-sheet .balance-summary .value{font-weight:700}
`;

function getStatementSnapshot() {
  const modal = $("partyStatementModal");
  const tbody = $("partyStatementTbody");
  const title = $("partyStatementTitle")?.textContent?.trim() || "كشف حساب";
  const businessName = localStorage.getItem("businessName") || "";
  const partyName = modal?.dataset.partyName || "";
  const rows = Array.isArray(tbody?._statementEntries)
    ? tbody._statementEntries.map(entry => [
        entry.date || "-",
        entry.type,
        entry.docNo,
        entry.debit > 0 ? entry.debit.toFixed(2) : "-",
        entry.credit > 0 ? entry.credit.toFixed(2) : "-",
        Math.abs(entry.balance).toFixed(2),
      ])
    : Array.from(tbody?.querySelectorAll("tr") || [])
      .map(tr => Array.from(tr.querySelectorAll("td,th"))
        .map(cell => (cell.textContent || "").trim().replace(/\s+/g, " ")))
      .filter(cells => cells.length >= 6)
      .map(cells => cells.slice(0, 6));
  return { title, businessName, partyName, rows };
}

function buildStatementHtml() {
  const { title, businessName, partyName, rows } = getStatementSnapshot();

  const bodyRows = rows.map(cells => {
    const [date, type, doc, debit, credit, balance] = cells;
    return `
      <tr>
        <td>${escapeHtml(date)}</td>
        <td>${escapeHtml(type)}</td>
        <td>${escapeHtml(doc)}</td>
        <td>${escapeHtml(debit || "-")}</td>
        <td>${escapeHtml(credit || "-")}</td>
        <td>${escapeHtml(balance)}</td>
      </tr>`;
  }).join("");

  const summary = $("partyStatementSummary")?.innerHTML || "";

  return `
    <div class="statement-sheet">
      <div class="sheet-head">
        <div>
          <h1>${escapeHtml(title)}</h1>
              ${partyName ? `<div class="sheet-sub">الطرف: ${escapeHtml(partyName)}</div>` : ""}
        </div>
            ${businessName ? `<div class="sheet-sub">${escapeHtml(businessName)}</div>` : ""}
      </div>
      <table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>نوع العملية</th>
            <th>رقم المستند</th>
            <th>مدين</th>
            <th>دائن</th>
            <th>الرصيد</th>
          </tr>
        </thead>
        <tbody>${bodyRows || '<tr><td colspan="6" class="text-muted">لا توجد حركات</td></tr>'}</tbody>
      </table>
      <div class="balance-summary">${summary}</div>
    </div>`;
}

function buildFullDocument(bodyHtml, { printOnLoad = false } = {}) {
  const printHandler = printOnLoad
    ? ' onload="setTimeout(function(){ window.focus(); window.print(); }, 400);"'
    : "";
  return `<!DOCTYPE html><html lang="ar" dir="rtl"><head>
<meta charset="utf-8"><title>${escapeHtml(getStatementSnapshot().title)}</title>
${SHARED_LINKS}
<style>${STATEMENT_CSS}</style>
</head><body${printHandler}><main id="statement-export-root">${bodyHtml}</main></body></html>`;
}

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

export function printPartyStatement() {
  const html = buildStatementHtml();
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:absolute;width:0;height:0;border:none;opacity:0;";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(buildFullDocument(html, { printOnLoad: true }));
  doc.close();

  waitForStyles(doc).then(() => new Promise((r) => setTimeout(r, 1000))).then(() => {
    setTimeout(() => { try { document.body.removeChild(iframe); } catch { /* أُزيل مسبقاً | already removed */ } }, 2000);
  });
}

export async function downloadStatementPdf() {
  const { title, businessName } = getStatementSnapshot();
  const fileName = `كشف_حساب${partyFileNameSuffix()}.pdf`;

  window.showGlobalAlert?.(`جاري تحميل "${title}" كملف PDF …`, "info");

  try {
    await ensureHtml2Pdf();
  } catch (err) {
    console.error("html2pdf load failed:", err);
    window.showGlobalAlert?.("فشل تحميل مكتبة PDF — يرجى المحاولة لاحقاً", "danger");
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:0;top:0;width:900px;border:none;pointer-events:none;z-index:-1;opacity:0.01;";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(buildFullDocument(buildStatementHtml()));
  iframeDoc.close();

  try {
    await ensureHtml2Pdf(iframe.contentWindow);
  } catch (err) {
    console.error("html2pdf load failed in export frame:", err);
    document.body.removeChild(iframe);
    window.showGlobalAlert?.("فشل تحميل مكتبة PDF — يرجى المحاولة لاحقاً", "danger");
    return;
  }

  await waitForStyles(iframeDoc);
  try { iframeDoc.documentElement; } catch { /* حماية | guard */ }
  await new Promise((r) => setTimeout(r, 600));

  try {
    const fullHeight = Math.max(iframeDoc.documentElement.scrollHeight, iframeDoc.body.scrollHeight, 400);
    iframe.style.height = fullHeight + "px";
  } catch { /* حماية | guard */ }
  await new Promise((r) => setTimeout(r, 200));

  const exportRoot = iframeDoc.getElementById("statement-export-root");
  if (!exportRoot) { document.body.removeChild(iframe); return; }

  try {
    const pdfBlob = await iframe.contentWindow.html2pdf()
      .set({
        margin: 15,
        filename: fileName,
        image: { type: "jpeg", quality: 0.98 },
        pagebreak: { mode: ["css", "legacy"] },
        html2canvas: { scale: 2, useCORS: true, logging: false, allowTaint: true, backgroundColor: "#ffffff", scrollX: 0, scrollY: 0 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      })
      .from(exportRoot)
      .toPdf()
      .output("blob");

    const downloadUrl = URL.createObjectURL(pdfBlob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = fileName;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
    window.showGlobalAlert?.(`تم تحميل "${fileName}" بنجاح`, "success");
  } catch (err) {
    console.error("PDF generation error:", err);
    window.showGlobalAlert?.("خطأ في إنشاء ملف PDF", "danger");
  } finally {
    document.body.removeChild(iframe);
  }
}

export function downloadStatementExcel() {
  const { title, businessName, partyName, rows } = getStatementSnapshot();

  const header = ["التاريخ", "نوع العملية", "رقم المستند", "مدين", "دائن", "الرصيد"];
  const body = rows.map(cells => "<tr>" + cells.map(c => `<td>${sanitizeCell(c)}</td>`).join("") + "</tr>").join("");

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
      <head><meta charset="UTF-8"><style>td,th{border:.5pt solid #000;padding:4pt;text-align:center}th{background:#198754;color:#fff}</style></head>
      <body dir="rtl"><h3>${title}${partyName ? ` — ${partyName}` : ""}${businessName ? ` — ${businessName}` : ""}</h3>
      <table border="1"><thead><tr>${header.map(h => `<th>${h}</th>`).join("")}</tr></thead>
      <tbody>${body || '<tr><td colspan="6">لا توجد حركات</td></tr>'}</tbody></table></body>
    </html>`;

  const blob = new Blob(["\ufeff" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `كشف_حساب${partyFileNameSuffix()}.xls`;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  window.showGlobalAlert?.("تم تحميل كشف الحساب بنجاح", "success");
}

function sanitizeCell(value) {
  return String(value || "-").replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" }[c]));
}

function partyFileNameSuffix() {
  const name = $("partyStatementModal")?.dataset.partyName;
  return name ? `_${name.replace(/[\\/:*?"<>| ]/g, "_")}` : "";
}

function ensureHtml2Pdf(targetWindow) {
  if (!targetWindow) targetWindow = window;
  if (targetWindow.html2pdf) return Promise.resolve();
  const targetDocument = targetWindow.document;

  return new Promise((resolve, reject) => {
    if (targetDocument.querySelector('script[src*="html2pdf"]')) {
      const check = setInterval(() => {
        if (targetWindow.html2pdf) { clearInterval(check); resolve(); }
      }, 100);
      setTimeout(() => { clearInterval(check); reject(new Error("html2pdf load timeout")); }, 10000);
      return;
    }
    const script = targetDocument.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load html2pdf"));
    targetDocument.head.appendChild(script);
  });
}