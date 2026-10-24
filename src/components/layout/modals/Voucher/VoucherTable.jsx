"use client";

export default function VoucherTable() {
    return (
        <>
            <div className="table-responsive">
                <table className="table table-bordered mb-2">
                    <thead className="table-light">
                        <tr>
                            <th id="voucherLineNoHeader" className="d-none" style={{ width: "50px" }}>
                                #
                            </th>

                            <th style={{ width: "40px" }}></th>

                            <th style={{ minWidth: "180px" }}>
                                البند
                            </th>

                            <th style={{ minWidth: "200px" }}>
                                الحساب
                            </th>

                            <th id="voucherLineStatementHeader" className="d-none" style={{ minWidth: "180px" }}>
                                البيان
                            </th>

                            <th id="voucherLineQuantityHeader" className="d-none" style={{ width: "80px" }}>
                                الكمية
                            </th>

                            <th style={{ width: "120px" }}>
                                المبلغ
                            </th>

                            <th id="voucherLineDiscountHeader" className="d-none" style={{ width: "120px" }}>
                                الخصم
                            </th>

                            <th style={{ width: "120px" }}>
                                الإجمالي
                            </th>

                            <th id="voucherLineTaxSelectHeader" style={{ width: "150px" }}>
                                الرمز الضريبي
                            </th>

                            <th id="voucherLineTaxAmountHeader" className="d-none" style={{ width: "120px" }}>
                                مبلغ الضريبة
                            </th>

                            <th style={{ width: "130px" }}>
                                الإجمالي النهائي
                            </th>

                            <th style={{ width: "80px" }}></th>

                            <th style={{ width: "80px" }}></th>
                        </tr>
                    </thead>

                    <tbody id="voucherLinesBody">
                        {/* تُنشأ الصفوف بواسطة createVoucherLine() | Rows are created by createVoucherLine() */}
                    </tbody>
                </table>
            </div>

            <button
                id="btnAddVoucherLine"
                type="button"
                className="btn btn-sm btn-outline-success mb-2"
            >
                <i className="bi bi-plus-lg"></i>{" "}
                إضافة سطر
            </button>
        </>
    );
}
