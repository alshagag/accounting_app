"use client";

import React from 'react';
import AppSelect from "@/components/ui/Select.jsx";

const InvoiceLineItem = ({
  item,
  index,
  onLineChange,
  onRemove,
  onCopy,
  products,
  taxCodes
}) => {
  const subtotal = (item.quantity || 0) * (item.price || 0);
  const taxRate = item.taxCodeId?.rate || 0;
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  return (
    <tr>
      {/* مقبض السحب | Drag handle */}
      <td className="text-center align-middle" style={{ width: "40px", cursor: "grab" }}>
        <i className="bi bi-grip-vertical" style={{ opacity: 0.4 }}></i>
      </td>

      {/* المنتج | Product */}
      <td style={{ minWidth: "220px" }}>
        <AppSelect
          instanceId={`line-${index}-product`}
          options={products}
          value={item.product}
          onChange={(selected) => onLineChange(index, 'product', selected)}
          placeholder="اختر منتج..."
          isClearable
        />
      </td>

      {/* الحساب (عنصر نائب) | Account (placeholder) */}
      <td style={{ minWidth: "150px" }}>
        <input type="text" className="form-control form-control-sm" readOnly value={item.product?.defaultSalesAccount || 'المبيعات'} />
      </td>

      {/* البيان (مخفي) | Description (hidden) */}
      <td style={{ width: "180px" }} className="d-none-col-desc d-none">
        <input
          type="text"
          className="form-control form-control-sm"
          value={item.description}
          onChange={(e) => onLineChange(index, 'description', e.target.value)}
        />
      </td>

      {/* الكمية | Quantity */}
      <td style={{ width: "80px" }}>
        <input
          type="number"
          className="form-control form-control-sm text-end"
          value={item.quantity}
          onChange={(e) => onLineChange(index, 'quantity', parseFloat(e.target.value) || 0)}
          min="0"
        />
      </td>

      {/* سعر الوحدة | Unit price */}
      <td style={{ width: "110px" }}>
        <input
          type="number"
          className="form-control form-control-sm text-end"
          value={item.price}
          onChange={(e) => onLineChange(index, 'price', parseFloat(e.target.value) || 0)}
          min="0"
        />
      </td>

      {/* الخصم (مخفي) | Discount (hidden) */}
      <td style={{ width: "90px" }} className="d-none-col-discount d-none">
        <input
          type="number"
          className="form-control form-control-sm text-end"
          value={item.discount}
          onChange={(e) => onLineChange(index, 'discount', parseFloat(e.target.value) || 0)}
          min="0"
        />
      </td>

      {/* المجموع الفرعي | Subtotal */}
      <td style={{ width: "120px" }} className="text-end align-middle">
        {subtotal.toFixed(2)}
      </td>

      {/* الرمز الضريبي | Tax code */}
      <td style={{ minWidth: "180px" }}>
        <AppSelect
          instanceId={`line-${index}-tax`}
          options={taxCodes}
          value={item.taxCodeId}
          onChange={(selected) => onLineChange(index, 'taxCodeId', selected)}
          placeholder="لا توجد ضريبة"
          isClearable
        />
      </td>

      {/* مبلغ الضريبة (مخفي) | Tax amount (hidden) */}
      <td style={{ width: "120px" }} className="text-end align-middle d-none-col-tax-amount d-none">{taxAmount.toFixed(2)}</td>

      {/* الإجمالي | Total */}
      <td style={{ width: "160px" }} className="fw-bold text-end align-middle">{total.toFixed(2)}</td>

      {/* الإجراءات | Actions */}
      <td className="text-center align-middle" style={{ width: "40px" }}><button type="button" onClick={() => onCopy(index)} className="btn btn-sm btn-outline-primary"><i className="bi bi-clipboard"></i></button></td>
      <td className="text-center align-middle" style={{ width: "40px" }}><button type="button" onClick={() => onRemove(index)} className="btn btn-sm btn-outline-danger">&times;</button></td>
    </tr>
  );
};

export default InvoiceLineItem;
