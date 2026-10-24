export default function ToastContainer() {
  return (
    <>
      {/* تنبيه توافق المتصفح | Browser compatibility notice */}
      <div
        id="globalAlert"
        className="alert alert-warning"
        style={{ display: "none" }}
      >
        <strong>ملاحظة:</strong> تم اكتشاف قيود في تخزين المتصفح. التطبيق سيعمل في وضع احتياطي (LocalStorage).
      </div>

      {/* حاوية إشعارات Toast | Toast notification container */}
      <div
        id="toastContainer"
        className="position-fixed"
        style={{
          top: "20px",
          right: "20px",
          zIndex: 10999,
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          pointerEvents: "none",
        }}
      />
    </>
  );
}