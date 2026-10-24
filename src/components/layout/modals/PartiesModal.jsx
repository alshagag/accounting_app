export default function PartiesModal() {
  return (
    <div className="modal fade" id="partiesModal" tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content parties-modal-content">

          <div className="modal-header parties-modal-header border-0 pb-0">
            <span className="fw-bold fs-5">
              <i className="bi bi-people-fill me-2 text-success"></i>
              العملاء والموردين
            </span>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            ></button>
          </div>

          <div className="modal-body px-4 pt-3">

            <ul className="nav nav-pills mb-3 gap-2 parties-tabs" role="tablist">

              <li className="nav-item" role="presentation">
                <button
                  className="nav-link active rounded-pill"
                  id="tabListParty"
                  data-bs-toggle="tab"
                  data-bs-target="#partiesListTab"
                  type="button"
                  role="tab"
                >
                  <i className="bi bi-list-ul me-1"></i>
                  القائمة
                </button>
              </li>

              <li className="nav-item" role="presentation">
                <button
                  className="nav-link rounded-pill"
                  id="tabEditParty"
                  data-bs-toggle="tab"
                  data-bs-target="#partiesAddTab"
                  type="button"
                  role="tab"
                >
                  <i className="bi bi-plus-lg me-1"></i>
                  إضافة جديد
                </button>
              </li>

            </ul>

            <div className="tab-content">

              {/* تبويب القائمة | List tab */}
              <div
                className="tab-pane fade show active"
                id="partiesListTab"
                role="tabpanel"
              >

                <div className="d-flex justify-content-between align-items-center mb-3">

                  <div className="d-flex gap-2">
                    <button
                      className="btn btn-sm rounded-pill btn-success modal-party-filter"
                      data-party-type="customers"
                    >
                      <i className="bi bi-person me-1"></i>
                      العملاء
                    </button>

                    <button
                      className="btn btn-sm rounded-pill btn-outline-success modal-party-filter"
                      data-party-type="suppliers"
                    >
                      <i className="bi bi-truck me-1"></i>
                      الموردون
                    </button>
                  </div>

                  <span className="text-muted small">
                    العدد:
                    <strong
                      id="modalCustomersCount"
                      className="text-success"
                    >
                      {" "}0
                    </strong>
                  </span>

                </div>

                <div className="parties-table-container table-responsive">
                  <table className="table parties-table card-table">

                    <thead className="sticky-top">
                      <tr>
                        <th className="text-center" style={{ width: "50px" }}>
                          <i className="bi bi-eye"></i>
                        </th>

                        <th className="text-center" style={{ width: "50px" }}>
                          <i className="bi bi-pencil-square"></i>
                        </th>

                        <th>الاسم</th>

                        <th className="text-end">
                          الرصيد
                        </th>

                        <th className="text-center">
                          الحالة
                        </th>
                      </tr>
                    </thead>

                    <tbody id="modalPartiesTbody"></tbody>

                    <tfoot id="modalPartiesTfoot"></tfoot>

                  </table>
                </div>

              </div>

              {/* تبويب الإضافة/التحرير | Add/edit tab */}

              <div
                className="tab-pane fade"
                id="partiesAddTab"
                role="tabpanel"
              >

                <input type="hidden" id="editPartyId" />

                <div className="row g-3">

                  <div className="col-6">
                    <label className="form-label parties-label">
                      النوع
                    </label>

                    <select
                      id="newPartyType"
                      className="form-select parties-input rounded-pill"
                    >
                      <option value="customers">عميل</option>
                      <option value="suppliers">مورد</option>
                    </select>
                  </div>

                  <div className="col-6">

                    <label className="form-label parties-label">
                      الكود
                    </label>

                    <div className="input-group">
                      <input
                        id="newPartyCode"
                        className="form-control parties-input rounded-pill"
                        readOnly
                      />
                    </div>

                    <div className="form-check form-switch mt-1">

                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="autoCode"
                        defaultChecked
                      />

                      <label
                        className="form-check-label small"
                        htmlFor="autoCode"
                      >
                        كود تلقائي
                      </label>

                    </div>

                  </div>

                  <div className="col-12">
                    <label className="form-label parties-label">
                      الاسم
                    </label>

                    <input
                      id="newPartyName"
                      className="form-control parties-input rounded-pill"
                      placeholder="اسم الطرف"
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label parties-label">
                      الهاتف
                    </label>

                    <input
                      id="newPartyPhone"
                      className="form-control parties-input rounded-pill"
                      placeholder="رقم الهاتف"
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label parties-label">
                      المدينة
                    </label>

                    <input
                      id="newPartyCity"
                      className="form-control parties-input rounded-pill"
                      placeholder="المدينة"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label parties-label">
                      العنوان
                    </label>

                    <input
                      id="newPartyAddress"
                      className="form-control parties-input rounded-pill"
                      placeholder="العنوان"
                    />
                  </div>

                  <div className="col-6">
                    <label className="form-label parties-label">
                      البريد الإلكتروني
                    </label>

                    <input
                      id="newPartyEmail"
                      type="email"
                      className="form-control parties-input rounded-pill"
                      placeholder="email@example.com"
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label parties-label">
                      ملاحظات
                    </label>

                    <textarea
                      id="newPartyNotes"
                      className="form-control parties-input"
                      rows="2"
                      style={{ borderRadius: "12px" }}
                    ></textarea>
                  </div>

                </div>

                <div className="d-flex gap-2 mt-4">

                  <button
                    id="btnSaveParty"
                    className="btn btn-success rounded-pill flex-grow-1 py-2"
                  >
                    <span id="btnSavePartyText">
                      <i className="bi bi-check-lg me-1"></i>
                      حفظ
                    </span>
                  </button>

                  <button
                    id="btnDeleteParty"
                    className="btn btn-outline-danger rounded-pill d-none px-3"
                  >
                    <i className="bi bi-trash"></i>
                  </button>

                </div>

              </div>

            </div>

          </div>

        </div>
      </div>
    </div>
  );
}