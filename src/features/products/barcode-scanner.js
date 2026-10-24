/* ================= ماسح الباركود | Barcode Scanner ================= */
/* مسح الكاميرا عبر html5-qrcode (ZXing) بلا BarcodeDetector — يعمل على Chrome وSafari وEdge | Camera scanning via html5-qrcode (ZXing), no BarcodeDetector — works on Chrome, Safari & Edge */
/* جلسة كاميرا واحدة فقط وكل جلسة سابقة تُوقَف قبل الجديدة؛ وعند الإغلاق تُحرَّر الكاميرا كاملاً (stop ثم clear ثم إيقاف كل tracks الفيديو) | One camera session only, each prior session stopped first; on close the camera is fully released (stop, clear, then stop all video tracks) */
/* عند فشل start() يُحرَّر الـ instance قبل الرمي وNotReadableError/AbortError يُعاد المحاولة مرة وstartPromise يمنع تشغيل ماسحَين | On start() failure the instance is released before rethrowing; NotReadableError/AbortError retries once; startPromise prevents two scanners */

import { showGlobalAlert, playScanSound } from "@/components/ui.js";
import { track, startOperation, operationDuration } from "@/services/analytics/gtag.js";

/* تحميل كسول لمكتبة html5-qrcode (ثقيلة: محرك ZXing وتشغيل الكاميرا) عند فتح الماسح فقط لا مع حزمة البداية | Lazy-load html5-qrcode (heavy: ZXing engine + camera) only when the scanner opens, not in the initial bundle */
let html5QrcodePromise = null;
function getHtml5Qrcode() {
    if (!html5QrcodePromise) html5QrcodePromise = import("html5-qrcode");
    return html5QrcodePromise;
}

const MODAL_ID = "quickBarcodeScannerModal";
const SCANNER_ID = "quickBarcodeScannerView";
// نفس حسّاسية ماسح الفواتير: تمنع تكرار الإطار وتسمح بإعادة مسح سريعة | Same sensitivity as the invoice scanner: blocks duplicate frames while allowing a quick rescan
const DUP_WINDOW_MS = 450;

/* رفض AbortError متوقّع من إزالة عنصر الفيديو أثناء play() عند الإغلاق، يظهر كاستثناء غير معالَج في Console لذا يُكتم عند تحقق الشرط فقط | A benign AbortError from removing the video element during play() on close appears as an unhandled Console exception, so it is silenced only when that condition matches */
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    window.addEventListener("unhandledrejection", (e) => {
        const r = e.reason;
        if (r?.name === "AbortError" && /play\(\)|media was removed/i.test(String(r?.message || ""))) {
            e.preventDefault();
        }
    });
}

const SCAN_CONFIG = {
    fps: 24,
    qrbox: { width: 280, height: 150 },
    aspectRatio: 4 / 3,
};

const VIDEO_CONSTRAINTS = {
    facingMode: "environment",
};

/* أخطاء الأذونات لا يُعاد المحاولة عليها آلياً | Permission errors are not retried automatically */
const PERMISSION_ERRORS = new Set(["NotAllowedError", "SecurityError"]);

/* رسالة واضحة لكل نوع خطأ من getUserMedia | A clear message per getUserMedia error type */
const CAMERA_ERRORS = {
    NotAllowedError: "تم رفض إذن الكاميرا — اسمح بالوصول من إعدادات المتصفح ثم أعد المحاولة",
    SecurityError: "المتصفح يمنع الكاميرا — افتح الصفحة عبر HTTPS ثم أعد المحاولة",
    NotFoundError: "لا توجد كاميرا متاحة على هذا الجهاز",
    NotReadableError: "الكاميرا مستخدمة من تطبيق آخر — أغلقه ثم أعد المحاولة",
    OverconstrainedError: "تعذّر تشغيل الكاميرا بالمعايير المطلوبة",
    AbortError: "تم إلغاء تشغيل الكاميرا — أعد المحاولة",
};

let activeScanner = null; // شكل الجلسة النشطة: { modalId, stop } أو null | Active session shape: { modalId, stop } or null
let startPromise = null; // يمنع تشغيل ماسحَين معاً وينتظر أي تشغيل سابق | Prevents two concurrent scanners and waits for any prior start

function isCameraBusyError(err) {
    return !!err && (err.name === "NotReadableError" || err.name === "AbortError");
}

function cameraErrorMessage(err) {
    return (
        CAMERA_ERRORS[err?.name] ||
        "تعذر تشغيل الكاميرا. تأكد من السماح باستخدامها ثم حاول مرة أخرى."
    );
}

