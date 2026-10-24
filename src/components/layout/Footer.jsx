export default function Footer() {
  return (
    <footer className="text-center mt-4 py-3 border-top">

      <div className="text-muted small mb-3">
        الإصدار | 1.2 ـ من تطوير <strong>alshagag</strong>
      </div>

      <div className="footer-support mb-3">
        <div className="support-intro">
          <i className="bi bi-cup-hot-fill"></i>
          <span>عجبك المشروع؟ تبرع أو اشتري.</span>
        </div>

        <div className="footer-actions">
          <a
            href="https://safsif.net"
            target="_blank"
            rel="noopener noreferrer"
            className="support-card support-card--store"
          >
            <span className="support-word">اشتري</span>
            <i className="bi bi-shop"></i>
            <span className="support-label">متجر سفسيف</span>
          </a>

          <a
            href="https://paypal.me/alshagag"
            target="_blank"
            rel="noopener noreferrer"
            className="support-card"
          >
            <span className="support-word">تبرع</span>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M7.5 2h6.2c3.3 0 5.3 1.7 5.3 4.6 0 3.6-2.8 5.9-6.9 5.9h-2l-1 6.3H4.7L7.5 2z" />
              <path d="M17.5 6.6c-.5 3.4-3.2 5.3-7.2 5.3H8.6L7.8 17h3.5l.7-4.3h1.8c3.6 0 5.8-1.6 6.3-4.9.2-1.5-.2-2.6-1.1-3.2z" />
            </svg>
            <span className="support-label">دعم بكوب شاي</span>
          </a>
        </div>
      </div>

      <div>
        <a
          href="/versions/versions.html"
          className="btn btn-outline-primary btn-sm"
        >
          <i className="bi bi-clock-history me-1"></i>
          عرض الإصدارات السابقة
        </a>
      </div>

    </footer>
  );
}