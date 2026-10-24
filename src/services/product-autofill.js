/*
 * التعبئة التلقائية لنماذج إضافة المنتج | Product autofill for the add-product forms
 * ============================================================================
 * نفس منطق إضافة المنتج في الفاتورة (barcode-scanner.js)، مشترك للسرعة والكاملة | The same add-product logic as the invoice barcode scanner, shared by the quick and full forms
 *   1. الباركود → قائمة المستخدم أولاً (مؤكدة) ثم Open Food Facts (مقترحة) | 1. By barcode: the user's list first (confirmed), then Open Food Facts (suggested).
 *   2. الاسم → نفس المطابقة المحلية مع استخراج الوزن/الحجم من الاسم | 2. By name: the same local match, plus size/weight extracted from the name.
 *
 * قواعد ثابتة | Standing rules:
 *   - لا يُلمس حقل كتبه المستخدم؛ الفارغ أو ما كتبناه نحن فقط | User-typed fields are never touched; only empty ones or our own suggestions.
 *   - سعر البيع فقط؛ سعر التكلفة لا يُخمَّن أبداً | Sale price only; cost is never guessed.
 *   - لا حفظ تلقائي؛ زر الإضافة هو ما يكتب في القاعدة | No auto-save; the add button writes to the database.
 *   - الفشل غير قاتل؛ النموذج يبقى مع الإدخال اليدوي متاحاً | Failures are non-fatal; the form stays usable for manual entry.
 */

import { lookupBarcodeGlobalDetailed } from "@/services/global-products.js";
import { $ } from "@/services/lib/utils.js";

/* مصدر البيانات — يحدد نص الرسالة ودرجة الثقة | Where the data came from — drives the message text and confidence level */
export const AUTOFILL_SOURCE = {
    LOCAL: "local",   /* منتج موجود في قائمة المستخدم | Product already in the user's list */
    PUBLIC: "public", /* Open Food Facts — بيانات عامة | Public catalog */
    NAME: "name",     /* استنتاج من الاسم الذي كتبه المستخدم | Inferred from the name the user typed */
};

export const AUTOFILL_CONFIDENCE = {
    CONFIRMED: "confirmed", /* سجّله المستخدم نفسه | Registered by the user themselves */
    SUGGESTED: "suggested", /* من مصدر عام أو استنتاج | From a public source or inference */
};

/* ================= المطابقة | Matching ================= */

/** يزيل المسافات من الباركود/الكود ليطابق ما تقرؤه الكاميرا وما هو محفوظ في السجل | Strips spaces from a barcode/code so what the scanner reads matches the stored record. */
export function normalizeCode(raw) {
    return String(raw || "").trim().replace(/\s+/g, "");
}

/**
 * يبحث عن المنتج المطابق لقراءة الباركود في قائمة المنتجات الحالية | Finds the product matching a barcode read within the current product list.
 * أولوية المطابقة: barcode ثم sku ثم (id أو name) بنفس النص | Match priority: barcode, then sku, then (id or name) by exact text.
 * (نفس دالة ماسح الباركود في الفاتورة، مشتركة مع نموذجي الإضافة) | The same lookup the invoice barcode scanner uses, shared by both add-product forms.
 */
export function findProductByBarcode(rawText, products) {
    const code = normalizeCode(rawText);
    if (!code) return null;
    const list = Array.isArray(products) ? products : [];
    const norm = v => String(v ?? "").trim().replace(/\s+/g, "");

    for (const p of list) { if (norm(p.barcode) === code) return p; }
    for (const p of list) { if (norm(p.sku) === code) return p; }
    for (const p of list) { if (norm(p.id) === code) return p; }
    for (const p of list) { if (norm(p.name) === code) return p; }
    return null;
}

/** مطابقة بالاسم تتجاهل الفراغات واختلاف حالة الأحرف — لاختيار منتج موجود باسمه فقط | Name match ignoring whitespace and case, to select a product by its name alone. */
export function findProductByName(name, products) {
    const target = String(name || "").trim().toLowerCase();
    if (!target) return null;
    const list = Array.isArray(products) ? products : [];
    const norm = v => String(v ?? "").trim().toLowerCase();

    return list.find(p => norm(p.name) === target) || null;
}

/* ================= الوزن/الحجم | Size ================= */

