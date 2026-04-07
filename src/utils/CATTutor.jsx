import { useState, useRef, useEffect, useCallback } from "react";

const API_URL = "https://abitonp.pythonanywhere.com/chat";

const SUGGESTED = [
  "What is a spreadsheet formula?",
  "Difference between RAM and ROM?",
  "What is a database primary key?",
  "How does the internet work?",
  "What is cloud computing?",
  "Explain phishing attacks.",
];

// ─── Parse AI response into structured blocks ─────────────────────────────────
// Converts markdown-like text into clean display blocks:
// **heading** → heading block
// - item / * item → bullet list
// 1. item → numbered list
// plain text → paragraph
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

    // **Bold heading** — strip stars, render as heading
    if (/^\*\*(.+)\*\*$/.test(line)) {
      flushList();
      blocks.push({ type: "heading", text: line.replace(/\*\*/g, "") });
      return;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      if (listType !== "numbered") { flushList(); currentList = []; listType = "numbered"; }
      currentList.push(line.replace(/^\d+\.\s/, "").replace(/\*\*/g, ""));
      return;
    }

    // Bullet list
    if (/^[-*•]\s/.test(line)) {
      if (listType !== "bullet") { flushList(); currentList = []; listType = "bullet"; }
      currentList.push(line.replace(/^[-*•]\s/, "").replace(/\*\*/g, ""));
      return;
    }

    // Plain paragraph — strip any remaining ** 
    flushList();
    const cleaned = line.replace(/\*\*(.+?)\*\*/g, "$1");
    if (cleaned) blocks.push({ type: "paragraph", text: cleaned });
  });

  flushList();
  return blocks;
}

// ─── Render a single parsed block ────────────────────────────────────────────
function ResponseBlock({ block, isDark }) {
  const textColor  = isDark ? "#e2e8f0" : "#374151";
  const headColor  = isDark ? "#a5b4fc" : "#4338ca";
  const bulletCol  = isDark ? "#818cf8" : "#6366f1";
  const numCol     = isDark ? "#a78bfa" : "#7c3aed";

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

// ─── Formatted assistant message ─────────────────────────────────────────────
function AssistantMessage({ msg, activeMsg, onSpeak, onStop, onPauseResume, paused }) {
  const blocks   = parseResponse(msg.text);
  const isActive = activeMsg === msg.id;

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "18px 18px 18px 4px", padding: "14px 18px", boxShadow: "0 1px 8px rgba(0,0,0,.06)", maxWidth: "85%" }}>
      {blocks.map((block, i) => (
        <ResponseBlock key={i} block={block} isDark={false} />
      ))}

      {/* TTS controls */}
      <div style={{ display: "flex", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid #f3f4f6", flexWrap: "wrap" }}>
        <button
          onClick={() => isActive ? onStop() : onSpeak(msg.text, msg.id)}
          style={{
            display: "flex", alignItems: "center", gap: 6, fontSize: 11, fontWeight: 800,
            textTransform: "uppercase", letterSpacing: .6, padding: "5px 12px", borderRadius: 8,
            border: "none", cursor: "pointer", transition: "all .15s",
            background: isActive ? "#fee2e2" : "#eef2ff", color: isActive ? "#dc2626" : "#6366f1"
          }}
        >
          {isActive ? "⏹ Stop" : "🔈 Read"}
        </button>
        {isActive && (
          <button
            onClick={onPauseResume}
            style={{
              fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: .6,
              padding: "5px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: "#fef9c3", color: "#92400e"
            }}
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
  const [question, setQuestion]         = useState("");
  const [messages, setMessages]         = useState([]);
  const [loading, setLoading]           = useState(false);

  // TTS
  const [speaking, setSpeaking]         = useState(false);
  const [paused, setPaused]             = useState(false);
  const [rate, setRate]                 = useState(1);
  const [pitch, setPitch]               = useState(1);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voices, setVoices]             = useState([]);
  const [activeMsg, setActiveMsg]       = useState(null);
  const [showVoicePanel, setShowVoicePanel] = useState(false);

  // UI
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize]         = useState("md");   // "sm" | "md" | "lg"
  const [showResetModal, setShowResetModal] = useState(false);

  const utteranceRef = useRef(null);
  const bottomRef    = useRef(null);
  const inputRef     = useRef(null);
  const containerRef = useRef(null);



  // ── Voices ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) setVoices(v);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── Fullscreen API ──────────────────────────────────────────────────────────
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

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && isFullscreen) exitFullscreen();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFullscreen]);

  // ── Ask ─────────────────────────────────────────────────────────────────────
  const ask = async (q_override) => {
    const q = (q_override || question).trim();
    if (!q || loading) return;
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    stopSpeaking();
    try {
      const res  = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, mode: "tutor" }),
      });
      const data = await res.json();
      setMessages((m) => [...m, {
        role: "assistant",
        text: data.answer ?? "No answer returned.",
        id:   Date.now()
      }]);
    } catch {
      setMessages((m) => [...m, {
        role: "assistant",
        text: "⚠️ Could not reach the tutor. Check your connection and try again.",
        id:   Date.now()
      }]);
    }
    setLoading(false);
  };

  // ── TTS ─────────────────────────────────────────────────────────────────────
  const speak = (text, id) => {
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate  = rate;
    utter.pitch = pitch;
    if (selectedVoice) utter.voice = selectedVoice;
    utter.onend  = () => { setSpeaking(false); setPaused(false); setActiveMsg(null); };
    utter.onerror = () => { setSpeaking(false); setPaused(false); setActiveMsg(null); };
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
    setPaused(false);
    setActiveMsg(id);
  };

  const pauseResume = () => {
    if (paused) { window.speechSynthesis.resume(); setPaused(false); }
    else        { window.speechSynthesis.pause();  setPaused(true);  }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false); setPaused(false); setActiveMsg(null);
  };

  // ── Reset ───────────────────────────────────────────────────────────────────
  const resetChat = () => {
    stopSpeaking();
    setMessages([]);
    setQuestion("");
    setShowResetModal(false);
    if (isFullscreen) exitFullscreen();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
  };
