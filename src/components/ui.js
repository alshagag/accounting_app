'use client';

import { $ } from "@/services/lib/utils.js";

/* ================= الأدوات المساعدة | Helpers ================= */

function showGlobalAlert(message, type = "info", timeout = 4000) {
  const container = $("toastContainer");
  if (!container) {
    const alert = $("globalAlert");
    if (!alert) return;
    alert.className = `alert alert-${type}`;
    alert.innerHTML = message;
    alert.style.display = "block";
    if (timeout > 0) {
      window.clearTimeout(showGlobalAlert.timer);
      showGlobalAlert.timer = window.setTimeout(() => { alert.style.display = "none"; }, timeout);
    }
    return;
  }

  const icons = { success: "bi-check-circle-fill", danger: "bi-x-circle-fill", warning: "bi-exclamation-triangle-fill", info: "bi-info-circle-fill" };
  const colors = { success: "#198754", danger: "#dc3545", warning: "#fd7e14", info: "#0d6efd" };

  const toast = document.createElement("div");
  toast.style.cssText = `pointer-events:auto;display:flex;align-items:center;gap:10px;min-width:300px;max-width:420px;padding:14px 18px;border-radius:10px;background:#fff;color:#333;box-shadow:0 8px 24px rgba(0,0,0,.15);font-size:.9rem;transform:translateX(120%);opacity:0;transition:transform .35s ease,opacity .35s ease;direction:rtl;`;
  toast.innerHTML = `<i class="bi ${icons[type] || icons.info}" style="font-size:1.2rem;color:${colors[type] || colors.info};flex-shrink:0"></i><span style="flex:1">${escapeHtml(message)}</span><button type="button" style="background:none;border:none;font-size:1.1rem;cursor:pointer;color:#999;padding:0 0 0 4px;flex-shrink:0" aria-label="إغلاق">&times;</button>`;
  toast.querySelector("button").addEventListener("click", () => dismissToast(toast));

  container.appendChild(toast);
  requestAnimationFrame(() => { toast.style.transform = "translateX(0)"; toast.style.opacity = "1"; });

  if (timeout > 0) {
    setTimeout(() => dismissToast(toast), timeout);
  }
}

function dismissToast(toast) {
  if (!toast || toast._dismissed) return;
  toast._dismissed = true;
  toast.style.transform = "translateX(120%)";
  toast.style.opacity = "0";
  setTimeout(() => toast.remove(), 400);
}

