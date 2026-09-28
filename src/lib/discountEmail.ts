/**
 * Sends the generated discount code to Chris's inbox via EmailJS
 * (client-side email — no server needed).
 *
 * Chris: fill in the three values below from your EmailJS dashboard
 * (emailjs.com → create account → Add New Service (Gmail) → create an
 * Email Template). The template receives two variables: {{code}} and
 * {{date}}. Until these are filled in, the bonus page still shows the
 * code — it just won't email.
 */
import emailjs from '@emailjs/browser';

export const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY';
export const EMAILJS_SERVICE_ID = 'YOUR_SERVICE_ID';
export const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';

export function bonusEmailConfigured(): boolean {
  return (
    !EMAILJS_PUBLIC_KEY.startsWith('YOUR_') &&
    !EMAILJS_SERVICE_ID.startsWith('YOUR_') &&
    !EMAILJS_TEMPLATE_ID.startsWith('YOUR_')
  );
}

/** Fire-and-forget: the bonus page shows the code regardless. */
export async function sendDiscountEmail(code: string): Promise<boolean> {
  if (!bonusEmailConfigured()) return false;
  try {
    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      {
        code,
        date: new Date().toLocaleString('en-US', {
          timeZone: 'America/New_York',
        }),
      },
      { publicKey: EMAILJS_PUBLIC_KEY },
    );
    return true;
  } catch {
    return false;
  }
}
