"use client";

export default function FullEditProductsModal() {

  return (
    <div
      className="modal fade"
      id="fullEditProductModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <span className="fw-semibold">
              <i className="bi bi-pencil-square me-1"></i>
              تعديل شامل للمنتج
            </span>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div className="modal-body p-3">
            <button type="button" id="btnBackFromFullEdit" className="btn btn-sm btn-light mb-3 fw-semibold btn-back-settings">
              <i className="bi bi-arrow-right me-1"></i>
              رجوع
            </button>
            <input type="hidden" id="full_editProductId" />

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
                            <input id="full_editProductName" className="form-control" />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">الوحدة</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-rulers"></i></span>
                            <select id="full_editProductUnit" className="form-select" defaultValue="قطعة">
                                <option>قطعة</option>
                                <option>حبة</option>
                                <option>كرتون</option>
                                <option>صندوق</option>
                                <option>كيلوجرام</option>
                                <option>جرام</option>
                                <option>لتر</option>
                                <option>ملليلتر</option>
                                <option>متر</option>
                                <option>سنتيمتر</option>
                                <option>متر مربع</option>
                                <option>متر مكعب</option>
                                <option>زوج</option>
                                <option>عبوة</option>
                                <option>باكيت</option>
                                <option>خدمة</option>
                                <option>وحدة</option>
                            </select>
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">القسم</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-folder"></i></span>
                            <input id="full_editProductDivision" className="form-control" placeholder="القسم الرئيسي" />
                        </div>
                    </div>
                    <div className="col-12">
                        <label className="form-label fw-semibold">وصف المنتج</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-card-text"></i></span>
                            <textarea id="full_editProductDesc" className="form-control" rows={2}></textarea>
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
                            <input id="full_editProductSalePrice" type="number" className="form-control" />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">سعر الشراء</label>
                        <div className="input-group">
                            <span className="input-group-text"><i className="bi bi-cart-check"></i></span>
                            <input id="full_editProductPrice" type="number" className="form-control" />
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
                            <input id="full_editProductSku" className="form-control" placeholder="أدخل كود المنتج الداخلي" />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <label className="form-label fw-semibold">الباركود</label>
                        <div className="input-group input-with-clear">
                            <span className="input-group-text"><i className="bi bi-qr-code-scan"></i></span>
                            <input id="full_editProductBarcode" className="form-control" placeholder="أدخل أو امسح الباركود" />
                            <button className="btn btn-outline-secondary" type="button" id="btnScanBarcode" title="مسح الباركود">
                                <i className="bi bi-camera"></i>
                            </button>
                        </div>
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
                            <input id="full_editProductMinStock" type="number" className="form-control" placeholder="0" />
                        </div>
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
                            <input id="full_editProductImage" type="file" accept="image/*" className="form-control" />
                        </div>
                    </div>
                    <div className="col-sm-4">
                        <div id="full_editImagePreview" className="mt-2 text-center d-none">
                            <img id="full_editImagePreviewImg" alt="معاينة" className="img-fluid rounded" style={{ maxHeight: "80px" }} />
                            <div className="mt-1">
                                <button type="button" className="btn btn-sm btn-outline-danger" id="btnDeleteFullEditImage">
                                    <i className="bi bi-trash me-1"></i>حذف
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-danger me-auto"
              id="full_btnDeleteProduct"
              title="حذف المنتج"
            >
              <i className="bi bi-trash"></i>
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              data-bs-dismiss="modal"
            >
              إلغاء
            </button>

            <button
              type="button"
              className="btn btn-primary"
              id="full_btnSaveEditProduct"
            >
              <i className="bi bi-arrow-repeat me-1"></i>
              تحديث
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
