"use client";

export default function PurchaseInvoiceFooter() {
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
        id="purchaseInvSave"
        type="button"
        className="btn btn-success"
      >
        <i className="bi bi-check-lg me-1"></i>
        حفظ
      </button>

      <button
        id="purchaseInvDelete"
        type="button"
        className="btn btn-danger d-none"
      >
        <i className="bi bi-trash"></i>
      </button>
    </div>
  );
}