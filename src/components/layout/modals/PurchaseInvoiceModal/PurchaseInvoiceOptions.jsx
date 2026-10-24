"use client";

export default function PurchaseInvoiceOptions() {
  return (
    <div className="d-flex flex-column gap-1 mb-2">
      <div className="form-check form-switch">
        <input
          id="purchaseToggleShowNum"
          className="form-check-input"
          type="checkbox"
        />
        <label
          className="form-check-label"
          htmlFor="purchaseToggleShowNum"
        >
          إظهار رقم السطر
        </label>
      </div>

      <div className="form-check form-switch">
        <input
          id="purchaseToggleShowDesc"
          className="form-check-input"
          type="checkbox"
        />
        <label
          className="form-check-label"
          htmlFor="purchaseToggleShowDesc"
        >
          إظهار البيان
        </label>
      </div>

      <div className="form-check form-switch">
        <input
          id="purchaseToggleShowDiscount"
          className="form-check-input"
          type="checkbox"
        />
        <label
          className="form-check-label"
          htmlFor="purchaseToggleShowDiscount"
        >
          إظهار الخصم
        </label>
      </div>

      <div
        id="purchaseInvDiscountTypeRow"
        className="ps-4"
        style={{ display: "none" }}
      >
        <select
          id="purchaseInvLineDiscountType"
          className="form-select form-select-sm"
          defaultValue="fixed"
          onChange={(e) => {
            document.querySelectorAll(".purchase-inv-discount-type").forEach(input => {
              input.value = e.target.value;
            });
            window.recalc_purchaseInv?.();
          }}
        >
          <option value="fixed">مبلغ ثابت</option>
          <option value="percent">نسبة مئوية (%)</option>
        </select>
      </div>

      <div className="form-check form-switch">
        <input
          id="purchaseToggleTaxInclusive"
          className="form-check-input"
          type="checkbox"
        />
        <label
          className="form-check-label"
          htmlFor="purchaseToggleTaxInclusive"
        >
          المبالغ شاملة الضريبة
        </label>
      </div>

      <div className="form-check form-switch">
        <input
          id="purchaseToggleShowTaxAmount"
          className="form-check-input"
          type="checkbox"
        />
        <label
          className="form-check-label"
          htmlFor="purchaseToggleShowTaxAmount"
        >
          إظهار عمود الضريبة
        </label>
      </div>

      <div className="form-check form-switch">
        <input
          id="purchaseToggleInvTitle"
          className="form-check-input"
          type="checkbox"
        />
        <label
          className="form-check-label"
          htmlFor="purchaseToggleInvTitle"
        >
          عنوان مخصص
        </label>
      </div>

      <div
        id="purchaseInvTitleRow"
        className="ps-4"
        style={{ display: "none" }}
      >
        <textarea
          id="purchaseInvTitle"
          className="form-control form-control-sm"
          rows={2}
          placeholder="عنوان الفاتورة"
        />
      </div>

      <div className="form-check form-switch">
        <input
          id="purchaseToggleBilingual"
          className="form-check-input"
          type="checkbox"
        />
        <label
          className="form-check-label"
          htmlFor="purchaseToggleBilingual"
        >
          ثنائي اللغة
        </label>
      </div>

      <div
        id="purchaseInvTitleEnRow"
        className="ps-4"
        style={{ display: "none" }}
      >
        <textarea
          id="purchaseInvTitleEn"
          className="form-control form-control-sm mt-1"
          placeholder="Invoice Title (English)"
        />
      </div>

      <div className="form-check form-switch">
        <input
          id="purchaseToggleDescription"
          className="form-check-input"
          type="checkbox"
        />
        <label
          className="form-check-label"
          htmlFor="purchaseToggleDescription"
        >
          وصف
        </label>
      </div>

      <div
        id="purchaseInvDescRow"
        className="ps-4"
        style={{ display: "none" }}
      >
        <textarea
          id="purchaseInvDescTextarea"
          className="form-control form-control-sm"
          rows={2}
          placeholder="وصف الفاتورة"
        />
      </div>

      <div className="form-check form-switch">
        <input
          id="purchaseToggleClosedInvoice"
          className="form-check-input"
          type="checkbox"
        />
        <label
          className="form-check-label"
          htmlFor="purchaseToggleClosedInvoice"
        >
          فاتورة مغلقة
        </label>
      </div>

      <div className="form-check form-switch">
        <input
          id="purchaseToggleShowFooter"
          className="form-check-input"
          type="checkbox"
        />
        <label
          className="form-check-label"
          htmlFor="purchaseToggleShowFooter"
        >
          التذييلات
        </label>
      </div>

      <div
        id="purchaseInvFooterRow"
        className="ps-4"
        style={{ display: "none" }}
      >
        <textarea
          id="purchaseInvFooter"
          className="form-control form-control-sm"
          rows={2}
          placeholder="ملاحظات التذييل..."
        />
      </div>

      <div className="form-check form-switch">
        <input
          id="purchaseToggleHidePaymentsOnPrint"
          className="form-check-input"
          type="checkbox"
        />
        <label
          className="form-check-label"
          htmlFor="purchaseToggleHidePaymentsOnPrint"
        >
          إخفاء سجل المدفوعات عند الطباعة
        </label>
      </div>
            
    </div>
  );
}