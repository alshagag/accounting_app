"use client";

export default function DocumentEditorModal() {
  return (
    <div
      className="modal fade"
      id="documentEditorModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog">
        <div className="modal-content">

          <div className="modal-header">
            <span className="fw-semibold">
              <i className="bi bi-pencil-square me-1"></i>
              <span id="documentEditorTitle">
                تعديل المستند
              </span>
            </span>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div className="modal-body">

            <input type="hidden" id="documentEditKey" />
            <input type="hidden" id="documentEditCategory" />

            <div className="mb-3">
              <label className="form-label">المرجع</label>
              <input
                id="documentEditCode"
                className="form-control"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">اسم المنشأة</label>
              <input
                id="documentEditStoreName"
                className="form-control"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">الشعار (رابط)</label>
              <input
                id="documentEditLogo"
                className="form-control"
                placeholder="https://"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">عنوان المنشأة</label>
              <input
                id="documentEditStoreAddress"
                className="form-control"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">هاتف المنشأة</label>
              <input
                id="documentEditStorePhone"
                className="form-control"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">الرقم الضريبي</label>
              <input
                id="documentEditTaxNumber"
                className="form-control"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">الطرف</label>
              <input
                id="documentEditParty"
                className="form-control"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">عنوان الطرف</label>
              <input
                id="documentEditPartyAddress"
                className="form-control"
              />
            </div>

            <div className="mb-3">
              <label className="form-label">ملاحظات</label>
              <textarea
                id="documentEditNotes"
                className="form-control"
                rows={3}
              ></textarea>
            </div>

          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              data-bs-dismiss="modal"
            >
              إلغاء
            </button>

            <button
              id="btnSaveDocumentMeta"
              className="btn btn-primary"
            >
              <i className="bi bi-save me-1"></i>
              حفظ
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}