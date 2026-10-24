"use client";

import PreviousSalesOperations from "../modals/PreviousSalesOperations/PreviousSalesOperations.jsx";
import PreviousPurchaseOperations from "../modals/PreviousPurchaseOperations/PreviousPurchaseOperations.jsx";

export default function DocumentsTabs() {
    return (
        <div className="documents-section documents-section-docs">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="nav-tabs-bar">
                    <ul className="nav nav-tabs nav-docs-tabs mb-0" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link active"
                                data-bs-toggle="tab"
                                data-bs-target="#salesTab"
                                type="button"
                                role="tab"
                            >
                                <i className="bi bi-graph-up me-1"></i>
                                المبيعات
                            </button>
                        </li>

                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link"
                                data-bs-toggle="tab"
                                data-bs-target="#purchasesTab"
                                type="button"
                                role="tab"
                            >
                                <i className="bi bi-graph-down me-1"></i>
                                المشتريات
                            </button>
                        </li>
                    </ul>
                </div>
                <button
                    id="btnRefreshDocs"
                    className="btn btn-sm btn-outline-secondary"
                >
                    <i className="bi bi-arrow-clockwise"></i>
                </button>
            </div>

            <div className="tab-content tab-content-docs">
                {/* تبويب المبيعات | Sales tab */}
                <div
                    className="tab-pane fade show active"
                    id="salesTab"
                    role="tabpanel"
                >
                    <ul className="nav nav-tabs mb-3" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link active"
                                data-bs-toggle="tab"
                                data-bs-target="#salesInvoicesSubTab"
                                type="button"
                                role="tab"
                            >
                                <i className="bi bi-receipt"></i>
                                {" "}فواتير البيع
                            </button>
                        </li>

                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link"
                                data-bs-toggle="tab"
                                data-bs-target="#salesReceiptsSubTab"
                                type="button"
                                role="tab"
                            >
                                <i className="bi bi-cash"></i>
                                {" "}سندات القبض
                            </button>
                        </li>

                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link"
                                data-bs-toggle="tab"
                                data-bs-target="#salesOperationsSubTab"
                                type="button"
                                role="tab"
                            >
                                <i className="bi bi-clock-history"></i>
                                {" "}عمليات البيع السابقة
                            </button>
                        </li>
                    </ul>

                    <div className="tab-content">

                        {/* فواتير البيع | Sales invoices */}
                        <div
                            className="tab-pane fade show active"
                            id="salesInvoicesSubTab"
                            role="tabpanel"
                        >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="mb-0">أحدث فواتير البيع</h6>

                                <div className="card-header-actions">
                                    <button
                                        id="btnShowAllSales"
                                        className="btn btn-sm btn-outline-secondary"
                                    >
                                        <i className="bi bi-list-ul me-1"></i>
                                        عرض الكل
                                    </button>

                                    <button
                                        className="btn btn-sm btn-primary create-document"
                                        data-doc-kind="salesInvoices"
                                    >
                                        <i className="bi bi-plus-lg"></i>
                                        {" "}فاتورة بيع جديدة
                                    </button>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover text-center mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: "80px" }}>
                                                <i className="bi bi-eye"></i> /{" "}
                                                <i className="bi bi-pencil-square"></i>
                                            </th>
                                            <th>تاريخ الإصدار</th>
                                            <th>المرجع</th>
                                            <th>العميل</th>
                                            <th>البيان</th>
                                            <th>مبلغ الفاتورة</th>
                                            <th>الرصيد المستحق</th>
                                            <th>الحالة</th>
                                        </tr>
                                    </thead>

                                    <tbody id="salesInvoicesTbody"></tbody>
                                </table>
                            </div>
                        </div>

                        {/* سندات القبض | Sales receipts */}
                        <div
                            className="tab-pane fade"
                            id="salesReceiptsSubTab"
                            role="tabpanel"
                        >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="mb-0">أحدث سندات القبض</h6>

                                <div className="card-header-actions">
                                    <button
                                        id="btnShowAllReceipts"
                                        className="btn btn-sm btn-outline-secondary"
                                    >
                                        <i className="bi bi-list-ul me-1"></i>
                                        عرض الكل
                                    </button>

                                    <button
                                        id="btnNewReceiptVoucher"
                                        className="btn btn-sm btn-success"
                                    >
                                        <i className="bi bi-plus-lg"></i>
                                        {" "}سند قبض جديد
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
                                            <th>تاريخ الإصدار</th>
                                            <th>المرجع</th>
                                            <th>حساب القبض</th>
                                            <th>البيان</th>
                                            <th>جهة الدفع</th>
                                            <th>المبلغ</th>
                                        </tr>
                                    </thead>

                                    <tbody id="salesReceiptsTbody"></tbody>
                                </table>
                            </div>
                        </div>

                        {/* عمليات البيع السابقة | Sales operations */}
                        <PreviousSalesOperations />

                    </div>
                </div>

                {/* تبويب المشتريات | Purchases tab */}
                <div
                    className="tab-pane fade"
                    id="purchasesTab"
                    role="tabpanel"
                >
                    <ul className="nav nav-tabs mb-3" role="tablist">
                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link active"
                                data-bs-toggle="tab"
                                data-bs-target="#purchaseInvoicesSubTab"
                                type="button"
                                role="tab"
                            >
                                <i className="bi bi-receipt"></i>
                                {" "}فواتير الشراء
                            </button>
                        </li>

                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link"
                                data-bs-toggle="tab"
                                data-bs-target="#purchasePaymentsSubTab"
                                type="button"
                                role="tab"
                            >
                                <i className="bi bi-cash"></i>
                                {" "}سندات الصرف
                            </button>
                        </li>

                        <li className="nav-item" role="presentation">
                            <button
                                className="nav-link"
                                data-bs-toggle="tab"
                                data-bs-target="#purchaseOperationsSubTab"
                                type="button"
                                role="tab"
                            >
                                <i className="bi bi-clock-history"></i>
                                {" "}عمليات الشراء السابقة
                            </button>
                        </li>
                    </ul>

                    <div className="tab-content">

                        {/* فواتير الشراء | Purchase invoices */}
                        <div
                            className="tab-pane fade show active"
                            id="purchaseInvoicesSubTab"
                            role="tabpanel"
                        >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="mb-0">أحدث فواتير الشراء</h6>

                                <div className="card-header-actions">
                                    <button
                                        id="btnShowAllPurchases"
                                        className="btn btn-sm btn-outline-secondary"
                                    >
                                        <i className="bi bi-list-ul me-1"></i>
                                        عرض الكل
                                    </button>

                                    <button
                                        className="btn btn-sm btn-warning create-document"
                                        data-doc-kind="purchaseInvoices"
                                    >
                                        <i className="bi bi-plus-lg"></i>
                                        {" "}فاتورة شراء جديدة
                                    </button>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover text-center mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: "80px" }}>
                                                <i className="bi bi-eye"></i> /{" "}
                                                <i className="bi bi-pencil-square"></i>
                                            </th>
                                            <th>تاريخ الإصدار</th>
                                            <th>المرجع</th>
                                            <th>المورد</th>
                                            <th>البيان</th>
                                            <th>مبلغ الفاتورة</th>
                                            <th>الرصيد المستحق</th>
                                            <th>الحالة</th>
                                        </tr>
                                    </thead>

                                    <tbody id="purchaseInvoicesTbody"></tbody>
                                </table>
                            </div>
                        </div>

                        {/* سندات الصرف | Payment vouchers */}
                        <div
                            className="tab-pane fade"
                            id="purchasePaymentsSubTab"
                            role="tabpanel"
                        >
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <h6 className="mb-0">أحدث سندات الصرف</h6>

                                <div className="card-header-actions">
                                    <button
                                        id="btnShowAllPayments"
                                        className="btn btn-sm btn-outline-secondary"
                                    >
                                        <i className="bi bi-list-ul me-1"></i>
                                        عرض الكل
                                    </button>

                                    <button
                                        id="btnNewPaymentVoucher"
                                        className="btn btn-sm btn-danger"
                                    >
                                        <i className="bi bi-plus-lg"></i>
                                        {" "}سند صرف جديد
                                    </button>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover text-center mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th style={{ width: "80px" }}>
                                                <i className="bi bi-eye"></i> /{" "}
                                                <i className="bi bi-pencil-square"></i>
                                            </th>
                                            <th>تاريخ الإصدار</th>
                                            <th>المرجع</th>
                                            <th>مدفوع من</th>
                                            <th>البيان</th>
                                            <th>المستفيد</th>
                                            <th>الرصيد</th>
                                        </tr>
                                    </thead>

                                    <tbody id="purchasePaymentsTbody"></tbody>
                                </table>
                            </div>
                        </div>

                        {/* عمليات الشراء السابقة | Purchase operations */}
                        <PreviousPurchaseOperations />

                    </div>
                </div>
            </div>
        </div>
    );
}