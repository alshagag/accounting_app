import { $ } from "@/services/lib/utils.js";
import { getProductById, saveProductEdit } from "./products.js";
import { showGlobalAlert, setButtonLoading } from "@/components/ui.js";
import { confirmDelete } from "@/components/dialogs/confirm-dialog.js";
import { openBarcodeScanner } from "./barcode-scanner.js";
import { track } from "@/services/analytics/gtag.js";

let open, openForCreate, bind;

if (typeof window !== 'undefined') {
    const FullEditProductModule = (function() {
        /* ================= محرر المنتج الكامل | Full Product Editor ================= */

        const ids = {
            modal: "fullEditProductModal",
            productId: "full_editProductId",
            sku: "full_editProductSku",
            barcode: "full_editProductBarcode",
            name: "full_editProductName",
            price: "full_editProductPrice",
            salePrice: "full_editProductSalePrice",
            description: "full_editProductDesc",
            unit: "full_editProductUnit",
            division: "full_editProductDivision",
            defaultDivision: "full_editProductDefaultDivision",
            minStock: "full_editProductMinStock",
            image: "full_editProductImage",
            saveButton: "full_btnSaveEditProduct"
        };

        const selectors = {
            openButton: ".full-edit-product"
        };

        /* أدوات الحقول | Field helpers */
        function setFieldValue(id, value) {
            const element = document.getElementById(id);
            if (element) element.value = value;
        }

        // في حالة عدم وجود قيمة الوحدة ضمن خيارات القائمة، يتم إضافة الخيار قبل التعيين | If unit value not in select options, add it before setting
        function setUnitValue(value) {
            const el = document.getElementById(ids.unit);
            if (!el) return;
            const v = value == null ? "" : String(value);
            if (v && ![...el.options].some(o => o.value === v)) {
                const option = document.createElement("option");
                option.value = v;
                option.textContent = v;
                el.appendChild(option);
            }
            el.value = v;
        }

        function resetFields() {
            Object.values(ids).forEach(id => {
                if (id !== ids.modal && id !== ids.saveButton) {
                    setFieldValue(id, "");
                }
            });
            const imgPreview = document.getElementById("full_editImagePreview");
            if (imgPreview) imgPreview.classList.add("d-none");
            const imgPreviewImg = document.getElementById("full_editImagePreviewImg");
            if (imgPreviewImg) imgPreviewImg.src = "";
            // إعادة تعيين الحالة المؤقتة | Reset temporary state
            window._fullEditDeleteImage = false;
        }

        /* إدارة النافذة | Modal handling */
        function getModal() {
            const modalElement = document.getElementById(ids.modal);
            if (!modalElement || !window.bootstrap) return null;

            return window.bootstrap.Modal.getOrCreateInstance(modalElement);
        }

        function showModal() {
            const editorModal = getModal();
            const productsModal = document.getElementById("productsModal");

            if (!editorModal) return;

            if (!productsModal?.classList.contains("show")) {
                editorModal.show();
                return;
            }

            productsModal.addEventListener("hidden.bs.modal", () => {
                editorModal.show();
            }, { once: true });

            window.bootstrap.Modal.getOrCreateInstance(productsModal)?.hide();
        }

        /* فتح للإنشاء | Open for create */
        function openForCreate() {
            resetFields();
            showModal();
        }

        /* فتح التعديل | Open editor */
        async function open(productId) {
            const product = await getProductById(productId);
            if (!product) return;

            track("product_edit_started", { feature_name: "products", entry_point: "full_editor" });

            setFieldValue(ids.productId, product.id);
            setFieldValue(ids.sku, product.sku || "");
            setFieldValue(ids.barcode, product.barcode || product.code || "");
            setFieldValue(ids.name, product.name || "");
            setFieldValue(ids.description, product.description || "");
            setUnitValue(product.unit || "");

            const salePriceEl = document.getElementById(ids.salePrice);
            if (salePriceEl) salePriceEl.value = product.price ?? "";

            const costPriceEl = document.getElementById(ids.price);
            if (costPriceEl) costPriceEl.value = product.costPrice ?? "";

            const unitEl = document.getElementById(ids.unit);
            if (unitEl) {
                const unit = product.unit ?? product.productUnit ?? "";
                unitEl.value = unit || unitEl.value || "";
            }

            setFieldValue(ids.division, product.division || "");
            setFieldValue(ids.defaultDivision, product.defaultDivision || "");
            setFieldValue(ids.minStock, product.minStock ?? "");

            // إعادة تعيين حالة حذف الصورة عند فتح منتج | Reset the image-deletion flag when a product opens
            window._fullEditDeleteImage = false;

            const imgPreview = document.getElementById("full_editImagePreview");
            const imgPreviewImg = document.getElementById("full_editImagePreviewImg");
            if (product.image && imgPreview && imgPreviewImg) {
                imgPreviewImg.src = product.image;
                imgPreview.classList.remove("d-none");
            } else {
                if (imgPreview) imgPreview.classList.add("d-none");
                if (imgPreviewImg) imgPreviewImg.src = "";
            }

            showModal();
        }


        /* حفظ التغييرات | Save changes */
        async function save() {
            const saveButton = document.getElementById(ids.saveButton);

            const productId = document.getElementById(ids.productId)?.value;
            const sku = document.getElementById(ids.sku)?.value?.trim() || "";
            const barcode = document.getElementById(ids.barcode)?.value?.trim() || "";
            const name = document.getElementById(ids.name)?.value?.trim();
            const description = document.getElementById(ids.description)?.value?.trim() || "";

            const salePriceEl = document.getElementById(ids.salePrice);
            const costPriceEl = document.getElementById(ids.price);
            const salePrice = parseFloat(salePriceEl?.value);
            const costPrice = parseFloat(costPriceEl?.value);

            const unit = document.getElementById(ids.unit)?.value ?? "";
            const division = document.getElementById(ids.division)?.value?.trim() || "";
            const defaultDivision = document.getElementById(ids.defaultDivision)?.value?.trim() || "";
            const minStock = parseInt(document.getElementById(ids.minStock)?.value, 10) || 0;
            const imageInput = document.getElementById(ids.image);
            const deleteImage = !!window._fullEditDeleteImage;

            if (!name) {
                showGlobalAlert("يرجى إدخال اسم المنتج", "warning");
                return;
            }

            if (isNaN(salePrice) || salePrice < 0) {
                showGlobalAlert("يرجى إدخال سعر بيع صحيح", "warning");
                return;
            }

            const doSave = async (imageDataUrl) => {
                try {
                    setButtonLoading(saveButton, true, "جاري تحديث المنتج...");

                    // بناء كائن الحقول بناءً على متطلبات saveProductEdit | Build fields object as expected by saveProductEdit
                    const fields = { sku, barcode, name, salePrice, costPrice, description, unit, division, defaultDivision, minStock };
                    if (deleteImage) {
                        fields.image = "";
                    } else if (imageDataUrl) {
                        fields.image = imageDataUrl;
                    }

                    const updated = await saveProductEdit(productId, fields);

                    if (!updated) {
                        showGlobalAlert("تعذر العثور على المنتج المطلوب", "warning");
                        return;
                    }

                    window._fullEditDeleteImage = false;
                    await window.fullAppRefresh?.();
                    showGlobalAlert("تم تحديث المنتج بنجاح", "success");
                    track("product_edit_success", {
                        feature_name: "products",
                        entry_point: "full_editor",
                        source: imageDataUrl || deleteImage ? "with_image_change" : "fields_only",
                    });

                    // بعد نجاح الحفظ: الانتقال إلى صفحة عرض المنتج نفسه | After a successful save: navigate to the same product's view page
                    const updatedId = Number(productId);
                    const editorModalEl = document.getElementById(ids.modal);
                    if (editorModalEl && updatedId && window.ViewProductModule?.open) {
                        editorModalEl.addEventListener("hidden.bs.modal", () => {
                            window.ViewProductModule.open(updatedId);
                        }, { once: true });
                    }
                    getModal()?.hide();

                } catch (error) {
                    console.error(error);
                    track("product_edit_failed", { feature_name: "products", failure_reason: "db_error", entry_point: "full_editor" });
                    showGlobalAlert("حدث خطأ أثناء تحديث المنتج", "danger");
                } finally {
                    setButtonLoading(saveButton, false);
                }
            };

            if (imageInput && imageInput.files?.[0]) {
                const reader = new FileReader();
                reader.onload = (ev) => doSave(ev.target?.result);
                reader.onerror = () => showGlobalAlert("تعذر قراءة الصورة — حاول مرة أخرى", "danger");
                reader.readAsDataURL(imageInput.files[0]);
            } else {
                doSave(null);
            }
        }

        /**
         * بدء ماسح الباركود | Initialize and start barcode scanner
         */
        async function startBarcodeScanner() {
            await openBarcodeScanner({
                modalId: "productEditBarcodeScannerModal",
                containerId: "barcodeScannerVideo",
                onDetected: (raw) => {
                    const barcodeInput = document.getElementById(ids.barcode);
                    if (barcodeInput) {
                        barcodeInput.value = raw;
                        barcodeInput.dispatchEvent(new Event("input"));
                    }
                }
            });
        }

        function goBackToProductsModal() {
            const editorModalEl = document.getElementById(ids.modal);
            if (!editorModalEl) return;
            
            const editorModal = window.bootstrap.Modal.getInstance(editorModalEl);
            if (!editorModal) return;

            editorModalEl.addEventListener('hidden.bs.modal', () => {
                const productsModalEl = document.getElementById("productsModal");
                if (productsModalEl) {
                    const productsModal = window.bootstrap.Modal.getOrCreateInstance(productsModalEl);
                    productsModal.show();
                }
            }, { once: true });

            editorModal.hide();
        }

        /* الأحداث | Events */
        function bind({ onDeleteProduct }) {
            const backButton = document.getElementById("btnBackFromFullEdit");
            if(backButton) {
                backButton.addEventListener("click", goBackToProductsModal);
            }

            const barcodeInput = document.getElementById(ids.barcode);
            const scanButton = document.getElementById("btnScanBarcode");
            const wrapper = barcodeInput?.closest(".input-group");

            if (barcodeInput && wrapper) {
                barcodeInput.readOnly = false;

                const clearBtn = document.createElement("span");
                clearBtn.className = "input-clear-btn";
                clearBtn.innerHTML = "&times;";

                // إدراج زر المسح قبل زر المسح الضوئي | Insert clear button before scan button
                if (scanButton) {
                    scanButton.before(clearBtn);
                } else {
                    wrapper.appendChild(clearBtn);
                }

                const checkValue = () => {
                    const hasValue = barcodeInput.value !== "";
                    wrapper.classList.toggle("has-value", hasValue);

                    if (scanButton && hasValue) {
                        const scanButtonWidth = scanButton.offsetWidth;
                        clearBtn.style.insetInlineEnd = `${scanButtonWidth + 5}px`;
                    }
                };

                barcodeInput.addEventListener("input", checkValue);
                clearBtn.addEventListener("click", () => {
                    barcodeInput.value = "";
                    checkValue();
                    barcodeInput.focus();
                });

                // إعادة حساب الموضع عند ظهور النافذة لأن offsetWidth لا يتوفر قبلها | Recalculate position on modal show because offsetWidth is only available then
                const modalElement = document.getElementById(ids.modal);
                if (modalElement) {
                    modalElement.addEventListener('shown.bs.modal', checkValue);
                }

                checkValue();
            }

            if (scanButton) {
                scanButton.addEventListener('click', startBarcodeScanner);
            }

            // حذف صورة المنتج بعد تأكيد المستخدم — ويُحفظ الحذف فعليًا في مصدر البيانات دون تغيير أي بيانات أخرى | Delete the product image after user confirmation — the removal is persisted to the data source without changing any other data
            const deleteImageButton = document.getElementById("btnDeleteFullEditImage");
            if (deleteImageButton) {
                deleteImageButton.addEventListener("click", async () => {
                    const productId = Number(document.getElementById(ids.productId)?.value);
                    if (!productId) return;

                    const confirmed = await confirmDelete({
                        title: "تأكيد حذف الصورة",
                        message: "هل أنت متأكد من حذف صورة المنتج؟",
                        detail: "سيتم حذف صورة المنتج فقط دون تغيير أي بيانات أخرى.",
                        confirmText: "حذف الصورة",
                    });
                    if (!confirmed) return;

                    const current = await getProductById(productId);
                    if (!current) {
                        showGlobalAlert("تعذر العثور على المنتج المطلوب", "warning");
                        return;
                    }

                    // تحديث حقل الصورة وحده مع الإبقاء على بقية القيم المحفوظة | Update only the image field while keeping the rest of the stored values
                    const saved = await saveProductEdit(productId, {
                        sku: current.sku,
                        barcode: current.barcode,
                        name: current.name,
                        salePrice: current.salePrice ?? current.price,
                        costPrice: current.costPrice,
                        description: current.description,
                        unit: current.unit,
                        division: current.division,
                        defaultDivision: current.defaultDivision,
                        minStock: current.minStock,
                        image: "",
                    });

                    if (!saved) {
                        showGlobalAlert("تعذر حذف صورة المنتج", "warning");
                        return;
                    }

                    window._fullEditDeleteImage = false;
                    const imageInput = document.getElementById(ids.image);
                    if (imageInput) imageInput.value = "";
                    const imgPreviewImg = document.getElementById("full_editImagePreviewImg");
                    if (imgPreviewImg) imgPreviewImg.src = "";
                    document.getElementById("full_editImagePreview")?.classList.add("d-none");
                    await window.fullAppRefresh?.();
                    showGlobalAlert("تم حذف صورة المنتج", "success");
                    track("product_image_deleted", { feature_name: "products" });
                });
            }

            // معاينة الصورة الجديدة المختارة فوراً | Preview the newly selected image immediately
            const imageInput = document.getElementById(ids.image);
            if (imageInput) {
                imageInput.addEventListener("change", () => {
                    const file = imageInput.files?.[0];
                    const imgPreview = document.getElementById("full_editImagePreview");
                    const imgPreviewImg = document.getElementById("full_editImagePreviewImg");
                    if (!file || !imgPreview || !imgPreviewImg) return;
                    window._fullEditDeleteImage = false;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        imgPreviewImg.src = typeof ev.target?.result === "string" ? ev.target.result : "";
                        imgPreview.classList.remove("d-none");
                    };
                    reader.readAsDataURL(file);
                });
            }

            document.addEventListener("click", (event) => {
                const button = event.target.closest(selectors.openButton);
                if (!button) return;

                const productId = Number(button.dataset.id);
                if (productId) open(productId);
            });

            document
                .getElementById(ids.saveButton)
                ?.addEventListener("click", save);

            const deleteButton = document.getElementById("full_btnDeleteProduct");
            if (deleteButton) {
                deleteButton.addEventListener("click", async () => {
                    const productId = Number(document.getElementById(ids.productId)?.value);
                    if (!productId) return;

                    const deleted = await onDeleteProduct(productId, true);
                    if (deleted) {
                        showGlobalAlert("تم حذف المنتج بنجاح", "success");
                        getModal()?.hide();
                        window.fullAppRefresh?.();
                    }
                });
            }
        }
        return { bind, open, openForCreate };
    }());

    open = (productId) => FullEditProductModule.open(productId);
    openForCreate = () => FullEditProductModule.openForCreate();
    bind = (args) => FullEditProductModule.bind(args);
    window.FullEditProductModule = FullEditProductModule;
}

export { open, openForCreate, bind };
