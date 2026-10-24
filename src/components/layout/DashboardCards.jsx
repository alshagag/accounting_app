export default function DashboardCards() {
  return (
    <>
      <div className="recent-products-section mt-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">العمليات</h5>
        </div>

        <div
          id="recentProductsContainer"
          className="recent-products-grid"
        ></div>
      </div>

      {/* ملخص سريع | Quick summary */}
      <div className="summary-boxes mb-4">

        <div className="summary-item border rounded p-3 text-center">
          <h6 className="text-success mb-2">
            إجمالي كمية المبيعات
          </h6>

          <p
            id="totalSales"
            className="fs-4 fw-bold text-success mb-0"
          >
            0
          </p>
        </div>

        <div className="summary-item border rounded p-3 text-center">
          <h6 className="text-danger mb-2">
            إجمالي كمية المشتريات
          </h6>

          <p
            id="totalPurchases"
            className="fs-4 fw-bold text-danger mb-0"
          >
            0
          </p>
        </div>

        <div className="summary-item border rounded p-3 text-center">
          <h6 className="text-muted mb-2">
            آخر عملية
          </h6>

          <p
            id="lastTransaction"
            className="fs-6 fw-semibold mb-0"
          >
            -
          </p>
        </div>
      </div>
    </>
  );
}