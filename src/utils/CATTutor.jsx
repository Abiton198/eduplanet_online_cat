import { useState, useRef, useEffect, useCallback } from "react";
import { useStudentId } from "./StudentId";
import { doc, onSnapshot } from "firebase/firestore";

const API_BASE = "https://chatbot-backend-educat.onrender.com";

// ─── Performance context helper ───────────────────────────────────────────────
function getPerformanceContext(subject, examHistory = {}) {
  const h = examHistory[subject];
  if (!h) {
    return {
      type: "new",
      badgeLabel: "No exams yet",
      greeting: `Looks like you haven't taken a ${subject} exam yet — no worries! Let's build a strong foundation together. What would you like to start with?`,
      systemNote: `The student has no recorded ${subject} exam history yet. Encourage them warmly and help them explore foundational topics.`,
    };
  }
  if (h.lastScore >= 70) {
    return {
      type: "good",
      badgeLabel: `${h.lastScore}% last exam ↑`,
      greeting: `Great work on your last ${subject} test — you scored ${h.lastScore}%! 🎉 Let's keep that momentum going. Want to go deeper on ${h.topic}, or explore something new?`,
      systemNote: `The student scored ${h.lastScore}% in their last ${subject} exam on "${h.topic}". They are performing well. Challenge them with harder questions and stretch their understanding beyond the basics.`,
    };
  }
  return {
    type: "improve",
    badgeLabel: `${h.lastScore}% — let's improve`,
    greeting: `Your last ${subject} exam was ${h.lastScore}% — you can definitely push that higher! I noticed ${h.topic} was a tricky area. Want to work through it together, step by step?`,
    systemNote: `The student scored ${h.lastScore}% in their last ${subject} exam on "${h.topic}". They are struggling. Use extra scaffolding, simpler explanations, encouragement, and step-by-step breakdowns.`,
  };
}

// ─── Build system prompt per subject + performance ────────────────────────────
function buildSystemPrompt(subject, studentName, examHistory = {}) {
  const subj = subjects[subject] || subjects.CAT;
  const ctx = getPerformanceContext(subject, examHistory);
  return `You are Eduket, a warm, intelligent AI tutor for South African high school students.
Subject focus: ${subj.label} (${subject}).
Key topics in this subject: ${subj.topics.join(", ")}.
Student name: ${studentName}.
${ctx.systemNote}

Your teaching style:
- Use the Socratic method — ask guiding questions rather than just giving answers outright.
- Use examples relevant to South African learners and everyday life where possible.
- Break complex ideas into clear numbered steps.
- After explaining, always ask a follow-up question to check understanding or challenge the student.
- If a student seems to struggle, encourage them warmly and simplify further.
- Keep responses concise — ideally 3–6 sentences or 4–6 bullet points. Avoid walls of text.
- End every response with either a follow-up question or a short practice challenge.
- If asked something outside ${subject}, politely redirect: "That falls outside ${subject} — let's stay focused. Try asking me about ${subj.topics[0]} or ${subj.topics[1]}!"
- Never make up facts. If unsure, say so and guide the student to verify.`;
}

// ─── Parse AI response into structured blocks ─────────────────────────────────
function parseResponse(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const blocks = [];
  let currentList = null;
  let listType = null;

  const flushList = () => {
    if (currentList?.length) {
      blocks.push({ type: listType, items: [...currentList] });
      currentList = null;
      listType = null;
    }
  };

  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) { flushList(); return; }
    if (/^\*\*(.+)\*\*$/.test(line)) {
      flushList();
      blocks.push({ type: "heading", text: line.replace(/\*\*/g, "") });
      return;
    }
    if (/^\d+\.\s/.test(line)) {
      if (listType !== "numbered") { flushList(); currentList = []; listType = "numbered"; }
      currentList.push(line.replace(/^\d+\.\s/, "").replace(/\*\*/g, ""));
      return;
    }
    if (/^[-*•]\s/.test(line)) {
      if (listType !== "bullet") { flushList(); currentList = []; listType = "bullet"; }
      currentList.push(line.replace(/^[-*•]\s/, "").replace(/\*\*/g, ""));
      return;
    }
    flushList();
    const cleaned = line.replace(/\*\*(.+?)\*\*/g, "$1");
    if (cleaned) blocks.push({ type: "paragraph", text: cleaned });
  });

  flushList();
  return blocks;
}

