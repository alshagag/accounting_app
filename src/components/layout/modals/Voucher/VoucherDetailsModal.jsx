"use client";

export default function VoucherDetailsModal() {
  return (
    <div
      className="modal fade"
      id="voucherDetailsModal"
      tabIndex={-1}
      aria-hidden="true"
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">

          <div className="modal-header">
            <span className="fw-semibold">
              <i className="bi bi-file-earmark-text me-1"></i>
              تفاصيل السند
            </span>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div className="modal-body p-0">

            <div className="p-3 border-bottom text-center">
              <h5
                className="mb-0"
                id="voucherDetailsTitle"
              >
                -
              </h5>
            </div>

            <div className="d-flex gap-1 justify-content-center p-2 border-bottom">

              <button
                id="btnEditVoucherFromDetails"
                className="btn btn-doc-sm btn-doc-edit"
                title="تعديل"
              >
                <i className="bi bi-pencil-square"></i>
              </button>

              <button
                id="btnPrintVoucherFromDetails"
                className="btn btn-doc-sm btn-doc-print"
                title="طباعة"
              >
                <i className="bi bi-printer"></i>
              </button>

              <button
                id="btnPdfVoucherFromDetails"
                className="btn btn-doc-sm btn-doc-pdf"
                title="PDF"
              >
                <i className="bi bi-filetype-pdf"></i>
              </button>

              <button
                id="btnCloneVoucherFromDetails"
                className="btn btn-doc-sm btn-doc-clone"
                title="استنساخ"
              >
                <i className="bi bi-clipboard"></i>
              </button>

              <a
                id="whatsappLinkVoucherFromDetails"
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-doc-sm btn-doc-whatsapp"
                title="واتساب"
              >
                <i className="bi bi-whatsapp"></i>
              </a>

            </div>

            <div
              id="voucherDetailsBody"
              className="p-3"
            ></div>

          </div>

        </div>
      </div>
    </div>
  );
}