/* مرادفات الوحدات → الوحدات الثابتة المعروضة في نماذج المنتج | Unit aliases mapped to the standard units the product forms display */
const UNIT_ALIASES = [
    [/^(ملليلتر|مليلتر|مللتر|ml)$/i, "ملليلتر"],
    [/^(لتر|ليتر|l)$/i, "لتر"],
    [/^(كيلوجرام|كجم|كغ|kg|kilo.*)$/i, "كيلوجرام"],
    [/^(جرام|غ|g|gram.*)$/i, "جرام"],
    [/^(مليمتر|mm)$/i, "سنتيمتر"],
    [/^(سنتيمتر|سم|cm)$/i, "سنتيمتر"],
    [/^(متر|م)$/i, "متر"],
    [/^(متر مربع|م2|م²|m2|sqm)$/i, "متر مربع"],
    [/^(متر مكعب|م3|م³|m3|cbm)$/i, "متر مكعب"],
    [/^(علبة|كرتون|صندوق|عبوة|باكيت)$/, "عبوة"],
    [/^(حبة|حبه|قطعة|عدد)$/, "قطعة"],
];

const DEFAULT_UNIT = "قطعة";

/**
 * يستخرج الوزن/الحجم من نص حر مثل "500 غرام" أو "1.5 L" (من اسم المنتج أو حقل
 * quantity في القاعدة العامة) ويفصله إلى رقم + وحدة من قائمتنا | Extracts a weight/size from free text like "500 غرام" or "1.5 L" (from the product name or the global `quantity` field) and splits it into amount + unit from our list.
 * @returns {{text:string, amount:number|null, unit:string, found:boolean}}
 */
export function parseSize(raw) {
    const text = String(raw || "").trim();
    if (!text) return { text: "", amount: null, unit: DEFAULT_UNIT, found: false };

    const amountRaw = text.match(/[\d.,]+/)?.[0];
    const amount = Number(String(amountRaw ?? "").replace(/,/g, "."));
    const hasAmount = amountRaw !== undefined && Number.isFinite(amount);

    const unitToken = text
        .replace(/[\d.,]+/g, " ")
        .replace(/[()[\]{}]/g, " ")
        .trim()
        .split(/\s+/)
        .find(token => token && /[a-z؀-ۿ]/i.test(token));

    let unit = DEFAULT_UNIT;
    if (unitToken) {
        const match = UNIT_ALIASES.find(([pattern]) => pattern.test(unitToken));
        if (match) unit = match[1];
    }

    /* found = رقم + وحدة معروفة → يستحق ملء حقل الوحدة | found: a number plus a known unit — the unit field is worth filling */
    return { text, amount: hasAmount ? amount : null, unit, found: hasAmount && !!unitToken && unit !== DEFAULT_UNIT };
}

/* فئتا Open Food Facts مساران مفصولان بفاصلة، وآخر جزء فقط تسمية مفهومة وعادة إنكليزية — فتُعرض كاقتراح لا تُطبَّق تلقائيًا على قسم عربي | OFF categories are comma-separated paths; only the last segment is a human-readable label (usually English), so it surfaces as a suggestion, never auto-applied */
function lastCategorySegment(raw) {
    const parts = String(raw || "").split(",").map(s => s.trim());
    return parts.length ? parts[parts.length - 1] : "";
}

