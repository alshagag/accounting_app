/* المحاسب المبسط — عامل الخدمة | Simple Accountant — Service Worker
 * يُسجَّل في الإنتاج فقط (راجع layout.js) | Registered only in production (see layout.js).
 * الاستراتيجية | Strategy:
 *  - التنقّل: Network-First مع الرجوع إلى الكاش عند انقطاع الإنترنت | Navigations: Network-First, cache fallback offline.
 *  - أصول نفس المصدر: Stale-While-Revalidate (استجابة فورية + تحديث خلفي) | Same-origin assets: Stale-While-Revalidate (instant reply + background refresh).
 *  - أصول المورد (bootstrap/fonts): تُخزَّن مسبقًا وتُخدَم من الكاش لأوفلاين كامل | Vendor assets (bootstrap/fonts): pre-cached for full offline.
 *  - لا نلمس POST (مثل /api/email) ولا بيانات المستخدم — تُحفظ في IndexedDB وليس بالشبكة | POST (e.g. /api/email) and user data are untouched — stored in IndexedDB, never on the network.
 *  - رفع CACHE_VERSION يُنشئ كاشًا جديدًا ويزيل القديم عند التفعيل | Bumping CACHE_VERSION creates a fresh cache and drops the old one on activate.
 */
const CACHE_VERSION = "v2";
const CACHE = "simple-accounting-shell-" + CACHE_VERSION;

const VENDOR = [
  "/vendor/bootstrap/css/bootstrap.rtl.min.css",
  "/vendor/bootstrap/js/bootstrap.bundle.min.js",
  "/vendor/bootstrap-icons/bootstrap-icons.min.css",
  "/vendor/bootstrap-icons/fonts/bootstrap-icons.woff2",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then(async (cache) => {
        /* الملفات الأساسية تُخزَّن أولًا؛ وكل أصل مورد لوحده حتى لا يفشل التثبيت كليًا عند تعذُّر جلبه | Core files cache first; each vendor asset separately so one failed fetch cannot break the whole install */
        await cache.addAll(["./", "./manifest.webmanifest"]).catch(() => {});
        for (const url of VENDOR) {
          await cache
            .add(url)
            .catch(() => {});
        }
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  /* التنقّل: الشبكة أولًا لتصل التحديثات فورًا، والكاش (أو صفحة البداية) عند انقطاع الاتصال | Navigations: network first so fresh updates load immediately; cached copy (or start page) as offline fallback */
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches
            .open(CACHE)
            .then((cache) => cache.put(request, copy))
            .catch(() => {});
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit || caches.match("./"))
        )
    );
    return;
  }

  /* أصول المورد المعروفة: من الكاش فورًا مع تحديث خلفي عند توفر الشبكة | Known vendor assets: served from cache immediately, refreshed in the background when online */
  if (VENDOR.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((hit) => {
        const update = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches
                .open(CACHE)
                .then((cache) => cache.put(request, copy))
                .catch(() => {});
            }
            return response;
          })
          .catch(() => hit);
        return hit || update;
      })
    );
    return;
  }

  /* أصول من نفس المصدر فقط | Same-origin assets only */
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((hit) => {
      const update = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches
              .open(CACHE)
              .then((cache) => cache.put(request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() => hit);
      return hit || update;
    })
  );
});