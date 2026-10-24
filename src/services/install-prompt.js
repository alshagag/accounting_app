/* مستمع تثبيت PWA: يلتقط beforeinstallprompt ويربطه بزر التثبيت في الهيدر،
   ويُخفي الزر بعد التثبيت الناجح أو عند التشغيل كتطبيق مثبَّت.
   إن لم يتوفر المحفّز الأصلي (مثل سفاري على iOS) يفتح نافذة التعليمات بدلًا منه.
   PWA install listener: captures beforeinstallprompt, wires it to the header install button,
   and hides the button after a successful install or when running as an installed app.
   When no native prompt is available (e.g. iOS Safari) it opens the instructions modal instead. */
let deferredInstallPrompt = null;

export function bindInstallPrompt() {
  const btn = document.getElementById("btnInstallApp");

  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)")?.matches ||
    window.matchMedia?.("(display-mode: minimal-ui)")?.matches ||
    navigator.standalone === true;

  /* التطبيق مثبَّت بالفعل: أخفِ الزر ولا تُسجّل أي مستمع | Already installed: hide the button and skip listeners */
  if (isStandalone) {
    btn?.classList.add("d-none");
    return;
  }

  /* منع الشريط التلقائي الصغير وحفظ الحدث لاستخدامه عند الضغط | Suppress the automatic mini-infobar and stash the event for the button click */
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    btn?.classList.remove("d-none");
  });

  /* بعد التثبيت الناجح أخفِ الزر فورًا | Hide the button right after a successful install */
  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    btn?.classList.add("d-none");
  });

  btn?.addEventListener("click", async () => {
    /* المحفّز الأصلي متاح: اعرض نافذة المتصفح وتعامل مع القبول أو الرفض | Native prompt available: show it and handle accept or dismiss */
    if (deferredInstallPrompt) {
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null; /* الحدث للاستخدام الواحد | The event is one-shot */
      promptEvent.prompt();
      try {
        const { outcome } = await promptEvent.userChoice;
        if (outcome === "accepted") {
          /* حدث appinstalled سيُخفِ الزر أيضًا | The appinstalled event will hide the button too */
          btn.classList.add("d-none");
        }
        /* رفض: أبقِ الزر ظاهرًا؛ المحفّز يعود عبر beforeinstallprompt في زيارة قادمة | Dismissed: keep the button visible; the prompt re-arrives via beforeinstallprompt on a later visit */
      } catch {
        /* بعض المتصفحات ترمي هنا؛ افتح التعليمات كخطة بديلة | Some browsers throw here; fall back to the instructions modal */
        showInstallInstructions();
      }
      return;
    }

    /* لا محفّز أصلي (iOS وغيره): افتح نافذة التعليمات | No native prompt (iOS etc.): open the instructions modal */
    showInstallInstructions();
  });
}

function showInstallInstructions() {
  const modalEl = document.getElementById("installModal");
  if (modalEl && window.bootstrap) {
    window.bootstrap.Modal.getOrCreateInstance(modalEl).show();
  }
}
