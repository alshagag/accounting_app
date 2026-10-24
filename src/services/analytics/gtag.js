/**
 * واجهة إعادة تصدير فقط | Re-export shim only.
 *
 * الملف المصدر الوحيد للتتبّع هو: public/analytics/gtag.js
 * يُعاد تصديره هنا ليبقى الاستيراد داخل التطبيق كما هو: @/services/analytics/gtag.js
 * وبنفس الوقت تستطيع الإصدارات القديمة تحميل نفس الملف من /analytics/gtag.js بلا تكرار.
 *
 * The single source of truth is public/analytics/gtag.js.
 * It is re-exported here so app imports stay unchanged (@/services/analytics/gtag.js),
 * while legacy pages load the very same file from /analytics/gtag.js with no duplication.
 */

export * from "../../../public/analytics/gtag.js";