// ─── Render a single parsed block ─────────────────────────────────────────────
function ResponseBlock({ block, isDark }) {
  const textColor = isDark ? "#e2e8f0" : "#374151";
  const headColor = isDark ? "#a5b4fc" : "#4338ca";
  const bulletCol = isDark ? "#818cf8" : "#6366f1";
  const numCol = isDark ? "#a78bfa" : "#7c3aed";

  if (block.type === "heading") {
    return (
      <p style={{ fontWeight: 800, fontSize: 14, color: headColor, marginTop: 12, marginBottom: 4, letterSpacing: "-.2px" }}>
        {block.text}
      </p>
    );
  }
  if (block.type === "bullet") {
    return (
      <ul style={{ margin: "6px 0", paddingLeft: 0, listStyle: "none" }}>
        {block.items.map((item, i) => (
          <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5, fontSize: 13.5, color: textColor, lineHeight: 1.6 }}>
            <span style={{ color: bulletCol, fontWeight: 900, fontSize: 16, lineHeight: "20px", flexShrink: 0 }}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }
  if (block.type === "numbered") {
    return (
      <ol style={{ margin: "6px 0", paddingLeft: 0, listStyle: "none" }}>
        {block.items.map((item, i) => (
          <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 5, fontSize: 13.5, color: textColor, lineHeight: 1.6 }}>
            <span style={{ color: numCol, fontWeight: 800, fontSize: 13, minWidth: 20, flexShrink: 0 }}>{i + 1}.</span>
            <span>{item}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <p style={{ fontSize: 13.5, color: textColor, lineHeight: 1.7, margin: "4px 0" }}>
      {block.text}
    </p>
  );
}

// ─── Quick-reply chips ────────────────────────────────────────────────────────
function QuickReplies({ replies, onSelect, isDark }) {
  if (!replies?.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
      {replies.map((r) => (
        <button
          key={r}
          onClick={() => onSelect(r)}
          style={{
            fontSize: 11, fontWeight: 700, padding: "5px 11px", borderRadius: 20,
            border: isDark ? "1px solid #334155" : "1px solid #e0e7ff",
            background: isDark ? "#1e293b" : "#fff",
            color: isDark ? "#818cf8" : "#6366f1",
            cursor: "pointer", transition: "all .15s",
          }}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ─── Assistant message bubble ──────────────────────────────────────────────────
function AssistantMessage({ msg, isDark, activeMsg, onSpeak, onStop, onPauseResume, paused, onQuickReply }) {
  const blocks = parseResponse(msg.text);
  const isActive = activeMsg === msg.id;
  const bg = isDark ? "#1e293b" : "#fff";
  const border = isDark ? "1px solid #334155" : "1px solid #e5e7eb";

  return (
    <div style={{ background: bg, border, borderRadius: "18px 18px 18px 4px", padding: "14px 18px", boxShadow: "0 1px 8px rgba(0,0,0,.06)", maxWidth: "85%" }}>
      {blocks.map((block, i) => <ResponseBlock key={i} block={block} isDark={isDark} />)}

      {msg.quickReplies?.length > 0 && (
        <QuickReplies replies={msg.quickReplies} onSelect={onQuickReply} isDark={isDark} />
      )}

      {/* TTS controls */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 10, borderTop: isDark ? "1px solid #334155" : "1px solid #f3f4f6", flexWrap: "wrap" }}>
        <button
          onClick={() => isActive ? onStop() : onSpeak(msg.text, msg.id)}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: .6, padding: "5px 12px", borderRadius: 8,
            border: "none", cursor: "pointer", transition: "all .15s",
            background: isActive ? "#fee2e2" : "#eef2ff",
            color: isActive ? "#dc2626" : "#6366f1",
          }}
        >
          {isActive ? "⏹ Stop" : "🔈 Read"}
        </button>
        {isActive && (
          <button
            onClick={onPauseResume}
            style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: .6, padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer", background: "#fef9c3", color: "#92400e" }}
          >
            {paused ? "▶ Resume" : "⏸ Pause"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────
function TypingIndicator({ isDark }) {
  const bg = isDark ? "#1e293b" : "#fff";
  const border = isDark ? "1px solid #334155" : "1px solid #e5e7eb";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 10, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>🤖</div>
      <div style={{ background: bg, border, borderRadius: "18px 18px 18px 4px", padding: "14px 18px", boxShadow: "0 1px 8px rgba(0,0,0,.06)" }}>
        <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
          {[0, 1, 2].map((d) => (
            <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "#a5b4fc", animation: "bounce .8s infinite", animationDelay: `${d * .15}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export default function CATTutor() {
  const STUDENT_ID = useStudentId();

  // ── Student profile (fetched from backend) ─────────────────────────────────
  // Expected API shape: { name, enrolledSubjects: ["CAT","Maths",...], examHistory: { CAT: { lastScore, topic, trend } } }
  const [studentProfile, setStudentProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currentSubject, setCurrentSubject] = useState(null);

  // ── Chat ───────────────────────────────────────────────────────────────────
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [agentStatus, setAgentStatus] = useState("");

  // ── TTS ────────────────────────────────────────────────────────────────────
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [activeMsg, setActiveMsg] = useState(null);
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState("md");
  const [showResetModal, setShowResetModal] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [welcomeSubject, setWelcomeSubject] = useState(null);

  const utteranceRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const [subjects, setSubjects] = useState([]);
  const [student, setStudent] = useState(null);

  //   fetch student profile
  useEffect(() => {

    if (!user?.uid) return;

    const unsub = onSnapshot(
      doc(db, "students", user.uid),
      (snap) => {

        if (!snap.exists()) return;

        const data = snap.data();

        setStudent(data);

        setSubjects(data.subjects || []);

      }
    );

    return unsub;

  }, [user]);

  // ── Load student profile ───────────────────────────────────────────────────
  useEffect(() => {
    if (!STUDENT_ID) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/student-profile?student_id=${encodeURIComponent(STUDENT_ID)}`);
        const data = await res.json();
        setStudentProfile(data);
        const first = data.enrolledSubjects?.[0] || "CAT";
        setCurrentSubject(first);
        setWelcomeSubject(first);
      } catch {
        // Graceful fallback — treat as new CAT student with all subjects available
        const fallback = {
          name: STUDENT_ID,
          enrolledSubjects: Object.keys(SUBJECTS),
          examHistory: {},
        };
        setStudentProfile(fallback);
        setCurrentSubject("CAT");
        setWelcomeSubject("CAT");
      } finally {
        setProfileLoading(false);
      }
    })();
  }, [STUDENT_ID]);

  // ── Voices ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = () => { const v = window.speechSynthesis.getVoices(); if (v.length) setVoices(v); };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Fullscreen ────────────────────────────────────────────────────────────
  const enterFullscreen = useCallback(() => {
    const el = containerRef.current || document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen();
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    setIsFullscreen(true);
  }, []);

  const exitFullscreen = useCallback(() => {
    if (document.exitFullscreen) document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    setIsFullscreen(false);
  }, []);

  useEffect(() => {
    const h = () => { if (!document.fullscreenElement && !document.webkitFullscreenElement) setIsFullscreen(false); };
    document.addEventListener("fullscreenchange", h);
    document.addEventListener("webkitfullscreenchange", h);
    return () => { document.removeEventListener("fullscreenchange", h); document.removeEventListener("webkitfullscreenchange", h); };
  }, []);

  useEffect(() => {
    const h = (e) => { if (e.key === "Escape" && isFullscreen) exitFullscreen(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isFullscreen, exitFullscreen]);

  // ── Auto-resize textarea ───────────────────────────────────────────────────
  const autoResize = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

  // ── TTS helpers ───────────────────────────────────────────────────────────
  const speak = (text, id) => {
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = pitch;
    if (selectedVoice) utter.voice = selectedVoice;
    utter.onend = () => { setPaused(false); setActiveMsg(null); };
    utter.onerror = () => { setPaused(false); setActiveMsg(null); };
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
    setPaused(false);
    setActiveMsg(id);
  };

  const pauseResume = () => {
    if (paused) { window.speechSynthesis.resume(); setPaused(false); }
    else { window.speechSynthesis.pause(); setPaused(true); }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setPaused(false);
    setActiveMsg(null);
  };

  // ── Start session from welcome ─────────────────────────────────────────────
  const startSession = useCallback(() => {
    const subject = welcomeSubject || currentSubject || "CAT";
    setCurrentSubject(subject);
    setShowWelcome(false);

    const ctx = getPerformanceContext(subject, studentProfile?.examHistory || {});
    const subjectData = subjects[subject] || subjects.CAT;
    const quickReplies = (subjectData.suggest || []).slice(0, 3);

    const greeting = `Hi ${studentProfile?.name || STUDENT_ID}! 👋\n\n${ctx.greeting}\n\nHere are some ideas to get started — or just type your own question below!`;
    setMessages([{ role: "assistant", text: greeting, id: Date.now(), quickReplies }]);
  }, [welcomeSubject, currentSubject, studentProfile, STUDENT_ID]);

  // ── Switch subject mid-chat ────────────────────────────────────────────────
  const switchSubject = useCallback((subject) => {
    setCurrentSubject(subject);
    stopSpeaking();
    const ctx = getPerformanceContext(subject, studentProfile?.examHistory || {});
    const subjectData = subjects[subject] || subjects.CAT;
    const quickReplies = (subjectData.suggest || []).slice(0, 3);
    setMessages((m) => [...m, {
      role: "assistant",
      text: `Switched to **${subject}** — ${subjectData?.label}.\n\n${ctx.greeting}`,
      id: Date.now(),
      quickReplies,
    }]);
  }, [studentProfile]);

  // ── Ask ────────────────────────────────────────────────────────────────────
  const ask = useCallback(async (q_override) => {
    const q = (q_override ?? question).trim();
    if (!q || loading) return;

    setQuestion("");
    if (inputRef.current) inputRef.current.style.height = "auto";
    setMessages((m) => [...m, { role: "user", text: q, id: Date.now() }]);
    setLoading(true);
    setAgentStatus("🤔 Thinking…");
    stopSpeaking();

    const subject = currentSubject || "CAT";
    const systemPrompt = buildSystemPrompt(subject, studentProfile?.name || STUDENT_ID, studentProfile?.examHistory || {});

    try {
      const res = await fetch(`${API_BASE}/agent-chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: STUDENT_ID,
          message: q,
          system: systemPrompt,
          history: messages.slice(-12).map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.text,
          })),
          learningProfile: {
            subjects: studentProfile?.enrolledSubjects || [subject],
            currentSubject: subject,
            examHistory: studentProfile?.examHistory || {},
          },
        }),
      });
      const data = await res.json();
      const replyText = data.response ?? data.answer ?? "No response returned.";
      setMessages((m) => [...m, { role: "assistant", text: replyText, id: Date.now(), quickReplies: [] }]);
    } catch {
      setMessages((m) => [...m, {
        role: "assistant",
        text: "⚠️ Could not reach the tutor. Check your connection and try again.",
        id: Date.now(),
        quickReplies: [],
      }]);
    } finally {
      setLoading(false);
      setAgentStatus("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [question, loading, messages, currentSubject, studentProfile, STUDENT_ID]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const clearServerHistory = async () => {
    try {
      await fetch(`${API_BASE}/clear-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: STUDENT_ID }),
      });
    } catch (_) { }
  };

  const resetChat = async () => {
    stopSpeaking();
    setMessages([]);
    setQuestion("");
    setShowResetModal(false);
    setShowWelcome(true);
    if (isFullscreen) exitFullscreen();
    await clearServerHistory();
  };

  // ── Key handler ────────────────────────────────────────────────────────────
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
  };

  const fontScale = { sm: 12, md: 14, lg: 16 }[fontSize];
  const dark = isDark || isFullscreen;

  // ── Performance badge style ────────────────────────────────────────────────
  const perfBadgeStyle = (type) => {
    if (type === "good") return { background: "#dcfce7", color: "#166534" };
    if (type === "improve") return { background: "#fef9c3", color: "#854d0e" };
    return { background: "#eef2ff", color: "#4338ca" };
  };

  // ─── Welcome Modal ──────────────────────────────────────────────────────────
  const WelcomeModal = () => {
    if (!showWelcome || profileLoading) return null;
    const subject = welcomeSubject || "CAT";
    const ctx = getPerformanceContext(subject, studentProfile?.examHistory || {});
    const enrolledSubjects = studentProfile?.enrolledSubjects || Object.keys(subjects);
    const badge = perfBadgeStyle(ctx.type);
    const icon = ctx.type === "good" ? "🏆" : ctx.type === "improve" ? "📈" : "🎓";

    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.55)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: dark ? "#1e293b" : "#fff",
            borderRadius: 24, padding: "32px 28px", maxWidth: 420, width: "100%",
            textAlign: "center", boxShadow: "0 24px 64px rgba(0,0,0,.25)",
            border: dark ? "1px solid #334155" : "1px solid #e5e7eb",
          }}
        >
          <div style={{ width: 64, height: 64, borderRadius: 20, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30, margin: "0 auto 16px" }}>🤖</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: dark ? "#e2e8f0" : "#1a1a2e", marginBottom: 4, letterSpacing: "-.4px" }}>
            Hi, {studentProfile?.name || STUDENT_ID}! 👋
          </h2>
          <p style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".15em", color: dark ? "#475569" : "#9ca3af", marginBottom: 16 }}>
            Eduket AI Tutor
          </p>

          {/* Performance badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, marginBottom: 16, fontSize: 12, fontWeight: 700, ...badge }}>
            {icon} {ctx.badgeLabel}
          </div>

          <p style={{ fontSize: 14, color: dark ? "#94a3b8" : "#4b5563", lineHeight: 1.7, marginBottom: 20 }}>
            {ctx.greeting}
          </p>

          <label style={{ display: "block", textAlign: "left", fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".12em", color: dark ? "#64748b" : "#9ca3af", marginBottom: 6 }}>
            Choose your subject
          </label>
          <select
            value={welcomeSubject || ""}
            onChange={(e) => setWelcomeSubject(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, marginBottom: 20, border: dark ? "1px solid #334155" : "1px solid #d1d5db", background: dark ? "#0f172a" : "#f9fafb", color: dark ? "#e2e8f0" : "#374151", fontSize: 14, fontFamily: "inherit" }}
          >
            {enrolledSubjects.map((s) => (
              <option key={s} value={s}>{s} – {SUBJECTS[s]?.label || s}</option>
            ))}
          </select>

          <button
            onClick={startSession}
            style={{ width: "100%", padding: "13px", borderRadius: 12, border: "none", background: "#6366f1", color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer", letterSpacing: "-.2px" }}
          >
            Start Learning →
          </button>
        </div>
      </div>
    );
  };

  // ─── Reset Modal ────────────────────────────────────────────────────────────
  const ResetModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: dark ? "#1e293b" : "#fff", borderRadius: 20, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: dark ? "#e2e8f0" : "#1a1a2e", marginBottom: 8 }}>Clear Chat?</div>
        <div style={{ fontSize: 14, color: dark ? "#64748b" : "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
          This removes all <b>{messages.length}</b> messages and clears the tutor's memory for this session.
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => setShowResetModal(false)} style={{ padding: "10px 24px", borderRadius: 10, border: dark ? "1px solid #334155" : "1.5px solid #e5e7eb", background: dark ? "#0f172a" : "#f9fafb", color: dark ? "#94a3b8" : "#374151", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={resetChat} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            🗑 Clear All
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Voice Panel ─────────────────────────────────────────────────────────
  const VoicePanel = () => (
    <div style={{ background: dark ? "#1e293b" : "#fff", border: dark ? "1px solid #334155" : "1px solid #e5e7eb", borderRadius: 14, padding: 16, marginBottom: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
        {[["Speed", rate, setRate, "#6366f1"], ["Pitch", pitch, setPitch, "#a855f7"]].map(([label, val, set, col]) => (
          <div key={label}>
            <label style={{ fontSize: 10, fontWeight: 800, color: dark ? "#64748b" : "#9ca3af", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
              {label}: {val.toFixed(1)}{label === "Speed" ? "x" : ""}
            </label>
            <input type="range" min="0.5" max="2" step="0.1" value={val} onChange={(e) => set(parseFloat(e.target.value))} style={{ width: "100%", accentColor: col }} />
          </div>
        ))}
      </div>
      <label style={{ fontSize: 10, fontWeight: 800, color: dark ? "#64748b" : "#9ca3af", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Voice</label>
      <select value={selectedVoice?.name ?? ""} onChange={(e) => setSelectedVoice(voices.find((v) => v.name === e.target.value) || null)} style={{ width: "100%", fontSize: 12, padding: "7px 10px", borderRadius: 8, border: dark ? "1px solid #334155" : "1px solid #d1d5db", background: dark ? "#0f172a" : "#f9fafb", color: dark ? "#e2e8f0" : "#374151" }}>
        <option value="">🎙️ Default Voice</option>
        {voices.map((v) => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
      </select>
    </div>
  );

  // ─── Subject Switcher Bar ─────────────────────────────────────────────────
  const SubjectBar = () => {
    const enrolled = subjects;
    if (enrolled.length <= 1) return null;
    return (
      <div style={{ display: "flex", gap: 6, padding: "8px 16px", overflowX: "auto", borderBottom: dark ? "1px solid #1e293b" : "1px solid #f3f4f6", background: dark ? "#0f172a" : "#fafafa", flexShrink: 0 }}>
        {enrolled.map((s) => {
          const isActive = s === currentSubject;
          const ctx = getPerformanceContext(s, studentProfile?.examHistory || {});
          return (
            <button key={s} onClick={() => !isActive && switchSubject(s)} style={{ flexShrink: 0, padding: "5px 13px", borderRadius: 20, border: "none", cursor: isActive ? "default" : "pointer", fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", background: isActive ? "#6366f1" : (dark ? "#1e293b" : "#e5e7eb"), color: isActive ? "#fff" : (dark ? "#64748b" : "#6b7280"), transition: "all .15s" }}>
              {s}
              {ctx.type === "good" && <span style={{ marginLeft: 4 }}>✓</span>}
              {ctx.type === "improve" && <span style={{ marginLeft: 4 }}>↑</span>}
            </button>
          );
        })}
      </div>
    );
  };

  // ─── Topic Chips ──────────────────────────────────────────────────────────
  const TopicChips = () => {
    const subjectData = subjects[currentSubject] || subjects.CAT;
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
        {subjectData.topics.slice(0, 5).map((t) => (
          <button key={t} onClick={() => ask(`Explain ${t} in ${currentSubject} for me`)} style={{ fontSize: 11, fontWeight: 700, padding: "4px 11px", borderRadius: 20, border: dark ? "1px solid #334155" : "1px solid #e0e7ff", background: dark ? "#1e293b" : "#fff", color: dark ? "#818cf8" : "#6366f1", cursor: "pointer", transition: "all .15s" }}>
            {t}
          </button>
        ))}
      </div>
    );
  };

  // ─── Toolbar ──────────────────────────────────────────────────────────────
  const ToolBar = () => {
    const base = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all .15s" };
    const bg = dark ? { background: "#1e293b", color: "#94a3b8" } : { background: "#f3f4f6", color: "#6b7280" };
    const active = dark ? { background: "#334155", color: "#e2e8f0" } : { background: "#e0e7ff", color: "#6366f1" };
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ display: "flex", border: dark ? "1px solid #334155" : "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          {["sm", "md", "lg"].map((s) => (
            <button key={s} onClick={() => setFontSize(s)} style={{ ...base, borderRadius: 0, padding: "6px 10px", background: fontSize === s ? "#6366f1" : (dark ? "#1e293b" : "#fff"), color: fontSize === s ? "#fff" : (dark ? "#94a3b8" : "#6b7280"), borderRight: dark ? "1px solid #334155" : "1px solid #e5e7eb" }}>
              {s === "sm" ? "A" : s === "md" ? "A+" : "A++"}
            </button>
          ))}
        </div>
        <button onClick={() => setIsDark((d) => !d)} style={{ ...base, ...(isDark ? active : bg) }}>{isDark ? "☀️ Light" : "🌙 Dark"}</button>
        <button onClick={isFullscreen ? exitFullscreen : enterFullscreen} style={{ ...base, ...(isFullscreen ? active : bg) }}>{isFullscreen ? "⛶ Exit" : "⛶ Focus"}</button>
        <button onClick={() => setShowVoicePanel((p) => !p)} style={{ ...base, ...(showVoicePanel ? active : bg) }}>🔊 Voice</button>
        {messages.length > 0 && (
          <button onClick={() => setShowResetModal(true)} style={{ ...base, background: dark ? "#1e293b" : "#fff7ed", color: dark ? "#f87171" : "#c2410c", border: dark ? "1px solid #7f1d1d" : "1px solid #fed7aa" }}>🗑 Clear</button>
        )}
        <span style={{ fontSize: 10, color: dark ? "#475569" : "#d1d5db", fontWeight: 700, fontFamily: "monospace", marginLeft: 4 }}>{STUDENT_ID}</span>
      </div>
    );
  };

  // ─── Input Bar ────────────────────────────────────────────────────────────
  const InputBar = () => (
    <div style={{ background: dark ? "rgba(15,23,42,.97)" : "rgba(255,255,255,.95)", backdropFilter: "blur(12px)", borderTop: dark ? "1px solid #1e293b" : "1px solid #f3f4f6", padding: "12px 16px 16px", flexShrink: 0 }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {showVoicePanel && <VoicePanel />}
        {messages.length > 0 && <TopicChips />}

        {agentStatus && (
          <div style={{ fontSize: 11, color: dark ? "#818cf8" : "#6366f1", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ animation: "bounce .8s infinite", display: "inline-block" }}>⚙</span> {agentStatus}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => { setQuestion(e.target.value); autoResize(); }}
            onKeyDown={handleKey}
            placeholder={`Ask a ${currentSubject || "subject"} question… (Enter to send, Shift+Enter for new line)`}
            rows={1}
            style={{
              flex: 1, resize: "none", padding: "12px 16px",
              borderRadius: 14, border: dark ? "1.5px solid #334155" : "1.5px solid #e5e7eb",
              fontSize: fontScale, fontFamily: "inherit", lineHeight: 1.5,
              background: dark ? "#1e293b" : "#fff", color: dark ? "#e2e8f0" : "#374151",
              outline: "none", transition: "border .15s",
              overflowY: "auto", minHeight: 46, maxHeight: 160, boxSizing: "border-box",
            }}
          />
          <button
            onClick={() => ask()}
            disabled={loading || !question.trim()}
            style={{
              padding: "0 22px", borderRadius: 14, border: "none", fontWeight: 800, fontSize: 14,
              cursor: loading || !question.trim() ? "not-allowed" : "pointer",
              background: loading || !question.trim() ? (dark ? "#334155" : "#e5e7eb") : "#6366f1",
              color: loading || !question.trim() ? (dark ? "#64748b" : "#9ca3af") : "#fff",
              transition: "all .15s", flexShrink: 0,
            }}
          >
            {loading ? "…" : "Send"}
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 10, color: dark ? "#334155" : "#d1d5db", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 8 }}>
          Powered by Eduket AI · {currentSubject && (subjects[currentSubject]?.label || currentSubject)}
        </p>
      </div>
    </div>
  );

  // ─── Message List ─────────────────────────────────────────────────────────
  const MessageList = () => {
    const subjectData = subjects[currentSubject] || subjects.CAT;
    return (
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: 700, margin: "0 auto", width: "100%" }}>

        {/* Empty-state suggestions — shown after welcome dismissed */}
        {messages.length === 0 && !showWelcome && (
          <div style={{ marginBottom: 24 }}>
            <p style={{ textAlign: "center", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".2em", color: dark ? "#475569" : "#d1d5db", marginBottom: 12 }}>
              Try asking about…
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {subjectData.suggest.map((s) => (
                <button key={s} onClick={() => ask(s)} style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 10, border: dark ? "1px solid #334155" : "1px solid #e0e7ff", background: dark ? "#1e293b" : "#fff", color: dark ? "#818cf8" : "#6366f1", cursor: "pointer", transition: "all .15s" }}>
                  {s}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 24, background: dark ? "#1e293b" : "#f8faff", border: dark ? "1px solid #334155" : "1px solid #e0e7ff", borderRadius: 14, padding: "14px 18px" }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: dark ? "#818cf8" : "#6366f1", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>
                🤖 Your AI Tutor can…
              </p>
              {[
                ["📚", "Explain any topic in your enrolled subjects"],
                ["💡", "Give Socratic hints without spoiling answers"],
                ["📊", "Tailor help based on your past exam performance"],
                ["📋", "Help you build a personalised study plan"],
                ["✍️", "Mark your written answers against the memo"],
                ["📈", "Help you identify and improve weak areas"],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: "flex", gap: 10, marginBottom: 7, fontSize: 13, color: dark ? "#94a3b8" : "#4b5563" }}>
                  <span>{icon}</span><span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {messages.map((msg, i) => (
            <div key={msg.id ?? i} style={{ display: "flex", alignItems: "flex-start", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: msg.role === "assistant" ? "#6366f1" : "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,.3)" }}>
                {msg.role === "assistant" ? "🤖" : "🎓"}
              </div>
              {msg.role === "user" ? (
                <div style={{ background: "#6366f1", color: "#fff", borderRadius: "18px 18px 4px 18px", padding: "11px 16px", fontSize: fontScale, lineHeight: 1.6, fontWeight: 500, maxWidth: "82%", boxShadow: "0 2px 12px rgba(99,102,241,.25)" }}>
                  {msg.text}
                </div>
              ) : (
                <AssistantMessage msg={msg} isDark={dark} activeMsg={activeMsg} onSpeak={speak} onStop={stopSpeaking} onPauseResume={pauseResume} paused={paused} onQuickReply={ask} />
              )}
            </div>
          ))}

          {loading && <TypingIndicator isDark={dark} />}
          <div ref={bottomRef} />
        </div>
      </div>
    );
  };

  // ─── Global styles ────────────────────────────────────────────────────────
  const globalStyle = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
    @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.4;} 30%{transform:translateY(-5px);opacity:1;} }
    * { box-sizing: border-box; }
    textarea { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #6366f1; border-radius: 4px; }
  `;

  // ─── Profile loading splash ───────────────────────────────────────────────
  if (profileLoading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 16, fontFamily: "'DM Sans', sans-serif" }}>
        <style>{globalStyle}</style>
        <div style={{ fontSize: 40 }}>🤖</div>
        <p style={{ fontSize: 14, color: "#6b7280", fontWeight: 700 }}>Loading your profile…</p>
        <div style={{ display: "flex", gap: 5 }}>
          {[0, 1, 2].map((d) => (
            <div key={d} style={{ width: 8, height: 8, borderRadius: "50%", background: "#a5b4fc", animation: "bounce .8s infinite", animationDelay: `${d * .15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Fullscreen layout ────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div ref={containerRef} style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
        <style>{globalStyle}</style>
        <WelcomeModal />
        {showResetModal && <ResetModal />}
        <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 22 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#e2e8f0", letterSpacing: "-.3px" }}>Eduket AI Tutor</div>
            <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700 }}>
              {currentSubject && subjects[currentSubject]?.label}
            </div>
          </div>
          <ToolBar />
        </div>
        <SubjectBar />
        <MessageList />
        <InputBar />
      </div>
    );
  }

  // ─── Normal layout ────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="flex flex-col h-full relative" style={{ fontFamily: "'DM Sans', sans-serif", background: dark ? "#0f172a" : "transparent", transition: "background .2s" }}>
      <style>{globalStyle}</style>
      <WelcomeModal />
      {showResetModal && <ResetModal />}

      <div style={{ textAlign: "center", padding: "24px 16px 12px" }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>🤖</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-.5px", margin: 0 }}>
          Eduket AI Tutor
        </h1>
        <p style={{ fontSize: 10, color: dark ? "#475569" : "#9ca3af", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".2em", marginTop: 4 }}>
          {currentSubject ? `${currentSubject} · ${subjects[currentSubject]?.label}` : "Your Personal Study Partner"}
        </p>
      </div>

      <div style={{ padding: "0 16px 8px", maxWidth: 700, margin: "0 auto", width: "100%" }}>
        <ToolBar />
      </div>

      <SubjectBar />
      <MessageList />
      <InputBar />
    </div>
  );
}