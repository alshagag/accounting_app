/**
 * Google Analytics (GA4) + Events Tracker
 */

const GA_ID = "G-817SG5NPXG";

/* =========================
   INIT GOOGLE ANALYTICS
========================= */
export function initTags() {
  if (window.__ga_initialized) return;
  window.__ga_initialized = true;

  // DataLayer
  window.dataLayer = window.dataLayer || [];

  // gtag function
  window.gtag = function () {
    window.dataLayer.push(arguments);
  };

  // تحميل سكربت Google Analytics
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;

  document.head.appendChild(script);

  // تهيئة مباشرة (أفضل من onload)
  window.gtag("js", new Date());

  window.gtag("config", GA_ID, {
    send_page_view: true,
    debug_mode: true,
  });
}

/* =========================
   GENERIC EVENT TRACKER
========================= */
export function track(eventName, params = {}) {
  if (!window.gtag) return;

  window.gtag("event", eventName, params);
}

/* =========================
   CUSTOM EVENTS
========================= */

export const trackAddProduct = (name, price) => {
  track("add_product", {
    item_name: name,
    value: price,
  });
};

export const trackTransaction = (type, product, qty) => {
  track("add_transaction", {
    transaction_type: type,
    item_name: product,
    quantity: qty,
  });
};

export const trackFeedback = (rating) => {
  track("send_feedback", {
    rating,
  });
};

export const trackModal = (name) => {
  track("open_modal", {
    modal_name: name,
  });
};

/* =========================
   PAGE VIEW TRACKING
========================= */
export function trackPageView(path) {
  if (!window.gtag) return;

  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
  });
}

/* =========================
   ERROR TRACKING
========================= */
export function initErrorTracking() {
  // JavaScript Errors
  window.onerror = function (message, source, lineno, colno, error) {
    sendError({
      message,
      source,
      lineno,
      colno,
      stack: error?.stack,
    });
  };

  // Promise Errors
  window.addEventListener("unhandledrejection", (event) => {
    sendError({
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
    });
  });
}

/* =========================
   SEND ERROR TO GA4
========================= */
export function sendError(error) {
  if (!window.gtag) return;

  window.gtag("event", "exception", {
    description: error.message || "Unknown error",
    fatal: false,
    error_source: error.source || "",
    line: error.lineno || 0,
  });
}