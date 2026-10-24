"use client";

export default function SettingsMainMenu() {
  return (
    <div className="modal-body p-3" id="settingsMainMenu">
      <div className="row g-3">

        {/* إعدادات الضريبة | Tax settings */}
        <div className="col-6">
          <button
            id="btnSettingsTax"
            className="btn w-100 h-100 p-3"
            type="button"
          >
            <div className="settings-icon-circle mb-3">
              <i className="bi bi-percent text-white"></i>
            </div>

            <span className="text-dark d-block">
              إعدادات الضريبة
            </span>

            <small className="text-muted">
              المعدل والنوع والحساب
            </small>
          </button>
        </div>

        {/* البيانات التجارية | Business data */}
        <div className="col-6">
          <button
            id="btnSettingsBusiness"
            className="btn w-100 h-100 p-3"
            type="button"
          >
            <div className="settings-icon-circle mb-3">
              <i className="bi bi-building text-white"></i>
            </div>

            <span className="text-dark d-block">
              البيانات التجارية
            </span>

            <small className="text-muted">
              اسم المنشأة، العنوان، الشعار
            </small>
          </button>
        </div>

      </div>
    </div>
  );
}