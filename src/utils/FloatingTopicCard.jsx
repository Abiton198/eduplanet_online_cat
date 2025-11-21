// utils/FloatingStudyHub.jsx
import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LayoutGrid, Trophy, BookOpen, Hash, Search, ChevronDown, ChevronUp, Zap, Lightbulb, CheckCircle, XCircle, Globe, Info } from "lucide-react";
import { catTopics } from "../data/catTopicsData";
import { abbreviationsData } from "../data/abbreviationsData";
import { collection, onSnapshot, query, where, orderBy } from "firebase/firestore";
import { db } from "../utils/firebase";

export default function FloatingStudyHub({
  grade,
  currentStudentId,
  selectedExam = null,
  position = "bottom-right",
  initiallyOpen = false,
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [tab, setTab] = useState("topics");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedTopic, setExpandedTopic] = useState(null);

  // === LIVE LEADERBOARD ===
  const [students, setStudents] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);

  const { year, gradeKey, raw } = useMemo(() => {
    const rawGrade = String(grade || "").trim();
    const match = rawGrade.match(/(\d{1,2})/);
    const year = match ? Number(match[1]) : null;
    const gradeKey = rawGrade.toLowerCase().replace(/\s+/g, "");
    return { year, gradeKey, raw: rawGrade };
  }, [grade]);

  useEffect(() => {
    if (!grade || !currentStudentId) {
      setStudents([]);
      setLoadingLeaderboard(false);
      return;
    }
    setLoadingLeaderboard(true);
    let q;
    if (year !== null) q = query(collection(db, "students"), where("gradeYear", "==", year), orderBy("totalPoints", "desc"));
    else if (gradeKey) q = query(collection(db, "students"), where("gradeKey", "==", gradeKey), orderBy("totalPoints", "desc"));
    else q = query(collection(db, "students"), where("grade", "==", raw), orderBy("totalPoints", "desc"));

    const unsub = onSnapshot(q, snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoadingLeaderboard(false);
    });
    return () => unsub && unsub();
  }, [grade, year, gradeKey, raw, currentStudentId]);

  const me = students.find(s => s.id === currentStudentId);
  const myRank = students.findIndex(s => s.id === currentStudentId) + 1;

  const showHub = !selectedExam;
  const isRight = position === "bottom-right";

  const filteredTopics = catTopics.filter(t =>
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.definition?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAbbr = abbreviationsData.filter(item =>
    item.abbr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.fullForm?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!showHub) return null;

  const renderSection = (title, items, icon: React.ReactNode, color = "indigo") => {
    if (!items || items.length === 0) return null;
    return (
      <div className={`p-6 rounded-3xl border-2 border-${color}-200 bg-gradient-to-br from-${color}-50 to-white`}>
        <h4 className={`text-xl font-bold text-${color}-800 mb-4 flex items-center gap-3`}>
          {icon} {title}
        </h4>
        <ul className="space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-700">
              <span className={`text-${color}-600 mt-1`}>•</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className={`fixed z-50 ${isRight ? "right-4" : "left-4"} bottom-20 flex items-end gap-4`}
      >
        {/* Main Panel */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-[92vw] max-w-2xl max-h-[82vh] bg-white rounded-3xl shadow-3xl border border-gray-200 overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="flex items-center gap-4">
                  <LayoutGrid size={32} />
                  <div>
                    <h3 className="font-bold text-2xl">Study Hub</h3>
                    <p className="text-sm opacity-90">Everything you need</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="p-3 hover:bg-white/20 rounded-xl transition">
                  <X size={32} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b bg-gray-50">
                {[
                  { id: "topics", icon: BookOpen, label: "Topics" },
                  { id: "abbreviations", icon: Hash, label: "Abbreviations" },
                  { id: "leaderboard", icon: Trophy, label: "Leaderboard" },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => {
                      setTab(id);
                      setSearchTerm("");
                      setExpandedTopic(null);
                    }}
                    className={`flex-1 py-5 px-6 text-sm font-bold flex items-center justify-center gap-3 transition ${
                      tab === id
                        ? "text-indigo-600 border-b-4 border-indigo-600 bg-white"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    <Icon size={20} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="p-4 border-b bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-4 top-3.5 text-gray-400" size={22} />
                  <input
                    type="text"
                    placeholder={`Search ${tab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-5 py-3.5 rounded-2xl border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium"
                  />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-8">
                {/* TOPICS — FULL DETAILS ON CLICK */}
                {tab === "topics" && (
                  <div className="space-y-6">
                    {filteredTopics.length === 0 ? (
                      <p className="text-center text-gray-500 py-20 text-lg">No topics found</p>
                    ) : (
                      filteredTopics.map((topic) => (
                        <div key={topic.id} className="border-2 border-indigo-200 rounded-3xl overflow-hidden bg-gradient-to-br from-indigo-50 to-purple-50">
                          <button
                            onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                            className="w-full px-8 py-6 flex items-center justify-between hover:bg-white/50 transition text-left"
                          >
                            <div className="flex items-center gap-6">
                              <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center text-3xl text-white font-black shadow-xl">
                                {topic.title.charAt(0)}
                              </div>
                              <div>
                                <h3 className="font-bold text-2xl text-indigo-900">{topic.title}</h3>
                                <p className="text-sm text-gray-700 mt-1 line-clamp-2">{topic.definition}</p>
                              </div>
                            </div>
                            {expandedTopic === topic.id ? <ChevronUp size={32} className="text-indigo-600" /> : <ChevronDown size={32} className="text-indigo-600" />}
                          </button>

                          {/* FULL EXPANDED CONTENT */}
                          {expandedTopic === topic.id && (
                            <div className="px-8 pb-8 space-y-8 bg-white/95 backdrop-blur">
                              {/* Definition */}
                              <div className="p-6 bg-indigo-50 rounded-3xl border-2 border-indigo-300">
                                <h4 className="text-xl font-bold text-indigo-800 mb-3 flex items-center gap-3">
                                  <Info className="text-indigo-600" /> Definition
                                </h4>
                                <p className="text-lg text-gray-800 leading-relaxed">{topic.definition}</p>
                              </div>

                              {/* Core Functions */}
                              {renderSection("Function & Purpose", topic.bullets, <Zap className="text-yellow-600" />, "purple")}

                              {/* All Other Sections */}
                              {renderSection("Quick Facts", topic.facts, <Lightbulb className="text-yellow-500" />, "yellow")}
                              {renderSection("Examples", topic.examples, <CheckCircle className="text-green-600" />, "green")}
                              {renderSection("Advantages", topic.advantages, <CheckCircle className="text-green-600" />, "green")}
                              {renderSection("Common Uses", topic.uses, <Zap className="text-orange-600" />, "orange")}
                              {renderSection("Disadvantages", topic.disadvantages, <XCircle className="text-red-600" />, "red")}
                              {renderSection("Limitations", topic.limitations, <XCircle className="text-red-600" />, "red")}
                              {renderSection("Applications in ICT", topic.applicationsICT, <Globe className="text-blue-600" />, "blue")}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* ABBREVIATIONS */}
                {tab === "abbreviations" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredAbbr.length === 0 ? (
                      <p className="col-span-2 text-center text-gray-500 py-20 text-lg">No abbreviations found</p>
                    ) : (
                      filteredAbbr.map((item, i) => (
                        <div key={i} className="p-8 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-3xl border-2 border-purple-300 shadow-xl hover:shadow-2xl hover:scale-105 transition-all">
                          <div className="text-5xl font-black text-purple-800 mb-3">{item.abbr}</div>
                          <div className="text-xl font-bold text-indigo-800 mb-4">{item.fullForm}</div>
                          <p className="text-gray-700"><span className="font-bold">Use:</span> {item.use}</p>
                          {item.definition && <p className="text-sm text-gray-600 mt-3 italic">{item.definition}</p>}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* LEADERBOARD */}
                {tab === "leaderboard" && (
                  <div className="space-y-6">
                    <h3 className="text-center text-3xl font-black text-indigo-800">Grade {raw} Leaderboard</h3>
                    {loadingLeaderboard ? (
                      <div className="text-center py-20">
                        <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-indigo-600 border-t-transparent"></div>
                      </div>
                    ) : students.length === 0 ? (
                      <p className="text-center text-gray-500 py-20 text-lg">No students found</p>
                    ) : (
                      <>
                        {students.slice(0, 10).map((s, i) => {
                          const isMe = s.id === currentStudentId;
                          return (
                            <div key={s.id} className={`flex items-center gap-6 p-6 rounded-3xl border-2 ${isMe ? "bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-500 shadow-2xl" : "bg-gray-50 border-gray-300"}`}>
                              <div className="text-4xl font-black">
                                {i === 0 ? "First" : i === 1 ? "Second" : i === 2 ? "Third" : `#${i + 1}`}
                              </div>
                              <div className="flex-1">
                                <p className="text-2xl font-bold">{isMe ? "YOU" : (s.name || "Student")}</p>
                                <p className="text-gray-600">Rank #{i + 1}</p>
                              </div>
                              <div className="text-4xl font-black text-indigo-700">{Number(s.totalPoints || 0)}</div>
                            </div>
                          );
                        })}
                        {myRank > 10 && me && (
                          <div className="p-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded-3xl border-4 border-blue-600 text-center">
                            <p className="text-3xl font-black">Your Rank: #{myRank}</p>
                            <p className="text-5xl font-black text-blue-800 mt-4">{Number(me.totalPoints || 0)} pts</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB */}
        <motion.button
          onClick={() => setOpen(!open)}
          whileTap={{ scale: 0.9 }}
          className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:shadow-purple-500/70 transition-all ring-4 ring-purple-400/30"
        >
          <LayoutGrid size={40} className={`transition-transform duration-300 ${open ? "rotate-90" : ""}`} />
          <span className="absolute -top-3 -right-3 w-6 h-6 bg-red-500 text-white text-2xl font-bold rounded-full flex items-center justify-center animate-pulse shadow-2xl">
            
          </span>
        </motion.button>
      </motion.div>
    </AnimatePresence>
  );
}