
// netlify/functions/send-welcome-email.js
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { 
      email, 
      displayName, 
      role, 
      schoolName, 
      principalEmail, // Pass principal's email from request
      grade, 
      subjects, 
      dashboardUrl 
    } = data;

    if (!email) {
      return respond(400, { error: 'Email required' });
    }

    const cfg = roleConfig(role, schoolName, grade);
    const rows = buildRows({ displayName, email, role, schoolName, grade, subjects });
    const html = buildWelcomeHtml(cfg, displayName, rows, dashboardUrl);

    // Format sender name dynamically: "Fairview High via Eduket OS"
    const senderName = schoolName ? `${schoolName} via Eduket OS` : 'Eduket OS';
    const fromAddress = `${senderName} <notifications@eduket.tech>`;
    
    // Set replyTo so responses go straight to the principal
    const replyToAddress = principalEmail || 'nextgenskills96@gmail.com';

    const result = await sendViaResend({
      to:      email,
      subject: `${cfg.icon} ${cfg.subtitle}`,
      html,
      from:    fromAddress,
      replyTo: replyToAddress,
    });

    return respond(200, result);
  } catch (err) {
    console.error('[Welcome Email]', err);
    return respond(200, { success: false, error: err.message });
  }
};

// ── Resend API Call with replyTo ──────────────────────────────────────────
async function sendViaResend({ to, subject, html, from: fromAddr, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { success: false, error: 'RESEND_API_KEY not set' };

  const payload = {
    from: fromAddr,
    to: [to],
    subject,
    html,
  };

  if (replyTo) {
    payload.reply_to = replyTo;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json();
  if (!res.ok) {
    console.error('[Resend Error]', json);
    return { success: false, error: json.message || res.statusText };
  }
  return { success: true, id: json.id };
}

// ── Role config ────────────────────────────────────────────────────────────
function roleConfig(role, schoolName, grade) {
  const configs = {
    principal: {
      colour:   '#7c3aed', icon: '🏫',
      subtitle: 'Your school is live on Eduket OS!',
      body:     `Your school <strong>${schoolName}</strong> has been registered. Invite teachers and students to join.`,
      btn:      'Go to Principal Dashboard',
    },
    teacher: {
      colour:   '#059669', icon: '📚',
      subtitle: 'Welcome, Teacher!',
      body:     `You have been set up as a teacher at <strong>${schoolName}</strong>. Start by uploading your first exam.`,
      btn:      'Go to Teacher Dashboard',
    },
    student: {
      colour:   '#1d4ed8', icon: '🎓',
      subtitle: 'Welcome to Eduket OS!',
      body:     `You are enrolled at <strong>${schoolName}</strong>${grade ? `, Grade ${grade}` : ''}. Your exams will appear when teachers upload them.`,
      btn:      'Go to My Exams',
    },
  };
  return configs[role] || configs.student;
}

// ── Build details rows ─────────────────────────────────────────────────────
function buildRows({ displayName, email, role, schoolName, grade, subjects }) {
  const row = (label, value) =>
    `<tr><td style="padding:7px 0;color:#6b7280;font-size:13px;width:35%">${label}</td>` +
    `<td style="padding:7px 0;font-weight:700;font-size:13px">${value}</td></tr>`;

  let rows = '';
  if (displayName) rows += row('Name',    displayName);
  if (email)       rows += row('Email',   email);
  if (role)        rows += row('Role',    role.charAt(0).toUpperCase() + role.slice(1));
  if (schoolName)  rows += row('School',  schoolName);
  if (grade)       rows += row('Grade',   grade);
  if (subjects?.length) rows += row('Subjects', subjects.join(', '));
  return rows;
}

// ── Build HTML ─────────────────────────────────────────────────────────────
function buildWelcomeHtml(cfg, name, rows, dashboard = 'https://eduket.tech') {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0"
       style="max-width:560px;background:#fff;border-radius:20px;overflow:hidden;
              box-shadow:0 4px 32px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,${cfg.colour},${cfg.colour}cc);
                 padding:36px 32px;text-align:center;">
    <p style="margin:0 0 8px;font-size:32px;">${cfg.icon}</p>
    <h1 style="margin:0;font-size:24px;font-weight:900;color:#fff;">Eduket OS</h1>
    <p style="margin:8px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">
      AI-Powered School Assessment Platform</p>
  </td></tr>
  <tr><td style="padding:32px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:${cfg.colour};
               text-transform:uppercase;letter-spacing:1px;">${cfg.subtitle}</p>
    <p style="margin:8px 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      Hi <strong>${name || 'there'}</strong>, ${cfg.body}</p>
    <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;
                border:1px solid #e2e8f0;margin-bottom:28px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#94a3b8;
                 text-transform:uppercase;letter-spacing:1px;">Your Registration Details</p>
      <table width="100%" cellpadding="0" cellspacing="0">${rows}</table>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <a href="${dashboard}"
         target="_blank";
        rel="noopener noreferrer";
           style="display:inline-block;padding:14px 36px;background:${cfg.colour};
                  color:#fff;font-size:14px;font-weight:900;text-decoration:none;
                  border-radius:12px;">${cfg.btn} &rarr;</a>
      </td></tr>
    </table>
    <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;text-align:center;">
      If you did not create this account, please ignore this email.</p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">
      &copy; 2026 Nextgen Skills &middot; Eduket OS &middot; eduket.tech</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}



// ── Resend API call ────────────────────────────────────────────────────────
async function sendViaResend({ to, subject, html, from: fromAddr }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { success: false, error: 'RESEND_API_KEY not set' };

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({ from: fromAddr, to: [to], subject, html }),
  });

  const json = await res.json();
  if (!res.ok) return { success: false, error: json.message || res.statusText };
  return { success: true, id: json.id };
}

// ── CORS headers ───────────────────────────────────────────────────────────
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}


