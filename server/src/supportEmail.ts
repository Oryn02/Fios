/**
 * Deliver support form messages via Resend or SendGrid when configured.
 * Returns a structured result so the route can surface clear JSON errors.
 */

export interface SupportPayload {
  message: string;
  name?: string;
  replyTo?: string;
}

export interface SupportSendResult {
  ok: boolean;
  provider?: 'resend' | 'sendgrid';
  id?: string;
  error?: string;
  /** True when no API key / inbox is configured — caller should return 503. */
  unconfigured?: boolean;
}

function supportInbox(): string {
  return (
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.VITE_SUPPORT_EMAIL?.trim() ||
    ''
  );
}

function fromAddress(): string {
  return (
    process.env.SUPPORT_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    'Fios Support Form <onboarding@resend.dev>'
  );
}

async function sendViaResend(payload: SupportPayload, to: string, apiKey: string): Promise<SupportSendResult> {
  const subject = `[Fios Support] ${payload.name?.trim() || 'Anonymous'} — ${new Date().toISOString().slice(0, 16)}`;
  const text = [
    `From: ${payload.name?.trim() || '(no name)'}`,
    `Reply-To: ${payload.replyTo?.trim() || '(none)'}`,
    '',
    payload.message.trim(),
  ].join('\n');

  const body: Record<string, unknown> = {
    from: fromAddress(),
    to: [to],
    subject,
    text,
  };
  if (payload.replyTo?.trim()) body.reply_to = payload.replyTo.trim();

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!res.ok) {
    return { ok: false, provider: 'resend', error: data?.message || `Resend HTTP ${res.status}` };
  }
  return { ok: true, provider: 'resend', id: data.id };
}

async function sendViaSendGrid(payload: SupportPayload, to: string, apiKey: string): Promise<SupportSendResult> {
  const subject = `[Fios Support] ${payload.name?.trim() || 'Anonymous'} — ${new Date().toISOString().slice(0, 16)}`;
  const text = [
    `From: ${payload.name?.trim() || '(no name)'}`,
    `Reply-To: ${payload.replyTo?.trim() || '(none)'}`,
    '',
    payload.message.trim(),
  ].join('\n');

  const from = fromAddress().includes('<')
    ? fromAddress()
    : `Fios Support Form <${fromAddress()}>`;

  // Parse "Name <email>" or bare email
  let fromEmail = from;
  let fromName = 'Fios Support Form';
  const m = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (m) {
    fromName = m[1].trim() || fromName;
    fromEmail = m[2].trim();
  }

  const personalizations: Record<string, unknown> = {
    to: [{ email: to }],
    subject,
  };
  if (payload.replyTo?.trim()) {
    personalizations.headers = { 'Reply-To': payload.replyTo.trim() };
  }

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [personalizations],
      from: { email: fromEmail, name: fromName },
      content: [{ type: 'text/plain', value: text }],
      ...(payload.replyTo?.trim()
        ? { reply_to: { email: payload.replyTo.trim() } }
        : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    return { ok: false, provider: 'sendgrid', error: errText.slice(0, 200) || `SendGrid HTTP ${res.status}` };
  }
  return { ok: true, provider: 'sendgrid' };
}

/**
 * Send a support message. Prefer Resend, then SendGrid.
 */
export async function sendSupportEmail(payload: SupportPayload): Promise<SupportSendResult> {
  const to = supportInbox();
  const resendKey = process.env.RESEND_API_KEY?.trim();
  const sendgridKey = process.env.SENDGRID_API_KEY?.trim();

  if (!to) {
    return {
      ok: false,
      unconfigured: true,
      error: 'Support inbox not configured. Set SUPPORT_EMAIL (or VITE_SUPPORT_EMAIL) on the server.',
    };
  }
  if (!resendKey && !sendgridKey) {
    return {
      ok: false,
      unconfigured: true,
      error: 'Email provider not configured. Set RESEND_API_KEY or SENDGRID_API_KEY on the server.',
    };
  }

  try {
    if (resendKey) return await sendViaResend(payload, to, resendKey);
    return await sendViaSendGrid(payload, to, sendgridKey!);
  } catch (err: any) {
    return { ok: false, error: err?.message || 'Failed to send support email' };
  }
}
