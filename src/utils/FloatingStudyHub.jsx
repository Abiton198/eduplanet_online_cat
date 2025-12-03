// src/utils/FloatingStudyHub.jsx
import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, LayoutGrid, Trophy, BookOpen, Hash, Search,
  ChevronDown, ChevronUp
} from "lucide-react";

import { catTopics } from "../data/catTopicsData";
import { abbreviationsData } from "../data/abbreviationsData";
import {
  collection, onSnapshot, query, where, orderBy,
  getDocs, writeBatch
} from "firebase/firestore";
import { db } from "../utils/firebase";

export default function FloatingStudyHub({
  grade = "10",           // Accepts: "10", "Grade 10", "11", "12", etc.
  initiallyOpen = false,
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [tab, setTab] = useState("topics");
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTopic, setExpandedTopic] = useState(null);

  // CHANGE THIS TO true ONLY WHEN YOU (TEACHER) WANT TO RESET
  const SHOW_TEACHER_RESET = false;

  // Extract grade number: "Grade 10" → 10, "11A" → 11, etc.
  const currentGradeNumber = (() => {
    const match = String(grade).match(/(10|11|12)/);
    return match ? parseInt(match[1]) : 10;
  })();

  const gradeDisplay = `Grade ${currentGradeNumber}`;

  // Fetch leaderboard for current grade only
  useEffect(() => {
    const q = query(
      collection(db, "students"),
      where("gradeYear", "==", currentGradeNumber),
      orderBy("totalPoints", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStudents(data);
      setLoading(false);
    }, (err) => {
      console.error("Leaderboard error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [currentGradeNumber]);

  // Teacher: Reset THIS grade only
  const resetThisGrade = async () => {
    if (!window.confirm(`RESET ${gradeDisplay} LEADERBOARD TO ZERO?\n\nThis cannot be undone!`)) return;

    try {
      const snap = await getDocs(
        query(collection(db, "students"), where("gradeYear", "==", currentGradeNumber))
      );
      const batch = writeBatch(db);

      snap.forEach((doc) => {
        batch.update(doc.ref, {
          totalPoints: 0,
          quizHistory: [],
          weeklyPoints: {}
        });
      });

      await batch.commit();
      alert(`${gradeDisplay} leaderboard reset for 2026!`);
    } catch (err) {
      alert("Reset failed: " + err.message);
    }
  };

  // Teacher: Reset ALL grades 10–12
  const resetAllGrades = async () => {
    if (!window.confirm("NUCLEAR RESET: Wipe ALL Grade 10, 11, 12 points?\n\nIRREVERSIBLE!")) return;

    try {
      for (const g of [10, 11, 12]) {
        const snap = await getDocs(query(collection(db, "students"), where("gradeYear", "==", g)));
        const batch = writeBatch(db);
        snap.forEach((doc) => batch.update(doc.ref, { totalPoints: 0, quizHistory: [], weeklyPoints: {} }));
        await batch.commit();
      }
      alert("All Grades 10–12 leaderboards reset for 2026!");
    } catch (err) {
      alert("Failed: " + err.message);
    }
  };

  const filteredTopics = catTopics.filter(t =>
    t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.definition?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAbbr = abbreviationsData.filter(a =>
    a.abbr?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.fullForm?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AnimatePresence>
      {/* Floating Button */}
      {!open && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full shadow-2xl flex items-center justify-center text-white"
          whileTap={{ scale: 0.9 }}
        >
          <LayoutGrid size={32} />
        </motion.button>
      )}

      {/* Main Panel */}
      {open && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          className="fixed inset-0 z-[9999] bg-white flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <div className="flex items-center gap-3">
              <LayoutGrid size={28} />
              <div>
                <h3 className="font-bold text-xl">CAT Study Hub 2026</h3>
                <p className="text-xs opacity-90">{gradeDisplay} • CAPS Aligned</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-2 hover:bg-white/20 rounded-xl">
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
                onClick={() => { setTab(id); setSearchTerm(""); setExpandedTopic(null); }}
                className={`flex-1 py-4 font-bold flex items-center justify-center gap-2 ${
                  tab === id ? "text-indigo-600 border-b-4 border-indigo-600 bg-white" : "text-gray-600"
                }`}
              >
                <Icon size={18} /> {label}
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
                className="w-full pl-10 pr-4 py-3 rounded-xl border bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {/* TOPICS */}
            {tab === "topics" && filteredTopics.map(topic => (
              <div key={topic.id} className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl border-2 border-indigo-200 overflow-hidden">
                <button
                  onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)}
                  className="w-full px-5 py-5 flex justify-between items-center text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center text-2xl text-white font-bold">
                      {topic.title[0]}
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-indigo-900">{topic.title}</h3>
                      <p className="text-xs text-gray-600 line-clamp-2">{topic.definition}</p>
                    </div>
                  </div>
                  {expandedTopic === topic.id ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                </button>
                {expandedTopic === topic.id && (
                  <div className="px-5 pb-6 pt-2 bg-white/90 text-sm space-y-4">
                    <p className="text-gray-800">{topic.definition}</p>
                    {topic.bullets && <div><strong>Purpose:</strong> {topic.bullets.join(" • ")}</div>}
                    {topic.examples && <div><strong>Examples:</strong> {topic.examples.join(" • ")}</div>}
                  </div>
                )}
              </div>
            ))}

            {/* ABBREVIATIONS */}
            {tab === "abbreviations" && filteredAbbr.map(item => (
              <div key={item.abbr} className="p-5 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl border-2 border-purple-300">
                <div className="text-4xl font-black text-purple-800">{item.abbr}</div>
                <div className="text-lg font-bold text-indigo-800 mt-1">{item.fullForm}</div>
                <p className="text-sm text-gray-700 mt-2"><strong>Use:</strong> {item.use}</p>
              </div>
            ))}

            {/* LEADERBOARD */}
            {tab === "leaderboard" && (
              <div className="space-y-6">
                {/* Teacher Reset Tools */}
                {SHOW_TEACHER_RESET && (
                  <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-6 text-center">
                    <h3 className="text-2xl font-bold text-red-800 mb-4">TEACHER RESET 2026</h3>
                    <div className="space-y-3">
                      <button onClick={resetThisGrade} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl">
                        Reset {gradeDisplay} Only
                      </button>
                      <button onClick={resetAllGrades} className="w-full bg-black text-white font-bold py-3 rounded-xl">
                        Reset ALL Grades 10–12
                      </button>
                    </div>
                  </div>
                )}

                <h2 className="text-center text-3xl font-black text-indigo-800">
                  {gradeDisplay} Leaderboard 2026
                </h2>

                {loading ? (
                  <div className="text-center py-20">
                    <div className="inline-block animate-spin rounded-full h-16 w-16 border-8 border-indigo-600 border-t-transparent"></div>
                  </div>
                ) : students.length === 0 ? (
                  <p className="text-center text-2xl text-gray-400 py-20">
                    No points yet in {gradeDisplay}
                  </p>
                ) : (
                  students.slice(0, 15).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-5 p-6 bg-white rounded-3xl border-4 border-gray-200 shadow-lg">
                      <div className="text-5xl font-black text-gray-800 w-20 text-center">
                        {i === 0 ? "1st" : i === 1 ? "2nd" : i === 2 ? "3rd" : `#${i + 1}`}
                      </div>
                      <div className="flex-1">
                        <p className="text-2xl font-bold">{s.name || "Student"}</p>
                        <p className="text-sm text-gray-600">{gradeDisplay}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-4xl font-black text-indigo-700">
                          {Number(s.totalPoints || 0).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">points</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}