// !!!!!! Input text not allowing continuous typing .....

  // ── Font size scale ─────────────────────────────────────────────────────────
  const fontScale = { sm: 12, md: 14, lg: 16 }[fontSize];

  // ─────────────────────────────────────────────────────────────────────────
  // ── Shared toolbar buttons ────────────────────────────────────────────────
  const ToolBar = ({ dark }) => {
    const base   = { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, transition: "all .15s" };
    const bg     = dark ? { background: "#1e293b", color: "#94a3b8" } : { background: "#f3f4f6", color: "#6b7280" };
    const active = dark ? { background: "#334155", color: "#e2e8f0" } : { background: "#e0e7ff", color: "#6366f1" };

    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>

        {/* Font size */}
        <div style={{ display: "flex", border: dark ? "1px solid #334155" : "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          {["sm", "md", "lg"].map((s) => (
            <button key={s} onClick={() => setFontSize(s)}
              style={{ ...base, borderRadius: 0, padding: "6px 10px", background: fontSize === s ? (dark ? "#6366f1" : "#6366f1") : (dark ? "#1e293b" : "#fff"), color: fontSize === s ? "#fff" : (dark ? "#94a3b8" : "#6b7280"), borderRight: dark ? "1px solid #334155" : "1px solid #e5e7eb" }}>
              {s === "sm" ? "A" : s === "md" ? "A+" : "A++"}
            </button>
          ))}
        </div>

        {/* Fullscreen toggle */}
        <button onClick={isFullscreen ? exitFullscreen : enterFullscreen}
          style={{ ...base, ...(isFullscreen ? active : bg) }}
          title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen"}>
          {isFullscreen ? "⛶ Exit" : "⛶ Focus"}
        </button>

        {/* Voice settings */}
        <button onClick={() => setShowVoicePanel(p => !p)} style={{ ...base, ...(showVoicePanel ? active : bg) }}>
          🔊 Voice
        </button>

        {/* Reset */}
        {messages.length > 0 && (
          <button onClick={() => setShowResetModal(true)}
            style={{ ...base, background: dark ? "#1e293b" : "#fff7ed", color: dark ? "#f87171" : "#c2410c", border: dark ? "1px solid #7f1d1d" : "1px solid #fed7aa" }}>
            🗑 Clear
          </button>
        )}
      </div>
    );
  };

  // ── Reset confirm modal ─────────────────────────────────────────────────────
  const ResetModal = () => (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#fff", borderRadius: 20, padding: 32, maxWidth: 400, width: "100%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,.2)" }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
        <div style={{ fontWeight: 800, fontSize: 20, color: "#1a1a2e", marginBottom: 8 }}>Clear Chat?</div>
        <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 24, lineHeight: 1.6 }}>
          This will remove all <b>{messages.length}</b> messages from this session.
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button onClick={() => setShowResetModal(false)}
            style={{ padding: "10px 24px", borderRadius: 10, border: "1.5px solid #e5e7eb", background: "#f9fafb", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            Cancel
          </button>
          <button onClick={resetChat}
            style={{ padding: "10px 24px", borderRadius: 10, border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            🗑 Clear All
          </button>
        </div>
      </div>
    </div>
  );

  // ── Voice panel ─────────────────────────────────────────────────────────────
  const VoicePanel = ({ dark }) => (
    <div style={{ background: dark ? "#1e293b" : "#fff", border: dark ? "1px solid #334155" : "1px solid #e5e7eb", borderRadius: 14, padding: 16, marginTop: 8, marginBottom: 8 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: 10, fontWeight: 800, color: dark ? "#64748b" : "#9ca3af", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
            Speed: {rate.toFixed(1)}x
          </label>
          <input type="range" min="0.5" max="2" step="0.1" value={rate}
            onChange={(e) => setRate(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#6366f1" }} />
        </div>
        <div>
          <label style={{ fontSize: 10, fontWeight: 800, color: dark ? "#64748b" : "#9ca3af", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
            Pitch: {pitch.toFixed(1)}
          </label>
          <input type="range" min="0.5" max="2" step="0.1" value={pitch}
            onChange={(e) => setPitch(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#a855f7" }} />
        </div>
      </div>
      <div>
        <label style={{ fontSize: 10, fontWeight: 800, color: dark ? "#64748b" : "#9ca3af", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 4 }}>
          Voice
        </label>
        <select value={selectedVoice?.name ?? ""}
          onChange={(e) => setSelectedVoice(voices.find(v => v.name === e.target.value) || null)}
          style={{ width: "100%", fontSize: 12, padding: "7px 10px", borderRadius: 8, border: dark ? "1px solid #334155" : "1px solid #d1d5db", background: dark ? "#0f172a" : "#f9fafb", color: dark ? "#e2e8f0" : "#374151" }}>
          <option value="">🎙️ Default Voice</option>
          {voices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
        </select>
      </div>
    </div>
  );

  // ── Input bar (shared) ───────────────────────────────────────────────────────
  const InputBar = ({ dark }) => (
    <div style={{ background: dark ? "rgba(15,23,42,.95)" : "rgba(255,255,255,.92)", backdropFilter: "blur(12px)", borderTop: dark ? "1px solid #1e293b" : "1px solid #f3f4f6", padding: "12px 16px 16px" }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {showVoicePanel && <VoicePanel dark={dark} />}

          <div style={{ display: "flex", gap: 8 }}>
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a CAT question… (Enter to send)"
            rows={1}
            style={{
              flex: 1,
              resize: "none",
              padding: "12px 16px",
              borderRadius: 14,
              border: dark ? "1.5px solid #334155" : "1.5px solid #e5e7eb",
              fontSize: fontScale,
              fontFamily: "inherit",
              lineHeight: 1.5,
              background: dark ? "#1e293b" : "#fff",
              color: dark ? "#e2e8f0" : "#374151",
              outline: "none",
              transition: "border .15s",
              overflow: "hidden",
              minHeight: "42px"
            }}
          />

          <button onClick={() => ask()}
            disabled={loading || !question.trim()}
            style={{
              padding: "0 22px", borderRadius: 14, border: "none", fontWeight: 800, fontSize: 14,
              cursor: loading || !question.trim() ? "not-allowed" : "pointer",
              background: loading || !question.trim() ? (dark ? "#334155" : "#e5e7eb") : "#6366f1",
              color: loading || !question.trim() ? (dark ? "#64748b" : "#9ca3af") : "#fff",
              transition: "all .15s",
            }}>
            {loading ? "…" : "Send"}
          </button>
        </div>
        <p style={{ textAlign: "center", fontSize: 10, color: dark ? "#334155" : "#d1d5db", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".1em", marginTop: 8 }}>
          Powered by EduCAT AI
        </p>
      </div>
    </div>
  );

  // ── Messages (shared) ────────────────────────────────────────────────────────
  const MessageList = ({ dark }) => (
    <div style={{ flex: 1, overflowY: "auto", padding: "16px", maxWidth: 700, margin: "0 auto", width: "100%" }}>

      {/* Suggested — only when empty */}
      {messages.length === 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ textAlign: "center", fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: ".2em", color: dark ? "#475569" : "#d1d5db", marginBottom: 12 }}>
            Suggested Topics
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {SUGGESTED.map((s) => (
              <button key={s} onClick={() => ask(s)}
                style={{ fontSize: 12, fontWeight: 700, padding: "8px 14px", borderRadius: 10, border: dark ? "1px solid #334155" : "1px solid #e0e7ff", background: dark ? "#1e293b" : "#fff", color: dark ? "#818cf8" : "#6366f1", cursor: "pointer", transition: "all .15s" }}>
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row" }}>
            {/* Avatar */}
            <div style={{ width: 32, height: 32, borderRadius: 10, background: msg.role === "assistant" ? "#6366f1" : "#8b5cf6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0, boxShadow: "0 2px 8px rgba(99,102,241,.3)" }}>
              {msg.role === "assistant" ? "🤖" : "🎓"}
            </div>

            {/* Bubble */}
            {msg.role === "user" ? (
              <div style={{ background: "#6366f1", color: "#fff", borderRadius: "18px 18px 4px 18px", padding: "11px 16px", fontSize: fontScale, lineHeight: 1.6, fontWeight: 500, maxWidth: "82%", boxShadow: "0 2px 12px rgba(99,102,241,.25)" }}>
                {msg.text}
              </div>
            ) : (
              <AssistantMessage
                msg={msg}
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
            <div style={{ background: dark ? "#1e293b" : "#fff", border: dark ? "1px solid #334155" : "1px solid #e5e7eb", borderRadius: "18px 18px 18px 4px", padding: "14px 18px", boxShadow: "0 1px 8px rgba(0,0,0,.06)" }}>
              <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                {[0, 1, 2].map((d) => (
                  <div key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "#a5b4fc", animation: "bounce .8s infinite", animationDelay: `${d * .15}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // FULLSCREEN VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (isFullscreen) {
    return (
      <div ref={containerRef} style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a", fontFamily: "'DM Sans', sans-serif", overflow: "hidden" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap'); @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.4;} 30%{transform:translateY(-5px);opacity:1;} } *{box-sizing:border-box;} textarea{box-sizing:border-box;}`}</style>
        {showResetModal && <ResetModal />}

        {/* Dark top bar */}
        <div style={{ background: "#0f172a", borderBottom: "1px solid #1e293b", padding: "10px 20px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <div style={{ fontSize: 20 }}>🤖</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#e2e8f0", letterSpacing: "-.3px" }}>EduCAT AI Tutor</div>
            <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700 }}>CAT Syllabus Specialist</div>
          </div>
          <ToolBar dark={true} />
        </div>

        <MessageList dark={true} />
        <InputBar dark={true} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // NORMAL VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="flex flex-col h-full bg-transparent relative" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800&display=swap'); @keyframes bounce { 0%,60%,100%{transform:translateY(0);opacity:.4;} 30%{transform:translateY(-5px);opacity:1;} } *{box-sizing:border-box;} textarea{box-sizing:border-box;}`}</style>
      {showResetModal && <ResetModal />}

      {/* Header */}
      <div style={{ textAlign: "center", padding: "24px 16px 12px" }}>
        <div style={{ fontSize: 36, marginBottom: 4 }}>🤖</div>
        <h1 style={{ fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-.5px", margin: 0 }}>
          How can I help you today?
        </h1>
        <p style={{ fontSize: 10, color: "#9ca3af", fontWeight: 800, textTransform: "uppercase", letterSpacing: ".2em", marginTop: 4 }}>
          CAT Syllabus Specialist
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ padding: "0 16px 8px", maxWidth: 700, margin: "0 auto", width: "100%" }}>
        <ToolBar dark={false} />
      </div>

      {/* Messages */}
      <MessageList dark={false} />

      {/* Input */}
      <InputBar dark={false} />
    </div>
  );
}