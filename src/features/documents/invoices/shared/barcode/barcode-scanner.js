import { showGlobalAlert, playScanSound } from "@/components/ui.js";
import { lookupBarcodeGlobal } from "@/services/global-products.js";
import { findProductByBarcode } from "@/services/product-autofill.js";
import { track, startOperation, operationDuration } from "@/services/analytics/gtag.js";

/*
 * ماسح باركود موحّد لجميع المستندات (فاتورة بيع، فاتورة شراء، سند قبض، سند صرف) | Unified barcode scanner for all documents (sales invoice, purchase invoice, receipt voucher, payment voucher)
 *
 * === سلة مسح مؤقتة (Basket Session) === | === Temporary scan basket (Basket Session) ===
 * - يُفتح الماسح ويكون "سلة مسح": تُجمع المنتجات الممسوحة داخل النافذة، | the scanner opens as a "scan basket": scanned products collect inside the modal,
 *   والمتكرر يُدمج تلقائياً وتزداد كميته (+1 لكل مسح إضافي، أو بقيمة حقل الكمية اليدوي عند تحديدها) | duplicates merge automatically and their quantity grows (+1 per extra scan, or the manual qty field value when set)
 * - كل منتج في السلة: اسم + كمية قابلة للتعديل + حذف | each basket item: name + editable quantity + delete
 * - زر «＋ إضافة منتج آخر» يبقي الماسح مفتوحاً لمسح المنتج التالي | the "＋ Add another" button keeps the scanner open to scan the next product
 * - زر «إنهاء الماسح» يُضيف كل المنتجات للفاتورة/السند كبنود منظمة (بلا تكرار أسطر لنفس المنتج) عبر onFinish | the "Finish" button adds all products to the invoice/voucher as tidy lines (no duplicate rows for the same product) via onFinish
 * - عند عدم العثور على المنتج محلياً: بحث في قاعدة البيانات العامة (Open Food Facts) — إن وُجد يُعبّأ نموذج بالإسم/الباركود/الوحدة وسعر مرجعي قابل للتعديل، وإن لم يجد يُعرض نموذج «إضافة يدوياً» بالباركود الممسوح | when the product isn't found locally: search the public DB (Open Food Facts) — if found, a form is filled with name/barcode/unit and an editable reference price; otherwise a "manual add" form is shown with the scanned barcode
 *
 * === دورة حياة الكاميرا (بلا Refresh) === | === Camera lifecycle (no Refresh) ===
 * Open → Start Camera → Scan → Stop → Close → Open Again → Start Camera
 * - كل فتح ينشئ جلسة كاملة جديدة (Html5Qrcode لم يعد مستعملاً من قبل) | each open creates a full fresh session (the Html5Qrcode instance is never reused)
 * - تسلسل الفتحات (openingChain): فتح جديد ينتظر أي فتح جارٍ، والإغلاق السريع ثم إعادة الفتح لا تُتجاهل بصمت كما كان يحدث | opening chain: a new open awaits any in-progress open, so a quick close then reopen is never silently dropped
 * - معالج الإغلاق مرتبط بـ token الجلسة، فلا يصطدم إصدار قديم بجلسة جديدة | the close handler is keyed on the session token, so an old close never hits a new session
 * - عند الإغلاق يُحرَّر MediaStream بالكامل: instance.stop() ثم clear() ثم إيقاف كل tracks المتبقية وإفراغ srcObject | on close the MediaStream is fully released: instance.stop(), clear(), stop remaining tracks, clear srcObject
 * - teardown ينتظر أي start() معلّق قبل تنظيفه، فلا يترك تشغيل متأخر الكاميرا محتجَزة | teardown awaits any pending start() before cleaning up, so a late start never leaves the camera locked
 * - أخطاء NotReadableError/AbortError: تحرير كل التدفقات + إعادة محاولة واحدة | NotReadableError/AbortError: release all streams + one retry
 * - حالات واضحة: فتح الكاميرا / جاهز للمسح / خطأ | clear states: opening camera / ready to scan / error
 *
 * لا يلمس هذا الملف أي حساب أو ضرائب أو مخزن بيانات؛ إنشاء المنتج المحلي يتم عبر onEnsureProduct الذي يوفّره المستدعي بنفس مخزن المنتجات الحالي | This file touches no accounts, taxes or data store; local product creation happens via the caller-provided onEnsureProduct using the same existing product store
 */

const MODAL_ID = "barcodeScannerModal";
const READER_ID = "barcodeScannerReader";
const STATUS_ID = "barcodeScannerStatus";
const BASKET_ID = "barcodeScannerBasket";
const DRAFT_ID = "barcodeScannerDraft";
const DRAFT_SOURCE_ID = "barcodeScannerDraftSource";
const MANUAL_QTY_ID = "barcodeScannerManualQty";
const ADD_MORE_ID = "barcodeScannerAddMore";
const FINISH_ID = "barcodeScannerFinish";

