/**
 * متتبّع GA4 الموحّد — ملف واحد مشترك بين التطبيق الحديث والإصدارات القديمة
 * Unified GA4 tracker — a single file shared by the modern app and legacy versions.
 *
 * يُستورَد بطريقتين | Imported in two ways:
 *   1) التطبيق الحديث: `import { track } from "@/services/analytics/gtag.js"` (الملف الحالي مُعاد تصديره | this file is re-exported).
 *   2) الإصدارات القديمة: `<script type="module">import { initTags } from "/analytics/gtag.js"; initTags({ pageView: true });</script>`.
 *
 * الخصوصية | Privacy:
 *   - لا تُرسل أي بيانات شخصية أو مالية أو محتويات حقول | No PII, financial data or field contents.
 *   - تُفلتر كل المعلمات عبر قائمة سماح | Every param is filtered through a whitelist.
 *   - لا شيء يُرسل قبل موافقة المستخدم، ولافتة الموافقة مرسومة هنا فتعمل على كل الإصدارات بلا تكرار.
 *     Nothing is sent before consent; the consent banner is rendered here so it works on all versions without duplication.
 *   - فشل التحليل لا يؤثر على العملية الأصلية | Analytics failure never affects the original operation.
 */

export const GA_ID = "G-817SG5NPXG";

/* مفتاح الموافقة في localStorage | Consent key in localStorage */
const CONSENT_KEY = "analyticsConsent";
export const CONSENT_GRANTED = "granted";
export const CONSENT_DENIED = "denied";

/* معرّف لافتة الموافقة المشتركة | Shared consent banner id */
const BANNER_ID = "__ga_consent_banner";

/*
 * قائمة معلمات مسموح بها فقط — أي مفتاح خارجها يُتجاهل حتى لو مُرِّر بالخطأ،
 * وهذا يمنع تسرّب الأسماء أو الأرقام أو المبالغ | Whitelist of allowed params — any
 * key outside it is dropped even if passed by mistake, preventing names/amounts leaks.
 */
const ALLOWED_PARAMS = new Set([
    "feature_name",
    "action_type",
    "page_name",
    "operation_status",
    "failure_reason",
    "entry_point",
    "duration_ms",
    "operation_id",
    "doc_type",
    "voucher_type",
    "party_type",
    "source",
    "method",
    "line_count",
    "item_count",
    "close_reason",
    "error_code",
    "device_type",
    "step",
    "count",
    "scan_source",
]);

/* حالة التهيئة | Init state */
let initialized = false;

/* طلب مشاهدة صفحة مؤجّل حتى الموافقة (للإصدارات القديمة) | Pending page view until consent (legacy pages) */
let pendingPageView = false;

/* ================= الموافقة | Consent ================= */

export function getConsent() {
    try {
        return localStorage.getItem(CONSENT_KEY) || null;
    } catch (_) {
        return null;
    }
}

export function hasConsent() {
    return getConsent() === CONSENT_GRANTED;
}

export function setConsent(value) {
    const v = value === CONSENT_GRANTED ? CONSENT_GRANTED : CONSENT_DENIED;
    try {
        localStorage.setItem(CONSENT_KEY, v);
    } catch (_) {}
    removeConsentBanner();
    if (v === CONSENT_GRANTED) initTags();
    if (typeof window !== "undefined") {
        try {
            window.dispatchEvent(new CustomEvent("analytics-consent", { detail: v }));
        } catch (_) {}
    }
}

/* ================= البيئة | Environment ================= */

/*
 * اكتشاف التطوير المحلي بلا أي طلب شبكة | Detect local development with no network request.
 * يشمل: localhost / 127.0.0.1 / ::1 / 0.0.0.0 / file:// (مضيف فارغ) / نطاقات التطوير .localhost/.local/.test
 */
export function isLocalEnvironment() {
    if (typeof window === "undefined") return false;
    try {
        const h = window.location.hostname;
        return (
            h === "localhost" ||
            h === "127.0.0.1" ||
            h === "::1" ||
            h === "0.0.0.0" ||
            h === "" ||
            /\.localhost$/.test(h) ||
            /\.local$/.test(h) ||
            /\.test$/.test(h)
        );
    } catch (_) {
        return false;
    }
}

