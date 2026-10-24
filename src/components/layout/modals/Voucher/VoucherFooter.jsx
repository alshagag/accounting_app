"use client";

export default function VoucherFooter() {
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
        id="btnSaveVoucher"
        type="button"
        className="btn btn-success"
      >
        <i className="bi bi-save me-1"></i>
        <span id="voucherSaveButtonText">
          إنشاء
        </span>
      </button>

      <button
        id="btnDeleteVoucher"
        type="button"
        className="btn btn-danger d-none"
      >
        <i className="bi bi-trash me-1"></i>
        حذف
      </button>

    </div>
  );
}