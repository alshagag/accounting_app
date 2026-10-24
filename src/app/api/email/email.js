// كائن emailjs محمّل من سكربت CDN في index.html ومتاح عامًا، فلا حاجة لاستيراده كوحدة | The emailjs object is loaded from the CDN script in index.html and is available globally, so importing it as a module is unnecessary.

// بيانات اعتماد EmailJS | EmailJS credentials
// ضع بياناتك الفعلية من حسابك في EmailJS مكان هذه القيم | Replace these with your actual credentials from your EmailJS account.
const publicKey = "YOUR_PUBLIC_KEY"; // في الحساب > مفاتيح API | Found in Account > API Keys
const serviceId = "YOUR_SERVICE_ID"; // في خدمات البريد | Found in Email Services
const templateId = "YOUR_TEMPLATE_ID"; // في قوالب البريد | Found in Email Templates

/* ================= تهيئة EmailJS | EmailJS Init ================= */

emailjs.init({ publicKey });

/* ================= إرسال النموذج | Send Feedback ================= */

async function sendFeedback() {
  const nameEl = document.getElementById("name");
  const emailEl = document.getElementById("email");
  const messageEl = document.getElementById("message");
  const ratingEl = document.getElementById("rating");

  if (!nameEl || !emailEl || !messageEl || !ratingEl) {
    console.error("Missing form elements");
    window.showGlobalAlert?.("خطأ في النموذج", "danger");
    return;
  }

  const name = nameEl.value.trim();
  const email = emailEl.value.trim();
  const message = messageEl.value.trim();
  const rating = ratingEl.value;

  /* ================= التحقق | Validation ================= */

  if (!name) {
    window.showGlobalAlert?.("الاسم مطلوب", "warning");
    return;
  }

  if (!message) {
    window.showGlobalAlert?.("الرسالة مطلوبة", "warning");
    return;
  }

  if (email && !email.includes("@")) {
    window.showGlobalAlert?.("يرجى إدخال بريد إلكتروني صحيح", "warning");
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

    window.showGlobalAlert?.("تم إرسال الرسالة بنجاح 🎉", "success");

    /* إعادة تعيين النموذج | Reset form */
    nameEl.value = "";
    emailEl.value = "";
    messageEl.value = "";
    ratingEl.value = "5";

  } catch (err) {
    console.error("EmailJS Error:", err);
    window.showGlobalAlert?.("فشل الإرسال - حاول مرة أخرى", "danger");
  }
}

/* ================= التصدير | Exports ================= */

window.sendFeedback = sendFeedback;

export { sendFeedback };
