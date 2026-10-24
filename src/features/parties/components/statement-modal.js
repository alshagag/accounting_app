import { $  }         from "@/services/lib/utils.js";
import { escapeHtml } from "@/features/documents/index.js";
import { buildPartyStatement } from "../services/statement.js";
import { printPartyStatement, downloadStatementPdf, downloadStatementExcel } from "../actions/statement-export.js";
import { renderPaginatedRows } from "@/features/documents/components/table-renderer.js";

/* مودال كشف حساب الطرف | Party Statement Modal */
export async function openPartyStatement(party) {
  const modalEl = $("partyStatementModal");
  if (!modalEl) { console.error("partyStatementModal not found"); return; }

  const titleEl = $("partyStatementTitle");
  if (titleEl) titleEl.textContent = `كشف حساب — ${party.name}`;

  const tbody = $("partyStatementTbody");
  const summary= $("partyStatementSummary");
  if (tbody) {
    tbody._statementEntries = [];
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4"><span class="spinner-border spinner-border-sm me-2"></span>جاري تحميل البيانات...</td></tr>`;
  }
  if (summary) summary.innerHTML = "";

  const modal = bootstrap.Modal.getOrCreateInstance(modalEl);
  modalEl.dataset.partyName = party.name;
  modalEl.dataset.partyType = party.type;
  modal.show();

  const entries = await buildPartyStatement(party);
  if (tbody) tbody._statementEntries = [...entries].reverse();

  if (!entries.length) {
    if (tbody) {
      renderPaginatedRows("partyStatementTbody", [], () => "", {
        emptyMessage: "لا توجد حركات مسجلة لهذا الطرف",
        colspan: 6,
      });
    }
    return;
  }

  // بناء الصفوف (من الأحدث إلى الأقدم) | Build rows (newest to oldest)
  const rows = [...entries].reverse().map(e => {
    const balClass  = e.balance > 0 ? "text-danger" : e.balance < 0 ? "text-success" : "text-muted";
    const typeColor = e.docKind === "voucher"
      ? (e.credit > 0 ? "text-success" : "text-danger")
      : "text-primary";

    const docLink = `
      <button class="btn btn-link btn-sm p-0 open-statement-doc"
        data-key="${escapeHtml(e.docKey || '')}"
        data-category="${escapeHtml(e.docCategory || '')}"
        data-kind="${escapeHtml(e.docKind)}"
        style="text-decoration:none;font-weight:600;">
        ${escapeHtml(e.docNo)}
      </button>`;

    return `
      <tr>
        <td class="text-muted small">${escapeHtml(e.date || "-")}</td>
        <td class="${typeColor} small fw-bold">${escapeHtml(e.type)}</td>
        <td>${docLink}</td>
        <td class="text-end text-danger">${e.debit  > 0 ? e.debit.toFixed(2)  : "-"}</td>
        <td class="text-end text-success">${e.credit > 0 ? e.credit.toFixed(2) : "-"}</td>
        <td class="text-end fw-bold ${balClass}">${Math.abs(e.balance).toFixed(2)}</td>
      </tr>`;
  });

  if (tbody) {
    renderPaginatedRows("partyStatementTbody", rows, row => row, {
      emptyMessage: "لا توجد حركات مسجلة لهذا الطرف",
      colspan: 6,
    });
  }

  // ملخّص الأرصدة | Summary of balances
  const finalBalance = entries[entries.length - 1]?.balance ?? 0;
  const totalDebit   = entries.reduce((s, e) => s + e.debit,  0);
  const totalCredit  = entries.reduce((s, e) => s + e.credit, 0);
  const isPaid       = finalBalance <= 0;

  if (summary) {
    summary.innerHTML = `
      <div class="d-flex flex-wrap gap-3 justify-content-end align-items-center mt-3 p-3 rounded"
           style="background:var(--surface,#f8f9fa);border:1px solid var(--border,#dee2e6)">
        <div class="text-center">
          <div class="text-muted small">إجمالي المدين</div>
          <div class="fw-bold text-danger">${totalDebit.toFixed(2)} ريال</div>
        </div>
        <div class="text-center">
          <div class="text-muted small">إجمالي الدائن</div>
          <div class="fw-bold text-success">${totalCredit.toFixed(2)} ريال</div>
        </div>
        <div class="text-center">
          <div class="text-muted small">الرصيد الحالي</div>
          <div class="fw-bold fs-5 ${isPaid ? 'text-success' : 'text-danger'}">
            ${isPaid ? '0.00' : Math.abs(finalBalance).toFixed(2)} ريال
          </div>
        </div>
        <div>
          <span class="badge fs-6 bg-${isPaid ? 'success' : 'danger'}">
            ${isPaid ? 'مدفوع بالكامل' : 'غير مدفوع'}
          </span>
        </div>
      </div>`;
  }
}

/* أحداث أزرار كشف الحساب | Statement button events */
export function initStatementModalEvents() {
  $("btnPrintPartyStatement")?.addEventListener("click",    printPartyStatement);
  $("btnExportPartyStatementPdf")?.addEventListener("click",    downloadStatementPdf);
  $("btnExportPartyStatementExcel")?.addEventListener("click", downloadStatementExcel);

  document.addEventListener("click", async e => {
    // فتح الكشف عند النقر على الرصيد في جدول الأطراف | Open the statement when clicking a balance in the parties table
    const balanceBtn = e.target.closest(".open-party-statement");
    if (balanceBtn) {
      const partyName = balanceBtn.dataset.partyName;
      const partyType = balanceBtn.dataset.partyType;
      if (partyName && partyType) {
        await openPartyStatement({ name: partyName, type: partyType, phone: balanceBtn.dataset.partyPhone || "" });
      }
      return;
    }

    // فتح الفاتورة أو السند عند النقر على رقم المستند | Open the invoice or voucher when clicking the document number
    const docBtn = e.target.closest(".open-statement-doc");
    if (!docBtn) return;

    const key      = docBtn.dataset.key;
    const category = docBtn.dataset.category;
    const kind     = docBtn.dataset.kind;

    if (kind === "voucher") {
      // تحميل دوال جلب السندات والأطراف عند الحاجة | Lazy-load voucher and party getters when needed
      const { getAllVouchers } = await import("@/features/documents/invoices/vouchers/voucher-storage.js");
      const { getAllParties }  = await import("@/features/parties/storage.js");

      const voucher = getAllVouchers().find(v => v.id === key);
      if (voucher && voucher.partyId) {
        // السندات تخزن partyId فقط، لذا نحتاج جلب بيانات الطرف كاملة | Vouchers store only partyId, so full party data must be fetched
        const party = getAllParties().find(p => p.id === voucher.partyId) || {};

        // دمج بيانات الطرف مع السند مع الحفاظ على المعرف | Merge party data into the voucher while keeping the id
        const augmentedVoucher = { ...party, ...voucher };
        window.openVoucherDetails?.(augmentedVoucher);
      }
    } else if (kind === "invoice" && key && category) {
      const { latestDocuments } = await import("@/features/documents/state.js");
      const all = [
        ...(latestDocuments.salesInvoices    || []),
        ...(latestDocuments.purchaseInvoices || [])
      ];
      const doc = all.find(d => d.key === key && d.category === category);
      if (doc) window.openDocumentDetails?.(doc);
    }
  });
}