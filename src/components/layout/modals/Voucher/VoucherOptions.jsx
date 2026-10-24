"use client";

export default function VoucherOptions() {
  return (
    <div className="card border-0 shadow-sm mb-3">
      <div className="card-body p-3">

        <div className="fw-semibold mb-3">
          خيارات العرض
        </div>

        <div className="d-flex flex-column gap-2">

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="voucherToggleLineNo"
            />
            <label
              className="form-check-label"
              htmlFor="voucherToggleLineNo"
            >
              عمود رقم السطر
            </label>
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="voucherToggleStatement"
            />
            <label
              className="form-check-label"
              htmlFor="voucherToggleStatement"
            >
              عمود البيان
            </label>
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="voucherToggleQuantity"
            />
            <label
              className="form-check-label"
              htmlFor="voucherToggleQuantity"
            >
              عمود الكمية
            </label>
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="voucherToggleDiscount"
            />
            <label
              className="form-check-label"
              htmlFor="voucherToggleDiscount"
            >
              عمود الخصم
            </label>
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="voucherToggleDiscountAmount"
            />
            <label
              className="form-check-label"
              htmlFor="voucherToggleDiscountAmount"
            >
              إظهار عمود الخصم
            </label>
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="voucherToggleTaxExclusive"
            />
            <label
              className="form-check-label"
              htmlFor="voucherToggleTaxExclusive"
            >
              المبالغ غير شاملة الضريبة
            </label>
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="voucherToggleTaxAmount"
            />
            <label
              className="form-check-label"
              htmlFor="voucherToggleTaxAmount"
            >
              إظهار عمود قيمة الضريبة
            </label>
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="voucherToggleTaxInclusive"
            />
            <label
              className="form-check-label"
              htmlFor="voucherToggleTaxInclusive"
            >
              المبالغ شاملة الضريبة
            </label>
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="voucherToggleFixedTotal"
            />
            <label
              className="form-check-label"
              htmlFor="voucherToggleFixedTotal"
            >
              مجموع ثابت
            </label>
          </div>

          <div
            id="voucherFixedTotalContainer"
            className="ps-4 d-none"
          >
            <div
              id="voucherFixedTotalGroup"
              className="mb-2"
            >
              <input
                id="voucherFixedTotal"
                type="number"
                min="0"
                step="0.01"
                defaultValue="0"
                className="form-control form-control-sm"
              />
            </div>

            <div
              id="voucherBalanceBar"
              className="input-group input-group-sm"
            >
              <span className="input-group-text">
                المجموع الثابت
              </span>

              <span
                id="voucherBalanceFixed"
                className="input-group-text fw-bold"
              >
                0.00
              </span>

              <span className="input-group-text ms-2">
                المجموع الحالي
              </span>

              <span
                id="voucherBalanceCurrent"
                className="input-group-text fw-bold"
              >
                0.00
              </span>

              <span className="input-group-text flex-grow-1"></span>

              <span
                id="voucherBalanceStatus"
                className="input-group-text text-danger"
              >
                غير متوازن
              </span>

              <span
                id="voucherBalanceRemaining"
                className="input-group-text text-danger fw-bold"
              >
                0.00
              </span>
            </div>
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="voucherToggleCustomTitle"
            />
            <label
              className="form-check-label"
              htmlFor="voucherToggleCustomTitle"
            >
              عنوان مخصص
            </label>
          </div>

          <div
            id="voucherCustomTitleGroup"
            className="ps-4 d-none"
          >
            <input
              id="voucherCustomTitle"
              className="form-control form-control-sm"
            />
          </div>

          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="voucherToggleFooter"
            />
            <label
              className="form-check-label"
              htmlFor="voucherToggleFooter"
            >
              التذييلات
            </label>
          </div>

          <div
            id="voucherFooterGroup"
            className="ps-4 d-none"
          >
            <textarea
              id="voucherFooter"
              rows={2}
              className="form-control form-control-sm"
            />
          </div>

        </div>

      </div>
    </div>
  );
}