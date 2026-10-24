export default function LoadingScreen() {
  return (
    <div id="loadingBox" className="text-center py-5">
      <div
        className="spinner-border text-primary"
        role="status"
        aria-hidden="true"
      ></div>

      <div className="mt-2">
        جاري تهيئة التطبيق...
      </div>
    </div>
  );
}