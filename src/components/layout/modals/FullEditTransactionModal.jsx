export default function FullEditTransactionModal() {
  return (
    <div
      className="modal fade"
      id="fullEditTransactionModal"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg">
        <div className="modal-content">

          <div className="modal-header">
            <div className="d-flex align-items-center gap-2">
              <i
                className="bi bi-receipt-cutoff fs-5"
                id="full_tx_headerIcon"
              ></i>
              <span className="fw-semibold" id="full_tx_title">
                تعديل شامل للعملية
              </span>
            </div>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div className="modal-body">

            <input type="hidden" id="full_tx_id" />

            <div className="row g-3 mb-3">

              <div className="col-12 col-md-4">
                <div className="border rounded p-3 h-100">
                  <div className="d-flex align-items-center gap-2 text-muted small mb-1">
                    <i className="bi bi-tag"></i>
                    <span>نوع العملية</span>
                  </div>
                  <div className="fw-bold" id="full_tx_typePoster">
                    -
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className="border rounded p-3 h-100">
                  <div className="d-flex align-items-center gap-2 text-muted small mb-1">
                    <i className="bi bi-calculator"></i>
                    <span>الإجمالي الحالي</span>
                  </div>
                  <div className="fw-bold" id="full_tx_totalPoster">
                    0.00
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className="border rounded p-3 h-100">
                  <div className="d-flex align-items-center gap-2 text-muted small mb-1">
                    <i className="bi bi-calendar-check"></i>
                    <span>تاريخ العملية</span>
                  </div>
                  <div className="fw-bold" id="full_tx_datePoster">
                    -
                  </div>
                </div>
              </div>

            </div>

            <div className="row g-3">

              <div className="col-12 col-md-4">
                <label className="form-label">رقم العملية</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-hash"></i>
                  </span>
                  <input
                    id="full_tx_code"
                    className="form-control"
                    readOnly
                  />
                </div>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">نوع العملية</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-arrow-left-right"></i>
                  </span>

                  <select id="full_tx_type" className="form-select">
                    <option value="بيع">بيع</option>
                    <option value="شراء">شراء</option>
                  </select>
                </div>

                <div
                  className="form-text"
                  id="full_tx_typeNotice"
                >
                  نوع العملية الحالي: -
                </div>
              </div>

              <div className="col-12 col-md-4">
                <label className="form-label">التاريخ</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-calendar-date"></i>
                  </span>
                  <input
                    id="full_tx_date"
                    type="date"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">المنتج</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-box-seam"></i>
                  </span>
                  <select
                    id="full_tx_product"
                    className="form-select"
                  >
                    <option value="">اختر منتج</option>
                  </select>
                </div>
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label">الكمية</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-123"></i>
                  </span>
                  <input
                    id="full_tx_quantity"
                    type="number"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="col-6 col-md-3">
                <label className="form-label">السعر</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-cash-stack"></i>
                  </span>
                  <input
                    id="full_tx_price"
                    type="number"
                    className="form-control"
                  />
                </div>
              </div>

              <div
                className="col-12 col-md-6"
                id="full_tx_supplierRow"
              >
                <label className="form-label">المورد</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-truck"></i>
                  </span>
                  <input
                    id="full_tx_supplier"
                    className="form-control"
                  />
                </div>
              </div>

              <div
                className="col-12 col-md-6"
                id="full_tx_phoneRow"
              >
                <label className="form-label">
                  رقم هاتف العميل
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-telephone"></i>
                  </span>
                  <input
                    id="full_tx_customerPhone"
                    className="form-control"
                  />
                </div>
              </div>

              <div className="col-12 col-md-6">
                <label className="form-label">الإجمالي</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-calculator"></i>
                  </span>
                  <input
                    id="full_tx_total"
                    className="form-control"
                    readOnly
                  />
                </div>
              </div>

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
              className="btn btn-primary"
              id="full_tx_save"
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