"use client";

export default function SaleFooter() {
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
        id="full_sale_save"
        type="button"
        className="btn btn-primary"
      >
        <i className="bi bi-save me-1"></i>
        حفظ
      </button>

    </div>
  );
}