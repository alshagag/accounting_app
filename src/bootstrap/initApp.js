"use client";

import { openDatabase, syncFallbackToIDB, getAllTransactions } from '@/data/db/db.js';
import { loadVoucherCache } from "@/features/documents/invoices/vouchers/voucher-storage.js";
// نفس مُنسّق اسم الضريبة المستخدم في القوائم والفواتير — مصدر واحد حتى لا تختلف صياغة النسبة بين الإعدادات والسطر | The same tax-name formatter used across lists and invoices — one source so the rate wording never differs between settings and the line
import { formatTaxName } from "@/features/documents/controllers/services/tax-codes.js";
// transactions.js و backup/index تُستوردان ساكنًا من وحدات أخرى كثيرة؛ الاستيراد الديناميكي هنا يجعل Turbopack يُصدر حِزمًا مكررة بعناوين قديمة (ChunkLoadError)، فالاستيراد الساكن يضمن نسخة واحدة بلا حزمة كسولة | transactions.js and backup/index are statically imported by many other modules; a dynamic import here makes Turbopack emit duplicated lazy chunks with stale URLs (ChunkLoadError), so a static import keeps a single instance with no lazy chunk
import {
    bindTransactionUI,
    loadTransactionsToUI,
    setDefaultDate,
    renderSalesModal,
    renderPurchasesModal,
    renderProductsModal,
    normalizeTransactionType,
    onEditTransaction,
    openFullEditTransactionModal,
    onDeleteTransaction,
    getTransactionById,
} from "@/features/documents/transactions.js";
import { bindDataTransfer } from "@/backup/index";
import { bindInstallPrompt } from "@/services/install-prompt.js";
import { initMobileTableCards } from "@/services/mobile-table-cards.js";
import { clearAutofillNote, markAutofillBaseline } from "@/services/product-autofill.js";
import { renderPaginatedRows } from "@/features/documents/components/table-renderer.js";

/**
 * Retry a dynamic import on ChunkLoadError (stale chunks, network hiccup).
 * Reloads the page once as a last resort.
 */
async function importWithRetry(factory, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await factory();
        } catch (err) {
            const isChunkError = err?.name === 'ChunkLoadError' || /loading chunk/i.test(err?.message);
            if (isChunkError && attempt < retries) {
                console.warn(`[INIT] ChunkLoadError on attempt ${attempt + 1}, retrying…`);
                await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
                continue;
            }
            throw err;
        }
    }
}

