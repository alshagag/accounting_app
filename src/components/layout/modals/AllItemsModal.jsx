"use client";

export default function AllItemsModal() {
  return (
    <div
      className="modal fade"
      id="allItemsModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">

          <div className="modal-header">
            <span
              className="fw-semibold"
              id="allItemsModalTitle"
            >
              جميع العناصر
            </span>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div
            className="modal-body p-0"
            id="allItemsModalBody"
          ></div>

        </div>
      </div>
    </div>
  );
}