import { useState, useRef, useEffect, useCallback } from "react";

const API_BASE = "https://abitonp.pythonanywhere.com";

// Persistent student ID — survives page refresh
const getStudentId = () => {
  let sid = localStorage.getItem("educat_sid");
  if (!sid) {
    sid = "stu_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("educat_sid", sid);
  }
  return sid;
};
const STUDENT_ID = getStudentId();

const SUGGESTED = [
  "What is a spreadsheet formula?",
  "Difference between RAM and ROM?",
  "What is a database primary key?",
  "How does the internet work?",
  "What is cloud computing?",
  "Explain phishing attacks.",
];

// ─── Parse AI response into structured blocks ─────────────────────────────────
function parseResponse(text) {
  if (!text) return [];
  const lines  = text.split("\n");
  const blocks = [];
  let currentList = null;
  let listType    = null;

  const flushList = () => {
    if (currentList?.length) {
      blocks.push({ type: listType, items: [...currentList] });
      currentList = null;
      listType    = null;
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
  const numCol    = isDark ? "#a78bfa" : "#7c3aed";

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

// ─── Assistant message bubble ──────────────────────────────────────────────────
function AssistantMessage({ msg, isDark, activeMsg, onSpeak, onStop, onPauseResume, paused }) {
  const blocks   = parseResponse(msg.text);
  const isActive = activeMsg === msg.id;
  const bg       = isDark ? "#1e293b" : "#fff";
  const border   = isDark ? "1px solid #334155" : "1px solid #e5e7eb";

  return (
    <div style={{ background: bg, border, borderRadius: "18px 18px 18px 4px", padding: "14px 18px", boxShadow: "0 1px 8px rgba(0,0,0,.06)", maxWidth: "85%" }}>
      {blocks.map((block, i) => (
        <ResponseBlock key={i} block={block} isDark={isDark} />
      ))}

      {/* TTS controls */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 10, borderTop: isDark ? "1px solid #334155" : "1px solid #f3f4f6", flexWrap: "wrap" }}>
        <button
          onClick={() => isActive ? onStop() : onSpeak(msg.text, msg.id)}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: .6, padding: "5px 12px", borderRadius: 8,
            border: "none", cursor: "pointer", transition: "all .15s",
            background: isActive ? "#fee2e2" : "#eef2ff",
            color:      isActive ? "#dc2626" : "#6366f1"
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

// ─────────────────────────────────────────────────────────────────────────────
export default function CATTutor() {
  const [question, setQuestion]           = useState("");
  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(false);
  const [agentStatus, setAgentStatus]     = useState(""); // shows tool activity

  // TTS
  const [speaking, setSpeaking]           = useState(false);
  const [paused, setPaused]               = useState(false);
  const [rate, setRate]                   = useState(1);
  const [pitch, setPitch]                 = useState(1);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voices, setVoices]               = useState([]);
  const [activeMsg, setActiveMsg]         = useState(null);
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  // UI
  const [isFullscreen, setIsFullscreen]   = useState(false);
  const [fontSize, setFontSize]           = useState("md");
  const [showResetModal, setShowResetModal] = useState(false);
  const [isDark, setIsDark]               = useState(false);

  const utteranceRef = useRef(null);
  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const containerRef = useRef(null);

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
    const handler = () => {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape" && isFullscreen) exitFullscreen(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen, exitFullscreen]);

  // ── Ask — hits /agent-chat with student_id ────────────────────────────────
  const ask = useCallback(async (q_override) => {
    const q = (q_override ?? question).trim();
    if (!q || loading) return;

    // Clear input FIRST so typing isn't blocked while awaiting
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q, id: Date.now() }]);
    setLoading(true);
    setAgentStatus("🤔 Thinking…");
    stopSpeaking();

    try {
      const res  = await fetch(`${API_BASE}/agent-chat`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ student_id: STUDENT_ID, message: q }),
      });
      const data = await res.json();
      setMessages((m) => [...m, {
        role: "assistant",
        text: data.response ?? data.answer ?? "No response returned.",
        id:   Date.now()
      }]);
    } catch (err) {
      setMessages((m) => [...m, {
        role: "assistant",
        text: "⚠️ Could not reach the tutor. Check your connection and try again.",
        id:   Date.now()
      }]);
    } finally {
      setLoading(false);
      setAgentStatus("");
    }
  }, [question, loading]);  // stable ref — only recreated when question/loading changes

  // ── Clear history on server too ────────────────────────────────────────────
  const clearServerHistory = async () => {
    try {
      await fetch(`${API_BASE}/clear-history`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ student_id: STUDENT_ID }),
      });
    } catch (_) {}
  };

  // ── TTS ───────────────────────────────────────────────────────────────────
  const speak = (text, id) => {
    stopSpeaking();
    const utter    = new SpeechSynthesisUtterance(text);
    utter.rate     = rate;
    utter.pitch    = pitch;
    if (selectedVoice) utter.voice = selectedVoice;
    utter.onend    = () => { setSpeaking(false); setPaused(false); setActiveMsg(null); };
    utter.onerror  = () => { setSpeaking(false); setPaused(false); setActiveMsg(null); };
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true); setPaused(false); setActiveMsg(id);
  };

  const pauseResume = () => {
    if (paused) { window.speechSynthesis.resume(); setPaused(false); }
    else        { window.speechSynthesis.pause();  setPaused(true);  }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false); setPaused(false); setActiveMsg(null);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetChat = async () => {
    stopSpeaking();
    setMessages([]);
    setQuestion("");
    setShowResetModal(false);
    if (isFullscreen) exitFullscreen();
    await clearServerHistory();
  };

  // Enter to send — NOT blocking typing
  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask();
    }
  };

  const fontScale = { sm: 12, md: 14, lg: 16 }[fontSize];
  const dark      = isDark || isFullscreen;

  // ── Toolbar ───────────────────────────────────────────────────────────────
  const ToolBar = () => {
    const base   = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all .15s" };
    const bg     = dark ? { background: "#1e293b", color: "#94a3b8" } : { background: "#f3f4f6", color: "#6b7280" };
    const active = dark ? { background: "#334155", color: "#e2e8f0" } : { background: "#e0e7ff", color: "#6366f1" };

    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {/* Font size */}
        <div style={{ display: "flex", border: dark ? "1px solid #334155" : "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          {["sm","md","lg"].map((s) => (
            <button key={s} onClick={() => setFontSize(s)} style={{ ...base, borderRadius: 0, padding: "6px 10px", background: fontSize===s ? "#6366f1" : (dark?"#1e293b":"#fff"), color: fontSize===s ? "#fff" : (dark?"#94a3b8":"#6b7280"), borderRight: dark?"1px solid #334155":"1px solid #e5e7eb" }}>
              {s==="sm"?"A":s==="md"?"A+":"A++"}
            </button>
          ))}
        </div>

        {/* Dark mode toggle */}
        <button onClick={() => setIsDark(d => !d)} style={{ ...base, ...(isDark ? active : bg) }} title="Toggle dark mode">
          {isDark ? "☀️ Light" : "🌙 Dark"}
        </button>

        {/* Fullscreen */}
        <button onClick={isFullscreen ? exitFullscreen : enterFullscreen} style={{ ...base, ...(isFullscreen ? active : bg) }}>
          {isFullscreen ? "⛶ Exit" : "⛶ Focus"}
        </button>

        {/* Voice */}
        <button onClick={() => setShowVoicePanel(p => !p)} style={{ ...base, ...(showVoicePanel ? active : bg) }}>
          🔊 Voice
        </button>

        {/* Clear */}
        {messages.length > 0 && (
          <button onClick={() => setShowResetModal(true)} style={{ ...base, background: dark?"#1e293b":"#fff7ed", color: dark?"#f87171":"#c2410c", border: dark?"1px solid #7f1d1d":"1px solid #fed7aa" }}>
            🗑 Clear
          </button>
        )}

        {/* Student ID badge */}
        <span style={{ fontSize: 10, color: dark?"#475569":"#d1d5db", fontWeight: 700, fontFamily: "monospace", marginLeft: 4 }}>
          {STUDENT_ID}
        </span>
      </div>
    );
  };

  // ── Reset confirm modal ────────────────────────────────────────────────────
  const ResetModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: dark?"#1e293b":"#fff", borderRadius: 20, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: dark?"#e2e8f0":"#1a1a2e", marginBottom: 8 }}>Clear Chat?</div>
        <div style={{ fontSize: 14, color: dark?"#64748b":"#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
          This removes all <b>{messages.length}</b> messages and clears the agent's memory for this session.
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => setShowResetModal(false)} style={{ padding: "10px 24px", borderRadius: 10, border: dark?"1px solid #334155":"1.5px solid #e5e7eb", background: dark?"#0f172a":"#f9fafb", color: dark?"#94a3b8":"#374151", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={resetChat} style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            🗑 Clear All
          </button>
        </div>
      </div>
    </div>
  );

  // ── Voice panel ────────────────────────────────────────────────────────────
  const VoicePanel = () => (
    <div style={{ background: dark?"#1e293b":"#fff", border: dark?"1px solid #334155":"1px solid #e5e7eb", borderRadius: 14, padding: 16, marginBottom: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
        {[["Speed", rate, setRate, "#6366f1"], ["Pitch", pitch, setPitch, "#a855f7"]].map(([label, val, set, col]) => (
          <div key={label}>
            <label style={{ fontSize: 10, fontWeight: 800, color: dark?"#64748b":"#9ca3af", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
              {label}: {val.toFixed(1)}{label==="Speed"?"x":""}
            </label>
            <input type="range" min="0.5" max="2" step="0.1" value={val}
              onChange={(e) => set(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: col }} />
          </div>
        ))}
      </div>
      <label style={{ fontSize: 10, fontWeight: 800, color: dark?"#64748b":"#9ca3af", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>Voice</label>
      <select value={selectedVoice?.name ?? ""}
        onChange={(e) => setSelectedVoice(voices.find(v => v.name===e.target.value)||null)}
        style={{ width: "100%", fontSize: 12, padding: "7px 10px", borderRadius: 8, border: dark?"1px solid #334155":"1px solid #d1d5db", background: dark?"#0f172a":"#f9fafb", color: dark?"#e2e8f0":"#374151" }}>
        <option value="">🎙️ Default Voice</option>
        {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
      </select>
    </div>
  );

  // ── Input bar ──────────────────────────────────────────────────────────────
  const InputBar = () => (
    <div style={{ background: dark?"rgba(15,23,42,.97)":"rgba(255,255,255,.95)", backdropFilter: "blur(12px)", borderTop: dark?"1px solid #1e293b":"1px solid #f3f4f6", padding: "12px 16px 16px", flexShrink: 0 }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {showVoicePanel && <VoicePanel />}

        {/* Agent status line */}
        {agentStatus && (
          <div style={{ fontSize: 11, color: dark?"#818cf8":"#6366f1", fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ animation: "bounce .8s infinite", display: "inline-block" }}>⚙</span>
            {agentStatus}
          </div>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          {/* FIX: value + onChange keeps React controlled; onKeyDown on div wrapper
              is removed — keyDown stays on textarea itself to avoid event conflicts */}
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a CAT question… (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{
              flex: 1, resize: "none", padding: "12px 16px",
              borderRadius: 14, border: dark?"1.5px solid #334155":"1.5px solid #e5e7eb",
              fontSize: fontScale, fontFamily: "inherit", lineHeight: 1.5,
              background: dark?"#1e293b":"#fff", color: dark?"#e2e8f0":"#374151",
              outline: "none", transition: "border .15s",
              overflowY: "auto", minHeight: 42, maxHeight: 160,
              boxSizing: "border-box"
            }}
            onInput={(e) => {
              // Auto-grow textarea
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
            }}
          />
          <button
            onClick={() => ask()}
            disabled={loading || !question.trim()}
            style={{
              padding: "0 22px", borderRadius: 14, border: "none", fontWeight: 800, fontSize: 14,
              cursor: loading || !question.trim() ? "not-allowed" : "pointer",
              background: loading || !question.trim() ? (dark?"#334155":"#e5e7eb") : "#6366f1",
              color: loading || !question.trim() ? (dark?"#64748b":"#9ca3af") : "#fff",
              transition: "all .15s", flexShrink: 0
            }}
          >
            {loading ? "…" : "Send"}
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 10, color: dark?"#334155":"#d1d5db", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 8 }}>
          Powered by EduCAT AI Agent
        </p>
      </div>
    </div>
  );

  // ── Message list ───────────────────────────────────────────────────────────
  const MessageList = () => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: 700, margin: "0 auto", width: "100%" }}>
      {/* Suggested chips — only when empty */}
      {messages.length === 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ textAlign: "center", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".2em", color: dark?"#475569":"#d1d5db", marginBottom: 12 }}>
            Try asking…
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {SUGGESTED.map((s) => (
              <button key={s} onClick={() => ask(s)}
                style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 10, border: dark?"1px solid #334155":"1px solid #e0e7ff", background: dark?"#1e293b":"#fff", color: dark?"#818cf8":"#6366f1", cursor: "pointer", transition: "all .15s" }}>
                {s}
              </button>
            ))}
          </div>

          {/* What the agent can do */}
          <div style={{ marginTop: 24, background: dark?"#1e293b":"#f8faff", border: dark?"1px solid #334155":"1px solid #e0e7ff", borderRadius: 14, padding: "14px 18px" }}>
            <p style={{ fontSize: 11, fontWeight: 800, color: dark?"#818cf8":"#6366f1", textTransform: "uppercase", letterSpacing: ".1em", marginBottom: 10 }}>
              🤖 Your AI Agent can…
            </p>
            {[
              ["📚", "Explain any CAT theory topic"],
              ["💡", "Give Socratic hints without spoiling answers"],
              ["📊", "Track your weak areas across exams"],
              ["📋", "Build a personalised study plan"],
              ["✍️", "Mark your written answers against the memo"],
              ["📈", "Review your past exam performance"],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: "flex", gap: 10, marginBottom: 7, fontSize: 13, color: dark?"#94a3b8":"#4b5563" }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {messages.map((msg, i) => (
          <div key={msg.id ?? i} style={{ display: "flex", alignItems: "flex-start", gap: 10, flexDirection: msg.role==="user"?"row-reverse":"row" }}>
            {/* Avatar */}
            <div style={{ width: 32, height: 32, borderRadius: 10, background: msg.role==="assistant"?"#6366f1":"#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,.3)" }}>
              {msg.role==="assistant" ? "🤖" : "🎓"}
            </div>

            {/* Bubble */}
            {msg.role==="user" ? (
              <div style={{ background: "#6366f1", color: "#fff", borderRadius: "18px 18px 4px 18px", padding: "11px 16px", fontSize: fontScale, lineHeight: 1.6, fontWeight: 500, maxWidth: "82%", boxShadow: "0 2px 12px rgba(99,102,241,.25)" }}>
                {msg.text}
              </div>
            ) : (
              <AssistantMessage
                msg={msg}
                isDark={dark}
                activeMsg={activeMsg}
                onSpeak={speak}
                onStop={stopSpeaking}
                onPauseResume={pauseResume}
                paused={paused}
              />
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>🤖</div>
            <div style={{ background: dark?"#1e293b":"#fff", border: dark?"1px solid #334155":"1px solid #e5e7eb", borderRadius: "18px 18px 18px 4px", padding: "14px 18px", boxShadow: "0 1px 8px rgba(0,0,0,.06)" }}>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {[0,1,2].map((d) => (
                  <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "#a5b4fc", animation: "bounce .8s infinite", animationDelay: `${d*.15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );

  // ── Shared styles ──────────────────────────────────────────────────────────
  const globalStyle = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap');
    @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.4;} 30%{transform:translateY(-5px);opacity:1;} }
    * { box-sizing: border-box; }
    textarea { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #6366f1; border-radius: 4px; }
  `;

  // ── Fullscreen view ────────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div ref={containerRef} style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
        <style>{globalStyle}</style>
        {showResetModal && <ResetModal />}
        <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 20 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#e2e8f0", letterSpacing: "-.3px" }}>EduCAT AI Agent</div>
            <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700 }}>CAT Syllabus Specialist</div>
          </div>
          <ToolBar />
        </div>
        <MessageList />
        <InputBar />
      </div>
    );
  }

  // ── Normal view ────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="flex flex-col h-full relative"
      style={{ fontFamily: "'DM Sans', sans-serif", background: dark?"#0f172a":"transparent", transition: "background .2s" }}>
      <style>{globalStyle}</style>
      {showResetModal && <ResetModal />}

      {/* Header */}
      <div style={{ textAlign: "center", padding: "24px 16px 12px" }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>🤖</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-.5px", margin: 0 }}>
          EduCAT AI Agent
        </h1>
        <p style={{ fontSize: 10, color: dark?"#475569":"#9ca3af", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".2em", marginTop: 4 }}>
          CAT Syllabus Specialist · Powered by Groq
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ padding: "0 16px 8px", maxWidth: 700, margin: "0 auto", width: "100%" }}>
        <ToolBar />
      </div>

      <MessageList />
      <InputBar />
    </div>
  );
}