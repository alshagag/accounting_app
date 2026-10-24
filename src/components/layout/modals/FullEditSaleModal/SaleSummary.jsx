"use client";

export default function SaleSummary() {
  return (
    <div className="col-12">
      <div className="border rounded p-2 mb-2 d-flex justify-content-between">

        <span>
          نوع العملية:{" "}
          <strong id="full_sale_codePoster">
            -
          </strong>
        </span>

        <span>
          التاريخ:{" "}
          <strong id="full_sale_datePoster">
            -
          </strong>
        </span>

        <span>
          الإجمالي:{" "}
          <strong id="full_sale_totalPoster">
            0.00
          </strong>
        </span>

      </div>
    </div>
  );
}