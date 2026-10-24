"use client";

export default function DocumentDetailsModal() {
    return (
        <div
            className="modal fade"
            id="documentDetailsModal"
            tabIndex={-1}
            aria-hidden="true"
        >
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
                <div className="modal-content">

                    <div className="modal-header">
                        <span className="fw-semibold">
                            <i className="bi bi-file-text me-1"></i>
                            تفاصيل المستند
                        </span>

                        <button
                            type="button"
                            className="btn-close"
                            data-bs-dismiss="modal"
                        />
                    </div>

                    <div className="modal-body p-0">

                        <div className="p-3 border-bottom text-center">
                            <h5 className="mb-0" id="documentDetailsTitle">
                                -
                            </h5>
                        </div>

                        <div className="d-flex gap-1 justify-content-center p-2 border-bottom">

                            <button
                                id="btnEditCurrentDocument"
                                className="btn btn-doc-sm btn-doc-edit"
                                title="تعديل"
                            >
                                <i className="bi bi-pencil-square"></i>
                            </button>

                            <div id="btnPrintChooserWrap" style={{ position: "relative" }}>
                                <button
                                    id="btnPrintCurrentDocument"
                                    className="btn btn-doc-sm btn-doc-print"
                                    title="طباعة"
                                    aria-label="طباعة — إيصال أو فاتورة"
                                >
                                    <i className="bi bi-printer"></i>
                                </button>
                                <div id="btnPrintChooser" className="pdf-doc-chooser">
                                    <button
                                        type="button"
                                        id="btnPrintDocumentTax"
                                        className="pdf-doc-option pdf-doc-option-tax"
                                        title="طباعة الإيصال بالتخطيط الطولي (فاتورة مبسطة)"
                                    >
                                        <i className="bi bi-receipt"></i> طباعة الإيصال
                                    </button>
                                    <button
                                        type="button"
                                        id="btnPrintDocumentFull"
                                        className="pdf-doc-option pdf-doc-option-full"
                                        title="طباعة الفاتورة بالتخطيط الكامل"
                                    >
                                        <i className="bi bi-printer-fill"></i> طباعة الفاتورة
                                    </button>
                                </div>
                            </div>

                            <div id="btnPdfChooserWrap" style={{ position: "relative" }}>
                                <button
                                    id="btnPdfCurrentDocument"
                                    className="btn btn-doc-sm btn-doc-pdf"
                                    title="PDF"
                                    aria-label="تحميل PDF — إيصال أو فاتورة"
                                >
                                    <i className="bi bi-filetype-pdf"></i>
                                </button>
                                <div id="btnPdfChooser" className="pdf-doc-chooser">
                                    <button
                                        type="button"
                                        id="btnPdfDocumentTax"
                                        className="pdf-doc-option pdf-doc-option-tax"
                                        title="تحميل الإيصال PDF بالتخطيط الطولي (فاتورة مبسطة)"
                                    >
                                        <i className="bi bi-receipt"></i> تحميل الإيصال PDF
                                    </button>
                                    <button
                                        type="button"
                                        id="btnPdfDocumentFull"
                                        className="pdf-doc-option pdf-doc-option-full"
                                        title="تحميل الفاتورة PDF بالتخطيط الكامل"
                                    >
                                        <i className="bi bi-file-earmark-text"></i> تحميل الفاتورة PDF
                                    </button>
                                </div>
                            </div>

                            <button
                                id="btnCloneCurrentDocument"
                                className="btn btn-doc-sm btn-doc-clone"
                                title="استنساخ"
                            >
                                <i className="bi bi-clipboard"></i>
                            </button>

                            <a
                                id="documentWhatsappLink"
                                href="#"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-doc-sm btn-doc-whatsapp"
                                title="واتساب"
                            >
                                <i className="bi bi-whatsapp"></i>
                            </a>

                            <span
                                style={{
                                    width: "1px",
                                    backgroundColor: "#dee2e6",
                                    marginInline: "6px",
                                    alignSelf: "center",
                                }}
                            ></span>

                            <button
                                id="btnCreateReceiptVoucher"
                                className="btn btn-doc-sm btn-doc-receipt"
                                title="سند قبض"
                            >
                                <i className="bi bi-cash-stack"></i>
                                <span>سند قبض</span>
                            </button>

                            <button
                                id="btnCreatePaymentVoucher"
                                className="btn btn-doc-sm btn-doc-payment"
                                title="سند صرف"
                            >
                                <i className="bi bi-bank"></i>
                                <span>سند صرف</span>
                            </button>

                        </div>

                        <div
                            id="documentDetailsBody"
                            className="p-3"
                        ></div>

                    </div>

                </div>
            </div>
        </div>
    );
}