/*
 * مهلة التكرار: قصيرة بما يكفي لكبح تكرار نفس إطار الكاميرا، وطويلة بما يكفي للسماح بإعادة مسح قصدية لنفس المنتج لتراكم الكمية (10 مسحات = كمية 10) | Repeat delay: short enough to suppress the same camera frame, long enough to allow an intentional rescan of the same product to accumulate quantity (10 scans = quantity 10)
 */
const SAME_CODE_SUPPRESS_MS = 450;

let qrcodeModulePromise = null;
function getQrcodeModule() {
    if (!qrcodeModulePromise) qrcodeModulePromise = import("html5-qrcode");
    return qrcodeModulePromise;
}

/*
 * رفض benign من نوع AbortError: html5-qrcode يستدعي video.play() ثم نُزيل عنصر الفيديو أثناء teardown (إغلاق سريع/إعادة فتح) فيرفض play() بـ "the media was removed from the document" | Benign AbortError rejection: html5-qrcode calls video.play() then we remove the video element during teardown (quick close/reopen), so play() rejects with "the media was removed from the document"
 * هذا رفض متوقّع من تدمير وسائط متعمَّد لكنه يظهر كاستثناء غير معالَج في Console؛ نكتمه فقط عند تحقق الشرط بدقة ونترك أي رفض آخر يظهر كما هو | this is expected from deliberate media teardown but shows as an unhandled exception in Console; suppress it only on the exact condition and leave any other rejection visible
 */
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("unhandledrejection", (e) => {
        const r = e.reason;
        if (r?.name === "AbortError" && /play\(\)|media was removed/i.test(String(r?.message || ""))) {
            e.preventDefault();
        }
    });
}

/* حالة الجلسة — تنشأ من الصفر عند كل فتح | Session state — created fresh on every open */
let session = null;
let openingChain = null; // تسلسل الفتحات: يمنع فتحاً جديداً فوق فتح جارٍ | opening chain: prevents a new open stacking on an in-progress one
let basket = [];
let callbacks = null;
let pendingFinishItems = null;

/* مضاد تكرار القراءات | Scan de-duplication */
let lastCode = "";
let lastCodeAt = 0;
let codeLost = true;
let processingScan = false;

/* روابط أحداث النافذة لتفكيكها عند الإغلاق | Window event bindings, torn down on close */
let boundControls = [];

