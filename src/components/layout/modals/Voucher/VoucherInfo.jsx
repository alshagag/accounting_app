"use client";

export default function VoucherInfo() {
    return (
        <>
            <input type="hidden" id="voucherType" />

            {/* التاريخ + المرجع | Date + reference */}
            <div className="row g-2 mb-3">
                <div className="col-12">
                    <div className="d-flex flex-wrap gap-2">
                        <div style={{ flex: "1 1 180px" }}>
                            <div className="form-group">
                                <label>التاريخ</label>

                                <div className="input-group">
                                    <span className="input-group-text">
                                        <i className="bi bi-calendar-date"></i>
                                    </span>

                                    <input
                                        id="voucherDate"
                                        type="date"
                                        className="form-control"
                                    />
                                </div>
                            </div>
                        </div>

                        <div style={{ flex: "1 1 180px" }}>
                            <div className="form-group">
                                <label>المرجع</label>

                                <div className="input-group">
                                    <span className="input-group-text">
                                        <i className="bi bi-hash"></i>
                                    </span>

                                    <input
                                        id="voucherReferenceNo"
                                        type="text"
                                        className="form-control"
                                        placeholder="المرجع"
                                        readOnly
                                    />

                                    <span
                                        id="voucherReferenceNoDisplay"
                                        className="input-group-text d-none"
                                        style={{
                                            flexGrow: 1,
                                            justifyContent: "flex-start",
                                            textAlign: "start",
                                        }}
                                    />

                                    <span className="input-group-text">
                                        <input
                                            id="voucherAutoReference"
                                            className="form-check-input mt-0"
                                            type="checkbox"
                                            title="توليد تلقائي"
                                        />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* مدفوع من | Paid from */}
            <div className="row g-2 mb-3">
                <div className="col-12">
                    <div style={{ maxWidth: "350px" }}>
                        <div className="form-group">
                            <label>مدفوع من</label>

                            <div className="input-group voucher-account-group">
                                <span className="input-group-text">
                                    <i className="bi bi-wallet2"></i>
                                </span>

                                <div className="select-with-clear flex-grow-1">
                                    <select
                                        id="voucherAccountType"
                                        className="form-select"
                                        defaultValue="cash"
                                    >
                                        <option value="cash">الصندوق</option>
                                        <option value="bank">البنك</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* جهة الاتصال | Contact party */}
            <div className="row g-2 mb-3">
                <div className="col-12">
                    <div className="form-group">
                        <label>جهة الاتصال</label>

                        <div className="input-group">
                            <span className="input-group-text">
                                <i className="bi bi-person"></i>
                            </span>

                            <div
                                className="select-with-clear flex-grow-0"
                                style={{ width: "120px" }}
                            >
                                <select
                                    id="voucherPartyType"
                                    name="voucherPartyType"
                                    className="form-select"
                                    defaultValue="manual"
                                >
                                    <option value="manual">آخر</option>
                                    <option value="customers">عميل</option>
                                    <option value="suppliers">مورد</option>
                                </select>
                            </div>

                            <div className="select-with-clear d-none flex-grow-1">
                                <select
                                    id="voucherParty"
                                    className="form-select"
                                ></select>
                            </div>

                            <input
                                id="voucherPartyManual"
                                type="text"
                                className="form-control d-none"
                                placeholder="أدخل اسم الجهة يدوياً"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* البيان | Description */}
            <div className="row g-2 mb-3">
                <div className="col-12">
                    <div className="form-group">
                        <label>البيان</label>

                        <textarea
                            id="voucherDescription"
                            className="form-control"
                            rows={2}
                            placeholder="اكتب البيان"
                        ></textarea>
                    </div>
                </div>
            </div>
        </>
    );
}