export const initApp = async () => {
    /* تحرير التركيز قبل إخفاء المودال يمنع تحذير "Blocked aria-hidden … retained focus" (نفس نمط chain-modals.js:17) ويغطي كل مواضع hide() الحالية والمستقبلية | Releasing focus before hiding the modal prevents the "Blocked aria-hidden … retained focus" warning (same pattern as chain-modals.js:17) and covers every current and future hide() site */
    const originalModalHide = window.bootstrap?.Modal?.prototype.hide;
    if (typeof originalModalHide === "function") {
        window.bootstrap.Modal.prototype.hide = function () {
            const modalEl = this?._element;
            if (modalEl && modalEl.contains(document.activeElement) && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
            return originalModalHide.apply(this, arguments);
        };
    }

    /* ربط مستمع التثبيت مبكرًا قبل انتظار قاعدة البيانات: حدث beforeinstallprompt لا يُعاد بعده في نفس الجلسة، وفقدانه يترك الزر يفتح شرحًا بدل النافذة الأصلية | Bind the install listener early, before awaiting the database: the beforeinstallprompt event does not re-fire within the same session, and missing it leaves the button opening the guide instead of the native prompt */
    bindInstallPrompt();

    /* فتح قاعدة البيانات يبدأ فورًا بالتوازي مع تنزيل وحدات الواجهة أدناه؛ خطوات تحميل البيانات (Step 3) أول من يحتاجها، والتقاط الخطأ مبكرًا يمنع unhandled rejection | Opening the database starts immediately alongside the UI module downloads below; the data-load steps (Step 3) need it first, and catching the error early avoids an unhandled rejection */
    const dbReady = (async () => {
        console.log("[INIT] Step 1: Opening database...");
        await openDatabase();
        await syncFallbackToIDB();
        await loadVoucherCache();
        console.log("[INIT] Step 1 COMPLETE. Database opened.");
    })();
    dbReady.catch(() => {});

    /* كل الوحدات تُستورد بالتوازي لتفادي انتظار شبكة لكل وحدة؛ كل وحدة مستقلة عند التقييم تسجّل دوالها على window دون قراءة تسجيلات غيرها، والفراغات في القائمة لوحدات تُستورد للتسجيل فقط | All modules load in parallel to avoid a network round-trip per module; each is self-contained at evaluation and registers onto window without reading others' registrations, and the blank slots mark modules imported only for their side effects */
    const [
        uiModule,
        confirmDialogModule,
        productsModule,
        partiesModule,
        documentsCommon,
        /* نموذج فاتورة البيع | sales-invoice-form */ ,
        /* نموذج فاتورة الشراء | purchase-invoice-form */ ,
        /* نموذج السند | voucher-form */ ,
        productFullEditModule,
        /* عرض المنتج | product-view */ ,
        saleFullEditModule,
    ] = await Promise.all([
        importWithRetry(() => import('@/components/ui')),
        importWithRetry(() => import('@/components/dialogs/confirm-dialog')),
        importWithRetry(() => import('@/features/products/products')),
        importWithRetry(() => import('@/features/parties/index.js')),
        importWithRetry(() => import('@/features/documents/index.js')),
        importWithRetry(() => import('@/features/documents/invoices/sales/sales-invoice-form.js')),
        importWithRetry(() => import('@/features/documents/invoices/purchases/purchase-invoice-form.js')),
        importWithRetry(() => import('@/features/documents/invoices/vouchers/voucher-form.js')),
        importWithRetry(() => import('@/features/products/product-full-edit.js')),
        importWithRetry(() => import('@/features/products/product-view.js')),
        importWithRetry(() => import('@/features/documents/invoices/sales/sale-full-edit.js')),
    ]);
    const { showGlobalAlert, bindUI: bindCoreUI } = uiModule;
    const { confirmDelete } = confirmDialogModule;
    const { bindUI: bindProductsUI, loadProductsToUI, getAllProducts, onDeleteProduct, onEditProduct } = productsModule;
    const { bindParties } = partiesModule;
    const { initDocumentsModule: documentModuleInit } = documentsCommon;
    const { bind: bindFullEditProductModule } = productFullEditModule;
    const { bindSaleFullEdit } = saleFullEditModule;

    const openAddProductModal = () => {
        const addModalEl = document.getElementById('addProductModal');
        if (!addModalEl) return;

        // فتح «إضافة» جديد لا يجب أن يرث ملاحظة التعبئة السابقة | A fresh "add" must not inherit the previous autofill note
        clearAutofillNote("addAutofillNote");
        // تسجيل قيم النموذج عند فتحه لتمييز ما كتبه المستخدم عن القيم الافتراضية التي لم تُمسّ (قائمة الوحدة تبدأ على «قطعة») | Record the form's opening values to tell user input from untouched defaults (the unit list starts on «قطعة»)
        markAutofillBaseline({
            name: "addProductName",
            barcode: "addProductBarcode",
            unit: "addProductUnit",
            division: "addProductDivision",
            description: "addProductDesc",
            salePrice: "addProductSalePrice",
        });

        const addModal = window.bootstrap.Modal.getOrCreateInstance(addModalEl);
        const productsModalEl = document.getElementById("productsModal");

        if (!productsModalEl?.classList.contains("show")) {
            addModal.show();
            return;
        }

        productsModalEl.addEventListener("hidden.bs.modal", () => {
            addModal.show();
        }, { once: true });

        window.bootstrap.Modal.getOrCreateInstance(productsModalEl)?.hide();
    }

    const bindProductModalButton = () => {
        const btn = document.getElementById("btnAddProductInModal");
        if (btn) {
            btn.addEventListener("click", openAddProductModal);
        }
    }

    const goBackToProductsModalFromAdd = () => {
        const addModalEl = document.getElementById('addProductModal');
        if (!addModalEl) return;

        const addModal = window.bootstrap.Modal.getInstance(addModalEl);
        if (!addModal) return;

        addModalEl.addEventListener('hidden.bs.modal', () => {
            const productsModalEl = document.getElementById("productsModal");
            if (productsModalEl) {
                const productsModal = window.bootstrap.Modal.getOrCreateInstance(productsModalEl);
                productsModal.show();
            }
        }, { once: true });

        addModal.hide();
    }

    const bindAddProductModalBackButton = () => {
        const btn = document.getElementById("btnBackFromAddProduct");
        if (btn) {
            btn.addEventListener("click", goBackToProductsModalFromAdd);
        }
    }

    // تُستخدم findDocument من معالجات أحداث documents.js للبحث عن الفواتير عبر window.latestDocuments الذي يضبطه renderDocuments | findDocument is used by documents.js event handlers to look up invoices via window.latestDocuments, which documents.js renderDocuments sets
    const findDocument = (key, category) => {
        if (typeof window === 'undefined' || !window.latestDocuments) return null;

        const k = String(key || '');

        // تحديد المصادر بحسب بادئة المفتاح: تُولَّد المفاتيح كـ «بيع-YYYY-MM-DD» و«شراء-YYYY-MM-DD»، والمفتاح بلا بادئة (رقم مستند) يُبحث في كل مصادر الفواتير | Pick the sources from the key prefix: keys use «بيع-YYYY-MM-DD» / «شراء-YYYY-MM-DD», and a plain document number (no prefix) searches all invoice sources
        const sources = [];
        if (k.startsWith('شراء-')) {
            sources.push(window.latestDocuments.purchaseInvoices || []);
        } else if (k.startsWith('بيع-')) {
            sources.push(window.latestDocuments.salesInvoices || []);
        } else {
            // رقم مستند أو مرجع بلا بادئة — ابحث في المصدرين | Plain document number or ref — search both sources
            sources.push(window.latestDocuments.salesInvoices || []);
            sources.push(window.latestDocuments.purchaseInvoices || []);
        }

        for (const source of sources) {
            const found = source.find(d => (d.key === key || d.documentNo === key));
            if (found) return found;
        }
        return null;
    };

    const updatePeriodProfitUI = (netProfit) => {
        const format = (val) => (val || 0).toFixed(2);
        const el = document.getElementById("periodProfitValue");
        if (el) el.textContent = format(netProfit);
    }

    const calculateStats = async (fromDate = null, toDate = null) => {
        const transactions = await getAllTransactions();
        const vouchers = documentsCommon.getAllVouchers();
        let totalRevenue = 0;
        let totalCost = 0;

        transactions.forEach((tx) => {
            if (fromDate && toDate && (tx.date < fromDate || tx.date > toDate)) return;
            const total = documentsCommon.getTransactionTotal(tx);
            if (normalizeTransactionType(tx.type) === 'بيع') totalRevenue += total;
            else if (normalizeTransactionType(tx.type) === 'شراء') totalCost += total;
        });

        vouchers.forEach((voucher) => {
            if (fromDate && toDate && (voucher.date < fromDate || voucher.date > toDate)) return;
            if (voucher.lines?.some(line => line.accountType === 'manual')) {
                const isTaxExclusive = voucher.toggleStates?.taxInclusive;
                const manualLinesTotal = voucher.lines
                    .filter(line => line.accountType === 'manual')
                    .reduce((sum, line) => sum + documentsCommon.getVoucherLineTotalValue(line, isTaxExclusive), 0);

                if (voucher.voucherType === 'قبض') totalRevenue += manualLinesTotal;
                else if (voucher.voucherType === 'صرف') totalCost += manualLinesTotal;
            }
        });

        return { totalRevenue, totalCost, netProfit: totalRevenue - totalCost };
    }

    const calculatePeriodProfit = async () => {
        const fromDate = document.getElementById("profitFromDate")?.value;
        const toDate = document.getElementById("profitToDate")?.value;
        const infoEl = document.getElementById("periodInfo");

        if (!fromDate || !toDate) {
            const { netProfit } = await calculateStats();
            updatePeriodProfitUI(netProfit);
            if (infoEl) infoEl.textContent = "عرض كامل البيانات (كل السنوات)";
            return;
        }

        localStorage.setItem("profitFromDate", fromDate);
        localStorage.setItem("profitToDate", toDate);

        if (infoEl) infoEl.textContent = `صافي الربح من ${fromDate} إلى ${toDate}`;
        const { netProfit } = await calculateStats(fromDate, toDate);
        updatePeriodProfitUI(netProfit);
    };

    const bindProfitCalculator = () => {
        document.getElementById("btnCalculatePeriodProfit")?.addEventListener("click", calculatePeriodProfit);
        document.getElementById("btnResetStats")?.addEventListener("click", async () => {
            localStorage.removeItem("profitFromDate");
            localStorage.removeItem("profitToDate");
            document.getElementById("profitFromDate").value = "";
            document.getElementById("profitToDate").value = "";
            await calculatePeriodProfit();
        });
    };

    function showSettingsPanel(panelId) {
        const mainMenu = document.getElementById("settingsMainMenu");
        const taxPanel = document.getElementById("settingsTaxPanel");
        const businessPanel = document.getElementById("settingsBusinessPanel");

        if (mainMenu) mainMenu.classList.add("d-none");
        if (taxPanel) taxPanel.classList.add("d-none");
        if (businessPanel) businessPanel.classList.add("d-none");

        const panelToShow = document.getElementById(panelId);
        if (panelToShow) panelToShow.classList.remove("d-none");
    }

    function bindSettingsEvents() {
        const addSafeListener = (id, handler) => {
            const element = document.getElementById(id);
            if (element && !element.dataset.settingsBound) {
                element.dataset.settingsBound = 'true';
                element.addEventListener('click', handler);
            }
        };

        addSafeListener("btnSettingsTax", () => {
            showSettingsPanel("settingsTaxPanel");
            showTaxListView();
        });
        addSafeListener("btnSettingsBusiness", () => showSettingsPanel("settingsBusinessPanel"));
        addSafeListener("btnBackFromTax", () => {
            showSettingsPanel("settingsMainMenu");
            showTaxListView();
        });
        addSafeListener("btnBackFromBusiness", () => showSettingsPanel("settingsMainMenu"));

        addSafeListener("btnCreateTax", () => {
            editingTaxId = null;
            resetTaxForm();
            updateTaxEditUI();
            showTaxFormView();
            document.getElementById("settingsTaxName")?.focus();
        });

        addSafeListener("btnBackToTaxList", () => {
            editingTaxId = null;
            resetTaxForm();
            updateTaxEditUI();
            showTaxListView();
        });

        // ─── تحميل الإعدادات عند فتح المودال | Load settings when the modal opens ───
        const settingsModal = document.getElementById("taxSettingsModal");
        if (settingsModal && !settingsModal.dataset.loadBound) {
            settingsModal.dataset.loadBound = "true";
            settingsModal.addEventListener("show.bs.modal", () => {
                loadTaxSettings();
                loadBusinessSettings();
            });
        }

        // ─── حفظ إعدادات الضريبة | Save tax settings ───
        addSafeListener("btnSaveTax", () => {
            // التقاط القيم المحفوظة قبل الكتابة فوق المفاتيح المسطحة أدناه | Capture the saved values before the flat keys are overwritten below
            const prevActiveTaxName = localStorage.getItem("settingsTaxName") || "";
            const prevActiveTaxRate = Number(localStorage.getItem("settingsTaxRate")) || 0;

            localStorage.setItem("settingsTaxName",
                document.getElementById("settingsTaxName")?.value?.trim() || "");
            localStorage.setItem("settingsTaxAccount",
                document.getElementById("settingsTaxAccount")?.value?.trim() || "");
            localStorage.setItem("settingsTaxRateType",
                document.getElementById("settingsTaxRateType")?.value || "CustomRate");
            localStorage.setItem("settingsTaxType",
                document.getElementById("settingsTaxType")?.value || "SingleRate");
            localStorage.setItem("settingsTaxRate",
                document.getElementById("settingsTaxRate")?.value || "0");

            // المفاتيح تُحفظ دائمًا كنص "true" / "false" | Switches are always saved as "true" / "false" strings
            localStorage.setItem("settingsTaxInclusive",
                String(!!document.getElementById("settingsTaxInclusive")?.checked));
            localStorage.setItem("settingsTaxInactive",
                String(!!document.getElementById("settingsTaxInactive")?.checked));

            // مفاتيح العناوين المخصصة | Custom title toggles
            localStorage.setItem("settingsCustomSalesTitle",
                String(!!document.getElementById("toggleCustomSalesTitle")?.checked));
            localStorage.setItem("settingsTaxSalesInvoiceTitle",
                document.getElementById("settingsTaxSalesInvoiceTitle")?.value?.trim() || "");
            localStorage.setItem("settingsCustomCreditTitle",
                String(!!document.getElementById("toggleCustomCreditTitle")?.checked));
            localStorage.setItem("settingsTaxCreditNoteTitle",
                document.getElementById("settingsTaxCreditNoteTitle")?.value?.trim() || "");

            // ── إضافة/تحرير الضريبة في سجل الضرائب المحفوظة | Add/edit the tax in the saved-taxes registry ──
            const savedTaxes = getSavedTaxes();
            const tax = buildTaxFromForm();
            const noRealChange = !editingTaxId
                && tax.name === prevActiveTaxName
                && tax.rate === prevActiveTaxRate;

            let registryChanged = editingTaxId || !noRealChange;
            if (!tax.name) {
                // فقط ما له اسم يدخل القائمة (المفاتيح المسطحة تُحفظ أعلاه) | Only data with a name belongs in the list (flat keys are still saved above)
                registryChanged = false;
            } else if (editingTaxId) {
                const editIdx = savedTaxes.findIndex((t) => String(t.id) === String(editingTaxId));
                if (editIdx === -1) savedTaxes.push({ ...tax, id: editingTaxId });
                else savedTaxes[editIdx] = { ...savedTaxes[editIdx], ...tax };
            } else if (!noRealChange) {
                // ضريبة جديدة تختلف عن الافتراضية الحالية ← أضف مدخلًا جديدًا | New tax config different from the current default → add a new entry
                const hasDefault = savedTaxes.some((t) => String(t.id) === "default_tax");
                savedTaxes.push({ ...tax, id: hasDefault ? `tax_${Date.now()}` : "default_tax" });
            }
            if (registryChanged) setSavedTaxes(savedTaxes);

            editingTaxId = null;
            updateTaxEditUI();
            showTaxListView();
            window.showGlobalAlert?.("تم حفظ إعدادات الضريبة", "success");
        });

        // ─── حفظ بيانات المنشأة | Save business settings ───
        addSafeListener("btnSaveBusiness", () => {
            localStorage.setItem("businessName",
                document.getElementById("settingsBusinessName")?.value?.trim() || "");
            localStorage.setItem("commercialReg",
                document.getElementById("settingsCommercialReg")?.value?.trim() || "");
            localStorage.setItem("taxNumber",
                document.getElementById("settingsTaxNumber")?.value?.trim() || "");
            localStorage.setItem("businessPhone",
                document.getElementById("settingsBusinessPhone")?.value?.trim() || "");
            localStorage.setItem("businessAddress",
                document.getElementById("settingsBusinessAddress")?.value?.trim() || "");

            // الشعار (قد يحتوي الحقل المخفي base64 من معالج الملف) | Logo (the hidden input may hold base64 from the file handler)
            const logoValue = document.getElementById("settingsBusinessLogo")?.value || "";
            if (logoValue) {
                localStorage.setItem("businessLogo", logoValue);
            }

            window.showGlobalAlert?.("تم حفظ بيانات المنشأة", "success");
        });

        // ─── ملف الشعار ← base64 ← الحقل المخفي | Logo file → base64 → hidden input ───
        const logoFile = document.getElementById("settingsBusinessLogoFile");
        if (logoFile && !logoFile.dataset.loadBound) {
            logoFile.dataset.loadBound = "true";
            logoFile.addEventListener("change", (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const result = ev.target?.result;
                    if (typeof result === "string") {
                        const hidden = document.getElementById("settingsBusinessLogo");
                        if (hidden) hidden.value = result;
                        const preview = document.getElementById("settingsBusinessLogoPreview");
                        if (preview) preview.innerHTML = `<img src="${result}" class="img-fluid rounded" style="max-height:80px" />`;
                    }
                };
                reader.readAsDataURL(file);
            });
        }
    }

    // ─── سجل الضرائب المحفوظة (القائمة تحت نموذج الإضافة) | Saved-taxes registry (list under the add form) ───
    const TAX_RATES_STORAGE_KEY = "accountingTaxRates";
    let editingTaxId = null;

    const getSavedTaxes = () => {
        try {
            return JSON.parse(localStorage.getItem(TAX_RATES_STORAGE_KEY) || "[]");
        } catch (err) {
            console.warn("[SETTINGS] Invalid tax registry, resetting.", err);
            return [];
        }
    };

    const setSavedTaxes = (taxes) => {
        try {
            localStorage.setItem(TAX_RATES_STORAGE_KEY, JSON.stringify(taxes || []));
        } catch (err) {
            console.warn("[SETTINGS] Failed to persist taxes.", err);
        }
    };

    const buildTaxFromForm = () => ({
        id: editingTaxId || "",
        name: document.getElementById("settingsTaxName")?.value?.trim() || "",
        account: document.getElementById("settingsTaxAccount")?.value?.trim() || "",
        rateType: document.getElementById("settingsTaxRateType")?.value || "CustomRate",
        type: document.getElementById("settingsTaxType")?.value || "SingleRate",
        rate: Number(document.getElementById("settingsTaxRate")?.value) || 0,
        inclusive: !!document.getElementById("settingsTaxInclusive")?.checked,
        inactive: !!document.getElementById("settingsTaxInactive")?.checked,
    });

    const loadTaxIntoForm = (tax) => {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val ?? "";
        };
        set("settingsTaxName", tax.name);
        set("settingsTaxAccount", tax.account);
        set("settingsTaxRate", tax.rate);
        set("settingsTaxRateType", tax.rateType || "CustomRate");
        set("settingsTaxType", tax.type || "SingleRate");
        const inclusive = document.getElementById("settingsTaxInclusive");
        if (inclusive) inclusive.checked = !!tax.inclusive;
        const inactive = document.getElementById("settingsTaxInactive");
        if (inactive) inactive.checked = !!tax.inactive;
    };

    const resetTaxForm = () => {
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };
        set("settingsTaxName", "");
        set("settingsTaxAccount", "");
        set("settingsTaxRate", "");
        set("settingsTaxRateType", "CustomRate");
        set("settingsTaxType", "SingleRate");
        const inclusive = document.getElementById("settingsTaxInclusive");
        if (inclusive) inclusive.checked = false;
        const inactive = document.getElementById("settingsTaxInactive");
        if (inactive) inactive.checked = false;
    };

    const updateTaxEditUI = () => {
        const btn = document.getElementById("btnSaveTax");
        if (btn) {
            btn.innerHTML = editingTaxId
                ? '<i class="bi bi-pencil-square me-1"></i>تحديث الضريبة'
                : '<i class="bi bi-check-lg me-1"></i>حفظ';
        }
    };

    const showTaxListView = () => {
        const list = document.getElementById("settingsTaxListView");
        const form = document.getElementById("settingsTaxFormView");
        if (list) list.classList.remove("d-none");
        if (form) form.classList.add("d-none");
        renderSavedTaxesTable();
    };

    const showTaxFormView = () => {
        const list = document.getElementById("settingsTaxListView");
        const form = document.getElementById("settingsTaxFormView");
        if (list) list.classList.add("d-none");
        if (form) form.classList.remove("d-none");
    };

    const countTaxTransactions = async (taxId) => {
        let count = 0;
        (documentsCommon.getAllVouchers?.() || []).forEach((v) =>
            (v.lines || []).forEach((l) => {
                if (String(l.taxCodeId) === String(taxId)) count += 1;
            })
        );
        try {
            const transactions = await getAllTransactions();
            (transactions || []).forEach((t) => {
                if (String(t.taxCodeId) === String(taxId)) count += 1;
            });
        } catch (err) {
            console.warn("[SETTINGS] Could not read transactions for tax count.", err);
        }
        return count;
    };

    const escapeTaxName = (str) =>
        String(str || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

    const renderSavedTaxesTable = async () => {
        const tbody = document.getElementById("savedTaxesTbody");
        if (!tbody) return;

        if (!tbody.dataset.editHandlerBound) {
            tbody.dataset.editHandlerBound = "true";
            tbody.addEventListener("click", (event) => {
                const button = event.target.closest(".btn-edit-saved-tax");
                if (!button) return;
                const tax = getSavedTaxes().find((item) => String(item.id) === String(button.dataset.taxId));
                if (!tax) return;
                editingTaxId = tax.id;
                loadTaxIntoForm(tax);
                updateTaxEditUI();
                showTaxFormView();
            });
        }

        let taxes = getSavedTaxes();

        // بذر الضريبة الافتراضية المهيأة ليظهر للمستخدمين الحاليين في القائمة | Seed the currently configured default tax so existing users see it in the list
        if (!taxes.length) {
            const name = localStorage.getItem("settingsTaxName");
            const rate = Number(localStorage.getItem("settingsTaxRate"));
            if (name && !Number.isNaN(rate) && rate >= 0) {
                taxes = [{
                    id: "default_tax",
                    name,
                    account: localStorage.getItem("settingsTaxAccount") || "",
                    rateType: localStorage.getItem("settingsTaxRateType") || "CustomRate",
                    type: localStorage.getItem("settingsTaxType") || "SingleRate",
                    rate,
                    inclusive: localStorage.getItem("settingsTaxInclusive") === "true",
                    inactive: localStorage.getItem("settingsTaxInactive") === "true",
                }];
                setSavedTaxes(taxes);
            }
        }

        if (!taxes.length) {
            renderPaginatedRows("savedTaxesTbody", [], () => "", {
                emptyMessage: "لا توجد ضرائب محفوظة بعد.",
                colspan: 3,
            });
            return;
        }

        const counts = {};
        await Promise.all(taxes.map(async (tax) => {
            counts[tax.id] = await countTaxTransactions(tax.id);
        }));

        const rows = taxes.map((tax) => {
            const statusBadge = tax.inactive
                ? '<span class="badge bg-secondary ms-2">غير نشط</span>'
                : '<span class="badge bg-success ms-2">نشط</span>';
            return `
                <tr>
                    <td class="fw-semibold text-start">
                        ${escapeTaxName(formatTaxName(tax.name, Number(tax.rate || 0)))}${statusBadge}
                    </td>
                    <td><span class="badge bg-light text-dark border">${counts[tax.id] || 0}</span></td>
                    <td>
                        <button type="button" class="btn btn-sm btn-outline-primary btn-edit-saved-tax"
                            data-tax-id="${escapeTaxName(tax.id)}">
                            <i class="bi bi-pencil-square"></i>تحرير
                        </button>
                    </td>
                </tr>`;
        });
        renderPaginatedRows("savedTaxesTbody", rows, row => row, {
            emptyMessage: "لا توجد ضرائب محفوظة بعد.",
            colspan: 3,
        });
    };

    // ─── تحميل إعدادات الضريبة من localStorage إلى حقول النموذج | Load tax settings from localStorage into the form fields ───
    function loadTaxSettings() {
        const v = (id, fallback) => {
            const el = document.getElementById(id);
            if (el) el.value = fallback;
        };
        const sw = (id, key) => {
            const el = document.getElementById(id);
            if (el) {
                const raw = localStorage.getItem(key);
                // لا نضبط checked إلا بوجود قيمة محفوظة، وإلا نُبقي الافتراضي في HTML | Set checked only when a stored value exists, otherwise keep the HTML default
                if (raw !== null) el.checked = raw === "true";
            }
        };

        v("settingsTaxName", localStorage.getItem("settingsTaxName") || "");
        v("settingsTaxAccount", localStorage.getItem("settingsTaxAccount") || "");
        v("settingsTaxRateType", localStorage.getItem("settingsTaxRateType") || "CustomRate");
        v("settingsTaxType", localStorage.getItem("settingsTaxType") || "SingleRate");
        v("settingsTaxRate", localStorage.getItem("settingsTaxRate") || "");
        v("settingsTaxSalesInvoiceTitle", localStorage.getItem("settingsTaxSalesInvoiceTitle") || "");
        v("settingsTaxCreditNoteTitle", localStorage.getItem("settingsTaxCreditNoteTitle") || "");

        sw("settingsTaxInclusive", "settingsTaxInclusive");
        sw("settingsTaxInactive", "settingsTaxInactive");
        sw("toggleCustomSalesTitle", "settingsCustomSalesTitle");
        sw("toggleCustomCreditTitle", "settingsCustomCreditTitle");

        // إطلاق تحديثات الظهور للمجموعات بعد ضبط قيم المفاتيح | Trigger visibility updates for groups after setting switch values
        ["toggleCustomSalesTitle", "toggleCustomCreditTitle"].forEach((tid) => {
            const toggle = document.getElementById(tid);
            if (toggle) toggle.dispatchEvent(new Event("change"));
        });

        // تصفير أي تحرير جارٍ وعرض قائمة الضرائب المحفوظة | Reset any in-progress edit and show the saved-taxes list
        editingTaxId = null;
        updateTaxEditUI();
        showTaxListView();
    }

    // ─── تحميل بيانات المنشأة من localStorage إلى حقول النموذج | Load business settings from localStorage into the form fields ───
    function loadBusinessSettings() {
        const v = (id, key, fallback) => {
            const el = document.getElementById(id);
            if (el) el.value = localStorage.getItem(key) || fallback || "";
        };

        v("settingsBusinessName", "businessName", "");
        v("settingsCommercialReg", "commercialReg", "");
        v("settingsTaxNumber", "taxNumber", "");
        v("settingsBusinessPhone", "businessPhone", "");
        v("settingsBusinessAddress", "businessAddress", "");

        // معاينة الشعار | Logo preview
        const logo = localStorage.getItem("businessLogo");
        const hidden = document.getElementById("settingsBusinessLogo");
        if (hidden) hidden.value = logo || "";
        const preview = document.getElementById("settingsBusinessLogoPreview");
        if (preview && logo) {
            preview.innerHTML = `<img src="${logo}" class="img-fluid rounded" style="max-height:80px" />`;
        }
    }

    const fullAppRefresh = async () => {
        console.log("[REFRESH] Starting full application UI refresh...");
        try {
            await loadProductsToUI();
            await loadTransactionsToUI();
            await window.renderDocuments?.();
            // updateDashboardStats تُستدعى داخل loadTransactionsToUI فلا حاجة لتكرارها | updateDashboardStats is called inside loadTransactionsToUI, so calling it again is unnecessary
            console.log("[REFRESH] Full application UI refresh complete.");
        } catch (error) {
            console.error("fullAppRefresh failed:", error);
            showGlobalAlert("حدث خطأ أثناء تحديث الواجهة.", "danger");
        }
    };

    console.log("[INIT] Starting application initialization...");

    window.showGlobalAlert = showGlobalAlert;
    window.confirmDelete = confirmDelete;
    window.fullAppRefresh = fullAppRefresh;
    window.findDocument = findDocument;
    window.openDocumentDetails = documentsCommon.openDocumentDetails;
    window.renderDocuments = documentsCommon.renderDocuments;
    window.updateDashboardStats = documentsCommon.updateDashboardStats;
    window.buildDocumentHtml = documentsCommon.buildDocumentHtml;

    try {
        await dbReady;

        console.log("[INIT] Step 2: Binding all UI events...");
        initMobileTableCards();  // تسميات بطاقات الجداول على الجوال (تصميم فقط) | Mobile card-table labels (design only)
        bindCoreUI();        // ربط أحداث الواجهة الأساسية (تبديل روابط الفواتير، تراكب النوافذ، إلخ) | Bind core UI events (invoice link toggle, modal stacking, etc.)
        bindProductsUI();
        bindProductModalButton();
        bindAddProductModalBackButton();
        bindTransactionUI();
        bindDataTransfer();
        bindProfitCalculator();
        bindSettingsEvents();
        bindParties();
        documentModuleInit();
        bindFullEditProductModule({ onDeleteProduct: onDeleteProduct });
        bindSaleFullEdit();

        document.getElementById("btnRefreshDocs")?.addEventListener("click", fullAppRefresh);

        document.getElementById("productsModal")?.addEventListener("show.bs.modal", async () => {
            const products = await getAllProducts();
            await renderProductsModal(products);
        });
        document.body.addEventListener('click', (event) => {
            if (event.target.closest('.quick-edit-product')?.dataset.id) onEditProduct(Number(event.target.closest('.quick-edit-product').dataset.id));
            if (event.target.closest('.delete-product')?.dataset.id) onDeleteProduct(Number(event.target.closest('.delete-product').dataset.id));
            const quickEditBtn = event.target.closest('.quick-edit-transaction');
            if (quickEditBtn?.dataset.id) {
                const id = Number(quickEditBtn.dataset.id);
                if (typeof window.openTransactionEdit === 'function') {
                    window.openTransactionEdit(id);
                } else {
                    onEditTransaction(id);
                }
            }
            if (event.target.closest('.full-edit-transaction')?.dataset.id) {
                const id = Number(event.target.closest('.full-edit-transaction').dataset.id);
                openFullEditTransactionModal(id);
            }
            if (event.target.closest('.delete-transaction')?.dataset.id) onDeleteTransaction(Number(event.target.closest('.delete-transaction').dataset.id));
        });

        // الاستماع لتغيّرات السندات لتحديث حالات الفواتير | Listen for voucher changes to refresh invoice statuses
        document.addEventListener('voucher-saved', async (e) => {
            console.log('[INIT] Voucher saved/updated, refreshing UI for invoice status update.', e.detail);
            await window.fullAppRefresh?.();
        });
        document.addEventListener('voucher-deleted', async (e) => {
            console.log('[INIT] Voucher deleted, refreshing UI for invoice status update.', e.detail);
            await window.fullAppRefresh?.();
        });

        console.log("[INIT] Step 2 COMPLETE. UI bound.");

        console.log("[INIT] Step 3: Performing initial data load...");
        await fullAppRefresh();
        console.log("[INIT] Step 3 COMPLETE. Initial data loaded.");

        console.log("[INIT] Step 4: Setting default date...");
        setDefaultDate();
        console.log("[INIT] Step 4 COMPLETE. Default date set.");

        const loadingBox = document.getElementById('loadingBox');
        if (loadingBox) {
            loadingBox.style.display = 'none';
        }
        const app = document.getElementById('app');
        if (app) {
            app.classList.remove('d-none');
        }

        console.log("[INIT] Initialization finished successfully.");

    } catch (error) {
        console.error("Critical initialization error:", error);
        showGlobalAlert(`فشل تشغيل التطبيق: ${error.message}`, "danger");
        const loadingBox = document.getElementById('loadingBox');
        if (loadingBox) {
            const errorMsg = '<div class="alert alert-danger">فشل تحميل التطبيق. يرجى تحديث الصفحة.</div>';
            loadingBox.innerHTML = errorMsg;
        }
    }

    const setupToggle = (toggleId, groupId) => {
        const toggle = document.getElementById(toggleId);
        const group = document.getElementById(groupId);
        if (toggle && group) {
            const updateVisibility = () => {
                group.classList.toggle('d-none', !toggle.checked);
            };
            toggle.addEventListener('change', updateVisibility);
            setTimeout(updateVisibility, 0);
        }
    };
    setupToggle('toggleCustomSalesTitle', 'customSalesTitleGroup');
    setupToggle('toggleCustomCreditTitle', 'customCreditTitleGroup');
};
