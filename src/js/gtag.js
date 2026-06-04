/**
 * Google Analytics (GA4) + Events
 */

const GA_ID = "G-817SG5NPXG";

/* =========================
   INIT GOOGLE TAG
========================= */
export function initTags() {
  if (window.__ga_initialized) return;
  window.__ga_initialized = true;

  window.dataLayer = window.dataLayer || [];

  function gtag(){dataLayer.push(arguments);}
  window.gtag = gtag;

  const script = document.createElement("script");
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.async = true;

  document.head.appendChild(script);

  script.onload = () => {
    gtag("js", new Date());
    gtag("config", GA_ID, {
      send_page_view: true,
      debug_mode: true,
    });
  };
}

/* =========================
   GENERAL TRACKER
========================= */
export function track(eventName, params = {}) {
  if (window.gtag) {
    window.gtag("event", eventName, params);
  }
}

/* =========================
   CUSTOM EVENTS (مشروعك)
========================= */

export const trackAddProduct = (name, price) => {
  track("add_product", { name, price });
};

export const trackTransaction = (type, product, qty) => {
  track("add_transaction", { type, product, qty });
};

export const trackFeedback = (rating) => {
  track("send_feedback", { rating });
};

export const trackModal = (name) => {
  track("open_modal", { name });
};

/* =========================
   PAGE VIEW TRACKING (NEW)
========================= */
export function trackPageView(path) {
  window.gtag?.("event", "page_view", {
    page_path: path,
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
  window.gtag?.("event", "exception", {
    description: error.message || "Unknown error",
    fatal: false,
    error_source: error.source || "",
    line: error.lineno || "",
  });
}