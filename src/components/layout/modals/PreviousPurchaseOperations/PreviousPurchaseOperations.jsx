/**
 * PreviousPurchaseOperations
 * عمليات الشراء السابقة | Previous purchase operations.
 */
export default function PreviousPurchaseOperations() {
    return (
        <div
            className="tab-pane fade"
            id="purchaseOperationsSubTab"
            role="tabpanel"
        >
            <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">عمليات الشراء السابقة</h6>
                <div className="card-header-actions">
                    <button
                        id="btnShowAllPurchasesOperations"
                        className="btn btn-sm btn-outline-secondary"
                    >
                        <i className="bi bi-list-ul me-1"></i>
                        عرض الكل
                    </button>
                </div>
            </div>
            <div className="table-responsive">
                <table className="table table-hover text-center mb-0 table-layout-auto-sized">
                    <thead className="table-light">
                        <tr>
                            <th style={{ width: "80px" }}>
                                <i className="bi bi-eye"></i> /{" "}
                                <i className="bi bi-pencil-square"></i>
                            </th>
                            <th>التاريخ</th>
                            <th className="col-product">المنتج</th>
                            <th>الكمية</th>
                            <th>السعر</th>
                            <th>الإجمالي</th>
                        </tr>
                    </thead>

                    <tbody id="purchaseTbody"></tbody>
                </table>
            </div>
        </div>
    );
}