function escapeHtml(v) {
    return String(v ?? "").replace(
        /[&<>"']/g,
        c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
}

/* ================= Status | الحالة/الحالات ================= */

function setStatus(text, kind = "") {
    const el = document.getElementById(STATUS_ID);
    if (!el) return;
    el.textContent = text || "";
    el.classList.remove("scanner-ok", "scanner-err");
    if (kind === "ok") el.classList.add("scanner-ok");
    else if (kind === "err") el.classList.add("scanner-err");
}

function showModal(modalEl) {
    try {
        window.bootstrap?.Modal.getOrCreateInstance(modalEl).show();
    } catch (e) {
        modalEl.classList.add("show");
        modalEl.style.display = "block";
    }
}

/*
 * Bootstrap 5 يرفض show() بصمت أثناء انتقال الإخفاء (‎_isTransitioning‎)، فالإغلاق السريع ثم إعادة فتح الماسح (أو إعادة الفتح مباشرة بعد «إنهاء الماسح») تُهمَل وتبدو الكاميرا كأنها لا تفتح؛ ننتظر انتهاء الانتقال قبل الإظهار | Bootstrap 5 silently ignores show() during the hide transition (_isTransitioning), so a quick close then reopen (or an immediate reopen after "finish") is dropped and the camera appears not to open; we wait for the transition to finish before showing
 */
function settleBeforeShow(modalEl) {
    const inst = window.bootstrap?.Modal?.getInstance?.(modalEl);
    if (!inst || inst._isShown || !inst._isTransitioning) return Promise.resolve();
    return new Promise(resolve => {
        let done = false;
        const fin = () => { if (done) return; done = true; clearTimeout(timer); resolve(); };
        const timer = setTimeout(fin, 700);
        modalEl.addEventListener("hidden.bs.modal", fin, { once: true });
    });
}

/*
 * نافذة Bootstrap تظهر على مرحلتين: يبدأ تشغيل الـ backdrop ثم يُنفَّذ _showElement (الذي يضبط display:block) داخل callback انتقال الـ backdrop، فيبقى عنصر العرض بلا عرض فعلي (clientWidth = 0) في اللحظة التي يُطلَب فيها تشغيل الكاميرا؛ وحينها تبني html5-qrcode وسم <video> بعرض 0px فلا تظهر الصورة إطلاقاً رغم نجاح التدفق. ننتظر حتى يصبح لعنصر العرض عرض حقيقي قبل التشغيل | Bootstrap reveals a modal in two phases: the backdrop starts, then _showElement (which sets display:block) runs inside the backdrop transition callback, so the reader has no real width (clientWidth = 0) at the moment the camera is requested; html5-qrcode then builds a 0px-wide <video> that never shows even though the stream succeeded. We wait until the reader has a real width before starting
 */
function whenLayoutReady(el, timeoutMs = 1500) {
    if (!el || el.clientWidth > 0) return Promise.resolve();
    return new Promise(resolve => {
        const startedAt = Date.now();
        const check = () => {
            if (!el.isConnected || el.clientWidth > 0 || Date.now() - startedAt >= timeoutMs) {
                resolve();
                return;
            }
            requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
    });
}

/* ================= Basket | السلة ================= */

function readManualQty() {
    const el = document.getElementById(MANUAL_QTY_ID);
    const v = Number(el?.value);
    return Number.isFinite(v) && v > 0 ? v : 1;
}

function addToBasket(product, qty) {
    const add = Math.max(1, Math.round(Number(qty) || 1) || 1);
    let existing = null;
    for (const b of basket) {
        if (b.product?.id !== undefined && String(b.product.id) === String(product?.id)) {
            existing = b;
            break;
        }
        if (
            (b.product?.id === undefined || b.product?.id === null || b.product?.id === "") &&
            String(b.product?.name || "") === String(product?.name || "")
        ) {
            existing = b;
            break;
        }
    }
    if (existing) existing.quantity += add;
    else basket.push({ product, quantity: add });

    const name = product?.name || "المنتج";
    if (existing) setStatus(`تمت زيادة الكمية: ${name} × ${existing.quantity}`, "ok");
    else setStatus(`تمت الإضافة: ${name} × ${add}`, "ok");
    playScanSound("success");
    renderBasket();
}

function renderBasket(forceEmpty = false) {
    const el = document.getElementById(BASKET_ID);
    if (!el) return;
    if (forceEmpty || !basket.length) {
        el.innerHTML = "";
        el.classList.add("d-none");
        return;
    }
    el.classList.remove("d-none");
    const totalQty = basket.reduce((s, b) => s + Number(b.quantity || 1), 0);
    el.innerHTML =
        `<div class="barcode-basket-head">المنتجات الممسوحة (${basket.length}) — إجمالي ${totalQty} قطعة</div>` +
        basket
            .map((b, i) =>
                `<div class="barcode-basket-item">
                   <input type="number" min="1" step="1" value="${Number(b.quantity) || 1}" class="barcode-basket-qty form-control form-control-sm" data-index="${i}" aria-label="الكمية" />
                   <span class="barcode-basket-name">${escapeHtml(b.product?.name || "")}</span>
                   <button type="button" class="barcode-basket-del btn btn-outline-danger btn-sm" data-index="${i}" title="حذف">&times;</button>
                 </div>`
            )
            .join("");
}

function updateBasketQty(index, value) {
    const b = basket[index];
    if (!b) return;
    const next = Math.max(1, Math.round(Number(value) || 0) || 1);
    b.quantity = next;
    renderBasket();
}

/* ================= Add-product form (public/manual) | نموذج إضافة منتج (عام/يدوي) ================= */

function setDraftField(id, value, readOnly = false) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? "";
    el.readOnly = Boolean(readOnly);
}

function showDraft(sourceText) {
    const sourceEl = document.getElementById(DRAFT_SOURCE_ID);
    if (sourceEl) sourceEl.textContent = sourceText || "";
    const el = document.getElementById(DRAFT_ID);
    if (el) el.classList.remove("d-none");
}

function hideDraft() {
    const el = document.getElementById(DRAFT_ID);
    if (el) el.classList.add("d-none");
}

function renderDraftGlobal(info) {
    setDraftField("barcodeDraftName", info?.name || "", false);
    setDraftField("barcodeDraftBarcode", info?.barcode || "", true);
    setDraftField("barcodeDraftUnit", info?.unit || "", false);
    const refPrice =
        info?.referencePrice != null ? String(info.referencePrice) : "";
    setDraftField("barcodeDraftPrice", refPrice, false);
    showDraft("البيانات من قاعدة بيانات عامة (Open Food Facts) — السعر مرجعي قابل للتعديل");
}

function renderDraftManual(barcode) {
    setDraftField("barcodeDraftName", "", false);
    setDraftField("barcodeDraftBarcode", barcode || "", true);
    setDraftField("barcodeDraftUnit", "", false);
    setDraftField("barcodeDraftPrice", "", false);
    showDraft("لم يُعثر على المنتج — أضِفه يدوياً بالباركود الممسوح");
}

async function confirmDraft() {
    const nameEl = document.getElementById("barcodeDraftName");
    const barcodeEl = document.getElementById("barcodeDraftBarcode");
    const priceEl = document.getElementById("barcodeDraftPrice");
    const unitEl = document.getElementById("barcodeDraftUnit");

    const name = nameEl?.value?.trim() || "";
    if (!name) {
        setStatus("أدخل اسم المنتج قبل الإضافة", "err");
        return;
    }
    const priceRaw = parseFloat(priceEl?.value);
    const price = Number.isFinite(priceRaw) && priceRaw >= 0 ? priceRaw : 0;

    setStatus("جارٍ حفظ المنتج...");
    let product = null;
    try {
        product = await callbacks?.onEnsureProduct?.({
            name,
            barcode: barcodeEl?.value?.trim() || "",
            price,
            unit: unitEl?.value?.trim() || "",
        });
    } catch (e) {
        console.error("barcode confirmDraft error:", e);
        product = null;
    }
    if (!session) return;
    if (!product) {
        setStatus("تعذر إضافة المنتج — حاول مرة أخرى", "err");
        playScanSound("error");
        return;
    }
    hideDraft();
    addToBasket(product, readManualQty());
    const qtyEl = document.getElementById(MANUAL_QTY_ID);
    if (qtyEl) qtyEl.value = "";
}

/* ================= Handling scans | التعامل مع القراءات ================= */

async function handleUnknown(barcode) {
    setStatus("لا يوجد المنتج محلياً — البحث في قاعدة البيانات العامة...");
    const info = await lookupBarcodeGlobal(barcode);
    if (!session) return;
    if (info) {
        playScanSound("notfound");
        setStatus("يوجد المنتج في القاعدة العامة — راجع البيانات ثم أضِفه", "ok");
        renderDraftGlobal(info);
    } else {
        playScanSound("notfound");
        setStatus("جرّب إعادة المسح أو الإضافة اليدوية");
        renderDraftManual(barcode);
    }
}

async function handleCode(raw) {
    if (!session || processingScan) return;

    const value = String(raw || "").trim();
    if (!value) return;

    const now = Date.now();
    const isSame = value === lastCode;
    if (isSame && !codeLost) return;
    if (isSame && now - lastCodeAt < SAME_CODE_SUPPRESS_MS) return;
    if (isSame) codeLost = false;
    lastCode = value;
    lastCodeAt = now;

    processingScan = true;
    setStatus("جارٍ البحث عن المنتج...");

    try {
        const res = await callbacks?.onCode?.(value);
        if (!session) return;
        if (res?.status === "found" && res.product) {
            const add = readManualQty();
            addToBasket(res.product, add);
            const qtyEl = document.getElementById(MANUAL_QTY_ID);
            if (qtyEl) qtyEl.value = "";
            track("barcode_scan_success", {
                feature_name: "barcode",
                source: session.source,
                operation_id: session.op?.id,
            });
        } else if (res?.status === "not-found" || !res) {
            track("barcode_scan_failed", {
                feature_name: "barcode",
                failure_reason: "not_found",
                source: session.source,
                operation_id: session.op?.id,
            });
            await handleUnknown(value);
        } else if (res?.message) {
            setStatus(res.message);
        }
    } catch (e) {
        console.error("barcode onCode error:", e);
        playScanSound("error");
        setStatus("حدث خطأ أثناء القراءة", "err");
        track("barcode_scan_failed", {
            feature_name: "barcode",
            failure_reason: "lookup_error",
            source: session?.source,
            operation_id: session?.op?.id,
        });
    } finally {
        processingScan = false;
    }
}

/* ================= Camera lifecycle | دورة حياة الكاميرا ================= */

/* أخطاء الأذونات: لا يُعاد المحاولة آلياً، المستخدم يجب أن يغيّر الإعداد | Permission errors: never retried automatically — the user must change the setting */
const PERMISSION_ERRORS = new Set(["NotAllowedError", "SecurityError", "PermissionDeniedError"]);

/* رسالة واضحة لكل نوع خطأ من getUserMedia بدل رسالة عامة واحدة | A clear message per getUserMedia error type instead of one generic message */
const CAMERA_ERRORS = {
    NotAllowedError: "تم رفض إذن الكاميرا — اسمح بالوصول من إعدادات المتصفح ثم أعد المحاولة",
    PermissionDeniedError: "تم رفض إذن الكاميرا — اسمح بالوصول من إعدادات المتصفح ثم أعد المحاولة",
    SecurityError: "المتصفح يمنع الكاميرا — افتح الصفحة عبر HTTPS ثم أعد المحاولة",
    NotFoundError: "لا توجد كاميرا متاحة على هذا الجهاز",
    NotReadableError: "الكاميرا مشغولة أو مستخدمة من تطبيق آخر — أغلقه ثم أعد المحاولة",
    OverconstrainedError: "تعذّر تشغيل الكاميرا بالمعايير المطلوبة",
    AbortError: "تم إلغاء تشغيل الكاميرا — أعد المحاولة",
};

function isCameraBusyError(err) {
    return !!err && (err.name === "NotReadableError" || err.name === "AbortError");
}

function cameraErrorMessage(err) {
    return CAMERA_ERRORS[err?.name] || "تعذر الوصول إلى الكاميرا — تحقق من الأذونات";
}

/* إيقاف فقط — يُبقي الـ instance قابلاً لإعادة التشغيل | Stop only — keeps the instance reusable */
async function stopScanner(sc) {
    if (!sc) return;
    try {
        if (typeof sc.stop === "function") await sc.stop();
    } catch (_) {}
}

/* إيقاف + تحرير كامل — لا يُعاد استخدام الـ instance بعدها | Stop + full release — the instance is not reused afterwards */
async function releaseScanner(sc) {
    if (!sc) return;
    await stopScanner(sc);
    try {
        if (typeof sc.clear === "function") sc.clear();
    } catch (_) {}
}

/*
 * تحرير شامل لتدفقات الفيديو المتبقية في الصفحة (حاوية الماسح + أي <video>) | Thorough release of leftover page video streams (scanner container + any <video>)
 * السبب الجذري لعرض "الماسح يفتح ثم يغلق": تدفّق يتسرب من جلسة سابقة يبقى محتجزاً فترفض getUserMedia الطلب التالي بـ NotReadableError، ولا ينحصر ذلك إلا بتحديث الصفحة | Root cause of the "scanner opens then closes" symptom: a leaked stream from a previous session stays locked, so the next getUserMedia is refused with NotReadableError, and it only clears on a page refresh
 * تحرير التدفقات قبل كل محاولة يجعل الفتح التالي ينجح | releasing streams before each attempt makes the next open succeed
 */
function releaseVideoStreams(root) {
    const videos = new Set();
    if (root && root.querySelectorAll) root.querySelectorAll("video").forEach(v => videos.add(v));
    document.querySelectorAll("video").forEach(v => videos.add(v));

    videos.forEach(v => {
        try {
            const s = v.srcObject;
            if (s && typeof s.getTracks === "function") {
                s.getTracks().forEach(t => {
                    try { t.stop(); } catch (_) {}
                });
            }
        } catch (_) {}
        try { v.srcObject = null; } catch (_) {}
        try { v.pause(); } catch (_) {}
    });
}

async function teardown(token) {
    const active = session && (token === undefined || session.token === token) ? session : null;
    if (!active) return;
    console.debug("[BarcodeScanner] teardown: releasing camera resources");

    track("barcode_scan_closed", {
        feature_name: "barcode",
        close_reason: active.closeReason || "closed",
        source: active.source,
        operation_id: active.op?.id,
        duration_ms: operationDuration(active.op),
    });

    /* 1) تعطيل الحالة فوراً — يمنع أي callback جديد أو scan أثناء التنظيف | 1) Disable state immediately — blocks any new callback or scan during cleanup */
    session = null;
    callbacks = null;
    lastCode = "";
    lastCodeAt = 0;
    codeLost = true;
    processingScan = false;
    removeBindings();

    /*
     * 2) انتظار أي تشغيل كاميرا ما زال معلّقاً قبل تنظيفه | 2) Await any still-pending camera start before cleaning it up
     * بدون هذا الانتظار كان start() يكتمل بعد الإغلاق فينشئ تدفّقاً محتجزاً لا يوقفه أحد (لأن session صار null فتجاهلته teardown) فتبقى الكاميرا مشغولة وتحتاج تحديث صفحة حتى يعمل الماسح مرة أخرى | without this wait start() completes after close and creates a locked stream nobody stops (session is null so teardown ignored it), leaving the camera busy until a page refresh
     */
    if (active.startPromise) {
        try { await active.startPromise; } catch (_) {}
        active.startPromise = null;
    }

    const readerEl = document.getElementById(READER_ID);

    /*
     * 3) تنظيف html5-qrcode أولاً — المكتبة توقف MediaStream وتحرر الكاميرا وتفكّ حاوياتها الداخلية بشكل صحيح | 3) Clean up html5-qrcode first — the library stops the MediaStream, frees the camera and tears down its inner containers properly
     * يجب أن نتركها تنهي عملها قبل أي تدخل يدوي حتى لا يسبب قتل track مبكر onabort من RenderedCameraImpl | it must finish before any manual step so an early track kill doesn't trigger onabort from RenderedCameraImpl
     */
    const sc = active.scanner;
    active.scanner = null;
    await releaseScanner(sc);

    /*
     * 4) تنظيف يدوي احترازي: أي tracks أو عناصر فيديو داخل حاوية الماسح | 4) Defensive manual cleanup: any tracks or video elements inside the scanner container
     * لا نقتل tracks قبل stop() لأن ذلك يسبب onabort | tracks are not killed before stop() because that causes onabort
     */
    if (readerEl) {
        readerEl.querySelectorAll("video").forEach(v => {
            try {
                const s = v.srcObject;
                if (s && typeof s.getTracks === "function") {
                    s.getTracks().forEach(t => {
                        try { t.stop(); } catch (_) {}
                    });
                }
            } catch (_) {}
            try { v.srcObject = null; } catch (_) {}
        });
        readerEl
            .querySelectorAll("video, canvas, .html5-qrcode-element")
            .forEach(el => { try { el.remove(); } catch (_) {} });
    }

    /* 5) تحرير أي تدفّق باقٍ في الصفحة — يحسم حالة "الكاميرا مشغولة" | 5) Release any leftover page stream — settles the "camera busy" state */
    releaseVideoStreams(readerEl);

    hideDraft();
    setStatus("");
    renderBasket(true);
}

async function startCamera(active) {
    const token = active.token;
    const readerEl = document.getElementById(READER_ID);
    if (!readerEl) return;

    /* لا تطلب الكاميرا قبل أن يكتسب عنصر العرض عرضاً حقيقياً، وإلا خرج <video> بعرض 0px بلا صورة مع نجاح التدفق | Do not request the camera before the reader has a real width, otherwise a <video> is created 0px wide with no picture despite a successful stream */
    await whenLayoutReady(readerEl);

    /*
     * تنظيف أي بقايا scanner قديم (من جلسة فاشلة سابقة) قبل إنشاء instance جديد | Clean up any old scanner remnants (from a previous failed session) before creating a new instance
     * يمنع تعارض الكاميرات عند إعادة فتح الماسح بعد خطأ | prevents camera conflicts when reopening the scanner after an error
     */
    if (active.scanner) {
        await releaseScanner(active.scanner);
        active.scanner = null;
    }

    /* حاوية نظيفة + تحرير أي تدفّق باقٍ قبل طلب الكاميرا | clean container + release any leftover stream before requesting the camera */
    readerEl.innerHTML = "";
    releaseVideoStreams(readerEl);

    try {
        const mod = await getQrcodeModule();
        if (!session || session.token !== token) return;

        const lib = mod.default && mod.default.Html5Qrcode ? mod.default : mod;
        const Html5Qrcode = lib.Html5Qrcode;
        const SupportedFormats = lib.Html5QrcodeSupportedFormats;
        if (!Html5Qrcode) throw new Error("باقة الماسح غير متوفرة");

        const config = { verbose: false, useBarCodeDetectorIfSupported: false };
        if (SupportedFormats) {
            const all = Object.values(SupportedFormats).filter(v => typeof v === "number");
            if (all.length) config.formatsToSupport = all;
        }

        const sc = new Html5Qrcode(READER_ID, config);
        active.scanner = sc;
        console.debug("[BarcodeScanner] start: requesting camera");

        const onSuccess = text => handleCode(String(text || ""));
        const onFailure = () => { if (session && session.token === token) codeLost = true; };
        const scanConfig = { fps: 24, qrbox: { width: 280, height: 150 }, aspectRatio: 4 / 3 };

        if (!active.permissionRequested) {
            active.permissionRequested = true;
            track("barcode_camera_permission_requested", {
                feature_name: "barcode",
                source: active.source,
                operation_id: active.op?.id,
            });
        }

        /*
         * توثيق promise التشغيل داخل الجلسة: يتيح لـ teardown انتظاره ثم تحرير الـ instance، فلا يترك تشغيل متأخر كاميرا محتجَزة بعد الإغلاق | Store the start promise on the session so teardown can await it then release the instance, so a late start never leaves the camera locked after close
         */
        active.startPromise = startWithFallback(
            Html5Qrcode,
            sc,
            scanConfig,
            onSuccess,
            onFailure
        ).catch(async err => {
            await releaseScanner(sc);
            if (active.scanner === sc) active.scanner = null;
            throw err;
        });

        let started = false;
        try {
            started = await active.startPromise;
        } finally {
            if (active.startPromise) {
                try { await active.startPromise; } catch (_) {}
                active.startPromise = null;
            }
        }
        if (!started) throw new Error("لا توجد كاميرا متاحة");

        /*
         * أُغلقت النافذة أثناء التشغيل: نظّف هذا الـ instance مباشرةً لأن teardown سيتجاهله (token قديم و session صار null) | The modal closed during start: clean this instance directly because teardown will ignore it (old token and session is null)
         */
        if (!session || session.token !== token) {
            await releaseScanner(sc);
            return;
        }
        console.debug("[BarcodeScanner] ready: camera scanning");
        if (!active.cameraOpened) {
            active.cameraOpened = true;
            track("barcode_camera_open_success", {
                feature_name: "barcode",
                source: active.source,
                operation_id: active.op?.id,
            });
        }
        setStatus("جاهز للمسح ✓", "ok");
    } catch (err) {
        console.error("barcode scanner start failed:", err);
        active.closeReason = "error";
        track("barcode_camera_open_failed", {
            feature_name: "barcode",
            failure_reason: err?.name || "unknown",
            source: active.source,
            operation_id: active.op?.id,
        });
        playScanSound("error");
        setStatus(cameraErrorMessage(err), "err");
        showGlobalAlert(cameraErrorMessage(err), "danger");
        await teardown(token);
        const modalEl = document.getElementById(MODAL_ID);
        try {
            if (modalEl && modalEl.classList.contains("show")) {
                window.bootstrap?.Modal.getOrCreateInstance(modalEl).hide();
            }
        } catch (e) {}
    }
}

async function startWithFallback(Html5Qrcode, sc, scanConfig, onSuccess, onFailure) {
    let started = false;
    try {
        await sc.start({ facingMode: "environment" }, scanConfig, onSuccess, onFailure);
        started = true;
    } catch (firstErr) {
        if (PERMISSION_ERRORS.has(firstErr?.name)) throw firstErr;

        /*
         * الكاميرا مشغولة (غالباً بتدفّق مسرَّب من جلسة سابقة): نحرّر كل التدفقات ثم نعيد المحاولة مرة واحدة قبل الرجوع لقائمة الكاميرات | Camera busy (usually a stream leaked from a previous session): release all streams then retry once before falling back to the camera list
         */
        if (isCameraBusyError(firstErr)) {
            releaseVideoStreams();
            await new Promise(r => setTimeout(r, 160));
            try {
                await sc.start({ facingMode: "environment" }, scanConfig, onSuccess, onFailure);
                return true;
            } catch (retryErr) {
                if (PERMISSION_ERRORS.has(retryErr?.name)) throw retryErr;
                firstErr = retryErr;
            }
        }

        try {
            const cameras = await Html5Qrcode.getCameras();
            if (cameras && cameras.length) {
                await stopScanner(sc);
                await sc.start(cameras[0].id, scanConfig, onSuccess, onFailure);
                started = true;
            }
        } catch (secondErr) {
            throw firstErr;
        }
    }
    return started;
}

/* ================= Window events (bound and unbound per session) | أحداث النافذة (تُرتبط وتُفك في كل جلسة) ================= */

function bindControls() {
    const pairs = [
        { el: document.querySelector(`#${MODAL_ID} .btn-close`), event: "click", fn: commitAndClose },
        { el: document.getElementById(FINISH_ID), event: "click", fn: commitAndClose },
        { el: document.getElementById(ADD_MORE_ID), event: "click", fn: resetToIdle },
        { el: document.getElementById(BASKET_ID), event: "input", fn: onBasketInput },
        { el: document.getElementById(BASKET_ID), event: "click", fn: onBasketClick },
        { el: document.getElementById(DRAFT_ID), event: "click", fn: onDraftClick },
    ];
    boundControls = pairs.filter(p => p.el).map(p => {
        p.el.addEventListener(p.event, p.fn);
        return p;
    });
}

function removeBindings() {
    boundControls.forEach(p => {
        try { p.el.removeEventListener(p.event, p.fn); } catch (e) {}
    });
    boundControls = [];
}

function commitAndClose() {
    if (!session) return;
    const items = basket
        .filter(b => Number(b.quantity) > 0)
        .map(b => ({ product: b.product, quantity: Number(b.quantity) }));
    pendingFinishItems = items.length ? items : null;
    if (session) session.closeReason = items.length ? "basket_committed" : "manual_close";

    const modalEl = document.getElementById(MODAL_ID);
    const modal = window.bootstrap?.Modal.getInstance?.(modalEl);
    if (modal) {
        modal.hide();
    } else {
        try {
            modalEl.classList.remove("show");
            modalEl.style.display = "none";
        } catch (e) {}
        handleHidden(session?.token);
    }
}

function resetToIdle() {
    hideDraft();
    setStatus("جاهز للمسح ✓", "ok");
}

function onBasketInput(event) {
    const t = event.target.closest(".barcode-basket-qty");
    if (!t) return;
    updateBasketQty(Number(t.dataset.index), t.value);
}

function onBasketClick(event) {
    const del = event.target.closest(".barcode-basket-del");
    if (!del) return;
    const index = Number(del.dataset.index);
    if (basket[index]) {
        basket.splice(index, 1);
        renderBasket();
    }
}

function onDraftClick(event) {
    if (event.target.closest("#barcodeDraftCancel")) {
        hideDraft();
        setStatus("جاهز للمسح ✓", "ok");
        return;
    }
    if (event.target.closest("#barcodeDraftSave")) {
        confirmDraft().catch(e => console.error("barcode confirmDraft:", e));
    }
}

/*
 * إغلاق النافذة مرتبط بالـ token: إن فُتحت جلسة أحدث قبل إطلاق hidden.bs.modal لجلسة سابقة، يتجاهل هذا المعالج الجلسة الجديدة بدل إغلاقها بالخطأ | The modal close is token-keyed: if a newer session opened before hidden.bs.modal fired for a previous session, this handler ignores the new session instead of closing it by mistake
 */
async function handleHidden(token) {
    if (!session) return;
    if (token !== undefined && session.token !== token) return;

    const items = pendingFinishItems;
    const cb = callbacks;
    const src = session?.source || cb?.source || "document";
    const opId = session?.op?.id;
    const opStart = session?.op;
    pendingFinishItems = null;

    await teardown(session.token);

    if (!items || !cb?.onFinish) return;
    try {
        const ok = await cb.onFinish(items);
        if (ok !== false) {
            playScanSound("success");
            const noun = items.length === 1 ? "بند" : "بنود";
            showGlobalAlert(`تمت إضافة ${items.length} ${noun} إلى المستند`, "success");
            track("barcode_scan_completed", {
                feature_name: "barcode",
                source: src,
                item_count: items.length,
                operation_id: opId,
                duration_ms: operationDuration(opStart),
            });
        }
    } catch (e) {
        console.error("barcode onFinish error:", e);
        showGlobalAlert("تعذر إضافة المنتجات إلى المستند", "danger");
    }
}

/* ================= Public API | الواجهة العامة ================= */

/**
 * يفتح ماسح الباركود كسلة مسح مؤقتة.
 * @param {{
 *   onCode: (code: string) => Promise<{status:'found', product:object} | {status:'not-found'}>,
 *   onEnsureProduct?: (draft:{name:string,barcode:string,price:number,unit?:string}) => Promise<object|null>,
 *   onFinish?: (items: Array<{product:object, quantity:number}>) => Promise<void|boolean>
 * }} options
 */
export async function runBarcodeScanner(options = {}) {
    /*
     * تسلسل الفتحات: انتظار أي فتح جارٍ بدل تجاهله | Opening chain: await any in-progress open instead of dropping it
     * كان الفتح بعد الإغلاق مباشرة يُهمَل بصمت لأن hidden.bs.modal لم يُطلق بعد، فيبدو للمستخدم أن "الماسح يفتح ثم يغلق" | an open right after close was silently dropped because hidden.bs.modal hadn't fired yet, making the scanner appear to open then close
     */
    if (openingChain) {
        try { await openingChain; } catch (_) {}
    }

    openingChain = (async () => {
        /*
         * جلسة سابقة لم يكتمل تنظيفها (أُغلقت أثناء تشغيل الكاميرا مثلاً): ننهيها وننتظرها — وقد تكون لها بنود معلّقة تُلتزم بـ onFinish | A previous session whose cleanup didn't finish (closed mid camera start): end it and await it — it may have pending items to commit via onFinish
         */
        if (session) await handleHidden(session.token);

        const modalEl = document.getElementById(MODAL_ID);
        const readerEl = document.getElementById(READER_ID);
        if (!modalEl || !readerEl) {
            showGlobalAlert("نافذة الماسح غير متوفرة.", "warning");
            return;
        }

        /* جلسة جديدة كلياً — لا تبعية على instance قديمة | A completely new session — no dependency on an old instance */
        session = {
            token: {},
            scanner: null,
            startPromise: null,
            op: startOperation(),
            source: options.source || "document",
            permissionRequested: false,
            cameraOpened: false,
            closeReason: "closed",
        };
        const token = session.token;
        callbacks = { ...options };
        track("barcode_scan_started", {
            feature_name: "barcode",
            source: session.source,
            entry_point: session.source,
            operation_id: session.op.id,
        });
        pendingFinishItems = null;
        basket = [];
        lastCode = "";
        lastCodeAt = 0;
        codeLost = true;
        processingScan = false;

        renderBasket(true);
        hideDraft();
        const qtyEl = document.getElementById(MANUAL_QTY_ID);
        if (qtyEl) qtyEl.value = "";

        setStatus("جارٍ فتح الكاميرا...");

        bindControls();

        /* انتظر انتهاء أي انتقال إخفاء قائم قبل ربط معالج الإغلاق وإظهار النافذة؛ يمنع حدث hidden قديم (من إغلاق لم يكتمل) من إنهاء الجلسة الجديدة، ويمنع تجاهل show() أثناء الانتقال | Wait out any in-progress hide transition before binding the close handler and showing; prevents a stale hidden event (from a still-pending close) from ending the new session, and prevents show() being ignored during the transition */
        await settleBeforeShow(modalEl);

        modalEl.addEventListener("hidden.bs.modal", () => handleHidden(token), { once: true });
        showModal(modalEl);

        await startCamera(session);
    })();

    try {
        await openingChain;
    } finally {
        openingChain = null;
    }
}

/**
 * يبحث عن المنتج المطابق لقراءة الباركود في قائمة المنتجات الحالية.
 * أولوية المطابقة: حقل barcode ثم sku ثم (id أو name) بنفس النص.
 *
 * The matcher itself now lives in @/services/product-autofill.js so the
 * invoice and the two add-product forms share one implementation; it is
 * re-exported here to keep every existing import site (invoice + vouchers)
 * working untouched.
 */
export { findProductByBarcode };