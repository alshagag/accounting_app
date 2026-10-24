import { NextResponse } from 'next/server';

const PUBLIC_KEY = process.env.VITE_EMAILJS_PUBLIC_KEY;
const SERVICE_ID = process.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = process.env.VITE_EMAILJS_TEMPLATE_ID;
const FROM_EMAIL = process.env.EMAIL_FROM || 'psp.spd@gmail.com';
const ADMIN_EMAIL = process.env.EMAIL_ADMIN || 'psp.spd@gmail.com';

function validateEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  if (!PUBLIC_KEY || !SERVICE_ID || !TEMPLATE_ID) {
    return NextResponse.json(
      {
        success: false,
        error: 'Email service is not configured. Please set VITE_EMAILJS_PUBLIC_KEY, VITE_EMAILJS_SERVICE_ID, and VITE_EMAILJS_TEMPLATE_ID.',
      },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const name = String(body.name || '').trim();
  const email = String(body.email || '').trim();
  const message = String(body.message || '').trim();
  const rating = String(body.rating || '5').trim();

  if (!name) {
    return NextResponse.json({ success: false, error: 'الاسم مطلوب.' }, { status: 400 });
  }

  if (!message) {
    return NextResponse.json({ success: false, error: 'الرسالة مطلوبة.' }, { status: 400 });
  }

  if (email && !validateEmail(email)) {
    return NextResponse.json({ success: false, error: 'يرجى إدخال بريد إلكتروني صالح.' }, { status: 400 });
  }

  const payload = {
    service_id: SERVICE_ID,
    template_id: TEMPLATE_ID,
    user_id: PUBLIC_KEY,
    template_params: {
      from_name: name,
      from_email: FROM_EMAIL,
      reply_to: email || FROM_EMAIL,
      user_email: email,
      message,
      rating,
      to_email: ADMIN_EMAIL,
    },
  };

  try {
    const origin = request.headers.get('origin') || request.headers.get('referer') || '';
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { success: false, error: `فشل الاتصال بخدمة البريد: ${response.status} ${response.statusText}`, details: text },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, message: 'تم إرسال الرسالة بنجاح.' });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'تعذر الاتصال بخدمة البريد. يرجى المحاولة لاحقًا.',
        details: err?.message || String(err),
      },
      { status: 502 }
    );
  }
}
