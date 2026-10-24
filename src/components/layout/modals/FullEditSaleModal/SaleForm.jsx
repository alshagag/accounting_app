"use client";

export default function SaleForm() {
  return (
    <div className="row g-2">

      <div className="col-6">
        <label className="form-label">النوع</label>

        <div className="input-group">
          <span className="input-group-text">
            <i className="bi bi-arrow-left-right"></i>
          </span>

          <select
            id="full_sale_type"
            className="form-select"
          >
            <option value="بيع">بيع</option>
            <option value="شراء">شراء</option>
          </select>
        </div>
      </div>

      <div className="col-6">
        <label className="form-label">التاريخ</label>

        <div className="input-group">
          <span className="input-group-text">
            <i className="bi bi-calendar-date"></i>
          </span>

          <input
            id="full_sale_date"
            type="date"
            className="form-control"
          />
        </div>
      </div>

      <div className="col-12">
        <label className="form-label">المنتج</label>

        <div className="input-group">
          <span className="input-group-text">
            <i className="bi bi-box-seam"></i>
          </span>

          <select
            id="full_sale_product"
            className="form-select"
          >
            <option value="">اختر منتج</option>
          </select>
        </div>
      </div>

      <div className="col-6">
        <label className="form-label">الكمية</label>

        <div className="input-group">
          <span className="input-group-text">
            <i className="bi bi-123"></i>
          </span>

          <input
            id="full_sale_quantity"
            type="number"
            className="form-control"
          />
        </div>
      </div>

      <div className="col-6">
        <label className="form-label">السعر</label>

        <div className="input-group">
          <span className="input-group-text">
            <i className="bi bi-cash-stack"></i>
          </span>

          <input
            id="full_sale_price"
            type="number"
            className="form-control"
          />
        </div>
      </div>

      <div className="col-12">
        <label className="form-label">الإجمالي</label>

        <div className="input-group">
          <span className="input-group-text">
            <i className="bi bi-calculator"></i>
          </span>

          <input
            id="full_sale_total"
            className="form-control"
            readOnly
          />
        </div>
      </div>

    </div>
  );
}