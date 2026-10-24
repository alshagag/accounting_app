import Script from 'next/script';
import AnalyticsInit from '@/services/analytics/AnalyticsInit.jsx';
import "../styles/globals.css";
import "../styles/PWA.css";
import "../styles/landing.css";



export const metadata = {
  title: 'المحاسب المبسط | إدارة المبيعات والمشتريات',
  description: 'سجّل المنتجات، تابع المبيعات والمشتريات، واحسب صافي الربح من واجهة واحدة سريعة وواضحة.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.svg',
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    title: 'المحاسب المبسط',
    statusBarStyle: 'default',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#198754',
};


export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){function c(e){["__gcruniqueid","__gcrremoteframetoken"].forEach(function(a){if(e.hasAttribute(a))e.removeAttribute(a)})}c(document.documentElement);document.querySelectorAll("[__gcruniqueid],[__gcrremoteframetoken]").forEach(c);new MutationObserver(function(rs){rs.forEach(function(m){if(m.type==="attributes")c(m.target)})}).observe(document.documentElement,{attributes:true,subtree:true})})()` }} />
        <script dangerouslySetInnerHTML={{ __html: `(function(){if('serviceWorker' in navigator && '${process.env.NODE_ENV}' === 'production'){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(err){console.warn('[PWA] SW registration failed:',err);});});}})();` }} />
        {/* أصول المورد تُخدَم ثابتة من /public بنفس الترتيب والتصميم، خارج خط أنابيب CSS الخاص بـ Next عمدًا | Vendor assets are served static from /public in the same order and design, deliberately outside Next's CSS pipeline */}
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link rel="stylesheet" href="/vendor/bootstrap-icons/bootstrap-icons.min.css" />
        {/* eslint-disable-next-line @next/next/no-css-tags */}
        <link href="/vendor/bootstrap/css/bootstrap.rtl.min.css" rel="stylesheet" />
      </head>
      <body>
        {children}
        <AnalyticsInit />
        <Script src="/vendor/bootstrap/js/bootstrap.bundle.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}