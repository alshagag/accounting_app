"use client";

export default function PurchaseInvoiceTotals() {
  return (
    <div className="row g-2">
      <div className="col-md-6">

        <div className="d-flex justify-content-between align-items-center mb-1">
          <span>المجموع الفرعي</span>
          <strong id="purchaseInvSubtotal">0.00</strong>
        </div>

        <div
          id="purchaseInvTaxRow"
          className="d-flex justify-content-between align-items-center mb-1"
          style={{ display: 'none' }}
        >
          <span id="purchaseInvTaxLabel">الضريبة</span>
          <strong id="purchaseInvTax">0.00</strong>
        </div>

        <hr className="my-2" />

        <div className="input-group input-group-sm">
          <span className="input-group-text flex-grow-1 text-start">
            الإجمالي
          </span>

          <span
            id="purchaseInvTotal"
            className="input-group-text fw-bold fs-5"
          >
            0.00
          </span>
        </div>

      </div>
    </div>
  );
}