import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { catTopics } from "../data/catTopicsData"; // topics list

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export default function FloatingTopicCard({
  topics,                // optional: override list
  startId,
  initiallyCollapsed = true,
  locked = false         // NEW: freeze card during exam
}) {
  // merge base topics if no override provided
  const allTopics = useMemo(
    () => (topics && topics.length ? topics : [...catTopics]),
    [topics]
  );

  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const [index, setIndex] = useState(() => {
    if (!startId) return 0;
    const i = allTopics.findIndex((t) => t.id === startId);
    return i >= 0 ? i : 0;
  });
  const [readMore, setReadMore] = useState(false);
  useEffect(() => setReadMore(false), [index]);

  // draggable
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ x: 24, y: 100 });
  const drag = useRef({ active: false, dx: 0, dy: 0 });

  const keepInBounds = useCallback((x, y) => {
    const el = cardRef.current;
    if (!el) return { x, y };
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth, vh = window.innerHeight, m = 8;
    return {
      x: Math.max(m, Math.min(x, vw - r.width - m)),
      y: Math.max(m, Math.min(y, vh - r.height - m))
    };
  }, []);

  const onPointerDown = (e) => {
    if (locked) return; // freeze drag
    const p = e.touches?.[0] ?? e;
    drag.current.active = true;
    drag.current.dx = p.clientX - pos.x;
    drag.current.dy = p.clientY - pos.y;
  };
  const onPointerMove = (e) => {
    if (locked || !drag.current.active) return;
    const p = e.touches?.[0] ?? e;
    setPos(keepInBounds(p.clientX - drag.current.dx, p.clientY - drag.current.dy));
  };

  useEffect(() => {
    const up = () => (drag.current.active = false);
    const onResize = () => setPos((p) => keepInBounds(p.x, p.y));
    window.addEventListener("mouseup", up);
    window.addEventListener("touchend", up, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("mouseup", up);
      window.removeEventListener("touchend", up);
      window.removeEventListener("resize", onResize);
    };
  }, [keepInBounds]);

  // When locked, auto-dock to a corner and collapse
  useEffect(() => {
    if (locked) {
      setCollapsed(true);
      setReadMore(false);
      setPos((p) => keepInBounds(16, 16));
    }
  }, [locked, keepInBounds]);

  const topic = allTopics[index] || allTopics[0];
  const go = (d) => setIndex((i) => Math.max(0, Math.min(i + d, allTopics.length - 1)));
  const jump = (e) => setIndex(Number(e.target.value));

  // scrollable content ref (when readMore is open)
  const contentRef = useRef(null);
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [index, readMore]);

  const containerClasses = [
    "fixed z-[9999] select-none",
    collapsed ? "w-auto" : "w-[22rem]",
    locked ? "opacity-70 pointer-events-none" : ""
  ].join(" ");

  return (
    <div
      ref={cardRef}
      className={containerClasses}
      style={{ left: pos.x, top: pos.y }}
      onMouseMove={onPointerMove}
      onTouchMove={onPointerMove}
      aria-hidden={locked ? "true" : "false"}
    >
      <div className="rounded-2xl shadow-2xl border bg-white overflow-hidden">
        {/* Drag header + collapse */}
        <div
          className="cursor-move bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-2 flex items-center justify-between"
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
        >
          <div className="font-semibold flex items-center gap-2">
            📚 Glossary of Terms
            {locked && (
              <span className="text-[10px] font-normal bg-white/20 px-2 py-0.5 rounded">
                Locked during exam
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => !locked && setCollapsed((c) => !c)}
            className={`rounded-md px-2 py-1 text-sm ${locked ? "bg-white/10" : "bg-white/20 hover:bg-white/30"}`}
            aria-expanded={!collapsed}
            aria-controls="glossary-body"
            aria-disabled={locked ? "true" : "false"}
            disabled={locked}
          >
            {locked ? "Locked" : collapsed ? "Show" : "Hide"}
          </button>
        </div>

        {!collapsed && (
          <div id="glossary-body" className="flex flex-col">
            {/* Topic title / definition */}
            <div className="px-4 pt-4">
              <h4 className="text-base font-semibold text-slate-800">{topic.title}</h4>
              <p className="text-xs text-slate-500">{index + 1} / {allTopics.length}</p>

              {/* Definition first */}
              {topic.definition && (
                <div className="mt-2 text-[0.95rem]">
                  <span className="font-semibold">Definition: </span>
                  <span>{topic.definition}</span>
                </div>
              )}
            </div>

            {/* Content area */}
            <div
              ref={contentRef}
              className={[
                "px-4",
                readMore
                  ? "mt-2 pb-4 max-h-[60vh] overflow-y-auto overscroll-contain"
                  : "p-4"
              ].join(" ")}
              style={readMore ? { WebkitOverflowScrolling: "touch" } : undefined}
            >
              {/* Function & Purpose bullets */}
              <div className="mt-1">
                <h5 className="mb-1 font-semibold text-sm">Function & Purpose</h5>
                <ul className="list-disc pl-5 space-y-2 text-[0.95rem]">
                  {(topic.bullets || []).map((b, i) => (
                    <li key={i} className="leading-snug">{b}</li>
                  ))}
                </ul>
              </div>

              {/* Read more toggle */}
              {(topic.details || topic.facts || topic.examples || topic.advantages || topic.uses || topic.disadvantages || topic.limitations || topic.applicationsICT) && (
                <div className="mt-3">
                  {!readMore ? (
                    <button
                      className="text-sm text-indigo-600 underline"
                      onClick={() => setReadMore(true)}
                      disabled={locked}
                    >
                      Read more…
                    </button>
                  ) : (
                    <>
                      <div className="mt-2 space-y-2 text-[0.95rem]">
                        {(topic.details || []).map((d, i) => <p key={`d-${i}`}>{d}</p>)}

                        {topic.facts && (
                          <div>
                            <h5 className="mt-2 mb-1 font-semibold text-sm">Quick Facts</h5>
                            <ul className="list-disc pl-5 space-y-1">
                              {topic.facts.map((f, i) => <li key={`f-${i}`}>{f}</li>)}
                            </ul>
                          </div>
                        )}

                        {topic.examples && (
                          <div>
                            <h5 className="mt-2 mb-1 font-semibold text-sm">Examples</h5>
                            <ul className="list-disc pl-5 space-y-1">
                              {topic.examples.map((ex, i) => <li key={`e-${i}`}>{ex}</li>)}
                            </ul>
                          </div>
                        )}

                        {["advantages","uses","disadvantages","limitations","applicationsICT"].map((k) => (
                          topic[k] ? (
                            <div key={k}>
                              <h5 className="mt-2 mb-1 font-semibold text-sm">
                                {k === "applicationsICT" ? "Applications in ICT" :
                                  k.charAt(0).toUpperCase() + k.slice(1)}
                              </h5>
                              <ul className="list-disc pl-5 space-y-1">
                                {topic[k].map((v, i) => <li key={`${k}-${i}`}>{v}</li>)}
                              </ul>
                            </div>
                          ) : null
                        ))}
                      </div>

                      <button
                        className="mt-3 text-sm text-indigo-600 underline"
                        onClick={() => setReadMore(false)}
                        disabled={locked}
                      >
                        Show less
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer controls */}
            <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md border px-3 py-1.5 text-sm bg-white hover:bg-gray-100 disabled:opacity-50"
                  onClick={() => go(-1)}
                  disabled={locked || index === 0}
                >
                  ← Prev
                </button>
                <button
                  className="rounded-md border px-3 py-1.5 text-sm bg-white hover:bg-gray-100 disabled:opacity-50"
                  onClick={() => go(+1)}
                  disabled={locked || index === allTopics.length - 1}
                >
                  Next →
                </button>
              </div>
              <div className="flex items-center gap-1">
                <label className="text-xs text-gray-500">Jump:</label>
                <select
                  className="text-sm border rounded-md px-2 py-1 bg-white"
                  value={index}
                  onChange={(e) => jump(e)}
                  disabled={locked}
                >
                  {allTopics.map((t, i) => (
                    <option key={t.id} value={i}>{i + 1}. {t.title}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dock */}
            <div className="px-4 py-2 bg-gray-50 flex justify-end">
              <button
                className="text-xs text-gray-500 underline"
                onClick={() => setPos({ x: 24, y: 100 })}
                disabled={locked}
              >
                Dock to corner
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
