import { $ } from "@/services/lib/utils.js";
import { showGlobalAlert, setButtonLoading } from "@/components/ui.js";
import { isFallbackMode, fallback, idbGetAll, STORE_PRODUCTS } from "@/data/db/db.js";
import { getTransactionById, saveTransactionEdit, refreshTransactionsUI, normalizeTransactionType } from "../../transactions.js";
import { open as openFullEditProduct } from "@/features/products/product-full-edit.js";

/* ================= Quick Product Edit Module | وحدة تعديل المنتج السريع من نموذج البيع ================= */

const QuickEditProductModule = (() => {
    async function open(productId) {
        openFullEditProduct(Number(productId));
    }

    /*
     * لا ربط هنا عن قصد: المستمع الوحيد المطلوب على .quick-edit-product هو الموجود في initApp.js | No binding here by design: the only listener needed on .quick-edit-product lives in initApp.js
     * ربط ثانٍ هنا كان يفتح نافذة التعديل الكامل بالخطأ بدل التعديل السريع | A second binding here would wrongly open the full-edit modal instead of the quick edit
     */
    function bind() {}

    return { bind, open };
})();

export function bindSaleFullEdit() {
    QuickEditProductModule.bind();
}