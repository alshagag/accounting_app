"use client";

export default function PurchaseInvoiceHeader() {
  return (
    <div className="row g-2 mb-3">
      <div className="col-12">
        <div className="d-flex flex-wrap gap-2">

          {/* تاريخ الإصدار | Issue date */}
          <div style={{ flex: "1 1 180px" }}>
            <div className="form-group">
              <label className="form-label">تاريخ الإصدار</label>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-calendar-date"></i>
                </span>

                <input
                  id="purchaseInvDate"
                  name="date"
                  type="text"
                  autoComplete="off"
                  className="mx-input form-control"
                />
              </div>
            </div>
          </div>

          {/* تاريخ الاستحقاق | Due date */}
          <div style={{ flex: "1 1 180px" }}>
            <div className="form-group">
              <label className="form-label">تاريخ الاستحقاق</label>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-calendar-date"></i>
                </span>

                <select
                  id="purchaseInvPaymentTerms"
                  className="form-select"
                >
                  <option value="net">صافي (Net)</option>
                  <option value="on">في (On)</option>
                </select>
              </div>
            </div>
          </div>

          {/* عدد الأيام | Number of days */}
          <div style={{ flex: "1 1 120px" }}>
            <div
              className="form-group mt-1"
              id="purchaseInvDaysGroup"
            >
              <label className="form-label">&nbsp;</label>

              <div className="input-group">
                <input
                  id="purchaseInvDays"
                  type="number"
                  className="form-control"
                  min="0"
                  defaultValue="0"
                  disabled
                />

                <span className="input-group-text">
                  يوم
                </span>
              </div>
            </div>
          </div>

          {/* رقم الفاتورة | Invoice number */}
          <div style={{ flex: "1 1 180px" }}>
            <div className="form-group">
              <label className="form-label">رقم الفاتورة</label>

              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-hash"></i>
                </span>

                <input
                  id="purchaseInvRef"
                  type="text"
                  className="form-control"
                  placeholder="رقم الفاتورة"
                  readOnly
                />

                <span className="input-group-text">
                  <input
                    id="purchaseInvAutoRef"
                    className="form-check-input mt-0"
                    type="checkbox"
                    defaultChecked
                    title="توليد تلقائي"
                  />
                </span>
              </div>
            </div>
          </div>

          {/* المورد | Supplier */}
          <div style={{ flexBasis: "100%" }}>
            <div className="form-group">
              <label className="form-label">المورد</label>

              <select
                id="purchaseInvSupplier"
                className="form-select"
              >
                <option value="">
                  اختر المورد
                </option>
              </select>
            </div>
          </div>

          {/* عنوان التسليم | Shipping address */}
          <div style={{ flexBasis: "100%" }}>
            <div className="form-group mt-1">
              <label className="form-label">
                عنوان التسليم
              </label>

              <textarea
                id="purchaseInvShippingAddress"
                className="form-control"
                rows={2}
                placeholder="سيتم تعبئته تلقائيًا"
                readOnly
              />
            </div>
          </div>

          {/* البيان | Description */}
          <div style={{ flexBasis: "100%" }}>
            <div className="form-group">
              <label className="form-label">
                البيان
              </label>

              <textarea
                id="purchaseInvDescription"
                className="form-control"
                rows={3}
                placeholder="اكتب البيان"
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}