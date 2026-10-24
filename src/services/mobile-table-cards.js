/* ============================================================================
   جداول البطاقات على الجوال | MOBILE CARD TABLES
   عرض فقط (Design-only): يصنف أعمدة الجدول تلقائياً من عناوين الرأس إلى مجموعات بصرية (مرجع، حالة، تاريخ، معلومات، مالية، إجراءات) ويرتبها داخل كل بطاقة خالية من العناوين (تخفي CSS التسميات؛ الترتيب والموقع وحدهما يحملان المعنى) | Design-only: auto-classifies table columns from header text into visual groups (ref, status, date, info, finance, actions) and lays them inside each heading-free card (CSS hides the labels; order and position carry the meaning).

   المجموعات المرئية (من الأعلى) | Visual groups (top to bottom):
     1. المرجع + التاريخ (المرجع يمين، التاريخ يسار) | 1. Reference + date (ref right, date left).
     2. المعلومات + المالية (الجهة يمين، المبلغ يسار وبارز) | 2. Info + finance (party right, amount left and prominent).
     3. الحالة (Pills) أو البيان وما يقابله | 3. Status pills or statement and its counterpart.
     4. الإجراءات (أزرار هادئة أسفل) | 4. Actions (quiet buttons at the bottom).

   سندات القبض/الصرف تشارك فواتير البيع والشراء نفس خطة البطاقة | Receipt/payment vouchers share the same card plan as sale/purchase invoices.
   لا يلمس هذا الملف أي منطق بيانات أو أحداث أو أزرار | This file touches no data logic, events, or buttons.
   ============================================================================ */

const TABLE_SELECTOR = "table.table-hover, table.parties-table";
const isCardViewport = () =>
  typeof window !== "undefined" && window.innerWidth <= 767;

/* ================= تصنيف الأعمدة من نص الرأس | Column Classification from Header Text ================= */
const HEADER_RULES = [
  [/^(الإجراءات|عرض|تعديل|حذف|طباعة)$/i, "actions"],
  [/^(المرجع|رقم|المستند|الكود)$/i, "ref"],
  [/^(الحالة)$/i, "status"],
  [/^(التاريخ|تاريخ الإصدار)$/i, "date"],
  [
    /^(مبلغ|المبلغ|الإجمالي|الرصيد|الرصيد المستحق|المدين|الدائن)$/i,
    "finance",
  ],
];

function classifyHeader(text) {
  const t = text.trim();
  for (const [re, group] of HEADER_RULES) {
    if (re.test(t)) return group;
  }
  return "info";
}

function readHeaderGroups(table) {
  return Array.from(table.querySelectorAll("thead th")).map((th) => {
    const text = (th.textContent || "").replace(/\s+/g, " ").trim();
    return { text, group: classifyHeader(text) };
  });
}

/* ================= تصنيف الخلايا من محتواها | Cell Classification from Content ================= */
function classifyTd(td, headerGroup) {
  if (td.hasAttribute("colspan")) return "empty";
  if (td.querySelector(".btn")) return "actions";
  if (td.querySelector(".badge")) return "status";
  if (headerGroup === "info" && td.classList.contains("text-end"))
    return "finance";
  return headerGroup;
}

/* ================= كشف جدول الأصناف (سعر + مخزون + إجراءات) | Products Table Detection (price + stock + actions) ================= */
function isProductsSidebarTable(headers) {
  const texts = headers.map((h) => h.text);
  return (
    texts.some((t) => /السعر/.test(t)) &&
    texts.some((t) => /المخزون/.test(t)) &&
    texts.some((t) => /إجراءات/.test(t))
  );
}

