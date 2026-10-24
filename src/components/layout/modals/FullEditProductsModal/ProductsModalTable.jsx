"use client";

export default function ProductsModal() {
  return (
    <div
      className="modal fade"
      id="productsModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-lg modal-dialog-scrollable" role="document">
        <div className="modal-content">

          <div className="modal-header">
            <h5 className="modal-title">
              <span className="fw-semibold">
                <i className="bi bi-box-seam me-1"></i>
                قائمة المنتجات
              </span>
            </h5>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div className="modal-body p-0">

            <div className="page-header">
              <div className="page-title">
                <i className="bi bi-box-seam page-title-icon"></i>
                <div>
                  <h4>قائمة المنتجات</h4>
                  <p>إدارة جميع المنتجات والمخزون.</p>
                </div>
              </div>
              <div className="page-header-actions">
                <button id="btnAddProductInModal" className="btn btn-success">
                  <i className="bi bi-plus-lg me-2"></i>إضافة منتج للمخزون
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover text-center mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="product-thumbnail-header">الصورة</th>
                    <th>اسم الصنف <i className="bi bi-sort-down sort-indicator"></i></th>
                    <th>الكمية المملوكة <i className="bi bi-sort-down sort-indicator"></i></th>
                    <th>متوسط التكلفة <i className="bi bi-sort-down sort-indicator"></i></th>
                    <th>إجمالي التكلفة <i className="bi bi-sort-down sort-indicator"></i></th>
                    <th style={{ width: "120px" }}>الإجراءات</th>
                  </tr>
                </thead>

                <tbody id="modalProductsTbody"></tbody>
                <tfoot id="modalProductsTfoot"></tfoot>
              </table>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}