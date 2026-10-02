// Cloudflare Worker entry: serves the static site, plus the contact-form API.
//
// Non-API requests fall through to the static assets (same behavior as the
// dashboard-managed assets-only setup). POST /api/contact sends the inquiry
// to chris@graywebsolutions.com via Resend.

interface Env {
  ASSETS: Fetcher;
  RESEND_API_KEY?: string;
  CONTACT_TO?: string;
  CONTACT_FROM?: string;
}

interface ContactPayload {
  name?: string;
  email?: string;
  phone?: string;
  hasSite?: string;
  siteUrl?: string;
  comments?: string;
  discountLine?: string;
  /** Honeypot — real users leave this empty. */
  company?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function handleContact(request: Request, env: Env): Promise<Response> {
  if (!env.RESEND_API_KEY) {
    return json({ ok: false, error: 'Email service is not configured yet.' }, 503);
  }

  let payload: ContactPayload;
  try {
    payload = (await request.json()) as ContactPayload;
  } catch {
    return json({ ok: false, error: 'Invalid request body.' }, 400);
  }

  // Honeypot: bots fill this in, humans never see it.
  if (payload.company) {
    return json({ ok: true });
  }

  const name = (payload.name ?? '').trim();
  const email = (payload.email ?? '').trim();
  const phone = (payload.phone ?? '').trim();
  const hasSite = payload.hasSite === 'yes';
  const siteUrl = (payload.siteUrl ?? '').trim();
  const comments = (payload.comments ?? '').trim();
  const discountLine = (payload.discountLine ?? '').trim() || 'Discount code: —';

  if (!name || !EMAIL_RE.test(email) || !comments) {
    return json({ ok: false, error: 'Please fill in your name, a valid email, and your project details.' }, 400);
  }

  const to = env.CONTACT_TO || 'chris@graywebsolutions.com';
  const from = env.CONTACT_FROM || 'website@graywebsolutions.com';

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone || '—'}`,
    `Existing site: ${hasSite ? `Yes — ${siteUrl || '—'}` : 'No'}`,
    discountLine,
    '',
    comments,
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Gray Solutions <${from}>`,
      to: [to],
      reply_to: email,
      subject: `Website inquiry from ${name}`,
      text,
    }),
  });

  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.stringify(await res.json());
    } catch {
      detail = await res.text();
    }
    console.error('Resend error:', res.status, detail);
    return json({ ok: false, error: 'Something went wrong sending your message. Please try again.' }, 502);
  }

  return json({ ok: true });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') {
      if (request.method !== 'POST') {
        return json({ ok: false, error: 'Method not allowed.' }, 405);
      }
      return handleContact(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