/* مصدر فتح الماسح لتقرير نقطة الدخول | Scan entry point label */
function scanSourceFor(modalId) {
    if (modalId === "quickBarcodeScannerModal") return "products_quick";
    if (modalId === "productEditBarcodeScannerModal") return "product_full_editor";
    return "unknown";
}

/* تحرير الكاميرا على مستوى الصفحة بإيقاف كل tracks أي <video>؛ تدفّق متسرب من جلسة سابقة يجعل getUserMedia يرمي NotReadableError | Page-wide camera release stops the tracks of every <video>; a stream leaked from a prior session makes getUserMedia throw NotReadableError */
function releaseVideoStreams(root) {
    const videos = new Set();
    if (root && root.querySelectorAll) root.querySelectorAll("video").forEach(v => videos.add(v));
    document.querySelectorAll("video").forEach(v => videos.add(v));

    videos.forEach(v => {
        const stream = v.srcObject;
        if (stream && typeof stream.getTracks === "function") {
            stream.getTracks().forEach(t => {
                try { t.stop(); } catch (_) {}
            });
        }
        try { v.srcObject = null; } catch (_) {}
        try { v.pause(); } catch (_) {}
    });
}

function mountModal(modalId, containerId) {
    /* إعادة استخدام عنصر النافذة نفسه بدل حذفه وإنشائه؛ الحذف يترك modal-backdrop و body.modal-open معلّقين فيبدو الماسح كأنه يفتح ويغلق فوراً | Reuse the same modal element instead of removing and recreating it; removal leaves modal-backdrop and body.modal-open stuck so the scanner seems to flash open and closed */
    const existing = document.getElementById(modalId);
    if (existing) {
        if (!document.getElementById(containerId)) {
            const holder = existing.querySelector(".modal-body");
            if (holder) {
                const c = document.createElement("div");
                c.id = containerId;
                c.style.width = "100%";
                holder.insertBefore(c, holder.firstChild);
            }
        }
        return existing;
    }

    const html = `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">امسح الباركود</h5>
                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body p-0 text-center position-relative">
                <div id="${containerId}" style="width:100%;"></div>
                <div style="position: absolute; top: 50%; left: 5%; right: 5%; height: 2px; background: rgba(255, 0, 0, 0.7); box-shadow: 0 0 10px rgba(255, 0, 0, 0.7); pointer-events: none;"></div>
              </div>
            </div>
          </div>
        </div>`;
    document.body.insertAdjacentHTML("beforeend", html);
    return document.getElementById(modalId);
}

/* Bootstrap 5 يرفض show() بصمت أثناء انتقال الإخفاء (‎_isTransitioning‎)، فإعادة الفتح السريعة بعد الإغلاق أو مباشرة بعد مسح ناجح تُهمَل وتبدو الكاميرا كأنها أُغلقت نهائياً؛ ننتظر انتهاء الانتقال قبل الإظهار | Bootstrap 5 silently ignores show() during the hide transition (_isTransitioning), so a quick reopen after close or right after a successful scan is dropped and the camera looks permanently closed; we wait for the transition to finish before showing */
function settleBeforeShow(modalEl, modal) {
    const inst = modal || window.bootstrap?.Modal?.getInstance?.(modalEl);
    if (!inst || inst._isShown || !inst._isTransitioning) return Promise.resolve();
    return new Promise(resolve => {
        let done = false;
        const fin = () => { if (done) return; done = true; clearTimeout(timer); resolve(); };
        const timer = setTimeout(fin, 700);
        modalEl.addEventListener("hidden.bs.modal", fin, { once: true });
    });
}

/* نبني <video> عبر مكتبة html5-qrcode التي تأخذ عرضه من clientWidth للحاوية؛ إن كانت الحاوية بلا عرض بعد (لأن نافذة Bootstrap تكتمل بالتدريج) خرج الفيديو بعرض 0px بلا صورة مع نجاح التدفق، لذا ننتظر عرضاً حقيقياً قبل التشغيل | html5-qrcode sizes its <video> from the container's clientWidth; if the container has no width yet (because the Bootstrap modal reveals progressively) the video comes out 0px wide with no picture despite a successful stream, so we wait for a real width before starting */
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

