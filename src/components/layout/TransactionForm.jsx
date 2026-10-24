"use client";
import { useState, useEffect } from "react";
import { normalizeTransactionType } from "@/services/lib/helpers.js";
import AppSelect from "@/components/ui/Select.jsx";
import { getAllProducts } from "@/features/products/products.js";
import { getAllTransactions, idbAdd, idbPut } from "@/data/db/db.js";
import { buildParties } from "@/features/parties/services/transactions.js";
import { showGlobalAlert, setButtonLoading } from "@/components/ui.js";
import { getInvoicesForParty } from "@/features/documents/invoices/vouchers/voucher-form.js";

export default function TransactionForm() {
  // حالة خيارات القوائم المنسدلة | State for populating dropdowns
  const [products, setProducts] = useState([]);
  const [parties, setParties] = useState([]);
  const [linkedInvoiceOptions, setLinkedInvoiceOptions] = useState([]);

  // حالة حقول النموذج | State for form inputs
  const [transType, setTransType] = useState({ value: "بيع", label: "بيع" });
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [date, setDate] = useState('');
  const [selectedParty, setSelectedParty] = useState(null);
  const [linkInvoice, setLinkInvoice] = useState(false);
  const [selectedLinkedInvoice, setSelectedLinkedInvoice] = useState(null);

  // حالة وضع التحرير | State for edit mode
  const [editTransactionId, setEditTransactionId] = useState(null);

  // حالة خيارات الأطراف | State for party options
  const [customerOptions, setCustomerOptions] = useState([]);
  const [supplierOptions, setSupplierOptions] = useState([]);


  // تأثير جلب البيانات | Data fetching effect
  useEffect(() => {
    async function fetchData() {
      // جلب المنتجات | Fetch products
      const productsData = await getAllProducts();
      const productOptions = productsData.map(p => ({ value: p.id, label: p.name, price: p.price }));
      setProducts(productOptions);

      // جلب الأطراف | Fetch parties
      const transactionsData = await getAllTransactions();
      const { customers, suppliers } = buildParties(transactionsData);
      const customerOpts = customers.map(c => ({ value: c.key, label: c.name }));
      const supplierOpts = suppliers.map(s => ({ value: s.key, label: s.name }));
      setCustomerOptions(customerOpts);
      setSupplierOptions(supplierOpts);

      // ضبط التاريخ الافتراضي | Set default date
      setDate(new Date().toISOString().split('T')[0]);
    }
    fetchData();
  }, []);

  // تحديث قائمة الأطراف بحسب نوع العملية | Update the parties dropdown based on transaction type
  useEffect(() => {
    if (transType?.value === 'بيع') {
      setParties(customerOptions);
    } else {
      setParties(supplierOptions);
    }
    // تصفير الطرف والفاتورة المختارين عند تغيّر نوع العملية | Reset the selected party and invoice when the transaction type changes
    setSelectedParty(null);
    setSelectedLinkedInvoice(null);
    setLinkInvoice(false);
  }, [transType, customerOptions, supplierOptions]);

  // جلب فواتير الطرف المختار | Fetch invoices for the selected party
  useEffect(() => {
    if (selectedParty && selectedParty.value) {
      const accountType = transType.value === 'بيع' ? 'customers' : 'suppliers';
      const invoices = getInvoicesForParty(selectedParty.value, accountType) || [];
      const invoiceOptions = invoices.map(inv => ({
        value: inv.key,
        label: `${inv.documentNo || inv.key} - ${inv.issueDate}`
      }));

      if (selectedLinkedInvoice && !invoiceOptions.some(o => o.value === selectedLinkedInvoice.value)) {
        invoiceOptions.unshift(selectedLinkedInvoice);
      }
      setLinkedInvoiceOptions(invoiceOptions);
    } else {
      setLinkedInvoiceOptions(selectedLinkedInvoice ? [selectedLinkedInvoice] : []);
    }
  }, [selectedParty, parties]);

  const handleProductChange = (option) => {
    setSelectedProduct(option);
    if (option && option.price) {
        setPrice(option.price);
    } else {
        setPrice('');
    }
  };

  const handlePartyChange = (option) => {
    setSelectedParty(option);
    if (!option) {
      setLinkInvoice(false);
      setSelectedLinkedInvoice(null);
    }
  };

  const clearForm = () => {
    setSelectedProduct(null);
    setQuantity('');
    setPrice('');
    setSelectedParty(null);
    setLinkInvoice(false);
    setSelectedLinkedInvoice(null);
    setEditTransactionId(null);
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleSave = async () => {
    const saveButton = document.getElementById("btnSaveTrans"); // نستخدم المعرّف للحصول على العنصر لـ setButtonLoading | Use the ID to get the element for setButtonLoading

    // التحقق من المدخلات | Validation
    if (!selectedProduct) {
        showGlobalAlert("اختر منتجًا", "warning");
        return;
    }
    if (!quantity || quantity <= 0) {
        showGlobalAlert("أدخل كمية صحيحة", "warning");
        return;
    }
    if (!price || price <= 0) {
        showGlobalAlert("أدخل سعرًا صحيحًا", "warning");
        return;
    }
     if (!date) {
        showGlobalAlert("اختر تاريخ العملية", "warning");
        return;
    }

    const values = {
        type: transType.value,
        product: selectedProduct.label,
        quantity: Number(quantity),
        price: Number(price),
        total: Number((quantity * price).toFixed(2)),
        date: date,
        supplier: transType.value === 'شراء' ? (selectedParty?.label || "") : "",
        customerPhone: transType.value === 'بيع' ? (selectedParty?.value || "") : "",
    };

    if (linkInvoice && selectedLinkedInvoice?.value) {
        const doc = window.findDocument?.(selectedLinkedInvoice.value, 'invoice');
        if (!doc) {
            showGlobalAlert("الفاتورة المختارة غير موجودة.", "danger");
            return;
        }
        values.date = doc.date || values.date;
        values.ref = doc.documentNo || doc.key;
        if (normalizeTransactionType(doc.type) === "شراء") {
            values.supplier = doc.party || "";
            values.customerPhone = "";
        } else {
            values.supplier = "";
            values.customerPhone = doc.phone || doc.customerPhone || "";
        }
    }

    try {
        if (editTransactionId) {
            setButtonLoading?.(saveButton, true, "جاري التحديث...");
            await idbPut("transactions", { ...values, id: editTransactionId });
            showGlobalAlert("تم تحديث العملية بنجاح", "success");

        } else {
            setButtonLoading?.(saveButton, true, "جاري الحفظ...");
            await idbAdd("transactions", values);
            showGlobalAlert("تم حفظ العملية بنجاح", "success");
        }

        clearForm();
        window.fullAppRefresh?.(); // إطلاق تحديث شامل للواجهة | Trigger a global refresh

    } catch(e) {
        console.error("Save transaction error:", e);
        showGlobalAlert("خطأ في حفظ العملية", "danger");
    } finally {
        setButtonLoading?.(saveButton, false);
    }
  };


  const transactionTypeOptions = [
    { value: "بيع", label: "بيع" },
    { value: "شراء", label: "شراء" }
  ];

  const loadTransactionForEdit = (tx) => {
    if (!tx) return;

    const type = normalizeTransactionType(tx.type) || "بيع";
    const doc = tx.ref ? (window.findDocument?.(tx.ref, 'invoice') || null) : null;

    setTransType({ value: type, label: type });
    setSelectedProduct(products.find(p => p.label === tx.product) || null);
    setQuantity(tx.quantity != null ? String(tx.quantity) : '');
    setPrice(tx.price != null ? String(tx.price) : '');
    setDate(tx.date || new Date().toISOString().split('T')[0]);
    setEditTransactionId(Number(tx.id));
    setLinkInvoice(Boolean(doc));
    setSelectedLinkedInvoice(null);

    if (type === "شراء") {
      setSelectedParty(supplierOptions.find(o => o.value === tx.supplier || o.label === tx.supplier) || null);
    } else {
      let party = customerOptions.find(o => o.value === tx.customerPhone || o.label === tx.customerPhone);
      if (!party && doc) {
        party = customerOptions.find(o => o.value === doc.party || o.label === doc.party) || null;
      }
      setSelectedParty(party);
    }

    setSelectedLinkedInvoice(doc ? { value: doc.key, label: `${doc.documentNo || doc.key} - ${doc.issueDate || doc.date}` } : null);
  };

  useEffect(() => {
    window.openTransactionEdit = async (id) => {
      const transactions = await getAllTransactions();
      const tx = transactions.find(t => Number(t.id) === Number(id));
      if (tx) {
        loadTransactionForEdit(tx);
      } else {
        showGlobalAlert("العملية غير موجودة.", "warning");
      }
    };
    return () => { delete window.openTransactionEdit; };
  }, [products, supplierOptions, customerOptions]);

  return (
    <div className="col-12">
      <div className="card p-3 mb-3 transaction-form">
        <h5 className="mb-3">
          <i className="bi bi-cart-check"></i> تسجيل/تحديث عملية بيع / شراء
        </h5>
        <div className="row g-2">
          <div className="col-4 col-md-3">
            <AppSelect
              instanceId="trans-type-select"
              value={transType}
              onChange={setTransType}
              options={transactionTypeOptions}
              placeholder="النوع"
              isClearable={false}
            />
          </div>
          <div className="col-8 col-md-4">
            <AppSelect
              instanceId="trans-product-select"
              value={selectedProduct}
              onChange={handleProductChange}
              options={products}
              placeholder="اختر منتج"
              isClearable
            />
          </div>
          <div className="col-6 col-md-2 input-icon">
            <input
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              className="form-control"
              placeholder="الكمية"
            />
            <i className="bi bi-stack"></i>
          </div>
          <div className="col-6 col-md-3">
            <div className="input-group">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                type="number"
                className="form-control"
                placeholder="السعر"
              />
              <span className="input-group-text">﷼</span>
            </div>
          </div>
          <div className="col-6 col-md-3 input-icon">
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              type="date"
              className="form-control"
            />
            <i className="bi bi-calendar-date"></i>
          </div>
          <div className="col-6 col-md-4">
            <div className="d-flex gap-1 align-items-center">
              <div className="flex-grow-1">
                <AppSelect
                  instanceId="trans-party-select"
                  value={selectedParty}
                  onChange={handlePartyChange}
                  options={parties}
                  placeholder="اختر الطرف"
                  isClearable
                />
              </div>
              <button
                className="btn btn-success btn-sm flex-shrink-0"
                style={{
                  height: "38px",
                  width: "38px",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="إضافة طرف"
                id="btn-new-party" // إبقاء المعرّف لاستخدامه من السكربتات القديمة عند الحاجة | Keep the ID for legacy scripts if needed
                onClick={() => window.openPartiesModal?.({ tab: "add" })}
              >
                <i className="bi bi-plus-lg"></i>
              </button>
            </div>
          </div>
          <div className="col-12">
            <div className="form-check form-switch mb-1">
              <input
                className="form-check-input"
                type="checkbox"
                disabled={!selectedParty}
                checked={linkInvoice}
                onChange={(e) => {
                  setLinkInvoice(e.target.checked);
                  if (!e.target.checked) {
                    setSelectedLinkedInvoice(null);
                  }
                }}
                id="transLinkInvoice"
              />
              <label className="form-check-label" htmlFor="transLinkInvoice">
                ربط فاتورة موجودة
              </label>
            </div>
          </div>
          {linkInvoice && (
            <div className="col-12">
              <AppSelect
                instanceId="trans-linked-invoice-select"
                value={selectedLinkedInvoice}
                onChange={setSelectedLinkedInvoice}
                options={linkedInvoiceOptions}
                placeholder="اختر فاتورة"
                isClearable
              />
            </div>
          )}
          <div className="col-12 d-flex gap-2 mt-2">
            <button id="btnSaveTrans" onClick={handleSave} className="btn btn-primary w-100">
              <i className="bi bi-save"></i> {editTransactionId ? 'تحديث العملية' : 'إرسال العملية'}
            </button>
            {editTransactionId && (
              <button onClick={clearForm} className="btn btn-outline-secondary w-100">
                إلغاء
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}