/* ================= التهيئة | Init ================= */

/*
 * options.pageView = true → إرسال مشاهد صفحة واحدة بعد التهيئة (تُستخدم في الإصدارات القديمة الثابتة).
 * في التطبيق الحديث تُرسل المشاهدات يدويًا من AnalyticsInit بعد كل تنقّل.
 * options.pageView = true → send a single page view after init (used by legacy static pages).
 * In the modern app, page views are sent manually from AnalyticsInit on each navigation.
 */
export function initTags(options) {
    if (typeof window === "undefined") return;
    if (options && options.pageView) pendingPageView = true;

    if (initialized || window.__ga_initialized) {
        if (pendingPageView && hasConsent()) flushPendingPageView();
        return;
    }

    /* بوابة الخصوصية: لا تهيئة بلا موافقة — نعرض اللافتة المشتركة بدلاً من ذلك | Privacy gate: no init without consent — render the shared banner instead */
    if (!hasConsent()) {
        renderConsentBanner();
        return;
    }

    try {
        initialized = true;
        window.__ga_initialized = true;

        window.dataLayer = window.dataLayer || [];
        window.gtag =
            window.gtag ||
            function () {
                window.dataLayer.push(arguments);
            };

        window.gtag("js", new Date());

        /*
         * إعدادات القياس | Measurement config:
         * - على الإنتاج: بلا أي إعداد إضافي (أقصى خصوصية ودقة) — لا cookie_domain ولا debug_mode.
         * - محلياً فقط: cookie_domain='none' لمنع مشاكل نطاق الكوكي، و debug_mode=true لظهور فوري في DebugView.
         * send_page_view=false لأن المشاهدات تُرسل يدويًا لمنع التكرار.
         */
        const config = {
            send_page_view: false,
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
        };
        if (isLocalEnvironment()) {
            config.cookie_domain = "none";
            config.debug_mode = true;
        }
        window.gtag("config", GA_ID, config);

        const script = document.createElement("script");
        script.async = true;
        script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
        document.head.appendChild(script);

        initErrorTracking();

        if (pendingPageView) flushPendingPageView();

        /* للتطوير فقط: يتيح اختبار التعقيم من الـConsole عبر window.__gaTrack(...) — غير موجود على النطاق الحقيقي */
        if (isLocalEnvironment()) window.__gaTrack = track;
    } catch (e) {
        console.warn("[analytics] init failed:", e);
    }
}

function flushPendingPageView() {
    pendingPageView = false;
    trackPageView();
}

/* ================= لافتة الموافقة المشتركة | Shared consent banner ================= */

function renderConsentBanner() {
    if (typeof document === "undefined") return;
    if (document.getElementById(BANNER_ID)) return;

    const el = document.createElement("div");
    el.id = BANNER_ID;
    el.setAttribute("dir", "rtl");
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-label", "موافقة التحليلات");
    el.style.cssText =
        "position:fixed;inset-inline:0;bottom:0;z-index:2000;background:#fff;" +
        "border-top:2px solid #198754;box-shadow:0 -4px 16px rgba(0,0,0,.12);" +
        "padding:12px 16px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;" +
        "justify-content:space-between;font-size:0.9rem;" +
        "font-family:system-ui,-apple-system,'Segoe UI',Tahoma,Arial,sans-serif;color:#212529";

    const msg = document.createElement("span");
    msg.style.cssText = "flex:1 1 260px";
    msg.textContent =
        "نستخدم إحصاءات استخدام مجهولة (Google Analytics) لتحسين التطبيق. لا تُرسل أي بيانات مالية أو شخصية.";

    const actions = document.createElement("span");
    actions.style.cssText = "display:flex;gap:8px;flex:0 0 auto";

    const accept = document.createElement("button");
    accept.type = "button";
    accept.textContent = "موافق";
    accept.style.cssText =
        "background:#198754;color:#fff;border:0;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:0.85rem";
    accept.addEventListener("click", () => setConsent(CONSENT_GRANTED));

    const reject = document.createElement("button");
    reject.type = "button";
    reject.textContent = "رفض";
    reject.style.cssText =
        "background:transparent;color:#6c757d;border:1px solid #6c757d;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:0.85rem";
    reject.addEventListener("click", () => setConsent(CONSENT_DENIED));

    actions.appendChild(accept);
    actions.appendChild(reject);
    el.appendChild(msg);
    el.appendChild(actions);
    (document.body || document.documentElement).appendChild(el);
}

