---

# 💼 المحاسب المبسط | Simple Accountant

نظام محاسبة مبسط وسهل الاستخدام يساعد أصحاب المشاريع الصغيرة على إدارة المبيعات والمشتريات والمنتجات بطريقة منظمة وسريعة.

A simple and lightweight accounting system designed to help small businesses manage sales, purchases, and products easily.

---

# 🚀 المميزات | Features

## 🇸🇦 المميزات العربية

* ➕ إضافة المنتجات بسهولة
* 🧾 تسجيل عمليات البيع والشراء
* 📊 حساب الأرباح بشكل تلقائي
* 💾 تخزين البيانات داخل المتصفح (IndexedDB)
* ✏️ تعديل وحذف العمليات بسهولة
* 📦 واجهة بسيطة وسهلة الاستخدام

## 🇬🇧 English Features

* ➕ Add products easily
* 🧾 Record sales and purchases
* 📊 Automatic profit calculation
* 💾 Store data locally using IndexedDB
* ✏️ Edit and delete transactions
* 📦 Simple and user-friendly interface

---

# 🖥️ صور المشروع | Screenshots

## 🏠 الصفحة الرئيسية | Dashboard

![Dashboard](screenshots/index.png)

---

# ⚙️ طريقة التشغيل | How to Run

## 🇸🇦 التشغيل

1. افتح مجلد المشروع
2. ثبّت الحزم:

```bash
npm install
````

3. شغّل المشروع:

```bash
npm run dev
```

أو استخدم:

* VS Code Live Server (في حال تشغيل نسخة static)
* أو افتح الرابط الذي يظهر في الطرفية

---

## 🇬🇧 Run Instructions

1. Open the project folder
2. Install dependencies:

```bash
npm install
```

3. Run the project:

```bash
npm run dev
```

Or use:

* VS Code Live Server (for static version)
* Or open the link shown in terminal
---

# 🧱 التقنيات المستخدمة | Tech Stack

* HTML
* CSS
* JavaScript
* IndexedDB (Local Storage)

---

# 📁 هيكلة المشروع| Project Structur
````md
📦 accounting_app
 ┣ 📁 public
 ┃ ┣ favicon.svg
 ┃ ┣ icons.svg
 ┃ ┗ landing-preview.png
 ┣ 📁 screenshots
 ┃ ┗ index.png
 ┣ 📁 src
 ┃ ┣ 📁 assets
 ┃ ┃ ┣ hero.png
 ┃ ┃ ┣ vite.svg
 ┃ ┃ ┗ vue.svg
 ┃ ┣ 📁 components
 ┃ ┃ ┗ HelloWorld.vue
 ┃ ┣ 📁 css
 ┃ ┃ ┣ landing.css
 ┃ ┃ ┗ style.css
 ┃ ┣ 📁 js
 ┃ ┃ ┣ 📁 api
 ┃ ┃ ┃ ┗ email.js
 ┃ ┃ ┣ app.js
 ┃ ┃ ┣ confirm-dialog.js
 ┃ ┃ ┣ db.js
 ┃ ┃ ┣ product-full-edit.js
 ┃ ┃ ┣ product-quick-edit.js
 ┃ ┃ ┣ products.js
 ┃ ┃ ┣ sale-full-edit.js
 ┃ ┃ ┣ transaction-full-edit.js
 ┃ ┃ ┣ transactions.js
 ┃ ┃ ┣ ui.js
 ┃ ┃ ┗ utils.js
 ┃ ┣ App.vue
 ┃ ┗ main.js
 ┣ 📁 versions
 ┃ ┣ versions.html
 ┃ ┣ 📁 css
 ┃ ┃ ┗ versions.css
 ┃ ┗ 📁 v1.0
 ┃   ┣ index.html
 ┃   ┗ style.css
 ┣ 📜 package.json
 ┣ 📜 package-lock.json
 ┣ 📜 vite.config.js
 ┣ 📜 README.md
````

---

# 👨‍💻 Developer | المطور

**alshagag**

---

# ⭐ Notes | ملاحظات

## 🇸🇦 عربي

* المشروع يعمل بدون قاعدة بيانات خارجية
* جميع البيانات محفوظة داخل المتصفح (LocalStorage / IndexedDB)
* مناسب للمشاريع الصغيرة والتجارب التعليمية

## 🇬🇧 English

* The project works without an external database
* All data is stored inside the browser (LocalStorage / IndexedDB)
* Suitable for small projects and educational purposes
