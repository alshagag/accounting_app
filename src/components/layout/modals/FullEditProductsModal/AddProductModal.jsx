"use client";

export default function AddProductModal() {
  return (
    <div
      className="modal fade"
      id="addProductModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <span className="fw-semibold">
              <i className="bi bi-plus-circle me-1"></i>
              إضافة منتج جديد
            </span>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div className="modal-body p-4">
            <button type="button" id="btnBackFromAddProduct" className="btn btn-sm btn-light mb-3 fw-semibold btn-back-settings">
                <i className="bi bi-arrow-right me-1"></i>
                رجوع
            </button>
            {/* قسم معلومات المنتج | Product information section */}
            <div className="settings-section">
                <div className="settings-section-title">
                    <i className="bi bi-box-seam me-1"></i>
                    معلومات المنتج
                </div>
                <div className="row g-3">
                    <div className="col-12">
                        <label className="form-label fw-semibold">اسم المنتج</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-box-seam"></i></span>
                            <input id="addProductName" className="form-control" placeholder="أدخل اسم المنتج" />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">الوحدة</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-rulers"></i></span>
                            <select id="addProductUnit" className="form-select" defaultValue="قطعة">
                                <option value="قطعة">قطعة</option>
                                <option value="حبة">حبة</option>
                                <option value="كرتون">كرتون</option>
                                <option value="صندوق">صندوق</option>
                                <option value="كيلوجرام">كيلوجرام</option>
                                <option value="جرام">جرام</option>
                                <option value="لتر">لتر</option>
                                <option value="ملليلتر">ملليلتر</option>
                                <option value="متر">متر</option>
                                <option value="سنتيمتر">سنتيمتر</option>
                                <option value="متر مربع">متر مربع</option>
                                <option value="متر مكعب">متر مكعب</option>
                                <option value="زوج">زوج</option>
                                <option value="عبوة">عبوة</option>
                                <option value="باكيت">باكيت</option>
                                <option value="خدمة">خدمة</option>
                                <option value="وحدة">وحدة</option>
                            </select>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">القسم</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-folder"></i></span>
                            <input id="addProductDivision" className="form-control" placeholder="القسم الرئيسي" />
                        </div>
                    </div>
                    <div className="col-12">
                        <label className="form-label fw-semibold">وصف المنتج</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-card-text"></i></span>
                            <textarea id="addProductDesc" className="form-control" rows={2} placeholder="وصف اختياري للمنتج"></textarea>
                        </div>
                    </div>
                </div>
            </div>

            {/* قسم الأسعار | Prices section */}
            <div className="settings-section">
                <div className="settings-section-title">
                    <i className="bi bi-tags me-1"></i>
                    الأسعار
                </div>
                <div className="row g-3">
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">سعر البيع</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-cash-coin"></i></span>
                            <input id="addProductSalePrice" type="number" className="form-control" placeholder="0" />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">سعر الشراء</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-cart-check"></i></span>
                            <input id="addProductCostPrice" type="number" className="form-control" placeholder="0" />
                        </div>
                    </div>
                </div>
            </div>

            {/* قسم أكواد المنتج | Product codes section */}
            <div className="settings-section">
                <div className="settings-section-title">
                    <i className="bi bi-upc-scan me-1"></i>
                    أكواد المنتج
                </div>
                <div className="row g-3">
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">كود المنتج (SKU)</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-upc-scan"></i></span>
                            <input id="addProductSku" className="form-control" placeholder="أدخل كود المنتج الداخلي" />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">الباركود</label>
                        <div className="input-group input-with-clear">
                            <span className="input-group-text"><i className="bi bi-qr-code-scan"></i></span>
                            <input id="addProductBarcode" className="form-control" placeholder="أدخل أو امسح الباركود" />
                            <button className="btn btn-outline-secondary" type="button" id="btnScanBarcodeAdd" title="مسح الباركود">
                                <i className="bi bi-camera"></i>
                            </button>
                        </div>
                        <p id="addAutofillNote" className="autofill-note d-none mt-2 mb-0"></p>
                    </div>
                </div>
            </div>

            {/* قسم المخزون | Stock section */}
            <div className="settings-section">
                <div className="settings-section-title">
                    <i className="bi bi-archive me-1"></i>
                    المخزون
                </div>
                <div className="row g-3">
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">الحد الأدنى للمخزون</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-exclamation-triangle"></i></span>
                            <input id="addProductMinStock" type="number" className="form-control" placeholder="0" />
                        </div>
                         <div className="form-text"><i className="bi bi-exclamation-circle me-1"></i> سيتم تنبيهك عند انخفاض الكمية عن هذا الحد.</div>
                    </div>
                </div>
            </div>

            {/* قسم الصورة | Image section */}
            <div className="settings-section">
                <div className="settings-section-title">
                    <i className="bi bi-image me-1"></i>
                    الصورة
                </div>
                <div className="row g-3 align-items-center">
                    <div className="col-sm-8">
                        <label className="form-label fw-semibold">تحميل صورة المنتج</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-image"></i></span>
                            <input id="addProductImage" type="file" accept="image/*" capture="environment" className="form-control" />
                        </div>
                        <div className="form-text">
                            تُحفظ الصورة مع المنتج للعرض لاحقاً، ولا تُقرأ ولا تُحلَّل بأي شكل.
                        </div>
                    </div>
                    <div className="col-sm-4">
                        <div id="addImagePreview" className="mt-2 text-center d-none">
                            <img id="addImagePreviewImg" alt="معاينة" className="img-fluid rounded" style={{ maxHeight: "80px" }} />
                            <div className="mt-1">
                                <button type="button" className="btn btn-sm btn-outline-danger" id="btnDeleteAddImage">
                                    <i className="bi bi-trash me-1"></i>حذف
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="form-text mt-3 text-center text-muted">
              <i className="bi bi-exclamation-circle me-1"></i>
              سيتم إضافة المنتج إلى المخزون بكمية صفرية. يمكنك تعديل الكمية لاحقاً عبر فاتورة شراء.
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              data-bs-dismiss="modal"
            >
              إلغاء
            </button>

            <button
              type="button"
              className="btn btn-success"
              id="btnSaveNewProduct"
            >
              <i className="bi bi-plus-lg me-1"></i>
              إضافة المنتج
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