/* ================= التخطيط المرئي: ترتيب وعرض لكل عمود | Visual Layout: Order and Width per Column ================= */
function computeRowPlan(table) {
  const headers = readHeaderGroups(table);
  const firstRow = table.querySelector(
    "tbody tr:not(:has(> td[colspan]))",
  );
  if (!firstRow)
    return { plan: [], finalGroups: headers.map(() => "info") };

  const cells = Array.from(firstRow.querySelectorAll(":scope > td"));
  const finalGroups = cells.map((td, i) =>
    classifyTd(td, headers[i]?.group || "info"),
  );

  const buckets = {
    ref: [],
    status: [],
    date: [],
    info: [],
    finance: [],
    actions: [],
  };
  finalGroups.forEach((g, i) => {
    if (buckets[g]) buckets[g].push(i);
  });

  /* ================= كشف جدول الفواتير (8 أعمدة محددة) | Invoice Table Detection (exactly 8 columns) ================= */
  const isInvoiceTable =
    buckets.ref.length === 1 &&
    buckets.status.length === 1 &&
    buckets.date.length === 1 &&
    buckets.info.length === 2 &&
    buckets.finance.length === 2 &&
    buckets.actions.length === 1;

  /* ================= كشف جدول السندات (قبض/صرف) من أزرار صف البيانات | Voucher Table Detection (receipt/payment) from Row Action Buttons ================= */
  const isVouchers =
    !!firstRow &&
    (!!firstRow.querySelector(".view-voucher") ||
      !!firstRow.querySelector(".edit-voucher"));

  /* ================= كشف جدول الأصناف الجانبي (منتج / سعر / مخزون / إجراءات) | Products Sidebar Table Detection (product / price / stock / actions) ================= */
  const isProducts = isProductsSidebarTable(headers);

  /* ================= كشف جدول «عرض كل المنتجات» (الكمية / تكلفتان / ⋯) | "All Products" Modal Table Detection ================= */
  const isModalProducts =
    headers.some((h) => /الكمية المملوكة/.test(h.text)) &&
    headers.some((h) => /متوسط التكلفة/.test(h.text)) &&
    headers.some((h) => /إجمالي التكلفة/.test(h.text));

  /* ================= كشف جدول الأطراف (عملاء/موردين) وجدول الضرائب | Parties (customers/suppliers) and Taxes Table Detection ================= */
  const isPartiesTable = table.classList.contains("parties-table");
  const isTaxesTable = !!table.closest("#taxSettingsModal");

  const plan = [];
  let lastVR = 0;
  const sepThreshold =
    isInvoiceTable || isVouchers ? 3 : isProducts || isModalProducts ? 99 : 2;

  const push = (colIndex, group, order, flex, vr, size, label) => {
    const visualRow = vr || lastVR + 1;
    plan.push({
      colIndex,
      group,
      order,
      flex,
      size,
      label,
      sep: visualRow >= sepThreshold,
    });
    lastVR = visualRow;
  };

  if (isInvoiceTable) {
    /* ================= ترتيب صفوف جدول الفواتير | Invoice Table Row Order =================
       صف 1: المرجع + التاريخ | Row 1: reference + date
       صف 2: الجهة + مبلغ الفاتورة (بارز) | Row 2: party + invoice amount (prominent)
       صف 3: البيان + الرصيد المستحق | Row 3: statement + due balance
       صف 4: الحالة (Badge) | Row 4: status badge
       صف 5: الإجراءات (أزرار) | Row 5: action buttons */
    push(buckets.ref[0], "ref", 1, "1 1 50%", 1, "lg");
    push(buckets.date[0], "date", 2, "1 1 50%", 1);
    push(buckets.info[0], "info", 3, "1 1 50%", 2);
    push(buckets.finance[0], "finance", 4, "1 1 50%", 2, "lg");
    push(buckets.info[1], "info", 5, "1 1 50%", 3);
    push(buckets.finance[1], "finance", 6, "1 1 50%", 3);
    push(buckets.status[0], "status", 7, "1 1 100%", 4);
    push(buckets.actions[0], "actions", 8, "1 1 100%", 5);
  } else if (isVouchers) {
    /* ================= بطاقة سند (قبض/صرف) — نفس خطة بطاقة الفاتورة | Voucher Card — Same Plan as the Invoice Card =================
       صف 1: المرجع (يمين) + التاريخ (يسار) | Row 1: reference (right) + date (left)
       صف 2: الحساب/الجهة (يمين) + المبلغ (يسار، بارز) | Row 2: account/party (right) + amount (left, prominent)
       صف 3: البيان (يمين) + جهة الدفع/المستفيد (يسار) | Row 3: statement (right) + payee/beneficiary (left)
       صف 4: الإجراءات (أسفل، يسار) | Row 4: actions (bottom, left)
       (المعلومات والمالية تُحسب من رأس الجدول؛ لا حالة للسندات) | Info and finance come from the table header; vouchers have no status */
    push(buckets.ref[0], "ref", 1, "1 1 50%", 1, "lg");
    push(buckets.date[0], "date", 2, "1 1 50%", 1);
    push(buckets.info[0], "info", 3, "1 1 50%", 2);
    push(buckets.finance[0], "finance", 4, "1 1 50%", 2, "lg");
    push(buckets.info[1], "info", 5, "1 1 50%", 3);
    push(buckets.info[2], "info", 6, "1 1 50%", 3, "paired");
    push(buckets.actions[0], "actions", 7, "1 1 100%", 4);
  } else if (isProducts) {
    /* ================= بطاقة منتج (مثل بطاقة الصفحة الرئيسية) | Product Card — Like the Home Page Card =================
       صف 1: اسم المنتج (كبير، يمين) + النقاط ⋯ (يسار، نفس المستوى) | Row 1: product name (large, right) + ⋯ dots (left, same level)
       صف 2: المخزون (يمين، بأيقونة) مباشرة تحت الاسم | Row 2: stock (right, with icon) directly under the name
       صف 3: السعر (يمين، بارز) | Row 3: price (right, prominent) */
    const texts = headers.map((h) => h.text);
    const nameIdx = texts.findIndex((t) => /المنتج|اسم الصنف/.test(t));
    const priceIdx = texts.findIndex((t) => /السعر/.test(t));
    const stockIdx = texts.findIndex((t) => /المخزون/.test(t));
    const actionsIdx = texts.findIndex((t) => /إجراءات/.test(t));
    if (nameIdx >= 0) push(nameIdx, "info", 1, "1 1 auto", 1);
    if (actionsIdx >= 0) push(actionsIdx, "actions", 2, "0 0 auto", 1);
    if (stockIdx >= 0) push(stockIdx, "status", 3, "1 1 100%", 2);
    if (priceIdx >= 0) push(priceIdx, "finance", 4, "1 1 100%", 3, "lg");
  } else if (isModalProducts) {
    /* ================= بطاقة «عرض كل المنتجات» — بنفس شكل بطاقة الرئيسية | "All Products" Card — Same Shape as the Home Card =================
       صف 1: اسم الصنف (كبير، يمين) + النقاط ⋯ (يسار، نفس المستوى) | Row 1: item name (large, right) + ⋯ dots (left, same level)
       صف 2: الكمية المملوكة (المخزون) مباشرة تحت الاسم | Row 2: owned quantity (stock) directly under the name
       صف 3: متوسط التكلفة + إجمالي التكلفة (سطر واحد مع الأيقونة) | Row 3: average cost + total cost (one line with the icon) */
    const texts = headers.map((h) => h.text);
    const nameIdx = texts.findIndex((t) => /اسم الصنف|المنتج/.test(t));
    const imageIdx = texts.findIndex((t) => /^الصورة$/.test(t));
    const stockIdx = texts.findIndex((t) => /الكمية المملوكة/.test(t));
    const avgIdx = texts.findIndex((t) => /متوسط التكلفة/.test(t));
    const totalIdx = texts.findIndex((t) => /إجمالي التكلفة/.test(t));
    const actionsIdx = texts.findIndex((t) => /الإجراءات/.test(t));
    if (imageIdx >= 0) push(imageIdx, "info", 0, "0 0 auto", 1, "thumb");
    if (nameIdx >= 0) push(nameIdx, "info", 1, "1 1 auto", 1);
    if (actionsIdx >= 0) push(actionsIdx, "actions", 2, "0 0 auto", 1);
    if (stockIdx >= 0) push(stockIdx, "status", 3, "1 1 100%", 2);
    if (avgIdx >= 0) push(avgIdx, "finance", 4, "1 1 50%", 3, "avg");
    if (totalIdx >= 0) push(totalIdx, "finance", 5, "1 1 50%", 3, "total");
  } else if (isPartiesTable || isTaxesTable) {
    /* ================= بطاقة طرف (عميل/مورد): الاسم ← الرصيد ← الحالة ← الإجراءات | Party Card (customer/supplier): name → balance → status → actions =================
       ── بطاقة ضريبة: الاسم ← عدد المعاملات ← الإجراءات | Tax card: name ← transaction count ← actions
       العنصر الأساسي في الأعلى والأزرار في صف واحد واضح في الأسفل | The key item on top, buttons in one visible row at the bottom */
    const texts = headers.map((h) => h.text);
    const idx = (re) => texts.findIndex((t) => re.test(t));

    if (isPartiesTable) {
      const nameIdx = idx(/^الاسم$/);
      const balanceIdx = idx(/^الرصيد$/);
      const statusIdx = idx(/^الحالة$/);
      const partyType =
        table
          .closest("#partiesModal")
          ?.querySelector(".modal-party-filter.btn-success")
          ?.getAttribute("data-party-type") || "customers";
      const nameLabel = partyType === "suppliers" ? "اسم المورد" : "اسم العميل";
      if (nameIdx >= 0) push(nameIdx, "info", 1, "1 1 100%", 1, null, nameLabel);
      if (balanceIdx >= 0) push(balanceIdx, "finance", 2, "1 1 100%", 2, "lg", "الرصيد");
      if (statusIdx >= 0) push(statusIdx, "status", 3, "1 1 100%", 3, null, "حالة الدفع");
      buckets.actions
        .filter((i) => i !== balanceIdx)
        .forEach((i) => push(i, "actions", 4, "0 0 auto", 4));
    } else {
      const nameIdx = idx(/^الاسم$/);
      const countIdx = idx(/^المعاملات$/);
      if (nameIdx >= 0) push(nameIdx, "info", 1, "1 1 100%", 1);
      if (countIdx >= 0) push(countIdx, "status", 2, "1 1 100%", 2);
      buckets.actions.forEach((i) => push(i, "actions", 3, "0 0 auto", 3));
    }
  } else {
    /* ================= الترتيب العام للجداول الأخرى | General Order for Other Tables ================= */
    const hasRef = buckets.ref.length > 0;
    const hasStatus = buckets.status.length > 0;
    const hasDate = buckets.date.length > 0;

    if (hasRef && hasStatus) {
      push(buckets.ref[0], "ref", 1, "1 1 50%", 1);
      push(buckets.status[0], "status", 1, "1 1 50%", 1);
    } else if (hasRef && hasDate) {
      push(buckets.ref[0], "ref", 1, "1 1 50%", 1);
      push(buckets.date[0], "date", 1, "1 1 50%", 1);
      buckets.date = buckets.date.slice(1);
    } else if (hasRef) {
      push(buckets.ref[0], "ref", 1, "1 1 100%", 1);
    } else if (hasStatus) {
      push(buckets.status[0], "status", 1, "1 1 100%", 1);
    }

    buckets.date.forEach((i) => push(i, "date", 2, "1 1 100%"));
    buckets.info.forEach((i) => push(i, "info", 3, "1 1 100%"));

    const finCount = buckets.finance.length;
    if (finCount === 1) {
      push(buckets.finance[0], "finance", 4, "1 1 100%");
    } else if (finCount >= 2) {
      const finVR = lastVR + 1;
      buckets.finance.forEach((i) => push(i, "finance", 4, "1 1 50%", finVR));
    }

    if (buckets.actions.length === 1) {
      push(buckets.actions[0], "actions", 5, "1 1 100%");
    } else if (buckets.actions.length >= 2) {
      const actVR = lastVR + 1;
      buckets.actions.forEach((i) => push(i, "actions", 5, "1 1 100%", actVR));
    }
  }

  return { plan, finalGroups, isProducts, isModalProducts, isVouchers };
}

