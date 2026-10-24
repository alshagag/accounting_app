/**
 * Returns the active tax codes used by invoices/vouchers for their tax options.
 *
 * Source of truth: the saved-taxes registry (localStorage["accountingTaxRates"])
 * written by the tax settings panel — an array of { id, name, rate, inactive, ... }.
 * A new tax saved there shows up automatically; no fixed/hardcoded tax list.
 * Falls back to the legacy flat keys so previously-configured single taxes
 * (and users who have not opened the tax settings yet) keep working.
 */
const TAX_RATES_STORAGE_KEY = "accountingTaxRates";

function readSavedTaxes() {
  try {
    const raw  = localStorage.getItem(TAX_RATES_STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn("[TAX] Invalid saved-taxes registry, ignoring.", err);
    return [];
  }
}

/* الاسم يعرض النسبة مرة واحدة فقط؛ بعض الأسماء تحتوي النسبة أصلاً فإزالة أي نسبة مكرَّرة تمنع ظهورها مرتين | The name shows the rate once; some names already contain it, so stripping any duplicate rate prevents it from appearing twice */
export function formatTaxName(name, rate) {
  const pct = String(rate ?? 0);
  const base = String(name || "")
    .replace(/\s*\(\s*[\d.]+\s*%\s*\)\s*$/, "")   // نسبة في نهاية الاسم | rate at the end of the name
    .replace(/\s*\(\s*[\d.]+\s*%\s*\)/g, " ")        // أو نسبة في وسطه | or a rate in the middle
    .replace(/\s{2,}/g, " ")
    .trim();
  return `${base} (${pct}%)`;
}

export function getTaxCodes() {
  // المفاتيح المسطّحة القديمة تصف الضريبة الافتراضية المضبوطة حالياً | Legacy flat keys describe the currently configured default tax.
  const legacyName     = localStorage.getItem("settingsTaxName");
  const legacyRate     = parseFloat(localStorage.getItem("settingsTaxRate"));
  const legacyInactive = localStorage.getItem("settingsTaxInactive") === "true";
  const legacy = legacyName && !Number.isNaN(legacyRate) && !legacyInactive
    ? { id: "default_tax", name: formatTaxName(legacyName, legacyRate), rate: legacyRate }
    : null;

  const saved = readSavedTaxes();
  if (!saved.length) {
    return legacy ? [legacy] : [];
  }

  const seen  = new Set();
  const codes = [];
  for (const tax of saved) {
    if (!tax || tax.inactive) continue;
    const rate = Number(tax.rate) || 0;
    const id = tax.id === "" || tax.id == null
      ? `tax_${String(tax.name || "unnamed")}_${rate}`
      : String(tax.id);
    if (seen.has(id)) continue;
    seen.add(id);
    codes.push({ id, name: formatTaxName(tax.name, rate), rate });
  }

  // الإبقاء على افتراضي قديم لم يُنقل بعد إلى السجل | Keep a legacy default that has not been migrated into the registry yet.
  if (legacy && !seen.has(legacy.id)) {
    codes.unshift(legacy);
  }

  return codes;
}