function salePriceOf(product) {
    const raw = product?.salePrice ?? product?.price;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

/* ================= بناء الاقتراحات | Building the Hints ================= */

function put(fields, key, value) {
    const v = String(value ?? "").trim();
    if (v) fields[key] = v;
}

/** اقتراحات من منتج موجود في قائمة المستخدم (بيانات مؤكدة) | Hints from a product already in the user's list (confirmed data). */
export function hintsFromProduct(product) {
    const fields = {};
    if (!product) return { source: null, confidence: null, fields };

    put(fields, "name", product.name);
    put(fields, "barcode", product.barcode);
    put(fields, "unit", product.unit);
    put(fields, "division", product.division);
    put(fields, "description", product.description);

    const price = salePriceOf(product);
    if (price !== null) fields.salePrice = String(price);

    return { source: AUTOFILL_SOURCE.LOCAL, confidence: AUTOFILL_CONFIDENCE.CONFIRMED, fields };
}

/** اقتراحات من السجل العام (مقترحة، والسعر مرجعي فقط) | Hints from the public catalog (suggested, price is reference-only). */
export function hintsFromPublicInfo(info) {
    const fields = {};
    if (!info) return { source: null, confidence: null, fields };

    put(fields, "name", info.name);
    put(fields, "barcode", info.barcode);

    const size = parseSize(info.unit);
    if (size.found) put(fields, "unit", size.unit);

    /* العلامة والحجم يذهبان للوصف لا للاسم — يبقى الاسم كما قُرئ دون جملة مفقودة | Brand and size go to the description, not the name — the name stays as read, without missing text woven in */
    put(fields, "description", [
        info.brand ? `العلامة: ${info.brand}` : "",
        info.unit ? `الحجم/الوزن: ${info.unit}` : "",
    ].filter(Boolean).join(" — "));

    const category = lastCategorySegment(info.category);
    if (category) put(fields, "division", category);

    if (info.referencePrice != null && Number(info.referencePrice) > 0) {
        fields.salePrice = String(info.referencePrice);
    }

    return { source: AUTOFILL_SOURCE.PUBLIC, confidence: AUTOFILL_CONFIDENCE.SUGGESTED, fields };
}

/* ================= نقطة الدخول | Entry Point ================= */

/**
 * يبحث عن بيانات المنتج بالباركود ثم بالاسم — نفس ترتيب الفاتورة | Looks up the product by barcode, then by name — the same order the invoice follows.
 *
 * @param {{barcode?:string, name?:string, getProducts:() => Promise<Array>}} input
 * @returns {Promise<{status:string, source:string|null, message:string, fields:Object}>}
 *   status: "local" | "public" | "not-found" | "error" | "empty"
 */
export async function resolveProductHints({ barcode, name, getProducts } = {}) {
    const code = normalizeCode(barcode);
    const typedName = String(name || "").trim();

    if (!code && !typedName) {
        return { status: "empty", source: null, message: "", fields: {} };
    }

    /* 1) قائمة المستخدم أولاً — نفس أولوية الفاتورة | 1) The user's list first — the same priority as the invoice */
    let products = [];
    try {
        products = (await getProducts?.()) || [];
    } catch (e) {
        products = [];
    }

    if (code) {
        const local = findProductByBarcode(code, products);
        if (local) {
            const hints = hintsFromProduct(local);
            return {
                status: "local",
                source: AUTOFILL_SOURCE.LOCAL,
                message: "الباركود موجود في قائمة منتجاتك — راجع البيانات المعروضة قبل الإضافة.",
                fields: hints.fields,
            };
        }
    }

    if (typedName) {
        const local = findProductByName(typedName, products);
        if (local) {
            const hints = hintsFromProduct(local);
            return {
                status: "local",
                source: AUTOFILL_SOURCE.LOCAL,
                message: "اسم المنتج موجود في قائمتك — تم استرجاع بياناته.",
                fields: hints.fields,
            };
        }
    }

    /* 2) لا شيء محلياً: الاسم وحده لا يبرّر نداءً خارجياً للشبكة | 2) Nothing local: a name alone never triggers an external network call */
    if (!code) {
        const size = parseSize(typedName);
        const fields = {};
        if (size.found) put(fields, "unit", size.unit);
        return {
            status: size.found ? "name" : "empty",
            source: size.found ? AUTOFILL_SOURCE.NAME : null,
            message: size.found ? `الوحدة مستخرجة من اسم المنتج: ${size.text}` : "",
            fields,
        };
    }

    /* 3) القاعدة العامة — نفس خدمة الفاتورة | 3) The public catalog — the same service the invoice uses */
    const { info, failed } = await lookupBarcodeGlobalDetailed(code);
    if (info) {
        return {
            status: "public",
            source: AUTOFILL_SOURCE.PUBLIC,
            message: "البيانات من قاعدة بيانات عامة (Open Food Facts) — السعر مرجعي قابل للتعديل",
            fields: hintsFromPublicInfo(info).fields,
        };
    }

    return {
        status: failed ? "error" : "not-found",
        source: null,
        message: failed
            ? "تعذّر الاتصال بقاعدة المنتجات العامة — أكمل البيانات يدوياً."
            : "لم يُعثر على المنتج — أضِفه يدوياً بالباركود الممسوح",
        fields: { barcode: code },
    };
}

/* ================= الكتابة في النموذج | Writing into the Form ================= */

/* ما كتبناه نحن في الحقل — يسمح باستبدال اقتراحنا الأقدم بالأحدث دون مسح كتابة المستخدم (فكرة "الملكية" ذاتها في الحفظ السريع) | What we wrote into a field — lets a newer suggestion replace ours without erasing user input (the same "ownership" idea as quick-save) */
const ownedValues = new WeakMap();

/* قيمة الحقل لحظة فتح النموذج: بعض الحقول ليست "فارغة" أصلاً (قائمة الوحدة تبدأ على «قطعة»)، فمقارنة الفراغ وحدها لا تكفي؛ بقاؤه على قيمته الأصلية = لم يُمسّ = يُملأ | A field's value when the form opened: some fields are never empty (unit starts on «قطعة»), so empty-checking alone is not enough; on its original value = untouched = fillable */
const pristineValues = new WeakMap();

/** يُستدعى عند فتح/تفريغ النموذج لتسجيل قيمه الأصلية | Called on form open/reset to record the fields' original values. */
export function markAutofillBaseline(targets) {
    Object.values(targets || {}).forEach((id) => {
        const el = $(id);
        if (el) pristineValues.set(el, String(el.value ?? ""));
    });
}

function isEmptyValue(el) {
    if (!el) return true;
    return !String(el.value ?? "").trim();
}

function isPristine(el) {
    return pristineValues.has(el) && pristineValues.get(el) === String(el.value ?? "");
}

/** يضع قيمة في <select> ويضيف الخيار إن لم يوجد (وحدة مخصصة) | Sets a <select> value, adding the option when missing (custom unit). */
function setSelectValue(el, value) {
    if (!el || !value) return false;
    const exists = Array.from(el.options || []).some(o => o.value === value);
    if (!exists) {
        const opt = document.createElement("option");
        opt.value = value;
        opt.textContent = value;
        el.appendChild(opt);
    }
    el.value = value;
    return true;
}

function setFieldValue(el, value) {
    if (!el || value === undefined || value === null) return false;
    if (el.tagName === "SELECT") return setSelectValue(el, String(value));
    el.value = String(value);
    return true;
}

/**
 * يملأ النموذج بالاقتراحات — الفارغ، أو ما لم يمسه المستخدم (بقاؤه على قيمته
 * الأصلية)، أو ما كتبناه نحن فيه | Fills the form with suggestions — empty fields, untouched fields (on their original value), or fields we already filled.
 *
 * @param {Object} fields من resolveProductHints
 * @param {{targets:Object<string,string>, noteId?:string}} config
 *   targets: خريطة {name|barcode|unit|salePrice|division|description → id}
 * @returns {{applied:string[], skipped:string[]}}
 */
export function applyProductHints(fields, { targets, noteId } = {}) {
    const applied = [];
    const skipped = [];

    Object.entries(fields || {}).forEach(([key, value]) => {
        const id = targets?.[key];
        if (!id) return;
        const el = $(id);
        if (!el) return;

        const current = String(el.value ?? "");
        const owned = ownedValues.get(el) === current;
        if (!isEmptyValue(el) && !isPristine(el) && !owned) {
            skipped.push(key);
            return;
        }

        if (setFieldValue(el, value)) {
            ownedValues.set(el, String(el.value ?? ""));
            applied.push(key);
        }
    });

    setAutofillNote(noteId, buildNoteMessage(applied, skipped));
    return { applied, skipped };
}

function buildNoteMessage(applied, skipped) {
    if (!applied.length) {
        return skipped.length
            ? "بياناتك المكتوبة هي الأحدث — لم يُغيَّر شيء."
            : "";
    }
    const kept = skipped.length ? ` (${skipped.length} حقلاً تركناه كما هو لأنك أدخلت فيه بياناتك)` : "";
    return `تم استرجاع البيانات تلقائياً في ${applied.length} حقل${kept}`;
}

function setAutofillNote(noteId, text) {
    const el = noteId ? $(noteId) : null;
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("d-none", !text);
}

/** يمسح ملاحظة التعبئة التلقائية (يُستدعى بعد الحفظ أو الإلغاء) | Clears the autofill note (called after save or cancel). */
export function clearAutofillNote(noteId) {
    setAutofillNote(noteId, "");
}

/* ================= ملاحظات جاهزة | Ready-made Messages ================= */

export function statusMessage(result) {
    switch (result?.status) {
        case "local":
            return `${result.message} إضافة المنتج نفسه مرة أخرى لن تنجح (مكرر).`;
        case "public":
            return result.message;
        case "name":
            return result.message;
        case "not-found":
        case "error":
            return result.message;
        default:
            return "";
    }
}
