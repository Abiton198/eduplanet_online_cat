import { useState, useRef, useEffect } from "react";

const API_URL = "https://abitonp.pythonanywhere.com/chat";

const SUGGESTED = [
  "What is a spreadsheet formula?",
  "Difference between RAM and ROM?",
  "What is a database primary key?",
  "How does the internet work?",
];

export default function CATTutor() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [paused, setPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [activeMsg, setActiveMsg] = useState(null);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const utteranceRef = useRef(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices();
      if (v.length) setVoices(v);
    };
    load();
    window.speechSynthesis.onvoiceschanged = load;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const ask = async () => {
    if (!question.trim() || loading) return;
    const q = question.trim();
    setQuestion("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    setLoading(true);
    stopSpeaking();
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        { role: "assistant", text: data.answer ?? "No answer returned.", id: Date.now() },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "⚠️ Could not reach the tutor. Please try again.", id: Date.now() },
      ]);
    }
    setLoading(false);
  };

  const speak = (text, id) => {
    stopSpeaking();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = rate;
    utter.pitch = pitch;
    if (selectedVoice) utter.voice = selectedVoice;
    utter.onend = () => { setSpeaking(false); setPaused(false); setActiveMsg(null); };
    utter.onerror = () => { setSpeaking(false); setPaused(false); setActiveMsg(null); };
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
    setSpeaking(true);
    setPaused(false);
    setActiveMsg(id);
  };

  const pauseResume = () => {
    if (paused) { window.speechSynthesis.resume(); setPaused(false); }
    else { window.speechSynthesis.pause(); setPaused(true); }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
    setPaused(false);
    setActiveMsg(null);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); }
  };

  return (
    // Changed min-h-screen to h-full to fit perfectly inside the App's Modal
    <div className="flex flex-col h-full bg-transparent relative">

      {/* Internal Header (Simplified for Modal use) */}
      <div className="text-center py-6 px-4">
        <div className="text-4xl mb-1">🤖</div>
        <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent tracking-tight">
          How can I help you today?
        </h1>
        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
          CAT Syllabus Specialist
        </p>
      </div>

      {/* Voice Settings Toggle */}
      <div className="px-4 max-w-2xl mx-auto w-full mb-3">
        <button
          onClick={() => setShowVoicePanel(!showVoicePanel)}
          className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-white border border-indigo-100 rounded-xl px-4 py-2 shadow-sm hover:bg-indigo-50 transition-all"
        >
          🔊 Voice Settings
          <span className="text-[10px] opacity-50 ml-1">{showVoicePanel ? "▲" : "▼"}</span>
        </button>

        {showVoicePanel && (
          <div className="bg-white rounded-2xl p-4 mt-2 shadow-xl border border-indigo-50 space-y-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  Speed: {rate.toFixed(1)}x
                </label>
                <input
                  type="range" min="0.5" max="2" step="0.1" value={rate}
                  onChange={(e) => setRate(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">
                  Pitch: {pitch.toFixed(1)}
                </label>
                <input
                  type="range" min="0.5" max="2" step="0.1" value={pitch}
                  onChange={(e) => setPitch(parseFloat(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1">Selected Voice</label>
              <select
                value={selectedVoice?.name ?? ""}
                onChange={(e) => setSelectedVoice(voices.find((v) => v.name === e.target.value) || null)}
                className="w-full text-xs border border-gray-100 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none focus:ring-2 focus:ring-indigo-200"
              >
                <option value="">🎙️ Default System Voice</option>
                {voices.map((v) => (
                  <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div className="px-4 max-w-2xl mx-auto w-full mb-4">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em] mb-3 text-center">Suggested Topics</p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTED.map((q) => (
              <button
                key={q}
                onClick={() => { setQuestion(q); inputRef.current?.focus(); }}
                className="text-xs font-bold px-4 py-2 rounded-xl border border-indigo-50 bg-white text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm active:scale-95"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Area - Adjusted padding for the fixed footer */}
      <div className="flex-1 overflow-y-auto px-4 pb-40 max-w-2xl mx-auto w-full space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 shadow-sm
              ${msg.role === "assistant" ? "bg-indigo-600" : "bg-purple-600"}`}>
              {msg.role === "assistant" ? "🤖" : "🎓"}
            </div>

            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm font-medium
              ${msg.role === "user"
                ? "bg-indigo-600 text-white rounded-tr-none"
                : "bg-white text-gray-700 border border-gray-100 rounded-tl-none"
              }`}
            >
              {msg.text}

              {msg.role === "assistant" && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
                  <button
                    onClick={() => activeMsg === msg.id ? stopSpeaking() : speak(msg.text, msg.id)}
                    className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all
                      ${activeMsg === msg.id ? "bg-red-50 text-red-600" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"}`}
                  >
                    {activeMsg === msg.id ? "⏹ Stop Reading" : "🔈 Read Aloud"}
                  </button>
                  {activeMsg === msg.id && (
                    <button
                      onClick={pauseResume}
                      className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg bg-yellow-50 text-yellow-700 hover:bg-yellow-100"
                    >
                      {paused ? "▶ Resume" : "⏸ Pause"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-sm">🤖</div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-4 shadow-sm">
              <div className="flex gap-1.5 items-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                    style={{ animation: "bounce 0.8s infinite", animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Floating input - Changed to 'sticky' so it anchors to the bottom of the scroll container */}
      <div className="sticky bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 px-4 py-4 pb-8">
        <div className="max-w-2xl mx-auto flex gap-2">
          <textarea
            ref={inputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type your CAT question..."
            rows={1}
            className="flex-1 resize-none px-4 py-3.5 rounded-2xl border border-gray-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 focus:outline-none text-sm font-medium text-gray-700 bg-white transition-all"
          />
          <button
            onClick={ask}
            disabled={loading || !question.trim()}
            className={`px-6 rounded-2xl text-white font-bold text-sm transition-all flex items-center justify-center
              ${loading || !question.trim()
                ? "bg-gray-200 cursor-not-allowed text-gray-400"
                : "bg-indigo-600 shadow-lg shadow-indigo-100 hover:scale-105 active:scale-95"
              }`}
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-[0.1em] mt-3">
          Powered by EduCAT AI
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
