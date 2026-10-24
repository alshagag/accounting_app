"use client";

export default function InvoiceFooter() {
  return (
    <div className="modal-footer">

      <button
        type="button"
        className="btn btn-outline-secondary"
        data-bs-dismiss="modal"
      >
        إلغاء
      </button>

      <button
        id="saleInvSave"
        type="button"
        className="btn btn-success"
      >
        <i className="bi bi-save me-1"></i>
        <span id="saleInvSaveButtonText">
          إنشاء
        </span>
      </button>

      <button
        id="saleInvDelete"
        type="button"
        className="btn btn-danger d-none"
      >
        <i className="bi bi-trash me-1"></i>
        حذف
      </button>

    </div>
  );
}