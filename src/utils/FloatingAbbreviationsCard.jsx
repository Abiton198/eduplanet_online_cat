import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

/**
 * FloatingAbbreviationsCard.jsx
 * Matches drag/float/collapse behavior used by FloatingTopicCard in your project.
 * - Draggable within viewport, using same pointer handling
 * - Default dock: bottom-right (to avoid other floating card)
 * - Center button (and auto-center when locked)
 * - Collapsible body; shows only header when collapsed
 * - Search + A↕Z sort in toolbar
 */
export default function FloatingAbbreviationsCard({
  data = [],
  initiallyCollapsed = true,
  locked = false,
  title = "Abbreviations"
}) {
  const [collapsed, setCollapsed] = useState(initiallyCollapsed);
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  // ---- Drag/position (mirrors FloatingTopicCard) ----
  const cardRef = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 }); // positioned after mount
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

  const centerCard = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.round((window.innerWidth  - r.width)  / 2);
    const y = Math.round((window.innerHeight - r.height) / 2);
    setPos(keepInBounds(x, y));
  }, [keepInBounds]);

  // NEW: default docking at bottom-right (instead of centering)
  const placeBottomRight = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const m = 24; // margin from edges
    const x = window.innerWidth  - r.width  - m;
    const y = window.innerHeight - r.height - m;
    setPos(keepInBounds(x, y));
  }, [keepInBounds]);

  // Dock bottom-right on first mount (plus a short delayed re-run)
  useLayoutEffect(() => {
    placeBottomRight();
    const t = setTimeout(placeBottomRight, 50);
    return () => clearTimeout(t);
  }, [placeBottomRight]);

  const onPointerDown = (e) => {
    if (locked) return;
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

  // When locked, collapse and center (unchanged)
  useEffect(() => {
    if (locked) {
      setCollapsed(true);
      const t = setTimeout(centerCard, 0);
      return () => clearTimeout(t);
    }
  }, [locked, centerCard]);

  // ---- Data: filtered + sorted ----
  const visibleData = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = Array.isArray(data) ? data : [];
    if (q) {
      items = items.filter((it) =>
        (`${it.abbr} ${it.fullForm} ${it.definition} ${it.use}` || "")
          .toLowerCase()
          .includes(q)
      );
    }
    return [...items].sort((a, b) =>
      sortDir === "asc" ? a.abbr.localeCompare(b.abbr) : b.abbr.localeCompare(a.abbr)
    );
  }, [data, query, sortDir]);

  const containerClasses = [
    "fixed z-[9999] select-none",
    collapsed ? "w-auto" : "w-[22rem]"
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
          className="cursor-move bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 flex items-center justify-between"
          onMouseDown={onPointerDown}
          onTouchStart={onPointerDown}
        >
          <div className="font-semibold flex items-center gap-2">
            {title}
            <span className="text-[10px] font-normal bg-white/20 px-2 py-0.5 rounded">
              {Array.isArray(data) ? data.length : 0}
            </span>
            {locked && (
              <span className="text-[10px] font-normal bg-white/20 px-2 py-0.5 rounded">Locked</span>
            )}
          </div>

          <button
            type="button"
            onClick={() => !locked && setCollapsed((c) => !c)}
            className={`rounded-md ml-2 px-2 py-1 text-sm ${locked ? "bg-white/10" : "bg-white/20 hover:bg-white/30"}`}
            aria-expanded={!collapsed}
            aria-controls="abbr-body"
            aria-disabled={locked ? "true" : "false"}
            disabled={locked}
          >
            {locked ? "Locked" : collapsed ? "Show" : "Hide"}
          </button>
        </div>

        {!collapsed && (
          <div id="abbr-body" className="flex flex-col">
            {/* Toolbar: search + sort */}
            <div className="px-4 pt-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search (abbr, full form, definition, use)"
                    className="w-full rounded-lg border border-gray-300 bg-white/90 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    aria-label="Search abbreviations"
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-white/80">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <circle cx="11" cy="11" r="7"></circle>
                      <path d="M21 21l-4.3-4.3"></path>
                    </svg>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                  className="shrink-0 rounded-lg border border-gray-300 bg-white/90 px-2 py-2 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label={`Sort ${sortDir === "asc" ? "descending" : "ascending"}`}
                  title={`Sort ${sortDir === "asc" ? "Z → A" : "A → Z"}`}
                >
                  {sortDir === "asc" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                      <path d="M7 7h10M7 12h7M7 17h4" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 rotate-180">
                      <path d="M7 7h10M7 12h7M7 17h4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* List */}
            <div className="px-4 pb-3 pt-2">
              <div
                id="abbr-list"
                className="overflow-y-auto max-h-[60vh] pr-2"
                role="list"
                aria-label="Abbreviation list"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {visibleData.map((item, idx) => (
                  <div
                    key={`${item.abbr}-${idx}`}
                    role="listitem"
                    className="mb-2 last:mb-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow transition-shadow"
                  >
                    <div className="font-bold text-gray-900">
                      {item.abbr}
                      <span className="ml-2 text-xs font-medium text-gray-500">{item.fullForm}</span>
                    </div>
                    <p className="mt-1 text-sm text-gray-700">
                      <span className="font-semibold">Definition:</span> {item.definition}
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      <span className="font-semibold">Use:</span> {item.use}
                    </p>
                  </div>
                ))}

                {visibleData.length === 0 && (
                  <div className="text-sm text-gray-600 p-3">No matches. Try a different search term.</div>
                )}
              </div>
            </div>

            {/* Tools / Footer */}
            <div className="px-4 py-2 bg-gray-50 flex justify-end gap-4 border-t">
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
