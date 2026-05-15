const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");

const groqKey = defineSecret("GROQ_API_KEY");

exports.remarkWithAI = onCall(
    {
        secrets: [groqKey],
        region: "us-central1",
        cors: true,         // ← explicitly allow all origins (fixes the CORS block)
        invoker: "public",  // ← allow calls from your app without extra IAM setup
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

Respond with ONLY a JSON array (no markdown fences, no preamble) of objects:
[{ "idx": 0, "earned": <number>, "status": "correct|partial|incorrect|no_memo", "feedback": "<one sentence>" }, ...]

Rules:
- earned must be between 0 and the question's total marks (inclusive, decimals allowed)
- status must be exactly one of: correct, partial, incorrect, no_memo
- no_memo means the student shows understanding but did not use required memorandum phrasing
- Return ONLY the JSON array, nothing else`;

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
                    max_tokens: 1000,
                    messages: [
                        {
                            role: "system",
                            content: "You are an exam marking assistant. You always respond with valid JSON only — no explanation, no markdown, no preamble.",
                        },
                        {
                            role: "user",
                            content: prompt,
                        },
                    ],
                }),
            });
        } catch (fetchErr) {
            console.error("Groq fetch failed:", fetchErr);
            throw new HttpsError("unavailable", "Could not reach Groq API. Check network or API key.");
        }

        if (!groqResponse.ok) {
            const errText = await groqResponse.text();
            console.error("Groq error response:", errText);
            throw new HttpsError("internal", `Groq API returned ${groqResponse.status}: ${errText}`);
        }

        const data = await groqResponse.json();
        const text = data.choices?.[0]?.message?.content || "";
        const clean = text.replace(/```json|```/g, "").trim();

        try {
            const results = JSON.parse(clean);
            return { results };
        } catch (parseErr) {
            console.error("JSON parse failed. Raw response:", clean);
            throw new HttpsError("internal", `AI returned unparseable response: ${clean}`);
        }
    }
);