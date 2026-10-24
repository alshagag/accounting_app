"use client";

import SaleSummary from "./SaleSummary";
import SaleForm from "./SaleForm";
import SaleFooter from "./SaleFooter";

export default function FullEditSaleModal() {
  return (
    <div
      className="modal fade"
      id="fullEditSaleModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog">
        <div className="modal-content">

          <div className="modal-header">
            <span className="fw-semibold">
              <i className="bi bi-pencil-square me-1"></i>
              تعديل عملية البيع
            </span>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div className="modal-body">

            <input type="hidden" id="full_sale_id" />

            <SaleSummary />

            <SaleForm />

          </div>

          <SaleFooter />

        </div>
      </div>
    </div>
  );
}