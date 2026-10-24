/*
 * البحث في قاعدة بيانات منتجات عامة | Global product lookup
 *
 * المصدر: Open Food Facts API — مجاني بلا مفتاح، متاح عبر CORS، ويعطي أسماء/علامات/وحدات موثوقة | Source: Open Food Facts API — free, keyless, CORS-enabled, trusted names/brands/units.
 *
 * ملاحظة السعر | Price note:
 * لا تُخمَّن الأسعار إطلاقاً؛ referencePrice يُعبأ فقط برقم سعري فعلي وإلا يبقى null ليدخله المستخدم — لا قيمة عشوائية | Prices are never guessed; referencePrice only carries a real source price, otherwise stays null for user entry — never a random value.
 *
 * lookupBarcodeGlobal يعامل فشل الشبكة/المهلة كلا نتيجة؛ وlookupBarcodeGlobalDetailed يميّز "غير موجود" عن "تعذّر الاتصال" لأن التعرف من صورة يعرض رسالة مختلفة لكل حالة | lookupBarcodeGlobal treats network failure/timeout as no result; lookupBarcodeGlobalDetailed tells "not found" apart from "unreachable" because image recognition shows a different message for each.
 */

const OFP_BASE = "https://world.openfoodfacts.org/api/v2/product/";
const OFP_FIELDS = [
    "product_name",
    "brands",
    "categories",
    "quantity",
    "price"
].join(",");

const LOOKUP_TIMEOUT_MS = 4000;

function normalizeCode(rawText) {
    return String(rawText || "").trim().replace(/\s+/g, "");
}

/**
 * يبحث عن باركود في قاعدة البيانات العامة مع تمييز نتيجة عن فشل.
 * @param {string} barcode
 * @returns {Promise<{info:object|null, failed:boolean}>}
 *   `failed: true` يعني أن الشبكة/المهلة منعنا من معرفة الجواب إطلاقاً،
 *   ويفترض على المتصل أن يُعيد المحاولة لاحقاً.
 */
async function lookupBarcodeGlobalDetailed(barcode) {
    const code = normalizeCode(barcode);
    if (!code) return { info: null, failed: false };

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
        const res = await fetch(
            `${OFP_BASE}${encodeURIComponent(code)}.json?fields=${OFP_FIELDS}`,
            { signal: controller.signal, headers: { Accept: "application/json" } }
        );
        clearTimeout(timer);
        if (!res.ok) return { info: null, failed: false };

        const json = await res.json();
        if (!json || json.status !== 1 || !json.product) return { info: null, failed: false };

        const p = json.product;
        const brand = String(p.brands || "").trim();
        const name = String(p.product_name || "").trim() || brand;
        if (!name) return { info: null, failed: false }; // لا اسم موثوق → يُعامل كغير موجود | No trustworthy name → treated as not found

        const priceRaw = Number(p.price);
        const referencePrice =
            Number.isFinite(priceRaw) && priceRaw > 0 ? priceRaw : null;

        return {
            info: {
                name,
                brand,
                category: String(p.categories || "").trim(),
                unit: String(p.quantity || "").trim(),
                barcode: code,
                referencePrice,
            },
            failed: false,
        };
    } catch (e) {
        // انقطاع الشبكة/مهلة/منع → لا نعرف الجواب (وليس "غير موجود") | Network drop / timeout / blocked → the answer is unknown, not "not found"
        return { info: null, failed: true };
    }
}

/**
 * يبحث عن باركود في قاعدة البيانات العامة ويعيد معلومات موثوقة.
 * @param {string} barcode
 * @returns {Promise<{name:string, brand:string, category:string, unit:string, barcode:string, referencePrice:number|null}|null>}
 */
async function lookupBarcodeGlobal(barcode) {
    const { info } = await lookupBarcodeGlobalDetailed(barcode);
    return info;
}

export { lookupBarcodeGlobal, lookupBarcodeGlobalDetailed };