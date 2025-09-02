// /utils/FloatingTopicCard.jsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { catTopics } from "../data/catTopicsData"; // topics list

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export default function FloatingTopicCard({
  topics,                 // optional: override list
  startId,
  initiallyCollapsed = true,
  locked = false,         // freeze card during exam

  /** ──────────────────────────────────────────────────────────────
   * POSITIONING / SAFE-AREA SETTINGS (tweak these as you like)
   * - baseMargin: the normal margin applied to all edges
   * - reserveRight: extra gap to leave on the RIGHT side
   *   (e.g., because another floating card sits at bottom-right)
   * - reserveBottom: extra gap to leave on the BOTTOM side
   * - startDock: where to place the card initially
   *   options: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'
   * ---------------------------------------------------------------- */
  baseMargin = 8,
  reserveRight = 96,      // 👈 Increase if you need a bigger gap on the right
  reserveBottom = 16,     // 👈 Increase if you need a bigger gap on the bottom
  startDock = "bottom-right",
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
  const [pos, setPos] = useState({ x: 0, y: 0 }); // will dock after mount
  const drag = useRef({ active: false, dx: 0, dy: 0 });

  /** Keep the card inside the viewport, honoring the "safe area".
   *  The safe area adds extra padding on the right/bottom so we avoid overlap
   *  with your other floating element at bottom-right.
   */
  const keepInBounds = useCallback(
    (x, y) => {
      const el = cardRef.current;
      if (!el) return { x, y };
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // LEFT/TOP margins are baseMargin; RIGHT/BOTTOM include your reserved gaps.
      const leftPad = baseMargin;
      const topPad = baseMargin;
      const rightPad = baseMargin + reserveRight;   // 👈 safe gap on the right
      const bottomPad = baseMargin + reserveBottom; // 👈 safe gap on the bottom

      return {
        x: clamp(x, leftPad, vw - r.width - rightPad),
        y: clamp(y, topPad, vh - r.height - bottomPad),
      };
    },
    [baseMargin, reserveRight, reserveBottom]
  );

  /** Dock the card to a corner (or center) on first render. */
  const dockCard = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const leftPad = baseMargin;
    const topPad = baseMargin;
    const rightPad = baseMargin + reserveRight;
    const bottomPad = baseMargin + reserveBottom;

    let x = leftPad;
    let y = topPad;

    switch (startDock) {
      case "bottom-right":
        x = vw - r.width - rightPad;
        y = vh - r.height - bottomPad;
        break;
      case "bottom-left":
        x = leftPad;
        y = vh - r.height - bottomPad;
        break;
      case "top-right":
        x = vw - r.width - rightPad;
        y = topPad;
        break;
      case "center":
        x = Math.round((vw - r.width) / 2);
        y = Math.round((vh - r.height) / 2);
        break;
      case "top-left":
      default:
        x = leftPad;
        y = topPad;
        break;
    }

    setPos(keepInBounds(x, y));
  }, [baseMargin, reserveRight, reserveBottom, startDock, keepInBounds]);

  // A helper to re-center (used when 'locked'). You can change it to 'dockCard()' if preferred.
  const centerCard = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.round((window.innerWidth - r.width) / 2);
    const y = Math.round((window.innerHeight - r.height) / 2);
    setPos(keepInBounds(x, y));
  }, [keepInBounds]);

  // Dock on first mount (instead of centering)
  useLayoutEffect(() => {
    dockCard();
    // also re-dock after short delay to account for fonts/layout shifts
    const t = setTimeout(dockCard, 50);
    return () => clearTimeout(t);
  }, [dockCard]);

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

  // When locked, collapse and **center** (you can change to 'dockCard()' if you prefer)
  useEffect(() => {
    if (locked) {
      setCollapsed(true);
      setReadMore(false);
      // wait a tick so collapse completes before reposition
      const t = setTimeout(centerCard, 0);
      return () => clearTimeout(t);
    }
  }, [locked, centerCard]);

  const topic = allTopics[index] || allTopics[0];
  const go = (d) => setIndex((i) => clamp(i + d, 0, allTopics.length - 1));
  const jump = (e) => setIndex(Number(e.target.value));

  // scrollable content ref (when readMore is open)
  const contentRef = useRef(null);
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [index, readMore]);

  const containerClasses = [
    "fixed z-[9999] select-none",
    collapsed ? "w-auto" : "w-[22rem]",
    locked ? "opacity-70 pointer-events-none" : "",
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
            📚 Knowledge Bank
            {locked && (
              <span className="text-[10px] font-normal bg-white/20 px-2 py-0.5 rounded">
                Locked during exam
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => !locked && setCollapsed((c) => !c)}
            className={`rounded-md ml-2 px-2 py-1 text-sm ${
              locked ? "bg-white/10" : "bg-white/20 hover:bg-white/30"
            }`}
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
              <h4 className="text-base font-semibold text-slate-800">
                {topic.title}
              </h4>
              <p className="text-xs text-slate-500">
                {index + 1} / {allTopics.length}
              </p>

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
                  : "p-4",
              ].join(" ")}
              style={readMore ? { WebkitOverflowScrolling: "touch" } : undefined}
            >
              {/* Function & Purpose bullets */}
              <div className="mt-1">
                <h5 className="mb-1 font-semibold text-sm">Function & Purpose</h5>
                <ul className="list-disc pl-5 space-y-2 text-[0.95rem]">
                  {(topic.bullets || []).map((b, i) => (
                    <li key={i} className="leading-snug">
                      {b}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Read more toggle */}
              {(topic.details ||
                topic.facts ||
                topic.examples ||
                topic.advantages ||
                topic.uses ||
                topic.disadvantages ||
                topic.limitations ||
                topic.applicationsICT) && (
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
                        {(topic.details || []).map((d, i) => (
                          <p key={`d-${i}`}>{d}</p>
                        ))}

                        {topic.facts && (
                          <div>
                            <h5 className="mt-2 mb-1 font-semibold text-sm">
                              Quick Facts
                            </h5>
                            <ul className="list-disc pl-5 space-y-1">
                              {topic.facts.map((f, i) => (
                                <li key={`f-${i}`}>{f}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {topic.examples && (
                          <div>
                            <h5 className="mt-2 mb-1 font-semibold text-sm">
                              Examples
                            </h5>
                            <ul className="list-disc pl-5 space-y-1">
                              {topic.examples.map((ex, i) => (
                                <li key={`e-${i}`}>{ex}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {["advantages", "uses", "disadvantages", "limitations", "applicationsICT"].map(
                          (k) =>
                            topic[k] ? (
                              <div key={k}>
                                <h5 className="mt-2 mb-1 font-semibold text-sm">
                                  {k === "applicationsICT"
                                    ? "Applications in ICT"
                                    : k.charAt(0).toUpperCase() + k.slice(1)}
                                </h5>
                                <ul className="list-disc pl-5 space-y-1">
                                  {topic[k].map((v, i) => (
                                    <li key={`${k}-${i}`}>{v}</li>
                                  ))}
                                </ul>
                              </div>
                            ) : null
                        )}
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
                    <option key={t.id} value={i}>
                      {i + 1}. {t.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tools */}
            <div className="px-4 py-2 bg-gray-50 flex justify-end gap-4">
              <button
                className="text-xs text-gray-500 underline"
                onClick={dockCard /* 👈 quick re-dock to your configured corner */}
                disabled={locked}
              >
                Dock
              </button>
              <button
                className="text-xs text-gray-500 underline"
                onClick={centerCard}
                disabled={locked}
              >
                Center
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
