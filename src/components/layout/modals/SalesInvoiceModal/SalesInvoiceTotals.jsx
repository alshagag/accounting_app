"use client";

export default function InvoiceTotals() {
  return (
    <div className="row g-2">
      <div className="col-md-6">

        {/* المجموع الفرعي | Subtotal */}
        <div className="d-flex justify-content-between align-items-center mb-2">
          <span>المجموع الفرعي</span>
          <strong id="saleInvSubtotal">0.00</strong>
        </div>

        {/* الضريبة | Tax */}
        <div
          id="saleInvTaxRow"
          className="d-flex justify-content-between align-items-center mb-2"
          style={{ display: 'none' }}
        >
          <span id="saleInvTaxLabel">الضريبة</span>
          <strong id="saleInvTax">0.00</strong>
        </div>

        <hr className="my-2" />

        {/* الإجمالي | Total */}
        <div className="input-group input-group-sm">

          <span className="input-group-text flex-grow-1 text-start">
            الإجمالي
          </span>

          <span
            id="saleInvTotal"
            className="input-group-text fw-bold fs-5"
          >
            0.00
          </span>

        </div>

      </div>
    </div>
  );
}