function escapeHtml(text) {
  if (text == null) return '';

  return text.toString()
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* حالة تحميل الأزرار | Button loading state */
const buttonLoadingState = new WeakMap();

function setButtonLoading(button, isLoading, loadingText = "جاري الحفظ...") {
  if (!button) return;

  if (isLoading) {
    if (!buttonLoadingState.has(button)) {
      buttonLoadingState.set(button, button.innerHTML);
    }

    button.disabled = true;
    button.innerHTML = `
      <span class="spinner-border spinner-border-sm me-1"></span>
      ${loadingText}
    `;
    return;
  }

  button.disabled = false;

  if (buttonLoadingState.has(button)) {
    button.innerHTML = buttonLoadingState.get(button);
    buttonLoadingState.delete(button);
  }
}

/* ================= ربط عناصر الواجهة | UI Binding ================= */

function bindUI() {
  // معالجة عامة لمشكلة الوصول حين يبقى التركيز داخل نافذة منبثقة مخفية | Global handler for the accessibility issue where focus remains inside a hidden modal
  document.addEventListener('hide.bs.modal', function (event) {
    const modal = event.target;
    if (document.activeElement instanceof HTMLElement && modal.contains(document.activeElement)) {
      document.activeElement.blur();
    }
  });

  // تراكب النوافذ المنبثقة | Modal stacking
  // ضبط z-index للنوافذ الظاهرة حديثًا لتراكب صحيح | Adjust z-index for newly shown modals so they stack properly
  document.addEventListener('show.bs.modal', function (event) {
    const modal = event.target;
    const openModals = document.querySelectorAll('.modal.show');
    if (openModals.length > 0) {
      // إيجاد أعلى z-index بين النوافذ المفتوحة | Find the highest z-index among open modals
      const maxZ = Math.max(...Array.from(openModals).map(m => parseInt(m.style.zIndex || window.getComputedStyle(m).zIndex, 10)));
      modal.style.zIndex = maxZ + 20;

      // ضبط z-index للخلفية الجديدة بعد ظهورها | Adjust the new backdrop's z-index after it is shown
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop.show');
        const topBackdrop = backdrops[backdrops.length - 1];
        if (topBackdrop) {
          topBackdrop.style.zIndex = maxZ + 10;
        }
      }, 0);
    }
  });

  // إعادة صنف 'modal-open' إلى body عند إغلاق نافذة متراكبة | Restore the 'modal-open' class on the body when a stacked modal is closed
  document.addEventListener('hidden.bs.modal', function () {
    if (document.querySelector('.modal.show')) {
      document.body.classList.add('modal-open');
    }
  });

  // تهيئة اختيار الطرف لنوع العملية الافتراضي | Initialize the party select for the default transaction type
  const transType = $('transType');
  if (transType) {
    setTimeout(() => transType.dispatchEvent(new Event("change")), 50);
  }

  // مفتاح ربط فاتورة موجودة | Link-existing-invoice toggle
  const linkInvoice = $("transLinkInvoice");
  const linkInvoiceRow = $("transLinkInvoiceRow");
  const linkInvoiceSelect = $("transLinkInvoiceSelect");
  if (linkInvoice && linkInvoiceRow) {
    linkInvoice.addEventListener("change", async () => {
      linkInvoiceRow.classList.toggle("d-none", !linkInvoice.checked);
      if (linkInvoice.checked) {
        const type = $("transType")?.value || "";
        const party = $("transParty")?.value || "";
        await populateInvoiceLinkSelect(type, party);
      }
    });
  }

  if (linkInvoiceSelect) {
    linkInvoiceSelect.addEventListener("change", async () => {
      const invoiceKey = linkInvoiceSelect.value;
      if (!invoiceKey) return;

      // البحث عن المستند من القائمة المتاحة عامًا | Find the document from the globally available list
      const doc = window.findDocument?.(invoiceKey, 'invoice');

      // عند اختيار فاتورة كهدف يمكن تعبئة حقل التاريخ مسبقًا ليطابق تاريخ الفاتورة | When an invoice is selected as a target, pre-fill the date field to match the invoice date
      if (doc) {
        const transDateInput = $('transDate');
        if (transDateInput) transDateInput.value = doc.date;
      }
      // منطق إضافة البند يتم في transactions.js عند الحفظ، فلا استيراد بنود ولا تصفير للاختيار هنا | The logic to add an item lives in transactions.js on save, so no item import or selection reset happens here
    });
  }

  // ترتبط إجراءات معاينة المستند في document-ui.js حيث تتوفر حالة المستند ودوال الطباعة/PDF | Document preview actions are bound in document-ui.js, where the current document state and the print/PDF functions are available
}

/* ================= ربط فاتورة موجودة | Invoice Link Select ================= */