/* ================= نص الخلية من العُقد النصية المباشرة فقط (يتجاهل التسميات المُحقنة) | Direct Text Nodes Only (ignores injected labels) ================= */
function readDirectText(td) {
  let out = "";
  td.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) out += node.textContent;
  });
  return out;
}

/* ================= تزيين خلايا بطاقة المنتج (أيقونات + عملة) — على الجوال فقط وبلا تكرار | Product Card Cell Decoration (icons + currency) — Mobile Only, No Duplication ================= */
function augmentProductCells(table) {
  table.querySelectorAll("tbody tr td[data-mcb-group]").forEach((td) => {
    const group = td.getAttribute("data-mcb-group");

    if (group === "finance" && !td.querySelector(".mcb-price-wrap")) {
      const value = readDirectText(td).replace(/\s+/g, " ").trim();
      const wrap = document.createElement("span");
      wrap.className = "mcb-price-wrap";
      wrap.innerHTML =
        '<i class="bi bi-cash-stack mcb-prod-icon" aria-hidden="true"></i>' +
        ' <span class="mcb-price-value">' +
        value +
        '</span> <span class="mcb-currency">ريال</span>';
      td.textContent = "";
      td.appendChild(wrap);
    } else if (group === "status") {
      if (!td.querySelector(".mcb-prod-stock")) {
        td.insertAdjacentHTML(
          "afterbegin",
          '<i class="bi bi-boxes mcb-prod-stock" aria-hidden="true"></i>',
        );
      }
      if (!td.querySelector(".mcb-prod-label")) {
        const badge = td.querySelector(".badge");
        const raw = (badge?.textContent || "").trim();
        const stockNum = Number(raw);
        // إذا عرضت الشارة نصًا (مثل «غير متوفر») لا نكرّر التسمية | When the badge shows text (e.g. «غير متوفر»), do not duplicate the label
        if (Number.isFinite(stockNum)) {
          const label = document.createElement("span");
          label.className = "mcb-prod-label";
          label.textContent = stockNum > 0 ? "متوفر" : "غير متوفر";
          td.appendChild(label);
        }
      }
    } else if (group === "actions" && !td.querySelector(".mcb-dots")) {
      const icon =
        td.querySelector(".bi-three-dots-vertical") ||
        td.querySelector(".bi-three-dots");
      if (icon) {
        icon.classList.remove("bi-three-dots-vertical");
        icon.classList.add("bi-three-dots");
        icon.classList.add("mcb-dots");
      }
    }
  });
}

