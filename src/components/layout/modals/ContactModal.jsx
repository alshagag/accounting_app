"use client";

import { useState } from "react";
import { showGlobalAlert } from "@/components/ui.js";

export default function ContactModal() {
  const [isLoading, setIsLoading] = useState(false);

  async function handleSendFeedback() {
    const name = document.getElementById("name")?.value.trim() || "";
    const email = document.getElementById("email")?.value.trim() || "";
    const message = document.getElementById("message")?.value.trim() || "";
    const rating = document.getElementById("rating")?.value || "5";

    if (!name) {
      showGlobalAlert("الاسم مطلوب", "warning");
      return;
    }

    if (!message) {
      showGlobalAlert("الرسالة مطلوبة", "warning");
      return;
    }

    if (email && !email.includes("@")) {
      showGlobalAlert("يرجى إدخال بريد إلكتروني صحيح", "warning");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, message, rating }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        const errorMessage = result?.error || "فشل الإرسال - حاول مرة أخرى";
        showGlobalAlert(errorMessage, "danger");
        return;
      }

      showGlobalAlert(result.message || "تم إرسال الرسالة بنجاح 🎉", "success");
      document.getElementById("name").value = "";
      document.getElementById("email").value = "";
      document.getElementById("message").value = "";
      document.getElementById("rating").value = "5";
    } catch (error) {
      console.error("ContactModal sendFeedback error:", error);
      showGlobalAlert("تعذر الاتصال بخدمة البريد. يرجى المحاولة لاحقًا.", "danger");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="modal fade" id="contactModal" tabIndex={-1}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">

          <div className="modal-header">
            <h5 className="modal-title">
              <i className="bi bi-chat-dots-fill"></i> اتصل بنا
            </h5>

            <button
              type="button"
              className="btn-close"
              data-bs-dismiss="modal"
            />
          </div>

          <div className="modal-body">

            <div className="text-center mb-4">
              <h5>نسعد بملاحظاتك واقتراحاتك</h5>
              <small className="text-muted">
                ساعدنا في تطوير المحاسب المبسط
              </small>
            </div>

            <label className="form-label">الاسم</label>
            <input
              id="name"
              className="form-control mb-3"
              placeholder="اكتب اسمك"
            />

            <label className="form-label">البريد الإلكتروني</label>
            <input
              id="email"
              type="email"
              className="form-control mb-3"
              placeholder="example@email.com"
            />

            <label className="form-label">رسالتك</label>
            <textarea
              id="message"
              rows={4}
              className="form-control mb-3"
              placeholder="اكتب ملاحظاتك هنا"
            />

            <label className="form-label">التقييم</label>
            <select id="rating" className="form-select mb-4">
              <option value="5">⭐⭐⭐⭐⭐ ممتاز</option>
              <option value="4">⭐⭐⭐⭐ جيد</option>
              <option value="3">⭐⭐⭐ متوسط</option>
              <option value="2">⭐⭐ ضعيف</option>
              <option value="1">⭐ سيء</option>
            </select>

            <button
              type="button"
              id="btnSendFeedback"
              className="btn btn-primary w-100"
              onClick={handleSendFeedback}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" /> جارٍ الإرسال...
                </>
              ) : (
                <>
                  <i className="bi bi-send-fill"></i> إرسال الملاحظات
                </>
              )}
            </button>

          </div>

          <div className="modal-footer justify-content-center">

            <a
              href="https://github.com/alshagag"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-dark"
            >
              <i className="bi bi-github"></i> GitHub
            </a>

            <a
              href="https://paypal.me/alshagag"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-outline-primary"
            >
              <i className="bi bi-cup-hot-fill"></i> دعم المشروع
            </a>

          </div>

        </div>
      </div>
    </div>
  );
}