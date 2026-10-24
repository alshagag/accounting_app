"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { initTags, trackPageView, hasConsent } from "./gtag.js";

/**
 * تهيئة التحليلات + تتبّع المشاهدات | Analytics init + page views.
 *
 * - لافتة الموافقة تُرسم من الملف المشترك (public/analytics/gtag.js) فلا حاجة لها هنا.
 * - لا يُحمَّل GA4 إلا بعد موافقة المستخدم (initTags تعرض اللافتة إن لم توجد موافقة).
 * The consent banner is rendered by the shared file (public/analytics/gtag.js), so none here.
 * GA4 is only initialized after consent (initTags shows the banner when undecided).
 */
export default function AnalyticsInit() {
    const pathname = usePathname();

    /* تهيئة مرة واحدة عند التركيب (تُظهر اللافتة أو تُهيّئ حسب الموافقة) | Init once on mount (shows banner or inits per consent) */
    useEffect(() => {
        initTags();
    }, []);

    /* تتبّع المشاهدة عند كل تنقّل، وعند منح الموافقة | Track page view on navigation and on consent grant */
    useEffect(() => {
        const send = () => {
            if (hasConsent()) trackPageView(pathname);
        };
        send();
        window.addEventListener("analytics-consent", send);
        return () => window.removeEventListener("analytics-consent", send);
    }, [pathname]);

    return null;
}
