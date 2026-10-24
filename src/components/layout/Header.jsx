export default function Header() {
  return (
    <>
      <header className="app-header shadow-sm">
        <div className="container">
          <div className="app-header-content d-flex justify-content-between align-items-center flex-wrap gap-3">

            <div>
              <h1 className="app-title">
                <i className="bi bi-calculator-fill"></i>
                {" "}المحاسب المبسط
              </h1>

              <p className="app-subtitle">
                إدارة المبيعات والمشتريات والمخزون بطريقة سهلة وسريعة
              </p>
            </div>

            <div className="app-header-actions d-flex gap-2">

              <button
                className="btn btn-outline-light"
                data-bs-toggle="modal"
                data-bs-target="#aboutModal"
              >
                <i className="bi bi-info-circle"></i>
                {" "}حول النظام
              </button>

              <button
                className="btn btn-outline-light"
                data-bs-toggle="modal"
                data-bs-target="#developerModal"
              >
                <i className="bi bi-person-circle"></i>
                {" "}عن المطور
              </button>

              {/* زوج (نسخ واستعادة + الإعدادات) داخل حاوية واحدة ليبليا صفًّا كاملاً ومتساويين بالعرض على الجوال | Copy/Restore + Settings pair share one wrapper so they take a full row and equal widths on mobile */}
              <div className="app-header-backup-settings d-flex gap-2">
                <div className="dropdown">
                  <button
                    className="btn btn-outline-light dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <i className="bi bi-arrow-down-up"></i>
                    {" "}نسخة احتياطية
                  </button>

                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <button
                        id="btnExportData"
                        className="dropdown-item"
                        type="button"
                      >
                        <i className="bi bi-download"></i>
                        {" "}تصدير البيانات
                      </button>
                    </li>
                    <li>
                      <button
                        id="btnImportData"
                        className="dropdown-item"
                        type="button"
                      >
                        <i className="bi bi-upload"></i>
                        {" "}استيراد البيانات
                      </button>
                    </li>
                  </ul>
                </div>

                <button
                  id="btnOpenSettings"
                  className="btn btn-warning"
                  type="button"
                  data-bs-toggle="modal"
                  data-bs-target="#taxSettingsModal"
                >
                  <i className="bi bi-gear"></i> الإعدادات
                </button>
              </div>

              <input
                id="importDataFile"
                type="file"
                accept="application/json,.json"
                className="d-none"
              />

<button
                className="btn btn-light"
                type="button"
                data-bs-toggle="modal"
                data-bs-target="#contactModal"
              >
                <i className="bi bi-envelope"></i> اتصل بنا
              </button>

            <button
                id="btnInstallApp"
                className="btn btn-install-cta"
                type="button"
              >
                <i className="bi bi-box-arrow-in-down"></i>
                {" "}تثبيت التطبيق
              </button>

            </div>
          </div>
        </div>
      </header>
    </>
  );
}