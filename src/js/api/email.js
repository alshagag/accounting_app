import emailjs from "@emailjs/browser";

const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID 
const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID 

/* ================= EmailJS Init | تهيئة EmailJS ================= */

emailjs.init({ publicKey });

/* ================= Toast Notification | الإشعارات ================= */

function showToast(message, type = "success") {
  const toastEl = document.getElementById("appToast");
  const messageEl = document.getElementById("toastMessage");

  if (!toastEl || !messageEl) return;

  toastEl.classList.remove(
    "bg-success",
    "bg-danger",
    "bg-warning",
    "bg-info"
  );

  const colors = {
    success: "bg-success",
    error: "bg-danger",
    danger: "bg-danger",
    warning: "bg-warning",
    info: "bg-info"
  };

  toastEl.classList.add(colors[type] || "bg-success");

  messageEl.textContent = message;

  const toast = new bootstrap.Toast(toastEl, {
    delay: 3000,
    autohide: true
  });

  toast.show();
}

/* ================= Send Feedback | إرسال النموذج ================= */

async function sendFeedback() {
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const messageEl = document.getElementById("message");
  const ratingEl = document.getElementById("rating");

  if (!nameEl || !emailEl || !messageEl || !ratingEl) {
    console.error("Missing form elements");
    showToast("خطأ في النموذج", "danger");
    return;
  }

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const message = messageEl.value.trim();
  const rating = ratingEl.value;

  /* ================= Validation | التحقق ================= */

  if (!name) {
    showToast("الاسم مطلوب", "warning");
    return;
  }

  if (!message) {
    showToast("الرسالة مطلوبة", "warning");
    return;
  }

  if (email && !email.includes("@")) {
    showToast("يرجى إدخال بريد إلكتروني صحيح", "warning");
    return;
  }

  const params = {
    from_name: name,
    from_email: email,
    message,
    rating,
    to_email: "psp.spd@gmail.com"
  };

  try {
    const response = await emailjs.send(
      serviceId,
      templateId,
      params
    );

    console.log("EmailJS success:", response);

    showToast("تم إرسال الرسالة بنجاح 🎉", "success");

    /* Reset form | إعادة تعيين النموذج */
    nameEl.value = "";
    emailEl.value = "";
    messageEl.value = "";
    ratingEl.value = "5";

  } catch (err) {
    console.error("EmailJS Error:", err);
    showToast("فشل الإرسال - حاول مرة أخرى", "danger");
  }
}

/* ================= Exports | التصدير ================= */

window.sendFeedback = sendFeedback;

export { sendFeedback, showToast };
