export default function PurchasesModal() {
  return (
    <div
      className="modal fade"
      id="purchasesModal"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">

          <div className="modal-header">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-bag-check fs-5"></i>
              <span className="fw-semibold">قائمة المشتريات</span>
            </div>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div className="modal-body p-0">

            <div className="p-3 border-bottom text-center">
              <h3 className="mb-0 fw-bold">
                <i className="bi bi-graph-down-arrow me-2 text-dark"></i>
                قائمة المشتريات
              </h3>

              <small className="text-muted">
                عدد المشتريات:{" "}
                <span id="purchasesCount">0</span>
              </small>
            </div>

            <div className="p-2 d-flex gap-2">
              <input
                id="purchaseSearch"
                className="form-control"
                placeholder="بحث في المشتريات..."
              />

              <button
                id="btnClearPurchaseSearch"
                className="btn btn-outline-secondary flex-shrink-0"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="table-responsive">
              <table className="table table-hover text-center mb-0">
                <thead className="table-light">
                  <tr>
                    <th>التاريخ</th>
                    <th>المنتج</th>
                    <th>الكمية</th>
                    <th>السعر</th>
                    <th>الإجمالي</th>
                    <th>المورد</th>
                    <th style={{ width: "120px" }}>إجراءات</th>
                  </tr>
                </thead>

                <tbody id="modalPurchaseTbody"></tbody>
              </table>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}