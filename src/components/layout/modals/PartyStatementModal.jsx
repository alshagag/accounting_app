export default function PartyStatementModal() {
  return (
    <div
      className="modal fade"
      id="partyStatementModal"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">

          <div className="modal-header">
            <h5 className="modal-title" id="partyStatementTitle">
              كشف حساب
            </h5>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div className="modal-body">
            <div className="table-responsive">
              <table className="table table-hover table-sm text-center align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>التاريخ</th>
                    <th>نوع العملية</th>
                    <th>رقم المستند</th>
                    <th className="text-end text-danger">مدين</th>
                    <th className="text-end text-success">دائن</th>
                    <th className="text-end">الرصيد</th>
                  </tr>
                </thead>

                <tbody id="partyStatementTbody">
                  <tr>
                    <td colSpan="6" className="text-muted py-4">
                      جاري التحميل...
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div id="partyStatementSummary"></div>
          </div>

          <div className="modal-footer d-flex justify-content-between">

            <div className="btn-group">
              <button
                type="button"
                className="btn btn-outline-success"
                id="btnExportPartyStatementExcel"
              >
                <i className="bi bi-file-earmark-excel me-1"></i>
                Excel
              </button>

              <button
                type="button"
                className="btn btn-outline-danger"
                id="btnExportPartyStatementPdf"
              >
                <i className="bi bi-file-earmark-pdf me-1"></i>
                PDF
              </button>

              <button
                type="button"
                className="btn btn-outline-primary"
                id="btnPrintPartyStatement"
              >
                <i className="bi bi-printer me-1"></i>
                طباعة
              </button>
            </div>

            <button
              type="button"
              className="btn btn-outline-secondary"
              data-bs-dismiss="modal"
            >
              <i className="bi bi-x-lg me-1"></i>
              إغلاق
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}