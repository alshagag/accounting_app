"use client";

import { useState } from "react";
import AppSelect from "@/components/ui/Select.jsx";

export default function InvoiceOptions() {
  const [discountType, setDiscountType] = useState({ value: "fixed", label: "مبلغ ثابت" });

  const handleDiscountTypeChange = (selectedOption) => {
    setDiscountType(selectedOption);
    // تطبيق نوع الخصم الجديد على كل البنود | Apply the new discount type to every line
    document.querySelectorAll(`.sale-inv-discount-type`).forEach(input => {
      input.value = selectedOption.value;
    });
    window.recalc_saleInv?.();
  };

  return (
    <div className="d-flex flex-column gap-1 mb-2">
      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleShowNum"
        />
        <label className="form-check-label" htmlFor="toggleShowNum">
          إظهار رقم السطر
        </label>
      </div>

      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleShowDesc"
        />
        <label className="form-check-label" htmlFor="toggleShowDesc">
          إظهار البيان
        </label>
      </div>

      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleShowDiscount"
        />
        <label className="form-check-label" htmlFor="toggleShowDiscount">
          إظهار الخصم
        </label>
      </div>

      <div
        id="saleInvDiscountTypeRow"
        className="ps-4"
        style={{ display: "none" }}
      >
        <AppSelect
          instanceId="sale-inv-discount-type-select"
          name="lineDiscountType"
          id="saleInvLineDiscountType"
          value={discountType}
          onChange={handleDiscountTypeChange}
          options={[
            { value: "fixed", label: "مبلغ ثابت" },
            { value: "percent", label: "نسبة مئوية (%)" },
          ]}
        />
      </div>

      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleShowTax"
        />
        <label className="form-check-label" htmlFor="toggleShowTax">
          إظهار عمود الضريبة
        </label>
      </div>

      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleTaxInclusive"
        />
        <label className="form-check-label" htmlFor="toggleTaxInclusive">
          المبالغ شاملة الضريبة
        </label>
      </div>

      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleInvTitle"
        />
        <label className="form-check-label" htmlFor="toggleInvTitle">
          عنوان مخصص
        </label>
      </div>

      <div
        id="saleInvTitleRow"
        className="ps-4"
        style={{ display: "none" }}
      >
        <textarea
          id="saleInvTitle"
          className="form-control form-control-sm"
          rows={2}
          placeholder="عنوان الفاتورة"
        />
      </div>

      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleBilingual"
        />
        <label className="form-check-label" htmlFor="toggleBilingual">
          ثنائي اللغة
        </label>
      </div>

      <div
        id="saleInvTitleEnRow"
        className="ps-4"
        style={{ display: "none" }}
      >
        <textarea
          id="saleInvTitleEn"
          className="form-control form-control-sm mt-1"
          rows={2}
          placeholder="Invoice Title (English)"
        />
      </div>

      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleDescription"
        />
        <label className="form-check-label" htmlFor="toggleDescription">
          وصف
        </label>
      </div>

      <div
        id="saleInvDescRow"
        className="ps-4"
        style={{ display: "none" }}
      >
        <textarea
          id="saleInvDescTextarea"
          className="form-control form-control-sm"
          rows={2}
          placeholder="وصف الفاتورة"
        />
      </div>

      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleClosedInvoice"
        />
        <label className="form-check-label" htmlFor="toggleClosedInvoice">
          فاتورة مغلقة
        </label>
      </div>

      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleShowFooter"
        />
        <label className="form-check-label" htmlFor="toggleShowFooter">
          التذييلات
        </label>
      </div>

      <div
        id="saleInvFooterRow"
        className="ps-4"
        style={{ display: "none" }}
      >
        <textarea
          id="saleInvFooter"
          className="form-control form-control-sm"
          rows={2}
          placeholder="ملاحظات التذييل..."
        />
      </div>

      <div className="form-check form-switch">
        <input
          className="form-check-input"
          type="checkbox"
          id="toggleHidePaymentsOnPrint"
        />
        <label
          className="form-check-label"
          htmlFor="toggleHidePaymentsOnPrint"
        >
          إخفاء سجل المدفوعات عند الطباعة
        </label>
      </div>
      
    </div>
  );
}