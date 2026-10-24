"use client";

export default function BusinessSettingsPanel() {
  return (
    <div
      className="modal-body p-3 d-none"
      id="settingsBusinessPanel"
    >
      {/* زر الرجوع | Back button */}
      <button
        id="btnBackFromBusiness"
        className="btn btn-sm btn-light mb-3 fw-semibold btn-back-settings"
      >
        <i className="bi bi-arrow-right me-1"></i>
        رجوع
      </button>

      {/* بيانات المنشأة | Business details */}
      <div className="settings-section">
        <div className="settings-section-title">
          <i className="bi bi-building me-1"></i>
          بيانات المنشأة
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">
            اسم المنشأة
          </label>

          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-building"></i>
            </span>

            <input
              id="settingsBusinessName"
              className="form-control"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">
            السجل التجاري
          </label>

          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-file-text"></i>
            </span>

            <input
              id="settingsCommercialReg"
              className="form-control"
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">
            الرقم الضريبي
          </label>

          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-upc-scan"></i>
            </span>

            <input
              id="settingsTaxNumber"
              className="form-control"
            />
          </div>
        </div>

        <div className="mb-0">
          <label className="form-label fw-semibold">
            رقم الهاتف
          </label>

          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-telephone"></i>
            </span>

            <input
              id="settingsBusinessPhone"
              className="form-control"
            />
          </div>
        </div>
      </div>

      {/* العنوان | Address */}
      <div className="settings-section">
        <div className="settings-section-title">
          <i className="bi bi-geo-alt me-1"></i>
          العنوان
        </div>

        <div className="mb-0">
          <div className="input-group">
            <span className="input-group-text">
              <i className="bi bi-geo-alt"></i>
            </span>

            <textarea
              id="settingsBusinessAddress"
              className="form-control"
              rows={2}
              placeholder="العنوان التفصيلي"
            />
          </div>
        </div>
      </div>

      {/* الشعار | Logo */}
      <div className="settings-section">
        <div className="settings-section-title">
          <i className="bi bi-image me-1"></i>
          شعار المنشأة
        </div>

        <div className="input-group mb-2">
          <span className="input-group-text">
            <i className="bi bi-image"></i>
          </span>

          <input
            id="settingsBusinessLogoFile"
            type="file"
            accept="image/*"
            className="form-control"
          />
        </div>

        <input
          type="hidden"
          id="settingsBusinessLogo"
        />

        <div
          id="settingsBusinessLogoPreview"
          className="text-center"
        ></div>
      </div>

      {/* حفظ | Save */}
      <button
        id="btnSaveBusiness"
        className="btn btn-save-settings w-100 mt-2"
      >
        <i className="bi bi-check-lg me-1"></i>
        حفظ
      </button>
    </div>
  );
}