"use client";

import { useEffect, useState } from "react";

const STEPS = {
  ios: [
    { title: "افتح من سفاري", detail: "افتح صفحة النظام من متصفح سفاري على الآي فون." },
    {
      arrow: "down",
      title: "اضغط زر المشاركة",
      detail: "زرُّ أسفل الشاشة على شكل مربع بسهم لأعلى — اضغطه.",
    },
    {
      title: "إضافة إلى الشاشة الرئيسية",
      detail: "من قائمة المشاركة اختر «إضافة إلى الشاشة الرئيسية».",
    },
    {
      arrow: "down",
      title: "اضغط «إضافة»",
      detail: "ثم اضغط «إضافة» أعلى القائمة — تظهر الأيقونة على شاشتك الرئيسية.",
    },
  ],
  android: [
    { title: "افتح من المتصفح", detail: "افتح صفحة النظام من متصفح كروم أو Edge." },
    {
      arrow: "upRight",
      title: "افتح القائمة ⋮",
      detail: "اضغط النقاط الثلاث أعلى شاشة المتصفح.",
    },
    {
      title: "اختر التثبيت",
      detail: "اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».",
    },
    { title: "اضغط «تثبيت»", detail: "وظهور الأيقونة فورًا على شاشتك الرئيسية." },
  ],
  desktop: [
    { title: "افتح من المتصفح", detail: "افتح صفحة النظام من كروم أو Edge على الحاسوب." },
    {
      arrow: "upRight",
      title: "زر التثبيت في شريط العنوان",
      detail: "أيقونة تثبيت (سهم لأسفل داخل مربع) تظهر أعلى المتصفح — اضغطها.",
    },
    { title: "اضغط «تثبيت»", detail: "يفتح التطبيق بنافذة مستقلة ويظهر في قائمة البرامج وسطح المكتب." },
  ],
};

function Marker({ arrow, n }) {
  if (arrow === "down") {
    return <span className="install-step-arrow">↓</span>;
  }
  if (arrow === "upRight") {
    return <span className="install-step-arrow" style={{ animationName: "none", transform: "rotate(-45deg) scale(0.8)" }}>↗</span>;
  }
  return <span className="install-step-badge">{n}</span>;
}

export default function InstallModal() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    let intervalId = null;
    let timeoutId = null;

    const stop = () => {
      if (intervalId) { clearInterval(intervalId); intervalId = null; }
      if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
    };

    const detect = (first) => {
      const ua = navigator.userAgent;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        navigator.standalone === true;
      const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
      const android = /Android/.test(ua);
      if (first) setInfo({ standalone, ios, android });

      if (standalone || sessionStorage.getItem("installTipDismissed")) {
        stop();
        return;
      }

      const app = document.getElementById("app");
      const appReady = app && !app.classList.contains("d-none");
      const el = document.getElementById("installModal");
      if (appReady && window.bootstrap && el) {
        window.bootstrap.Modal.getOrCreateInstance(el).show();
        stop();
      }
    };

    detect(true);
    intervalId = setInterval(() => detect(false), 200);
    timeoutId = setTimeout(stop, 20000);

    const el = document.getElementById("installModal");
    const onHidden = () => sessionStorage.setItem("installTipDismissed", "1");
    if (el) el.addEventListener("hidden.bs.modal", onHidden);

    return () => {
      stop();
      if (el) el.removeEventListener("hidden.bs.modal", onHidden);
    };
  }, []);

  const platform = info?.ios ? "ios" : info?.android ? "android" : "desktop";
  const steps = STEPS[platform] || [];

  return (
    <div className="modal fade" id="installModal" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content install-modal-card">

          <div className="modal-header install-modal-header border-0">
            <button
              type="button"
              className="btn-close btn-close-white ms-0 me-auto"
              data-bs-dismiss="modal"
              aria-label="إغلاق"
            />
            <i className="bi bi-phone-fill me-2"></i>
            تثبيت التطبيق على شاشتك
          </div>

          <div className="modal-body pt-3">

            {!info ? (
              <p className="text-center text-muted my-4">جارٍ تجهيز الشرح…</p>
            ) : info.standalone ? (
              <p className="text-center text-success my-4">
                <i className="bi bi-check-circle-fill fs-3"></i>
                <br />
                التطبيق مثبَّت على جهازك بالفعل ✓
              </p>
            ) : (
              <>
                <p className="text-center small text-muted mb-3">
                  يعمل حتى بدون إنترنت، وبياناتك تبقى في جهازك.
                </p>

                <div className="px-2">
                  {steps.map((step, i) => (
                    <div className="install-modal-step" key={i}>
                      <Marker arrow={step.arrow} n={i + 1} />
                      <div>
                        <span className="install-step-title">
                          {i + 1} - {step.title}
                        </span>
                        <p className="install-step-detail">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

          </div>

          <div className="modal-footer justify-content-center border-0 pb-4 pt-0">
            <button
              type="button"
              className="btn btn-success px-4"
              data-bs-dismiss="modal"
            >
              فهمت
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}