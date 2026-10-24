"use client";

import SettingsMainMenu from "./SettingsMainMenu";
import TaxSettingsPanel from "./TaxSettingsPanel";
import BusinessSettingsPanel from "./BusinessSettingsPanel";

export default function SettingsModal() {
  return (
    <div
      className="modal fade"
      id="taxSettingsModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog">
        <div className="modal-content">

          <div className="modal-header">
            <span className="fw-bold fs-5">
              <i className="bi bi-gear-wide-connected me-2 text-success"></i>
              الإعدادات
            </span>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <SettingsMainMenu />
          <TaxSettingsPanel />
          <BusinessSettingsPanel />

        </div>
      </div>
    </div>
  );
}