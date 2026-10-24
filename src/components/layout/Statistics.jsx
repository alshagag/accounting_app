export default function Statistics() {
  return (
    <div id="statsRow" className="d-flex stats-row">

      <div className="stat-card stat-sales flex-fill mx-2">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="text-muted">مجموع المبيعات</div>
            <h3 id="statSales">0.00</h3>
            <small>ريال</small>
          </div>

          <div>
            <i
              className="bi bi-cash-stack"
              style={{ fontSize: "28px", opacity: 0.9 }}
            />
          </div>
        </div>
      </div>

      <div className="stat-card stat-purchase flex-fill mx-2">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="text-muted">مجموع المشتريات</div>
            <h3 id="statPurchases">0.00</h3>
            <small>ريال</small>
          </div>

          <div>
            <i
              className="bi bi-basket"
              style={{ fontSize: "28px", opacity: 0.9 }}
            />
          </div>
        </div>
      </div>

      <div className="stat-card stat-profit flex-fill mx-2">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <div className="text-muted">صافي الربح</div>
            <h3 id="statProfit">0.00</h3>
            <small>ريال</small>
          </div>

          <div>
            <i
              className="bi bi-graph-up"
              style={{ fontSize: "28px", opacity: 0.9 }}
            />
          </div>
        </div>
      </div>

    </div>
  );
}