function removeConsentBanner() {
    if (typeof document === "undefined") return;
    const el = document.getElementById(BANNER_ID);
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

/* ================= تعقيم المعلمات | Param sanitization ================= */

function sanitize(params) {
    const out = {};
    if (!params || typeof params !== "object") return out;

    for (const [key, value] of Object.entries(params)) {
        if (!ALLOWED_PARAMS.has(key)) continue;
        if (value === null || value === undefined || value === "") continue;

        if (typeof value === "number") {
            if (Number.isFinite(value)) out[key] = Math.round(value * 100) / 100;
        } else if (typeof value === "boolean") {
            out[key] = value ? 1 : 0;
        } else {
            out[key] = String(value).slice(0, 100);
        }
    }
    return out;
}

/* ================= المتتبّع العام | Generic tracker ================= */

export function track(eventName, params = {}) {
    if (typeof window === "undefined") return;
    if (!initialized && !window.__ga_initialized) return;
    if (!hasConsent() || !eventName || !window.gtag) return;
    try {
        window.gtag("event", eventName, sanitize(params));
    } catch (e) {
        /* فشل التحليل لا يعطّل التطبيق | Analytics failure must not break the app */
        console.warn("[analytics] track failed:", e);
    }
}

/* ================= معرّف العملية | Operation (funnel) helpers ================= */

export function newOperationId() {
    try {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
            return crypto.randomUUID().slice(0, 18);
        }
    } catch (_) {}
    return "op-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

/* يبدأ عملية قابلة للقياس — يُعيد { id, t } | Starts a measurable operation — returns { id, t } */
export function startOperation() {
    return { id: newOperationId(), t: Date.now() };
}

export function operationDuration(op) {
    return op && op.t ? Date.now() - op.t : undefined;
}

/* ================= الأخطاء | Errors ================= */

export function trackError(error, context = {}) {
    const code = String(error?.name || error?.code || "unknown").slice(0, 40);
    track("app_error", {
        feature_name: context.feature_name,
        action_type: context.action_type,
        error_code: code,
        operation_status: "failed",
    });
}

/* توافق خلفي | Backwards compatibility */
export function sendError(error) {
    trackError(error);
}

export function initErrorTracking() {
    if (typeof window === "undefined" || window.__ga_error_tracking) return;
    window.__ga_error_tracking = true;

    window.addEventListener("error", (event) => {
        trackError(event?.error || { name: "Error" }, { feature_name: "app" });
    });
    window.addEventListener("unhandledrejection", (event) => {
        trackError(event?.reason || { name: "UnhandledRejection" }, { feature_name: "app" });
    });
}

/* ================= مشاهدات الصفحة | Page views ================= */

function pageNameFromPath(path) {
    if (!path || path === "/") return "landing";
    if (path.indexOf("/accounting") === 0) return "accounting";
    return "other";
}

export function trackPageView(path, name) {
    if (typeof window === "undefined") return;
    if (!initialized && !window.__ga_initialized) return;
    if (!hasConsent() || !window.gtag) return;
    try {
        const pagePath = path || window.location.pathname;
        window.gtag("event", "page_view", {
            page_path: pagePath,
            page_name: name || pageNameFromPath(pagePath),
        });
    } catch (e) {
        console.warn("[analytics] page_view failed:", e);
    }
}

/*
 * واجهة عامة للإصدارات القديمة التي لا تستخدم وحدات ESM (مثل v1.0 ذات السكربت المضمّن).
 * Global API for legacy pages that don't use ESM modules (e.g. v1.0 with an inline classic script).
 * لا تؤثّر على التطبيق الحديث | No effect on the modern app.
 */
if (typeof window !== "undefined") {
    window.__ga = window.__ga || {
        GA_ID,
        getConsent,
        hasConsent,
        setConsent,
        isLocalEnvironment,
        initTags,
        track,
        trackPageView,
        newOperationId,
        startOperation,
        operationDuration,
        trackError,
        sendError,
        initErrorTracking,
    };
}
