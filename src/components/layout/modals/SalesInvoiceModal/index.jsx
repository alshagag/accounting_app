"use client";

import InvoiceHeader from "./SalesInvoiceHeader";
import InvoiceLines from "./SalesInvoiceLines";
import InvoiceOptions from "./SalesInvoiceOptions";
import InvoiceTotals from "./SalesInvoiceTotals";
import InvoiceFooter from "./SalesInvoiceFooter";

export default function SalesInvoiceModal() {
  return (
    <div
      className="modal fade"
      id="salesInvoiceModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">

          <div className="modal-header">
            <h5 className="modal-title">
              <span className="fw-semibold">
                <i className="bi bi-receipt me-1"></i>
                <span id="salesInvoiceModalTitle">فاتورة بيع</span>
              </span>
            </h5>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div className="modal-body">

            <input type="hidden" id="saleInvEditKey" />

            <InvoiceHeader />

            <InvoiceLines />

            <InvoiceOptions />

            <InvoiceTotals />

          </div>

          <InvoiceFooter />

        </div>
      </div>
    </div>
  );
}