export async function openBarcodeScanner({ modalId, containerId, onDetected } = {}) {
    if (!modalId || !containerId) return;

    /* 1) إغلاق أي جلسة قائمة وانتظار تحريرها لمنع تعدد الكاميرات | 1) Close any active session and wait for its release to prevent multiple cameras */
    if (activeScanner) {
        const prev = activeScanner;
        activeScanner = null;
        await prev.stop();
    }
    /* 2) انتظار أي تشغيل معلّق (حماية من تكرار decodeFromVideoDevice) | 2) Wait for any pending start (guards against duplicate decodeFromVideoDevice) */
    if (startPromise) {
        try { await startPromise; } catch (_) {}
        startPromise = null;
    }

    const modalEl = mountModal(modalId, containerId);
    const containerEl = document.getElementById(containerId);
    if (!modalEl || !containerEl) return;

    /* تحليلات الجلسة | Session analytics — تُميّز فتح النافذة عن نجاح الكاميرا فعليًا */
    const op = startOperation();
    const scanSource = scanSourceFor(modalId);
    let permissionRequested = false;
    let cameraOpened = false;
    let closeReason = "closed";
    track("barcode_scan_started", {
        feature_name: "barcode",
        source: scanSource,
        entry_point: scanSource,
        operation_id: op.id,
    });

    const modal = window.bootstrap.Modal.getOrCreateInstance(modalEl);
    let html5QrCode = null;
    let ownedStream = null;
    let lastRaw = null;
    let lastTime = 0;
    let isShown = false;
    let isStopped = false;

    /* تحرير كامل يُنفَّذ مرة واحدة فقط (idempotent) | Full teardown that runs only once (idempotent) */
    const stop = async () => {
        if (isStopped) return;
        isStopped = true;
        console.debug("[BarcodeScanner] stop: releasing camera resources");
        if (activeScanner && activeScanner.stop === stop) activeScanner = null;

        try { if (startPromise) await startPromise; } catch (_) {}
        startPromise = null;

        const inst = html5QrCode;
        html5QrCode = null;
        if (inst) {
            try { if (typeof inst.stop === "function") await inst.stop(); } catch (_) {}
            try { inst.clear(); } catch (_) {}
        }

        if (ownedStream && typeof ownedStream.getTracks === "function") {
            ownedStream.getTracks().forEach(t => {
                try { t.stop(); } catch (_) {}
            });
        }
        ownedStream = null;

        releaseVideoStreams(containerEl);
        try { containerEl.innerHTML = ""; } catch (_) {}

        track("barcode_scan_closed", {
            feature_name: "barcode",
            close_reason: closeReason,
            source: scanSource,
            operation_id: op.id,
            duration_ms: operationDuration(op),
        });

        /* إغلاق النافذة مع انتظار انتهاء انتقال Bootstrap؛ بدون الانتظار يُتجاهل show() أثناء انتقال الإخفاء فيبدو أن الماسح يفتح ثم يغلق | Close the modal while awaiting Bootstrap's transition; otherwise show() is ignored during the hide transition and the scanner seems to open then close */
        if (isShown && modalEl.classList.contains("show")) {
            isShown = false;
            try {
                await new Promise(resolve => {
                    let done = false;
                    const fin = () => {
                        if (done) return;
                        done = true;
                        clearTimeout(timer);
                        resolve();
                    };
                    const timer = setTimeout(fin, 700);
                    modalEl.addEventListener("hidden.bs.modal", fin, { once: true });
                    modal.hide();
                });
            } catch (_) {}
        } else {
            isShown = false;
        }
    };

    activeScanner = { modalId, stop };

    /* انتظر انتهاء أي انتقال إخفاء قائم قبل ربط معالج الإغلاق وإظهار النافذة؛ يمنع التقاط حدث hidden قديم (من إغلاق سابق لم يكتمل بعد) فيُغلق الجلسة الجديدة فوراً، ويمنع أيضاً تجاهل show() أثناء الانتقال | Wait out any in-progress hide transition before binding the close handler and showing; prevents a stale hidden event (from a still-pending previous close) from tearing down the new session immediately, and prevents show() being ignored during the transition */
    await settleBeforeShow(modalEl, modal);
    if (isStopped) return;
    modalEl.addEventListener("hidden.bs.modal", () => {
        if (closeReason === "closed") closeReason = "manual_close";
        stop();
    }, { once: true });

    /* 3) تحرير أي تدفّق متبقٍ قبل طلب الكاميرا لحسم NotReadableError | 3) Release any remaining stream before requesting the camera to resolve NotReadableError */
    releaseVideoStreams(containerEl);

    const handleScan = async (decodedText) => {
        const raw = String(decodedText || "").trim();
        const now = Date.now();
        if (!raw) return;
        if (raw === lastRaw && now - lastTime < DUP_WINDOW_MS) return;
        lastRaw = raw;
        lastTime = now;

        /* تحرير الكاميرا بالكامل قبل الاستدعاء لضمان عمل «مسح منتج تالٍ» | Fully release the camera before the callback so "scan next product" works */
        closeReason = "scanned";
        await stop();
        playBarcodeBeep();
        if (typeof onDetected === "function") onDetected(raw);
        showGlobalAlert("تم قراءة الباركود بنجاح", "success");
        track("barcode_scan_success", {
            feature_name: "barcode",
            source: scanSource,
            operation_id: op.id,
            duration_ms: operationDuration(op),
        });
        track("barcode_scan_completed", {
            feature_name: "barcode",
            source: scanSource,
            operation_id: op.id,
            entry_point: scanSource,
        });
    };

    const startInstance = async (cameraIdOrConfig) => {
        const { Html5Qrcode } = await getHtml5Qrcode();
        const instance = new Html5Qrcode(containerId);
        try {
            console.debug("[BarcodeScanner] start: requesting camera");
            if (!permissionRequested) {
                permissionRequested = true;
                track("barcode_camera_permission_requested", {
                    feature_name: "barcode",
                    source: scanSource,
                    operation_id: op.id,
                });
            }
            await instance.start(cameraIdOrConfig, SCAN_CONFIG, handleScan, () => {});
            console.debug("[BarcodeScanner] ready: camera scanning");
            if (!cameraOpened) {
                cameraOpened = true;
                track("barcode_camera_open_success", {
                    feature_name: "barcode",
                    source: scanSource,
                    operation_id: op.id,
                });
            }
        } catch (err) {
            /* مهم: لا يُترك الـ instance بلا تنظيف وإلا حاولت الجلسة التالية الكاميرا المحتجَزة | Crucial: never drop the instance without cleanup, or the next session tries a still-held camera */
            try { await instance.stop(); } catch (_) {}
            try { instance.clear(); } catch (_) {}
            throw err;
        }
        const video = containerEl.querySelector("video");
        ownedStream = video ? video.srcObject : null;
        return instance;
    };

    isShown = true;
    try {
        modal.show();
    } catch (_) {}
    await new Promise(resolve => {
        let done = false;
        const fin = () => {
            if (done) return;
            done = true;
            resolve();
        };
        modalEl.addEventListener("shown.bs.modal", fin, { once: true });
        setTimeout(fin, 1500); // مهلة احتياطية إن لم يُطلق Bootstrap الحدث | Fallback timeout if Bootstrap does not fire the event
    });

    if (isStopped) return;

    /* حتى بعد حدث shown.bs.modal قد تبقى الحاوية بلا عرض لحظةً؛ نضمن عرضاً حقيقياً قبل بناء الفيديو | Even after shown.bs.modal the container may briefly have no width; guarantee a real width before the video is built */
    await whenLayoutReady(containerEl);
    if (isStopped) return;

    try {
        startPromise = (async () => {
            try {
                html5QrCode = await startInstance(VIDEO_CONSTRAINTS);
                return;
            } catch (firstErr) {
                console.warn("[BarcodeScanner] start failed, recovering:", firstErr);
                if (PERMISSION_ERRORS.has(firstErr?.name)) throw firstErr;

                /* الكاميرا مشغولة (غالباً من تدفّق متسرب) → تحرير وإعادة محاولة واحدة | Camera busy (likely a leaked stream) → release and retry once */
                if (isCameraBusyError(firstErr)) {
                    releaseVideoStreams();
                    await new Promise(r => setTimeout(r, 160));
                    html5QrCode = await startInstance(VIDEO_CONSTRAINTS);
                    return;
                }

                let cameras = [];
                try {
                    const { Html5Qrcode } = await getHtml5Qrcode();
                    cameras = await Html5Qrcode.getCameras();
                } catch (camErr) {
                    console.warn("[BarcodeScanner] could not enumerate cameras:", camErr);
                }
                if (!cameras || !cameras.length) throw firstErr;
                html5QrCode = await startInstance(cameras[0].id);
            }
        })();
        await startPromise;
    } catch (err) {
        console.error("[BarcodeScanner] start failed:", err);
        track("barcode_camera_open_failed", {
            feature_name: "barcode",
            failure_reason: err?.name || "unknown",
            source: scanSource,
            operation_id: op.id,
        });
        closeReason = "error";
        playScanSound("error");
        showGlobalAlert(cameraErrorMessage(err), "danger");
        await stop();
    } finally {
        startPromise = null;
    }
}

export function playBarcodeBeep() {
    playScanSound("success");
}

export async function startQuickProductBarcodeScanner({ onDetected } = {}) {
    await openBarcodeScanner({
        modalId: MODAL_ID,
        containerId: SCANNER_ID,
        onDetected,
    });
}
