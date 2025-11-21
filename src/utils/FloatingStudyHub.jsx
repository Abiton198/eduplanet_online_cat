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

  const filteredTopics = catTopics.filter(t =>
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.definition?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAbbr = abbreviationsData.filter(item =>
    item.abbr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.fullForm?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!showHub) return null;

  const renderSection = (title, items, icon, color = "indigo") => {
    if (!items || items.length === 0) return null;
    return (
      <div className={`p-5 rounded-2xl border-2 border-${color}-200 bg-gradient-to-br from-${color}-50 to-white`}>
        <h4 className={`text-lg font-bold text-${color}-800 mb-3 flex items-center gap-2`}>
          {icon} {title}
        </h4>
        <ul className="space-y-2.5 text-sm">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-3 text-gray-700">
              <span className={`text-${color}-600 mt-0.5`}>•</span>
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <AnimatePresence>
      {/* FAB Button */}
      {!open && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:shadow-purple-500/50 transition-all"
          whileTap={{ scale: 0.9 }}
        >
          <LayoutGrid size={32} />
          <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xl font-bold rounded-full flex items-center justify-center animate-pulse shadow-lg">
            
          </span>
        </motion.button>
      )}

      {/* Full Panel — Mobile-First & Responsive */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="fixed inset-0 z-[9999] bg-white flex flex-col"
          style={{ maxHeight: "100vh" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex items-center gap-3">
              <LayoutGrid size={28} />
              <div>
                <h3 className="font-bold text-xl">Study Hub</h3>
                <p className="text-xs opacity-90">Your CAT Companion</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-2 hover:bg-white/20 rounded-xl transition">
              <X size={28} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b bg-gray-50">
            {[
              { id: "topics", icon: BookOpen, label: "Topics" },
              { id: "abbreviations", icon: Hash, label: "Abbr" },
              { id: "leaderboard", icon: Trophy, label: "Rank" },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => {
                  setTab(id);
                  setSearchTerm("");
                  setExpandedTopic(null);
                }}
                className={`flex-1 py-4 text-sm font-bold flex items-center justify-center gap-2 transition ${
                  tab === id
                    ? "text-indigo-600 border-b-4 border-indigo-600 bg-white"
                    : "text-gray-600"
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-3 bg-gray-50 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                type="text"
                placeholder={`Search ${tab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
            {/* TOPICS */}
            {tab === "topics" && (
              <div className="space-y-5">
                {filteredTopics.length === 0 ? (
                  <p className="text-center text-gray-500 py-20">No topics found</p>
                ) : (
                  filteredTopics.map((topic) => (
                    <div key={topic.id} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 overflow-hidden">
                      <button
                        onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                        className="w-full px-5 py-5 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center text-2xl text-white font-bold shadow-lg">
                            {topic.title.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-bold text-lg text-indigo-900">{topic.title}</h3>
                            <p className="text-xs text-gray-600 line-clamp-1">{topic.definition}</p>
                          </div>
                        </div>
                        {expandedTopic === topic.id ? <ChevronUp size={24} className="text-indigo-600" /> : <ChevronDown size={24} className="text-indigo-600" />}
                      </button>

                      {expandedTopic === topic.id && (
                        <div className="px-5 pb-6 pt-2 space-y-6 bg-white/90">
                          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-300">
                            <h4 className="font-bold text-indigo-800 mb-2 flex items-center gap-2">
                              <Info size={18} /> Definition
                            </h4>
                            <p className="text-sm text-gray-800">{topic.definition}</p>
                          </div>

                          {renderSection("Function & Purpose", topic.bullets, <Zap size={18} />, "purple")}
                          {renderSection("Quick Facts", topic.facts, <Lightbulb size={18} />, "yellow")}
                          {renderSection("Examples", topic.examples, <CheckCircle size={18} />, "green")}
                          {renderSection("Advantages", topic.advantages, <CheckCircle size={18} />, "green")}
                          {renderSection("Uses", topic.uses, <Zap size={18} />, "orange")}
                          {renderSection("Disadvantages", topic.disadvantages, <XCircle size={18} />, "red")}
                          {renderSection("Limitations", topic.limitations, <XCircle size={18} />, "red")}
                          {renderSection("ICT Applications", topic.applicationsICT, <Globe size={18} />, "blue")}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ABBREVIATIONS */}
            {tab === "abbreviations" && (
              <div className="grid grid-cols-1 gap-4">
                {filteredAbbr.length === 0 ? (
                  <p className="text-center text-gray-500 py-20">No abbreviations found</p>
                ) : (
                  filteredAbbr.map((item, i) => (
                    <div key={i} className="p-5 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl border-2 border-purple-300">
                      <div className="text-4xl font-black text-purple-800">{item.abbr}</div>
                      <div className="text-lg font-bold text-indigo-800 mt-1">{item.fullForm}</div>
                      <p className="text-sm text-gray-700 mt-2"><span className="font-bold">Use:</span> {item.use}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* LEADERBOARD */}
            {tab === "leaderboard" && (
              <div className="space-y-5">
                <h3 className="text-center text-2xl font-black text-indigo-800">Grade {raw}</h3>
                {loadingLeaderboard ? (
                  <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
                  </div>
                ) : students.length === 0 ? (
                  <p className="text-center text-gray-500 py-20">No students found</p>
                ) : (
                  <>
                    {students.slice(0, 10).map((s, i) => {
                      const isMe = s.id === currentStudentId;
                      return (
                        <div key={s.id} className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${isMe ? "bg-gradient-to-r from-yellow-100 to-orange-100 border-yellow-500" : "bg-gray-50 border-gray-300"}`}>
                          <div className="text-3xl font-black">
                            {i === 0 ? "First" : i === 1 ? "Second" : i === 2 ? "Third" : `#${i + 1}`}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-lg">{isMe ? "YOU" : (s.name || "Student")}</p>
                            <p className="text-xs text-gray-600">Rank #{i + 1}</p>
                          </div>
                          <div className="text-2xl font-black text-indigo-700">{Number(s.totalPoints || 0)}</div>
                        </div>
                      );
                    })}
                    {myRank > 10 && me && (
                      <div className="p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-2xl border-4 border-blue-600 text-center">
                        <p className="text-xl font-black">Your Rank: #{myRank}</p>
                        <p className="text-4xl font-black text-blue-800 mt-2">{Number(me.totalPoints || 0)} pts</p>
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
  );
}