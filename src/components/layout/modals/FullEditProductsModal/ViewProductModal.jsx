"use client";

export default function ViewProductModal() {
  return (
    <div
      className="modal fade"
      id="viewProductModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">

          <div className="modal-header">
            <h5 className="modal-title">
              <span className="fw-semibold">
                <i className="bi bi-eye me-1"></i>
                تفاصيل المنتج
              </span>
            </h5>
            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div className="modal-body">
            <input type="hidden" id="viewProductId" />
            <input type="hidden" id="viewProductMinStockValue" />

            <div className="row g-3">

              {/* المخزون | Stock */}
              <div className="col-12">
                <div className="row g-3">
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100" id="viewStockCard">
                      <div className="card-body text-center py-4">
                        <div className="text-muted small mb-2">
                          <i className="bi bi-boxes me-1"></i>
                          كمية المخزون الحالية
                        </div>
                        <div id="viewProductStockValue" className="fw-bold" style={{ fontSize: "2.5rem" }}><span id="viewProductStockValueSpan">0</span></div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="card border-0 shadow-sm h-100">
                      <div className="card-body text-center py-4">
                        <div className="text-muted small mb-2">
                          <i className="bi bi-cart-check me-1"></i>
                          إجمالي القطع المباعة
                        </div>
                        <div id="viewProductTotalSoldValue" className="fw-bold text-primary" style={{ fontSize: "2.5rem" }}>0</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* صورة المنتج | Product image — أسفل كرتي المخزون وإجمالي القطع المباعة | below the stock and total-sold cards */}
              <div className="col-12 d-none" id="viewImageSection">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-bottom">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-image me-2 text-secondary"></i>
                      صورة المنتج
                    </h6>
                  </div>
                  <div className="card-body text-center py-4">
                    <img id="viewProductImage" alt="صورة المنتج" className="img-fluid rounded" style={{ maxHeight: "200px", objectFit: "contain" }} />
                  </div>
                </div>
              </div>

              {/* المعلومات الأساسية | Basic information */}
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-bottom">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-info-circle me-2 text-primary"></i>
                      المعلومات الأساسية
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label text-muted small">اسم المنتج</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-box-seam"></i></span>
                          <input id="viewProductName" className="form-control" readOnly />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small">كود المنتج (SKU)</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-hash"></i></span>
                          <input id="viewProductSku" className="form-control" readOnly placeholder="—" />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small">الباركود</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-upc-scan"></i></span>
                          <input id="viewProductBarcode" className="form-control" readOnly placeholder="—" />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small">الوحدة</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-box"></i></span>
                          <input id="viewProductUnit" className="form-control" readOnly />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small">التصنيف</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-folder"></i></span>
                          <input id="viewProductDivision" className="form-control" readOnly />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small">القسم الافتراضي</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-folder2-open"></i></span>
                          <input id="viewProductDefaultDivision" className="form-control" readOnly />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small">الحالة</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-check-circle"></i></span>
                          <input id="viewProductStatus" className="form-control" readOnly value="نشط" />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small">الحد الأدنى للمخزون</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-exclamation-triangle"></i></span>
                          <input id="viewProductMinStock" type="number" className="form-control" readOnly />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* الأسعار | Prices */}
              <div className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-bottom">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-currency-dollar me-2 text-success"></i>
                      الأسعار
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="d-flex flex-column gap-3">
                      <div>
                        <label className="form-label text-muted small">سعر الشراء</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-cash-stack"></i></span>
                          <input id="viewProductCostPrice" type="number" className="form-control" readOnly />
                          <span className="input-group-text">﷼</span>
                        </div>
                      </div>
                      <div>
                        <label className="form-label text-muted small">سعر البيع</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-tag"></i></span>
                          <input id="viewProductSalePrice" type="number" className="form-control" readOnly />
                          <span className="input-group-text">﷼</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* آخر حركة | Last movement */}
              <div className="col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-header bg-white border-bottom">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-clock-history me-2 text-warning"></i>
                      حركة المنتج
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="d-flex flex-column gap-3">
                      <div>
                        <label className="form-label text-muted small">آخر حركة</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-arrow-left-right"></i></span>
                          <input id="viewProductLastMovement" className="form-control" readOnly placeholder="—" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* معلومات إضافية | Additional information */}
              <div className="col-12">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-bottom">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-card-text me-2 text-info"></i>
                      معلومات إضافية
                    </h6>
                  </div>
                  <div className="card-body">
                    <div className="row g-3">
                      <div className="col-12">
                        <label className="form-label text-muted small">الوصف</label>
                        <textarea
                          id="viewProductDesc"
                          className="form-control"
                          rows={3}
                          readOnly
                        ></textarea>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small">تاريخ الإنشاء</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-calendar-plus"></i></span>
                          <input id="viewProductCreatedAt" className="form-control" readOnly placeholder="—" />
                        </div>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label text-muted small">آخر تعديل</label>
                        <div className="input-group input-group-sm">
                          <span className="input-group-text"><i className="bi bi-calendar-check"></i></span>
                          <input id="viewProductUpdatedAt" className="form-control" readOnly placeholder="—" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* الباركود | Barcode */}
              <div className="col-12 d-none" id="viewBarcodeSection">
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-bottom d-flex align-items-center justify-content-between">
                    <h6 className="mb-0 fw-bold">
                      <i className="bi bi-upc-scan me-2 text-secondary"></i>
                      الباركود
                    </h6>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      disabled
                      title="قريباً - طباعة الباركود"
                    >
                      <i className="bi bi-printer me-1"></i>
                      طباعة
                    </button>
                  </div>
                  <div className="card-body text-center py-4">
                    <div id="viewBarcodeImage" className="mb-3"></div>
                    <div id="viewBarcodeText" className="fw-bold fs-5 text-muted"></div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div className="modal-footer d-flex justify-content-between">
            <button
              type="button"
              className="btn btn-primary"
              id="btnEditFromView"
            >
              <i className="bi bi-pencil-square me-1"></i>
              تحرير المنتج
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              data-bs-dismiss="modal"
            >
              <i className="bi bi-x-lg me-1"></i>
              إغلاق
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
