"use client";

export default function InvoiceHeader() {
  return (
    <div className="row g-2 mb-3">
      <div className="col-12">
        <div className="d-flex flex-wrap gap-2">

          {/* تاريخ الإصدار | Issue date */}
          <div style={{ flex: "1 1 180px" }}>
            <div className="form-group">
              <label htmlFor="saleInvDate">تاريخ الإصدار</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-calendar-date"></i>
                </span>
                <input
                  id="saleInvDate"
                  name="date"
                  type="date"
                  autoComplete="off"
                  className="form-control"
                />
              </div>
            </div>
          </div>

          {/* تاريخ الاستحقاق | Due date */}
          <div style={{ flex: "1 1 180px" }}>
            <div className="form-group">
              <label htmlFor="saleInvPaymentTerms">شروط الدفع</label>
              <div className="input-group flex-nowrap">
                <span className="input-group-text">
                  <i className="bi bi-calendar-date"></i>
                </span>

                <select
                  id="saleInvPaymentTerms"
                  className="form-select"
                  defaultValue="net"
                >
                  <option value="net">صافي (Net)</option>
                  <option value="on">في (On)</option>
                </select>
              </div>
            </div>
          </div>

          {/* عدد الأيام | Number of days */}
          <div id="saleInvDaysGroup" style={{ flex: "1 1 140px" }}>
            <div className="form-group">
              <label htmlFor="saleInvDays">عدد الأيام</label>
              <input
                id="saleInvDays"
                type="number"
                className="form-control"
                min="0"
                defaultValue="0"
              />
            </div>
          </div>

          {/* تاريخ الاستحقاق الفعلي | Actual due date */}
          <div id="saleInvDueDateGroup" style={{ flex: "1 1 180px", display: 'none' }}>
            <div className="form-group">
              <label htmlFor="saleInvDueDate">تاريخ الاستحقاق</label>
              <input
                id="saleInvDueDate"
                type="date"
                className="form-control"
              />
            </div>
          </div>

          {/* رقم الفاتورة | Invoice number */}
          <div style={{ flex: "1 1 180px" }}>
            <div className="form-group">
              <label htmlFor="saleInvRef">رقم الفاتورة</label>
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-hash"></i>
                </span>

                <input
                  id="saleInvRef"
                  type="text"
                  className="form-control"
                  placeholder="رقم الفاتورة"
                  readOnly
                />

                <span className="input-group-text">
                  <input
                    id="saleInvAutoRef"
                    className="form-check-input mt-0"
                    type="checkbox"
                    defaultChecked
                    title="توليد تلقائي"
                  />
                </span>
              </div>
            </div>
          </div>

          {/* العميل | Customer */}
          <div style={{ flexBasis: "100%" }}>
            <div className="form-group">
              <label htmlFor="saleInvCustomer">العميل</label>
              <select
                id="saleInvCustomer"
                className="form-select"
              >
                <option value="">اختر العميل</option>
              </select>
            </div>
          </div>

          {/* عنوان التسليم | Shipping address */}
          <div style={{ flexBasis: "100%" }}>
            <div className="form-group mt-1">
              <label htmlFor="saleInvShippingAddress">عنوان التسليم</label>
              <textarea
                id="saleInvShippingAddress"
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
              <label htmlFor="saleInvDescription">البيان</label>
              <textarea
                id="saleInvDescription"
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