/* ── تزيين بطاقة «عرض كل المنتجات» (نافذة قائمة المنتجات) — على الجوال فقط | «All Products» card decoration (products-list modal) — mobile only ── */
function augmentModalProductCells(table) {
  table.querySelectorAll("tbody tr td[data-mcb-group]").forEach((td) => {
    const group = td.getAttribute("data-mcb-group");

    if (group === "finance" && !td.querySelector(".mcb-prod-fin-title")) {
      const isAvg = td.getAttribute("data-mcb-size") === "avg";
      const value = readDirectText(td).replace(/\s+/g, " ").trim();
      const title = document.createElement("div");
      title.className = "mcb-prod-fin-title";
      title.textContent = isAvg ? "متوسط التكلفة" : "إجمالي التكلفة";
      const wrap = document.createElement("span");
      wrap.className = "mcb-price-wrap";
      wrap.innerHTML =
        '<i class="bi ' +
        (isAvg ? "bi-calculator" : "bi-receipt") +
        ' mcb-prod-icon" aria-hidden="true"></i>' +
        ' <span class="mcb-price-value">' +
        value +
        '</span> <span class="mcb-currency">ريال</span>';
      td.textContent = "";
      td.appendChild(title);
      td.appendChild(wrap);
    } else if (group === "status" && !td.querySelector(".mcb-prod-stock")) {
      td.insertAdjacentHTML(
        "afterbegin",
        '<i class="bi bi-boxes mcb-prod-stock" aria-hidden="true"></i>' +
          ' <span class="mcb-prod-stock-label">المخزون:</span>',
      );
    } else if (group === "actions" && !td.querySelector(".mcb-modal-dots")) {
      const viewBtn = td.querySelector(".view-product-btn");
      const editBtn = td.querySelector(".full-edit-product");
      const productId = viewBtn?.getAttribute("data-id") || "";
      const wrap = document.createElement("div");
      wrap.className = "dropdown mcb-modal-dots";
      wrap.innerHTML =
        '<button class="btn mcb-dots-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="إجراءات">' +
        '<i class="bi bi-three-dots"></i>' +
        "</button>" +
        '<ul class="dropdown-menu dropdown-menu-end">' +
        '<li><button class="dropdown-item view-product-btn" type="button" data-id="' +
        productId +
        '">عرض</button></li>' +
        '<li><button class="dropdown-item full-edit-product" type="button" data-id="' +
        productId +
        '">تعديل</button></li>' +
        "</ul>";
      td.textContent = "";
      td.appendChild(wrap);
    }
  });
}

