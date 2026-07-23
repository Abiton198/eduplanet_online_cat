// netlify/functions/notify-principal.js
// Sends principal alert email — no Firestore, no backend needed
const { initializeApp, getApps } = require('firebase/app');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey:            process.env.VITE_FIREBASE_API_KEY,
  authDomain:        process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.VITE_FIREBASE_APP_ID,
};

function getDb() {
  if (!getApps().length) initializeApp(firebaseConfig);
  return getFirestore();
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { schoolId, email: newEmail, displayName, role, schoolName, grade, subjects } = data;

    if (!schoolId || !newEmail) {
      return respond(400, { error: 'schoolId and email required' });
    }

    // Get principal email from Firestore
    const db          = getDb();
    const schoolSnap  = await getDoc(doc(db, 'schools', schoolId));
    if (!schoolSnap.exists()) {
      return respond(200, { success: false, reason: 'School not found' });
    }

    const principalUid = schoolSnap.data().principalUid;
    if (!principalUid) {
      return respond(200, { success: false, reason: 'No principal linked' });
    }

    const principalSnap = await getDoc(doc(db, 'users', principalUid));
    if (!principalSnap.exists()) {
      return respond(200, { success: false, reason: 'Principal not found' });
    }

    const { email: principalEmail, firstName, displayName: pName } = principalSnap.data();
    const principalName = firstName || pName || 'Principal';

    if (!principalEmail) {
      return respond(200, { success: false, reason: 'Principal has no email' });
    }

    const roleColour  = { teacher: '#059669', student: '#1d4ed8' }[role] || '#6b7280';
    const timestamp   = new Date().toUTCString();
    const subjectList = subjects?.length ? subjects.join(', ') : '';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0"
       style="max-width:580px;background:#fff;border-radius:20px;overflow:hidden;
              box-shadow:0 4px 32px rgba(0,0,0,0.08);">
  <tr><td style="background:linear-gradient(135deg,#1e293b,#334155);padding:28px 32px;text-align:center;">
    <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">Eduket OS &middot; School Alert</h1>
    <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.6);">${schoolName}</p>
  </td></tr>
  <tr><td style="background:${roleColour}18;border-bottom:3px solid ${roleColour};padding:14px 32px;">
    <p style="margin:0;font-size:14px;font-weight:700;color:${roleColour};">
      New ${role.charAt(0).toUpperCase() + role.slice(1)} joined your school</p>
    <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${timestamp}</p>
  </td></tr>
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      Hi <strong>${principalName}</strong>, a new <strong>${role}</strong>
      has registered for <strong>${schoolName}</strong>.
      Please review and approve or decline from your dashboard.</p>
    <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;
                border:1px solid #e2e8f0;margin-bottom:20px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#94a3b8;
                 text-transform:uppercase;letter-spacing:1px;">New User Details</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:7px 0;color:#6b7280;font-size:13px;width:35%">Name</td>
            <td style="padding:7px 0;font-weight:700;font-size:13px">${displayName || newEmail}</td></tr>
        <tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Email</td>
            <td style="padding:7px 0;font-weight:700;font-size:13px">${newEmail}</td></tr>
        <tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Role</td>
            <td style="padding:7px 0;font-weight:700;font-size:13px;color:${roleColour}">${role}</td></tr>
        ${grade ? `<tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Grade</td>
            <td style="padding:7px 0;font-weight:700;font-size:13px">${grade}</td></tr>` : ''}
        ${subjectList ? `<tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Subjects</td>
            <td style="padding:7px 0;font-weight:700;font-size:13px">${subjectList}</td></tr>` : ''}
      </table>
    </div>
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;
                padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400e;">
        ⚠️ Do you recognise this person?</p>
      <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;">
        If not, contact <a href="mailto:support@eduket.tech">support@eduket.tech</a> immediately.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:6px;">
        <a href="https://eduket.tech/principal-dashboard"
           style="display:block;text-align:center;padding:13px 0;background:#7c3aed;
                  color:#fff;font-size:13px;font-weight:900;text-decoration:none;
                  border-radius:10px;">Review in Dashboard &rarr;</a></td>
      <td style="padding-left:6px;">
        <a href="mailto:support@eduket.tech?subject=Unknown user: ${newEmail}"
           style="display:block;text-align:center;padding:13px 0;background:#dc2626;
                  color:#fff;font-size:13px;font-weight:900;text-decoration:none;
                  border-radius:10px;">🚨 Report Unknown User</a></td>
    </tr></table>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">
      Eduket OS &middot; eduket.tech &middot; support@eduket.tech</p>
  </td></tr>
</table></td></tr></table></body></html>`;

    const result = await sendViaResend({
      to:      principalEmail,
      subject: `New ${role.charAt(0).toUpperCase() + role.slice(1)} joined ${schoolName} — Review Required`,
      html,
      from:    'Eduket OS Alerts <onboarding@resend.dev>',
    });

    return respond(200, result);

  } catch (err) {
    console.error('[Notify Principal]', err);
    return respond(200, { success: false, error: err.message });
  }
};

async function sendViaResend({ to, subject, html, from: fromAddr }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { success: false, error: 'RESEND_API_KEY not set' };

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify({ from: fromAddr, to: [to], subject, html }),
  });

  const json = await res.json();
  if (!res.ok) return { success: false, error: json.message || res.statusText };
  return { success: true, id: json.id };
}

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