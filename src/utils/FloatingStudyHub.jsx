// utils/FloatingStudyHub.jsx

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LayoutGrid, ChevronDown } from "lucide-react";

/**
 * FloatingStudyHub.jsx
 * A utility component you can import in Exam.jsx or any other component.
 * This version does NOT rely on shadcn/ui, only React + Tailwind.
 */
export default function FloatingStudyHub({
  grade,
  currentStudentId,
  topics = [],
  abbreviationsData = [],
  selectedExam, // when truthy => hub is hidden
  position = "bottom-right", // "bottom-right" | "bottom-left"
  defaultTab = "leaderboard",
  initiallyOpen = false,
  LeaderboardCard,
  FloatingTopicCard,
  FloatingAbbreviationsCard,
}) {
  const [open, setOpen] = React.useState(initiallyOpen);
  const [tab, setTab] = React.useState(defaultTab);
  const showHub = !selectedExam;

  React.useEffect(() => {
    if (selectedExam && open) setOpen(false);
  }, [selectedExam, open]);

  const isRight = position === "bottom-right";

  return (
    <AnimatePresence>
      {showHub && (
        <motion.div
          key="floating-study-hub"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          className={`fixed z-50 ${isRight ? "right-4" : "left-4"} bottom-4 flex items-end gap-3`}
        >
          {/* Panel */}
          <AnimatePresence>
            {open && (
              <motion.div
                key="hub-panel"
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 6 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                className="w-[min(92vw,760px)] max-h-[70vh] overflow-hidden rounded-2xl shadow-xl border bg-white"
                role="dialog"
                aria-modal="true"
                aria-label="Study tools"
              >
                <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="text-sm font-medium">Study Hub</span>
                  </div>
                  <button
                    className="p-2 rounded hover:bg-gray-100"
                    onClick={() => setOpen(false)}
                    aria-label="Close study hub"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Tab buttons */}
                <div className="grid grid-cols-3 border-b">
                  <TabButton label="Leaderboard" active={tab === "leaderboard"} onClick={() => setTab("leaderboard")} />
                  <TabButton label="Topics" active={tab === "topics"} onClick={() => setTab("topics")} />
                  <TabButton label="Abbreviations" active={tab === "abbr"} onClick={() => setTab("abbr")} />
                </div>

                {/* Tab content */}
                <div className="p-3 overflow-y-auto max-h-[60vh]">
                  {tab === "leaderboard" && (
                    LeaderboardCard ? (
                      <LeaderboardCard grade={grade} currentStudentId={currentStudentId} />
                    ) : (
                      <Placeholder label="LeaderboardCard" />
                    )
                  )}
                  {tab === "topics" && (
                    FloatingTopicCard ? (
                      <FloatingTopicCard topics={topics} initiallyCollapsed={false} locked={!!selectedExam} />
                    ) : (
                      <Placeholder label="FloatingTopicCard" />
                    )
                  )}
                  {tab === "abbr" && (
                    FloatingAbbreviationsCard ? (
                      <FloatingAbbreviationsCard
                        data={abbreviationsData}
                        initiallyCollapsed={false}
                        locked={!!selectedExam}
                        title="Abbreviations"
                      />
                    ) : (
                      <Placeholder label="FloatingAbbreviationsCard" />
                    )
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* FAB */}
          <motion.button
            type="button"
            aria-label={open ? "Collapse study hub" : "Expand study hub"}
            onClick={() => setOpen((v) => !v)}
            className="group relative grid h-14 w-14 place-items-center rounded-full border bg-white shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            whileTap={{ scale: 0.98 }}
          >
            <LayoutGrid className={`h-6 w-6 transition-transform ${open ? "rotate-90" : "rotate-0"}`} />
            <span className="pointer-events-none absolute -top-1 -right-1 grid h-6 w-6 place-items-center rounded-full border bg-indigo-600 text-white text-[10px] font-semibold shadow-sm">
              3
            </span>
            <span className="sr-only">Study Hub</span>
            <ChevronDown
              className={`pointer-events-none absolute bottom-1 h-3 w-3 opacity-70 transition-transform ${open ? "rotate-180" : "rotate-0"}`}
            />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Placeholder({ label }) {
  return <div className="text-sm text-gray-400">Provide <code>{label}</code> via props.</div>;
}

function TabButton({ label, active, onClick }) {
  return (
    <button
      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
        active ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-600 hover:text-gray-800"
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/* -------------------------
   Example Usage in Exam.jsx
   -------------------------

import FloatingStudyHub from "../utils/FloatingStudyHub";

{currentStudentId && (
  <FloatingStudyHub
    grade={studentInfo?.grade}
    currentStudentId={currentStudentId}
    topics={catTopics}
    abbreviationsData={abbreviationsData}
    selectedExam={selectedExam}
    LeaderboardCard={LeaderboardCard}
    FloatingTopicCard={FloatingTopicCard}
    FloatingAbbreviationsCard={FloatingAbbreviationsCard}
  />
)}
*/