/* ── تطبيق الخطة على صف واحد | Apply the plan to a single row ─────────────────────────────────────────────── */
function applyRow(tr, headers, rowPlan) {
  const cells = Array.from(tr.querySelectorAll(":scope > td"));

  cells.forEach((td, index) => {
    if (td.hasAttribute("colspan")) {
      td.setAttribute("data-mcb-group", "empty");
      return;
    }

    const entry = rowPlan.find((p) => p.colIndex === index);
    if (entry) {
      td.setAttribute("data-mcb-group", entry.group);
      td.style.order = String(entry.order);
      td.style.flex = entry.flex;
      if (entry.sep) td.setAttribute("data-mcb-sep", "");
      if (entry.size) td.setAttribute("data-mcb-size", entry.size);
    }

    if (td.querySelector(".btn:not(.btn-link)")) return;
    if (td.querySelector(":scope > .mcb-label")) return;
    const labelText = entry?.label || headers[index]?.text;
    if (!labelText || labelText.length <= 1) return;
    const label = document.createElement("span");
    label.className = "mcb-label";
    label.textContent = labelText;
    td.insertBefore(label, td.firstChild);
  });
}

/* ── تحديث جدول واحد | Refresh a single table ─────────────────────────────────────────────────────── */
function refreshTable(table) {
  if (!table) return;
  const { plan, isProducts, isModalProducts } = computeRowPlan(table);
  const headers = readHeaderGroups(table);
  table.querySelectorAll("tbody tr").forEach((tr) => applyRow(tr, headers, plan));
  if (isProducts) augmentProductCells(table);
  else if (isModalProducts) augmentModalProductCells(table);
}

