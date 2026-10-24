/*
 * خيارات الأطراف في سند الصرف/القبض = المسجَّلون في سجل الأطراف + الأطراف المستمدّة من الفواتير (المبيعات/المشتريات) غير المسجّلة | Party options in payment/receipt vouchers = saved parties in the registry + parties derived from unsaved invoices (sales/purchases)
 * بهذا يظهر أي مورد في قائمة الموردين في السند أيضاً؛ لا فرق بين مصدري القائمة | This makes any supplier in the suppliers list also appear in the voucher; no difference between the two list sources
 * المعرف (id) يُحمل للمسجّلين فقط؛ المستمدّ كيان مؤقت مشتق من معاملة وليس في السجل فلا معرّف له يُحفظ | The id is carried only for saved parties; a derived party is a temporary entity from a transaction, not in the registry, so it has no id to save
 */
export function getVoucherPartyOptions({ type, savedParties, latestDocuments }) {
    const saved = Array.isArray(savedParties) ? savedParties.filter(Boolean) : [];
    const savedFiltered = saved.filter(p => p?.type === type);

    const derivedInvoices = type === "customers"
        ? (latestDocuments?.salesInvoices || [])
        : (latestDocuments?.purchaseInvoices || []);

    const derivedNames = new Set();
    const derived = [];
    for (const invoice of derivedInvoices) {
        const name = String(invoice?.party || "").trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (savedFiltered.some(p => String(p.name).toLowerCase() === key)) continue;
        if (derivedNames.has(key)) continue;
        derivedNames.add(key);
        derived.push({ name });
    }

    return [...savedFiltered, ...derived]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(p => ({ name: p.name, id: p.id || "" }));
}