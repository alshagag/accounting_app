"use client";

export default function BarcodeScannerModal() {
  return (
    <div
      className="modal fade"
      id="barcodeScannerModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">

          <div className="modal-header">
            <span className="fw-semibold">
              <i className="bi bi-upc-scan me-1"></i>
              مسح الباركود
            </span>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            />
          </div>

          <div className="modal-body text-center">

            {/* حاوية تُحمل فيها معاينة الكاميرا وإطار المسح بواسطة html5-qrcode (Html5Qrcode) | Container where html5-qrcode (Html5Qrcode) mounts the camera preview and scan frame */}
            <div
              id="barcodeScannerReader"
              style={{ width: "100%", maxWidth: "380px", margin: "0 auto" }}
            />

            <div
              id="barcodeScannerStatus"
              className="small fw-semibold mt-2"
              style={{ minHeight: "1.5rem" }}
            />

            {/* سلة المسح المؤقتة: تُملأ ويُدار محتواها من ماسح الباركود | Temporary scan basket: filled and managed by the barcode scanner */}
            <div
              id="barcodeScannerBasket"
              className="barcode-scanner-basket d-none"
            ></div>

            {/* نموذج إضافة منتج من قاعدة عامة أو يدويًا | Draft form to add a product from the public catalog or manually */}
            <div
              id="barcodeScannerDraft"
              className="barcode-scanner-draft d-none"
            >
              <div className="draft-grid">
                <label className="draft-field">
                  <span>اسم المنتج</span>
                  <input
                    id="barcodeDraftName"
                    className="form-control form-control-sm"
                    type="text"
                    placeholder="أدخل اسم المنتج"
                  />
                </label>

                <label className="draft-field">
                  <span>الباركود</span>
                  <input
                    id="barcodeDraftBarcode"
                    className="form-control form-control-sm"
                    type="text"
                    readOnly
                  />
                </label>

                <label className="draft-field">
                  <span>الوحدة</span>
                  <input
                    id="barcodeDraftUnit"
                    className="form-control form-control-sm"
                    type="text"
                    placeholder="اختياري"
                  />
                </label>

                <label className="draft-field">
                  <span>سعر البيع (مرجعي قابل للتعديل)</span>
                  <input
                    id="barcodeDraftPrice"
                    className="form-control form-control-sm"
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0.00"
                  />
                </label>
              </div>

              <div
                id="barcodeScannerDraftSource"
                className="text-muted small mt-1"
              ></div>

              <div className="d-flex flex-wrap gap-2 justify-content-center mt-2">
                <button
                  id="barcodeDraftSave"
                  type="button"
                  className="btn btn-success btn-sm"
                >
                  <i className="bi bi-plus-lg me-1"></i>
                  إضافة المنتج
                </button>
                <button
                  id="barcodeDraftCancel"
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                >
                  إلغاء
                </button>
              </div>
            </div>

            <p className="text-muted small mt-2">
              وجّه الكاميرا نحو الباركود للمسح التلقائي
            </p>

            {/* شريط التحكم: إضافة منتج آخر + كمية يدوية + إنهاء الماسح | Controls: add another product + manual quantity + finish scanning */}
            <div className="d-flex flex-wrap gap-2 justify-content-center align-items-center mt-2 barcode-scanner-controls">
              <button
                id="barcodeScannerAddMore"
                type="button"
                className="btn btn-outline-success btn-sm"
              >
                <i className="bi bi-plus-lg me-1"></i>
                {" "}إضافة منتج آخر
              </button>

              <label className="d-inline-flex align-items-center gap-2 small text-muted mb-0">
                الكمية:
                <input
                  id="barcodeScannerManualQty"
                  type="number"
                  min="1"
                  step="1"
                  className="form-control form-control-sm"
                  style={{ width: "72px" }}
                  placeholder="1"
                />
              </label>

              <button
                id="barcodeScannerFinish"
                type="button"
                className="btn btn-primary btn-sm"
              >
                <i className="bi bi-check2-circle me-1"></i>
                إنهاء الماسح
              </button>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}