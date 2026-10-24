"use client";

import PurchaseInvoiceHeader from "./PurchaseInvoiceHeader";
import PurchaseInvoiceLines from "./PurchaseInvoiceLines";
import PurchaseInvoiceOptions from "./PurchaseInvoiceOptions";
import PurchaseInvoiceTotals from "./PurchaseInvoiceTotals";
import PurchaseInvoiceFooter from "./PurchaseInvoiceFooter";

export default function PurchaseInvoiceModal() {
  return (
    <div
      className="modal fade"
      id="purchaseInvoiceModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <span className="fw-semibold">
                <i className="bi bi-receipt me-1"></i>
                <span id="purchaseInvoiceModalTitle">فاتورة شراء</span>
              </span>
            </h5>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div className="modal-body">
            <input type="hidden" id="purchaseInvEditKey" />
            <input type="hidden" id="purchaseInvDueDate" />

            <PurchaseInvoiceHeader />

            <PurchaseInvoiceLines />

            <PurchaseInvoiceOptions />

            <PurchaseInvoiceTotals />
          </div>

          <PurchaseInvoiceFooter />
        </div>
      </div>
    </div>
  );
}