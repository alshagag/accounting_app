export default function ProductSidebar() {
  return (
    <div className="col-12 col-lg-4">

      {/* إدارة المنتجات — قسم تفاصيل المنتج | Product management — product details section */}
      <div className="card p-3 quick-product-box">
        <h5 className="mb-3">
          <i className="bi bi-box-seam"></i>{" "}
          إضافة المنتج سريعاً
        </h5>

        {/* اسم المنتج | Product name */}
        <div className="input-icon">
          <label htmlFor="productName" className="visually-hidden">
            اسم المنتج
          </label>

          <input
            id="productName"
            className="form-control"
            placeholder="اسم المنتج"
            autoComplete="off"
          />

          <i className="bi bi-tag"></i>
        </div>

        {/* الباركود + زر الكاميرا | Barcode + camera button */}
        <div className="quick-barcode-row">
          <div className="input-icon quick-barcode-field">
            <label htmlFor="productBarcode" className="visually-hidden">
              الباركود
            </label>

            <input
              id="productBarcode"
              className="form-control"
              placeholder="الباركود"
              inputMode="numeric"
              autoComplete="off"
            />

            <i className="bi bi-upc-scan"></i>
          </div>

          <button
            id="btnScanProductBarcode"
            className="btn btn-outline-primary quick-scan-btn"
            type="button"
            title="مسح الباركود بالكاميرا"
          >
            <i className="bi bi-camera"></i>
          </button>
        </div>

        <p
          id="quickAutofillNote"
          className="autofill-note d-none"
        ></p>

        {/* ملصقا حقلي التكلفة والبيع — يظهران عند التعديل ليعرف المستخدم كل حقل | Cost/sale field labels — shown while editing so the user knows which field is which */}
        <div
          id="quickPriceLabels"
          className="row g-2 quick-price-labels d-none mb-0"
        >
          <div className="col-6 text-center small text-muted">سعر التكلفة</div>
          <div className="col-6 text-center small text-muted">سعر البيع</div>
        </div>

        {/* الأسعار: سعر التكلفة ثم سعر البيع جنبًا إلى جنب | Prices: cost then sale price side by side */}
        <div className="row g-2 mb-3 quick-price-row">
          <div className="col-6">
            <div className="input-icon">
              <label htmlFor="productPrice" className="visually-hidden">
                سعر تكلفة المنتج
              </label>

              <input
                id="productPrice"
                type="number"
                min="0"
                className="form-control"
                placeholder="سعر التكلفة"
                inputMode="decimal"
              />

              <i className="bi bi-cash-coin"></i>
            </div>
          </div>

          <div className="col-6">
            <div className="input-icon">
              <label htmlFor="productSalePrice" className="visually-hidden">
                سعر بيع المنتج
              </label>

              <input
                id="productSalePrice"
                type="number"
                min="0"
                className="form-control"
                placeholder="سعر البيع"
                inputMode="decimal"
              />

              <i className="bi bi-cash-stack"></i>
            </div>
          </div>
        </div>

        <div className="d-flex gap-2 mb-3">
          <button
            id="btnAddProduct"
            className="btn btn-success w-100"
          >
            <i className="bi bi-plus-lg"></i>{" "}
            إضافة
          </button>

          <button
            id="btnCancelProduct"
            className="btn btn-outline-secondary w-100"
            style={{ display: "none" }}
          >
            <i className="bi bi-x-lg"></i>{" "}
            إلغاء
          </button>
        </div>

        <div className="table-responsive">
          <table className="table table-hover text-center">
            <thead className="table-light">
              <tr>
                <th>المنتج <i className="bi bi-sort-down sort-indicator"></i></th>
                <th>السعر <i className="bi bi-sort-down sort-indicator"></i></th>
                <th>المخزون <i className="bi bi-sort-down sort-indicator"></i></th>
                <th style={{ width: "80px" }}>إجراءات</th>
              </tr>
            </thead>

            <tbody id="productsTbody"></tbody>
          </table>
        </div>

        <div className="text-start mt-2">
          <button
            type="button"
            className="btn btn-outline-primary btn-sm"
            data-bs-toggle="modal"
            data-bs-target="#productsModal"
          >
            <i className="bi bi-box-arrow-up-right me-1"></i>
            عرض كل المنتجات
          </button>
        </div>
      </div>

      {/* العملاء والموردون | Customers and suppliers */}
      <div className="card p-3 mt-3">

        <div className="d-flex justify-content-between align-items-center mb-2">

          <h6 className="mb-0">
            <i className="bi bi-people"></i>{" "}
            العملاء والموردين
          </h6>

          <div className="d-flex gap-1">

            <button
              id="btnRefreshParties"
              className="btn btn-sm btn-outline-secondary"
              title="تحديث"
            >
              <i className="bi bi-arrow-clockwise"></i>
            </button>

            <button
              id="btnMoreParties"
              className="btn btn-sm btn-outline-secondary"
              title="المزيد"
            >
              <i className="bi bi-list"></i> المزيد
            </button>

            <button
              className="btn btn-sm btn-new-party"
              style={{ background: "#198754", color: "#fff" }}
              title="إنشاء جديد"
              onClick={() => window.openPartiesModal?.({ tab: "add" })}
            >
              <i className="bi bi-plus-lg"></i>
            </button>

          </div>
        </div>

        <div className="d-flex gap-2 mb-2">

          <button
            className="btn btn-sm btn-success party-filter"
            data-party-type="customers"
          >
            العملاء{" "}
            <span
              id="customersCount"
              className="badge bg-light text-dark"
            >
              0
            </span>
          </button>

          <button
            className="btn btn-sm btn-outline-success party-filter"
            data-party-type="suppliers"
          >
            الموردون{" "}
            <span
              id="suppliersCount"
              className="badge bg-light text-dark"
            >
              0
            </span>
          </button>

        </div>

        <div
          id="partiesList"
          className="documents-list"
        ></div>
      </div>
    </div>
  );
}