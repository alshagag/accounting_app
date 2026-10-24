"use client";

import VoucherInfo from "./VoucherInfo";
import VoucherTable from "./VoucherTable";
import VoucherOptions from "./VoucherOptions";
import VoucherFooter from "./VoucherFooter";

export default function VoucherModal() {
  return (
    <div
      className="modal fade"
      id="voucherModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">

          <div className="modal-header">
            <span className="fw-semibold">
              <i className="bi bi-receipt-cutoff me-1"></i>
              <span id="voucherModalTitle">سند</span>
            </span>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div className="modal-body">

            <VoucherInfo />

            <VoucherTable />

            <VoucherOptions />

          </div>

          <VoucherFooter />

        </div>
      </div>
    </div>
  );
}