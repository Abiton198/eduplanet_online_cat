// netlify/functions/notify-principal.js
// Logs activity to Firestore AND emails principal when teacher/student registers
// Uses Firebase Admin SDK for all Firestore operations

const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue }      = require('firebase-admin/firestore');

// ── Firebase Admin SDK (single instance) ──────────────────────────────────
function getAdminDb() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
    if (!raw) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT env var is not set in Netlify');
    }
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(raw);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON');
    }
    if (!serviceAccount.project_id) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT missing project_id field');
    }
    initializeApp({ credential: cert(serviceAccount) });
  }
  return getFirestore();
}

// ── Resend email via fetch (Node 18 has native fetch) ─────────────────────
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

// ── CORS ───────────────────────────────────────────────────────────────────
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
    body:    JSON.stringify(body),
  };
}

// ── Handler ────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders() };
  }

  // ── 1. Parse request body FIRST ──────────────────────────────────────────
  let data;
  try {
    data = JSON.parse(event.body || '{}');
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const {
    schoolId,
    email:       newEmail,
    displayName,
    firstName,
    role,
    schoolName,
    grade,
    subjects,
    uid,
  } = data;

  const userName = displayName || firstName || newEmail || 'New User';

  if (!schoolId || !newEmail) {
    return respond(400, { error: 'schoolId and email required' });
  }

  const db = getAdminDb();

  // ── 2. Log activity to Firestore ──────────────────────────────────────────
  try {
    await db.collection('schoolActivity').add({
      schoolId,
      schoolName:  schoolName  || '',
      type:        'user_joined',
      actorUid:    uid         || '',
      actorName:   userName,
      actorEmail:  newEmail,
      actorRole:   role        || 'student',
      grade:       grade       || '',
      subjects:    Array.isArray(subjects) ? subjects : [],
      description: `${userName} joined as ${role || 'student'}`,
      timestamp:   FieldValue.serverTimestamp(),
      read:        false,
    });
    console.log('[Notify] Activity logged for', newEmail);
  } catch (e) {
    console.error('[Notify] Activity log failed (non-fatal):', e.message);
    // Non-fatal — continue to email
  }

  // ── 3. Get principal details from Firestore ───────────────────────────────
  let principalEmail = null;
  let principalName  = 'Principal';

  try {
    const schoolSnap = await db.collection('schools').doc(schoolId).get();
    if (!schoolSnap.exists) {
      console.log('[Notify] School not found:', schoolId);
      return respond(200, { success: false, reason: 'School not found' });
    }

    const principalUid = schoolSnap.data().principalUid;
    if (!principalUid) {
      console.log('[Notify] No principalUid on school');
      return respond(200, { success: false, reason: 'No principal linked' });
    }

    // Try users collection first, fallback to principals
    let principalSnap = await db.collection('users').doc(principalUid).get();
    if (!principalSnap.exists) {
      principalSnap = await db.collection('principals').doc(principalUid).get();
    }

    if (!principalSnap.exists) {
      console.log('[Notify] Principal doc not found:', principalUid);
      return respond(200, { success: false, reason: 'Principal not found' });
    }

    const pd = principalSnap.data();
    principalEmail = pd.email || '';
    principalName  = pd.firstName || pd.displayName || 'Principal';

    if (!principalEmail) {
      console.log('[Notify] Principal has no email');
      return respond(200, { success: false, reason: 'Principal has no email' });
    }

  } catch (e) {
    console.error('[Notify] Firestore read failed:', e.message);
    return respond(200, { success: false, error: e.message });
  }

  // ── 4. Build and send email ───────────────────────────────────────────────
  const roleColour  = { teacher: '#059669', student: '#1d4ed8' }[role] || '#6b7280';
  const timestamp   = new Date().toUTCString();
  const subjectList = Array.isArray(subjects) && subjects.length
    ? subjects.join(', ')
    : '';

  const detailRows = `
    <tr><td style="padding:7px 0;color:#6b7280;font-size:13px;width:35%">Name</td>
        <td style="padding:7px 0;font-weight:700;font-size:13px">${userName}</td></tr>
    <tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Email</td>
        <td style="padding:7px 0;font-weight:700;font-size:13px">${newEmail}</td></tr>
    <tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Role</td>
        <td style="padding:7px 0;font-weight:700;font-size:13px;
                   text-transform:capitalize;color:${roleColour}">${role || 'student'}</td></tr>
    ${grade ? `<tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Grade</td>
        <td style="padding:7px 0;font-weight:700;font-size:13px">${grade}</td></tr>` : ''}
    ${subjectList ? `<tr><td style="padding:7px 0;color:#6b7280;font-size:13px">Subjects</td>
        <td style="padding:7px 0;font-weight:700;font-size:13px">${subjectList}</td></tr>` : ''}
  `;

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0"
       style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0"
       style="max-width:580px;background:#fff;border-radius:20px;overflow:hidden;
              box-shadow:0 4px 32px rgba(0,0,0,0.08);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#1e293b,#334155);
                 padding:28px 32px;text-align:center;">
    <h1 style="margin:0;font-size:22px;font-weight:900;color:#fff;">
      Eduket OS &middot; School Alert
    </h1>
    <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.6);">
      ${schoolName || 'Your School'}
    </p>
  </td></tr>

  <!-- Alert strip -->
  <tr><td style="background:${roleColour}18;border-bottom:3px solid ${roleColour};
                 padding:14px 32px;">
    <p style="margin:0;font-size:14px;font-weight:700;color:${roleColour};">
      New ${(role || 'user').charAt(0).toUpperCase() + (role || 'user').slice(1)} joined your school
    </p>
    <p style="margin:4px 0 0;font-size:12px;color:#6b7280;">${timestamp}</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:28px 32px;">
    <p style="margin:0 0 20px;font-size:14px;color:#374151;line-height:1.7;">
      Hi <strong>${principalName}</strong>, a new <strong>${role || 'user'}</strong>
      has registered for <strong>${schoolName || 'your school'}</strong>.
      Please review and approve or decline their access from your dashboard.
    </p>

    <!-- Details table -->
    <div style="background:#f8fafc;border-radius:12px;padding:16px 20px;
                border:1px solid #e2e8f0;margin-bottom:20px;">
      <p style="margin:0 0 10px;font-size:10px;font-weight:700;color:#94a3b8;
                 text-transform:uppercase;letter-spacing:1px;">New User Details</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${detailRows}
      </table>
    </div>

    <!-- Warning -->
    <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;
                padding:14px 18px;margin-bottom:24px;">
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#92400e;">
        &#9888;&#65039; Do you recognise this person?
      </p>
      <p style="margin:0;font-size:12px;color:#92400e;line-height:1.6;">
        If you do not recognise <strong>${userName} (${newEmail})</strong>
        as a member of ${schoolName || 'your school'}, contact Eduket OS support immediately.
      </p>
    </div>

    <!-- Buttons -->
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:6px;">
        <a href="https://eduket.tech/principal-dashboard"
           style="display:block;text-align:center;padding:13px 0;background:#7c3aed;
                  color:#fff;font-size:13px;font-weight:900;text-decoration:none;
                  border-radius:10px;">
          Review in Dashboard &rarr;
        </a>
      </td>
      <td style="padding-left:6px;">
        <a href="mailto:support@eduket.tech?subject=Unknown user: ${newEmail}&body=School: ${schoolName}%0AUser: ${userName} (${newEmail})"
           style="display:block;text-align:center;padding:13px 0;background:#dc2626;
                  color:#fff;font-size:13px;font-weight:900;text-decoration:none;
                  border-radius:10px;">
          &#128680; Report Unknown User
        </a>
      </td>
    </tr></table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;
                 text-align:center;">
    <p style="margin:0;font-size:11px;color:#94a3b8;">
      Eduket OS &middot; eduket.tech &middot; support@eduket.tech
    </p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const result = await sendViaResend({
    to:      principalEmail,
    subject: `New ${(role || 'user').charAt(0).toUpperCase() + (role || 'user').slice(1)} joined ${schoolName || 'your school'} — Review Required`,
    html,
    from:    'Eduket OS Alerts <onboarding@resend.dev>',
  });

  console.log(`[Notify] Email ${result.success ? 'sent' : 'failed'} to ${principalEmail}`);
  return respond(200, { success: result.success, id: result.id });
};