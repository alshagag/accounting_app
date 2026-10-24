export default function PeriodProfit() {
  return (
    <div className="card mt-3">

      <div
        className="card-header d-flex justify-content-between align-items-center"
        data-bs-toggle="collapse"
        data-bs-target="#periodProfitSection"
        style={{ cursor: "pointer" }}
      >
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-calendar3"></i>
          <strong>الأرباح حسب الفترة</strong>
        </div>

        <i className="bi bi-chevron-down"></i>
      </div>

      <div id="periodProfitSection" className="collapse">
        <div className="card-body">

          <div className="row g-2 align-items-end">

            <div className="col-md-4">
              <label className="form-label">من تاريخ</label>
              <input
                type="date"
                id="profitFromDate"
                className="form-control"
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">حتى تاريخ</label>
              <input
                type="date"
                id="profitToDate"
                className="form-control"
              />
            </div>

            <div className="col-md-4 d-flex flex-column gap-2">
              <button
                id="btnCalculatePeriodProfit"
                className="btn btn-primary w-100"
              >
                <i className="bi bi-search"></i>{" "}
                عرض التقرير
              </button>

              <button
                id="btnResetStats"
                className="btn btn-outline-secondary w-100"
              >
                <i className="bi bi-arrow-counterclockwise"></i>{" "}
                إعادة تعيين
              </button>
            </div>

          </div>

          <div
            id="periodInfo"
            className="alert alert-info mt-3 mb-0 d-flex align-items-center gap-2"
          >
            <i className="bi bi-collection"></i>
            <span>اختر الفترة لعرض الأرباح والخسائر</span>
          </div>

          <div
            id="periodProfitAlert"
            className="alert alert-success mt-3 mb-0 d-flex justify-content-between align-items-center"
          >
            <div className="d-flex align-items-center gap-2">
              <i
                id="periodProfitIcon"
                className="bi bi-graph-up-arrow"
              ></i>

              <strong>صافي الربح للفترة</strong>
            </div>

            <div>
              <strong id="periodProfitValue">0.00</strong> ريال
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}