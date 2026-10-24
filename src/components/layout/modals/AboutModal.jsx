export default function AboutModal() {
  return (
    <div className="modal fade" id="aboutModal" tabIndex="-1">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">

          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-info-circle"></i>{" "}
              حول المحاسب المبسط
            </h5>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div className="modal-body">

            <p>
              المحاسب المبسط نظام محاسبي خفيف يساعد أصحاب المشاريع الصغيرة
              على إدارة المبيعات والمشتريات ومتابعة الأرباح بسهولة.
            </p>

            <ul>
              <li>إدارة المنتجات.</li>
              <li>إدارة المبيعات.</li>
              <li>إدارة المشتريات.</li>
              <li>تقارير وإحصائيات فورية.</li>
            </ul>

            <hr className="my-3" />

            <div className="mb-2 fw-semibold">
              <i className="bi bi-stars me-1"></i>
              مميزات الإصدار
            </div>

            <ul className="mb-3">
              <li>
                <strong>مسح الباركود:</strong>{" "}
                قراءة بعض المنتجات بالكاميرا والتعرّف عليها تلقائياً.
              </li>
              <li>
                <strong>العملاء والموردون:</strong>{" "}
                إضافة العملاء والموردين وربطهم بالفواتير والسندات.
              </li>
              <li>
                <strong>سندات القبض والصرف:</strong>{" "}
                إنشاء سند قبض وسند صرف وتسجيل المبالغ بسهولة.
              </li>
              <li>
                <strong>ربط المنتج بالفاتورة:</strong>{" "}
                ترحيل منتج إلى فاتورة بيع أو شراء وربطه بها بسهولة.
              </li>
            </ul>

            <div className="alert alert-primary mb-0">
              الإصدار: 1.2
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}