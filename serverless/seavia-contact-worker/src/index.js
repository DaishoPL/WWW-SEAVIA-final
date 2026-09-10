const rateLimit = new Map();

const allowedOrigins = new Set([
  'https://www.seaviamarine.com',
  'https://seaviamarine.com'
]);

function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin'
  };

  if (allowedOrigins.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }

  return headers;
}

function respond(status, message, origin, success = false) {
  return new Response(JSON.stringify({ success, message }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      ...corsHeaders(origin)
    }
  });
}

function getClientIp(request) {
  return request.headers.get('CF-Connecting-IP') || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const recent = (rateLimit.get(ip) || []).filter((timestamp) => now - timestamp < windowMs);

  if (recent.length >= 5) {
    rateLimit.set(ip, recent);
    return true;
  }

  recent.push(now);
  rateLimit.set(ip, recent);
  return false;
}

function clean(value) {
  return String(value || '').trim().replace(/[\r\n]+/g, ' ');
}

function jsonHeaders(origin) {
  return {
    'Content-Type': 'application/json; charset=UTF-8',
    ...corsHeaders(origin)
  };
}

async function sendResendEmail(env, payload) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    console.error('Resend API error', response.status, await response.text());
    return false;
  }

  return true;
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST' || new URL(request.url).pathname !== '/recruitment') {
      return respond(405, 'Invalid request method.', origin);
    }

    if (!allowedOrigins.has(origin)) {
      return respond(403, 'Origin not allowed.', origin);
    }

    if (!env.RESEND_API_KEY || !env.RECIPIENT_EMAIL) {
      console.error('Missing required Worker secrets.');
      return respond(500, 'The application could not be sent. Please try again later.', origin);
    }

    if (isRateLimited(getClientIp(request))) {
      return respond(429, 'Too many requests. Please try again later.', origin);
    }

    const formData = await request.formData();
    if (clean(formData.get('website')) !== '') {
      return respond(400, 'Invalid request.', origin);
    }

    if (formData.get('notRobot') === null) {
      return respond(422, 'Please confirm that the information is correct.', origin);
    }

    const captchaFirst = Number(formData.get('captchaFirst'));
    const captchaSecond = Number(formData.get('captchaSecond'));
    const captchaAnswer = Number(formData.get('captchaAnswer'));
    if (!Number.isInteger(captchaFirst) || !Number.isInteger(captchaSecond)
      || !Number.isInteger(captchaAnswer) || captchaFirst < 2 || captchaFirst > 9
      || captchaSecond < 2 || captchaSecond > 9 || captchaAnswer !== captchaFirst + captchaSecond) {
      return respond(422, 'Please solve the security check correctly.', origin);
    }

    const firstName = clean(formData.get('firstName'));
    const lastName = clean(formData.get('lastName'));
    const phone = clean(formData.get('phone'));
    const email = clean(formData.get('email'));
    const about = String(formData.get('about') || '').trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!firstName || !lastName || !phone || !about || !emailPattern.test(email)) {
      return respond(422, 'Please complete all required fields with valid information.', origin);
    }

    const attachments = [];
    const cvFile = formData.get('cvFile');
    if (cvFile && typeof cvFile !== 'string' && cvFile.size > 0) {
      if (cvFile.size > 5 * 1024 * 1024) {
        return respond(422, 'The CV file must be smaller than 5 MB.', origin);
      }

      const filename = cvFile.name.replace(/[^A-Za-z0-9._-]/g, '_');
      const extension = filename.split('.').pop().toLowerCase();
      const allowedExtensions = new Set(['pdf', 'doc', 'docx']);
      if (!allowedExtensions.has(extension)) {
        return respond(422, 'The CV must be a PDF, DOC, or DOCX file.', origin);
      }

      const bytes = new Uint8Array(await cvFile.arrayBuffer());
      let binary = '';
      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }
      attachments.push({ filename, content: btoa(binary) });
    }

    const body = [
      `First name: ${firstName}`,
      `Last name: ${lastName}`,
      `Phone: ${phone}`,
      `Email: ${email}`,
      '',
      'About the applicant:',
      about
    ].join('\n');

    const sent = await sendResendEmail(env, {
      from: env.FROM_EMAIL || 'SEAVIA <rekrutacja@seaviamarine.com>',
      to: [env.RECIPIENT_EMAIL],
      reply_to: email,
      subject: 'Nowa aplikacja rekrutacyjna - SEAVIA',
      text: body,
      attachments
    });

    if (!sent) {
      return respond(500, 'The application could not be sent. Please try again later.', origin);
    }

    return new Response(JSON.stringify({ success: true, message: 'Your application has been sent.' }), {
      status: 200,
      headers: jsonHeaders(origin)
    });
  }
};