async function populateInvoiceLinkSelect(filterType, partyName) {
  const sel = $("transLinkInvoiceSelect");
  if (!sel) return;

  if (!partyName) {
    sel.innerHTML = '<option value="" disabled selected>اختر عميل / مورد أولاً</option>';
    sel.disabled = true;
    return;
  }

  sel.disabled = false;
  sel.innerHTML = '<option value="">جاري التحميل...</option>';

  const isSale = filterType === "بيع";
  const invoiceTypeLabel = isSale ? "فاتورة بيع" : "فاتورة شراء";
  const tbodyId = isSale ? "salesInvoicesTbody" : "purchaseInvoicesTbody";
  const tbody = $(tbodyId);

  if (!tbody) {
    sel.innerHTML = '<option value="" disabled selected>جدول الفواتير غير موجود</option>';
    return;
  }

  // 1. قراءة البيانات مباشرة من جدول DOM | 1. Read data directly from the DOM table
  const invoicesFromDOM = Array.from(tbody.querySelectorAll("tr")).map(tr => {
    if (tr.querySelector('td[colspan]')) return null; // تجاهل صف الحالة الفارغة | Skip the empty state row

    const viewButton = tr.querySelector('.view-document');
    if (!viewButton) return null;

    return {
      key: viewButton.dataset.key,
      date: tr.cells[1]?.textContent || "",
      documentNo: tr.cells[2]?.textContent || "",
      party: tr.cells[3]?.textContent || "", // اسم العميل/المورد من الجدول | Customer/supplier name from the table
      title: tr.cells[4]?.textContent || "" // الملاحظات/البيان | Notes/description
    };
  }).filter(Boolean);

  // 2. سجلات تشخيصية لمقارنة الربط | 2. Diagnostic logs for link comparison
  console.log("Selected:", partyName);
  console.log("Invoices from DOM:", invoicesFromDOM);
  console.log("Mapped for comparison:", invoicesFromDOM.map(i => ({
      ref: i.documentNo,
      customer: i.party, // نستخدم 'party' لأنه يحمل اسم العميل/المورد | Use 'party' as it holds the customer/supplier name
      key: i.key
  })));

  // 3. التصفية حسب اسم الطرف من DOM | 3. Filter by the party name from the DOM
  const partyDocuments = invoicesFromDOM.filter(doc => doc.party.trim().toLowerCase() === partyName.trim().toLowerCase());

  if (partyDocuments.length === 0) {
    const msg = isSale ? 'لا توجد فواتير لهذا العميل' : 'لا توجد فواتير لهذا المورد';
    sel.innerHTML = `<option value="" disabled selected>${msg}</option>`;
    return;
  }

  partyDocuments.sort((a, b) => b.date.localeCompare(a.date));

  sel.innerHTML = '<option value="">اختر فاتورة للربط</option>';
  partyDocuments.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d.key;
    opt.textContent = `${invoiceTypeLabel} — ${d.documentNo} — ${d.date}`;
    sel.appendChild(opt);
  });
}

/* ================= أصوات المسح | Barcode Scan Sounds ================= */

let scanAudioCtx = null;

function getScanAudioCtx() {
  if (!scanAudioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      try { scanAudioCtx = new AC(); } catch (e) { scanAudioCtx = null; }
    }
  }
  if (scanAudioCtx && scanAudioCtx.state === "suspended") {
    scanAudioCtx.resume().catch(() => {});
  }
  return scanAudioCtx;
}

function scanTone(ctx, freq, start, duration, volume, type) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t0 = ctx.currentTime + start;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration - 0.01);
  osc.start(t0);
  osc.stop(t0 + duration);
}

/**
 * يلعب صوت المسح المناسب دون حجب عملية المسح إطلاقًا.
 * لو رفض المتصفح تشغيل الصوت، يُتجاهل الفشل بصمت.
 * @param {"success"|"notfound"|"error"} kind
 */
function playScanSound(kind) {
  try {
    const ctx = getScanAudioCtx();
    if (!ctx) return;
    if (kind === "success") {
      scanTone(ctx, 1962, 0, 0.09, 0.18, "square");
      scanTone(ctx, 1319, 0.11, 0.12, 0.18, "square");
    } else if (kind === "notfound") {
      scanTone(ctx, 330, 0, 0.18, 0.22, "sawtooth");
      scanTone(ctx, 247, 0.15, 0.22, 0.22, "sawtooth");
    } else if (kind === "error") {
      scanTone(ctx, 220, 0, 0.25, 0.22, "triangle");
    }
  } catch (e) {
    // الصوت اختياري ولا يحجب المسح إطلاقًا | Audio is optional and never blocks scanning
  }
}

export { bindUI, showGlobalAlert, setButtonLoading, populateInvoiceLinkSelect, playScanSound };
