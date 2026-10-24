import Image from 'next/image';
import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <header className="landing-hero">
        <nav className="landing-nav">
          <Link className="brand" href="/">
            <i className="bi bi-calculator"></i>
            <span>المحاسب المبسط</span>
          </Link>
          <Link className="nav-entry" href="/accounting">
            <i className="bi bi-box-arrow-in-left"></i>
            دخول التطبيق
          </Link>
        </nav>

        <div className="hero-content">
          <p className="eyebrow">نظام محاسبة خفيف للمشاريع الصغيرة</p>
          <h1>المحاسب المبسط</h1>
          <p className="hero-copy">
            سجّل المنتجات، تابع المبيعات والمشتريات، واحسب صافي الربح من واجهة واحدة سريعة وواضحة.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-success btn-lg" href="/accounting">
              <i className="bi bi-play-fill"></i>
              ابدأ الآن
            </Link>
            <a className="btn btn-light btn-lg" href="#features">
              <i className="bi bi-grid-3x3-gap"></i>
              استعراض الخصائص
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="feature-strip" id="features">
          <div className="container">
            <div className="section-heading">
              <p>ماذا يقدم التطبيق؟</p>
              <h2>كل ما تحتاجه لتسجيل الحركة اليومية بسرعة</h2>
            </div>

            <div className="feature-grid">
              <article className="feature-card">
                <i className="bi bi-box-seam"></i>
                <h3>إدارة المنتجات</h3>
                <p>إضافة المنتجات وأسعارها وتعديلها بسرعة من الجدول أو من نافذة التعديل الكامل.</p>
              </article>

              <article className="feature-card">
                <i className="bi bi-receipt"></i>
                <h3>مبيعات ومشتريات</h3>
                <p>تسجيل عمليات البيع والشراء مع الكمية والسعر والتاريخ واسم المورد عند الحاجة.</p>
              </article>

              <article className="feature-card">
                <i className="bi bi-graph-up-arrow"></i>
                <h3>ملخص فوري</h3>
                <p>متابعة إجمالي المبيعات والمشتريات وصافي الربح وآخر عملية من أعلى الصفحة.</p>
              </article>

              <article className="feature-card">
                <i className="bi bi-database-check"></i>
                <h3>تخزين محلي</h3>
                <p>يعتمد على IndexedDB داخل المتصفح مع وضع احتياطي لضمان استمرار حفظ البيانات.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="workflow-section">
          <div className="container workflow-layout">
            <div className="workflow-copy">
              <p className="eyebrow">طريقة العمل</p>
              <h2>من المنتج إلى التقرير في خطوات قليلة</h2>
              <ul className="workflow-list">
                <li><span>1</span> أضف المنتج وسعره من لوحة المنتجات.</li>
                <li><span>2</span> اختر نوع العملية: بيع أو شراء.</li>
                <li><span>3</span> راجع الجداول المختصرة أو افتح عرض الكل للتعديل الكامل.</li>
              </ul>
            </div>

            <div className="preview-panel">
              <Image src="/landing-preview.png" alt="واجهة المحاسب المبسط تعرض المبيعات والمشتريات والمنتجات" width={500} height={300} style={{maxWidth: '100%', height: 'auto'}} />
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="container cta-layout">
            <div>
              <p className="eyebrow">جاهز للتجربة؟</p>
              <h2>ابدأ بإدارة حساباتك اليومية الآن</h2>
            </div>
            <Link className="btn btn-success btn-lg" href="/accounting">
              <i className="bi bi-arrow-left-circle"></i>
              الانتقال إلى التطبيق
            </Link>
          </div>
        </section>
      </main>

      {/* التذييل | Footer */}
      <footer className="text-center mt-4 py-3 border-top">

        {/* رابط GitHub | GitHub link */}
        <div className="mb-2">
          <a href="https://github.com/alshagag"
            target="_blank"
            rel="noopener noreferrer"
            className="text-dark text-decoration-none d-inline-flex align-items-center">

            <i className="bi bi-github fs-4"></i>
            <span className="ms-2">تابع المشروع على GitHub</span>

          </a>
        </div>

        {/* معلومات الإصدار | Version info */}
        <div className="text-muted small mb-3">
          الإصدار | 1.1 — من تطوير <strong>alshagag</strong>
        </div>

        {/* دعم المشروع | Donation section */}
        <div className="footer-support mb-3">

          {/* نص تعريفي | Intro text */}
          <div className="support-intro">
            <i className="bi bi-cup-hot-fill"></i>
            <span>عجبك المشروع؟ تبرع أو اشتري.</span>
          </div>

          <div className="footer-actions">
            {/* زر المتجر | Store button */}
            <a href="https://safsif.net"
              target="_blank"
              rel="noopener noreferrer"
              className="support-card support-card--store">
              <span className="support-word">اشتري</span>
              <i className="bi bi-shop"></i>
              <span className="support-label">متجر سفسيف</span>
            </a>

            {/* زر التبرع | Donate button */}
            <a href="https://paypal.me/alshagag"
              target="_blank"
              rel="noopener noreferrer"
              className="support-card">
              <span className="support-word">تبرع</span>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7.5 2h6.2c3.3 0 5.3 1.7 5.3 4.6 0 3.6-2.8 5.9-6.9 5.9h-2l-1 6.3H4.7L7.5 2z" />
                <path d="M17.5 6.6c-.5 3.4-3.2 5.3-7.2 5.3H8.6L7.8 17h3.5l.7-4.3h1.8c3.6 0 5.8-1.6 6.3-4.9.2-1.5-.2-2.6-1.1-3.2z" />
              </svg>
              <span className="support-label">دعم بكوب شاي</span>
            </a>
          </div>

        </div>

        {/* زر الإصدارات | Versions button */}
        <div>
          <a href="versions/versions.html"
            className="btn btn-outline-primary btn-sm">

            <i className="bi bi-clock-history me-1"></i>
            عرض الإصدارات السابقة

          </a>
        </div>

      </footer>
    </>
  );
}
