"use client";

export default function InvoiceLines() {
  return (
    <>
      <div className="table-responsive">
        <table className="table table-bordered mb-2">
          <thead className="table-light">
            <tr>
              {/* رقم السطر | Line number */}
              <th style={{ width: "40px" }} className="d-none-col-num">#</th>

              {/* مقبض السحب | Drag handle */}
              <th style={{ width: "40px" }}></th>

              {/* البند | Item */}
              <th>البند</th>

              {/* الكمية | Quantity */}
              <th style={{ width: "80px" }} className="d-none-col-qty">
                الكمية
              </th>

              {/* سعر الوحدة | Unit price */}
              <th style={{ width: "120px" }}>
                سعر الوحدة
              </th>

              {/* الحساب | Account */}
              <th style={{ minWidth: "150px" }}>الحساب</th>

              {/* البيان (مخفى) | Description (hidden) */}
              <th style={{ width: "180px" }} className="d-none-col-desc d-none">البيان</th>

              {/* الخصم | Discount */}
              <th
                style={{ width: "120px" }}
                className="d-none-col-discount"
              >
                الخصم
              </th>

              {/* الرمز الضريبي | Tax code */}
              <th style={{ minWidth: "180px" }}>
                الرمز الضريبي
              </th>

              {/* الإجمالي قبل الضريبة | Subtotal before tax */}
              <th style={{ width: "120px" }}>
                الإجمالي (قبل الضريبة)
              </th>

              {/* مبلغ الضريبة | Tax amount */}
              <th style={{ width: "120px" }} id="saleInvLineTaxAmountHeader" className="d-none-col-tax-amount d-none">
                مبلغ الضريبة
              </th>

              {/* الإجمالي النهائي | Grand total */}
              <th
                style={{ width: "160px" }}
                className="fw-bold"
              >
                الإجمالي النهائي
              </th>

              {/* زر تعطيل/تمكين السطر | Enable/disable line button */}
              <th style={{ width: "40px" }}></th>
              {/* زر نسخ السطر | Copy line button */}
              <th style={{ width: "40px" }}></th>
              {/* زر حذف السطر | Delete line button */}
              <th style={{ width: "40px" }}></th>
            </tr>
          </thead>

          <tbody id="saleInvLinesBody"></tbody>
        </table>
      </div>

      <button
        id="saleInvLinesBodyAddLine"
        className="btn btn-sm btn-outline-success mb-2"
        type="button"
      >
        <i className="bi bi-plus-lg"></i>{" "}
        إضافة سطر
      </button>
    </>
  );
}