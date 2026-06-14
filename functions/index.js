const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const groqKey = defineSecret("GROQ_API_KEY");


const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.processBillingUpdate = functions.firestore
    .document('billing/{docId}')
    .onCreate(async (snap, context) => {
        const data = snap.data();

        // Only trigger if status is "pending" (or however you initiate)
        if (data.status !== 'pending') return null;

        const db = admin.firestore();
        const schoolRef = db.collection('schools').doc(data.schoolId);

        // Calculate next billing date
        const nextDate = new Date();
        nextDate.setMonth(nextDate.getMonth() + 1);

        try {
            // Update the school's tier based on the billing data
            await schoolRef.update({
                tier: data.tier,
                subscribedAt: admin.firestore.FieldValue.serverTimestamp(),
                nextBillingDate: nextDate.toISOString(),
            });

            // Mark billing as paid
            return snap.ref.update({ status: 'paid' });
        } catch (error) {
            console.error("Error syncing tier:", error);
            return null;
        }
    });

// ── Repair common AI JSON mistakes ────────────────────────────────────────────
function repairJson(raw) {
    let text = raw.replace(/```json|```/g, "").trim();

    // Try straight parse first
    try { return JSON.parse(text); } catch (_) { }

    // Fix 1: last object missing closing brace  ..."]  →  ..."}]
    // e.g.  "feedback": "some text."]  →  "feedback": "some text."}]
    text = text.replace(/("[\w\s.,!?'-]+")\s*\](\s*)$/, '$1}]$2');

    try { return JSON.parse(text); } catch (_) { }

    // Fix 2: trailing commas before ] or }
    text = text.replace(/,\s*([\]}])/g, '$1');

    try { return JSON.parse(text); } catch (_) { }

    // Fix 3: ensure array is closed
    const openBraces = (text.match(/\{/g) || []).length;
    const closeBraces = (text.match(/\}/g) || []).length;
    if (openBraces > closeBraces) {
        text += "}".repeat(openBraces - closeBraces);
    }
    if (!text.trimEnd().endsWith("]")) text = text.trimEnd() + "]";

    return JSON.parse(text); // throws if still broken — caught upstream
}

exports.remarkWithAI = onCall(
    {
        secrets: [groqKey],
        region: "us-central1",
        cors: true,
        invoker: "public",
    },
    async (request) => {
        const { markedResults } = request.data;

        if (!Array.isArray(markedResults) || markedResults.length === 0) {
            throw new HttpsError("invalid-argument", "markedResults array is required.");
        }

        const prompt = `You are re-marking a student exam. For each question below, decide how many marks the student earns and give brief feedback.

${markedResults.map((r, i) => `
Question ${i + 1} [${r.question_number || `Q${i + 1}`}] — ${r.marks} mark(s)
Question: ${r.question || "(no question text)"}
Correct answer: ${r.correct_answer || "Not provided"}
Student answer: ${r.student_answer || "No answer given"}
`).join("\n")}

Respond with ONLY a valid JSON array. No markdown. No explanation. No text before or after.
Each element: { "idx": <number>, "earned": <number>, "status": "correct|partial|incorrect|no_memo", "feedback": "<one sentence>" }

IMPORTANT: Make sure every object has a closing brace and the array has a closing bracket.`;

        let groqResponse;
        try {
            groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${groqKey.value()}`,
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.1,
                    max_tokens: 1500,  // bumped up — 13 questions was hitting the limit
                    messages: [
                        {
                            role: "system",
                            content: "You are an exam marking assistant. Output ONLY a valid JSON array. Never truncate your response. Always close every object with } and the array with ].",
                        },
                        { role: "user", content: prompt },
                    ],
                }),
            });
        } catch (fetchErr) {
            console.error("Groq fetch failed:", fetchErr);
            throw new HttpsError("unavailable", "Could not reach Groq API.");
        }

        if (!groqResponse.ok) {
            const errText = await groqResponse.text();
            console.error("Groq error:", errText);
            throw new HttpsError("internal", `Groq API returned ${groqResponse.status}: ${errText}`);
        }

        const data = await groqResponse.json();
        const raw = data.choices?.[0]?.message?.content || "";

        try {
            const results = repairJson(raw);
            return { results };
        } catch (parseErr) {
            console.error("JSON repair failed. Raw:", raw);
            throw new HttpsError("internal", `AI returned unparseable response: ${raw}`);
        }
    }
);