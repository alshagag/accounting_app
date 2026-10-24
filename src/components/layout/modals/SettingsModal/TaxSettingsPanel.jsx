"use client";

export default function TaxSettingsPanel() {
  return (
    <div
      className="modal-body p-3 d-none"
      id="settingsTaxPanel"
    >
      {/* ── قائمة الضرائب المحفوظة (الواجهة الرئيسية) | Saved taxes list (main view) ── */}
      <div id="settingsTaxListView">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <button
            id="btnBackFromTax"
            className="btn btn-sm btn-light fw-semibold btn-back-settings"
          >
            <i className="bi bi-arrow-right me-1"></i>
            رجوع
          </button>

          <button
            id="btnCreateTax"
            className="btn btn-sm btn-success fw-semibold"
          >
            <i className="bi bi-plus-lg me-1"></i>
            إنشاء ضريبة جديدة
          </button>
        </div>

        <div className="settings-section">
          <div className="settings-section-title">
            <i className="bi bi-list-ul me-1 text-success"></i>
            الضرائب المحفوظة
          </div>

          <div className="table-responsive">
            <table className="table table-hover text-center mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th className="text-start">الاسم</th>
                  <th style={{ width: "110px" }}>المعاملات</th>
                  <th style={{ width: "110px" }}>إجراءات</th>
                </tr>
              </thead>
              <tbody id="savedTaxesTbody">
                <tr>
                  <td colSpan={3} className="text-muted py-3">لا توجد ضرائب محفوظة بعد.</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── نافذة إنشاء/تحرير الضريبة | Create/edit tax form ── */}
      <div id="settingsTaxFormView" className="d-none">
        <button
          id="btnBackToTaxList"
          className="btn btn-sm btn-light mb-3 fw-semibold btn-back-settings"
        >
          <i className="bi bi-arrow-right me-1"></i>
          رجوع إلى القائمة
        </button>

        {/* المعلومات الأساسية | Basic information */}
        <div className="settings-section">
          <div className="settings-section-title">
            <i className="bi bi-info-circle me-1"></i>
            المعلومات الأساسية
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">
              الاسم
            </label>

            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-tag"></i>
              </span>

              <input
                id="settingsTaxName"
                className="form-control"
                placeholder="مثال: ضريبة القيمة المضافة"
              />
            </div>
          </div>

          <div className="mb-0">
            <label className="form-label fw-semibold">
              الحساب
            </label>

            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-wallet2"></i>
              </span>

              <input
                id="settingsTaxAccount"
                className="form-control"
                placeholder="اختياري"
              />
            </div>
          </div>
        </div>

        {/* المعدل والنوع | Rate and type */}
        <div className="settings-section">
          <div className="settings-section-title">
            <i className="bi bi-speedometer2 me-1"></i>
            المعدل والنوع
          </div>

          <div className="row g-2">

            <div className="col-6 mb-3">
              <label className="form-label fw-semibold">
                معدل الضريبة
              </label>

              <select
                id="settingsTaxRateType"
                className="form-select"
              >
                <option value="CustomRate">مخصصة %</option>
                <option value="StandardRate">قياسية</option>
              </select>
            </div>

            <div className="col-6 mb-3">
              <label className="form-label fw-semibold">
                النوع
              </label>

              <select
                id="settingsTaxType"
                className="form-select"
              >
                <option value="SingleRate">ضريبة واحدة</option>
                <option value="MultiRate">متعددة</option>
              </select>
            </div>

          </div>

          <div className="mb-0">
            <label className="form-label fw-semibold">
              المعدل
            </label>

            <div className="input-group">
              <span className="input-group-text">
                <i className="bi bi-percent"></i>
              </span>

              <input
                id="settingsTaxRate"
                type="number"
                className="form-control"
                placeholder="15"
              />

              <span className="input-group-text">%</span>
            </div>
          </div>
        </div>

        {/* الخيارات | Options */}
        <div className="settings-section">

          <div className="settings-section-title">
            <i className="bi bi-toggle2-on me-1"></i>
            الخيارات
          </div>

          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="settingsTaxInclusive"
            />
            <label
              className="form-check-label fw-semibold"
              htmlFor="settingsTaxInclusive"
            >
              الضريبة شاملة السعر
            </label>
          </div>

          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="settingsTaxInactive"
            />
            <label
              className="form-check-label fw-semibold"
              htmlFor="settingsTaxInactive"
            >
              غير نشط
            </label>
          </div>

          <hr className="my-3" />

          {/* عنوان فاتورة المبيعات | Sales invoice title */}

          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="toggleCustomSalesTitle"
            />

            <label
              className="form-check-label fw-semibold"
              htmlFor="toggleCustomSalesTitle"
            >
              تفعيل عنوان مخصص لفاتورة المبيعات
            </label>
          </div>

          <div
            id="customSalesTitleGroup"
            className="mb-3 ps-4 d-none"
          >
            <div className="input-group input-group-sm">

              <span className="input-group-text">
                <i className="bi bi-receipt"></i>
              </span>

              <input
                id="settingsTaxSalesInvoiceTitle"
                className="form-control"
                placeholder="فاتورة ضريبية"
              />

            </div>
          </div>

          {/* عنوان إشعار الدائن | Credit note title */}

          <div className="form-check form-switch mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id="toggleCustomCreditTitle"
            />

            <label
              className="form-check-label fw-semibold"
              htmlFor="toggleCustomCreditTitle"
            >
              تفعيل عنوان مخصص لإشعار الدائن
            </label>
          </div>

          <div
            id="customCreditTitleGroup"
            className="ps-4 d-none"
          >
            <div className="input-group input-group-sm">

              <span className="input-group-text">
                <i className="bi bi-file-text"></i>
              </span>

              <input
                id="settingsTaxCreditNoteTitle"
                className="form-control"
                placeholder="إشعار دائن"
              />

            </div>
          </div>

        </div>

        <button
          id="btnSaveTax"
          className="btn btn-save-settings w-100 mt-2"
        >
          <i className="bi bi-check-lg me-1"></i>
          حفظ
        </button>
      </div>
    </div>
  );
}