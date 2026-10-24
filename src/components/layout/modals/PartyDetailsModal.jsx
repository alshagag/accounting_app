export default function PartyDetailsModal() {
  return (
    <div
      className="modal fade"
      id="partyDetailsModal"
      tabIndex="-1"
      aria-hidden="true"
    >
      <div className="modal-dialog">
        <div className="modal-content">

          <div className="modal-header">
            <span className="fw-semibold">
              <i className="bi bi-person-badge me-1"></i>
              تفاصيل الطرف
            </span>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div className="modal-body">

            <div className="text-center mb-3">
              <h5 id="detailPartyName" className="mb-1">
                -
              </h5>

              <span id="detailPartyType" className="badge bg-primary">
                -
              </span>

              <small className="text-muted d-block mt-1">
                الكود: <span id="detailPartyCode">-</span>
              </small>
            </div>

            <table className="table table-sm table-borderless mb-0">
              <tbody>
                <tr>
                  <td className="text-muted">الهاتف</td>
                  <td id="detailPartyPhone">-</td>
                </tr>

                <tr>
                  <td className="text-muted">المدينة</td>
                  <td id="detailPartyCity">-</td>
                </tr>

                <tr>
                  <td className="text-muted">العنوان</td>
                  <td id="detailPartyAddress">-</td>
                </tr>

                <tr>
                  <td className="text-muted">البريد</td>
                  <td id="detailPartyEmail">-</td>
                </tr>
              </tbody>
            </table>

            <div
              id="detailPartyNotesRow"
              className="mt-2 d-none"
            >
              <small className="text-muted">
                ملاحظات:
              </small>

              <p id="detailPartyNotes" className="mb-0"></p>
            </div>

            <hr />

            <div className="d-flex justify-content-around text-center">

              <div>
                <small className="text-muted d-block">
                  عدد المعاملات
                </small>

                <strong id="detailPartyCount">
                  0
                </strong>
              </div>

              <div>
                <small className="text-muted d-block">
                  الرصيد
                </small>

                <strong id="detailPartyBalance">
                  0.00
                </strong>
              </div>

              <div>
                <small className="text-muted d-block">
                  الحالة
                </small>

                <span
                  id="detailPartyStatus"
                  className="badge"
                >
                  نشط
                </span>
              </div>

            </div>

            <div className="d-flex gap-2 mt-3">

              <button
                id="btnPrintParty"
                className="btn btn-outline-secondary flex-grow-1"
              >
                <i className="bi bi-printer"></i>
                {" "}طباعة
              </button>

              <button
                id="btnWhatsappParty"
                className="btn btn-outline-success flex-grow-1"
              >
                <i className="bi bi-whatsapp"></i>
                {" "}واتساب
              </button>

              <button
                id="btnCopyParty"
                className="btn btn-outline-primary flex-grow-1"
              >
                <i className="bi bi-clipboard"></i>
                {" "}نسخ
              </button>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}