/* ── التهيئة العامة | General initialization ───────────────────────────────────────────────────────── */
export function initMobileTableCards() {
  if (
    typeof window === "undefined" ||
    window.__mobileTableCardsBound
  )
    return;
  window.__mobileTableCardsBound = true;

  const pending = new Set();
  let queued = false;

  const flush = () => {
    queued = false;
    if (!isCardViewport()) {
      pending.clear();
      return;
    }
    pending.forEach(refreshTable);
    pending.clear();
  };

  const schedule = (table) => {
    if (!table || !table.matches(TABLE_SELECTOR)) return;
    pending.add(table);
    if (!queued) {
      queued = true;
      requestAnimationFrame(flush);
    }
  };

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches && node.matches("tbody tr")) {
          schedule(node.closest(TABLE_SELECTOR));
          continue;
        }
        for (const tr of node.querySelectorAll
          ? node.querySelectorAll("tbody tr")
          : []) {
          schedule(tr.closest(TABLE_SELECTOR));
        }
      }
    }
  });

  window.addEventListener("resize", () => {
    if (isCardViewport())
      document.querySelectorAll(TABLE_SELECTOR).forEach(refreshTable);
  });

  if (isCardViewport())
    document.querySelectorAll(TABLE_SELECTOR).forEach(refreshTable);
  observer.observe(document.body, { childList: true, subtree: true });
}