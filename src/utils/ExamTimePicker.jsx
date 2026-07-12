/**
 * ExamTimePicker.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Scroll-wheel time picker used in the TeacherDashboard upload wizard.
 *
 * Two modes controlled by the `mode` prop:
 *   "duration"  — picks exam duration (0–5 hrs, 0/5/10…55 min)
 *                 value/onChange work in total minutes (number)
 *   "datetime"  — picks a due date + time for assignments
 *                 value/onChange work as ISO date string
 *
 * Usage — duration (exams and tests):
 *   <ExamTimePicker
 *     mode="duration"
 *     value={examDuration}
 *     onChange={setExamDuration}
 *   />
 *
 * Usage — due date (assignments):
 *   <ExamTimePicker
 *     mode="datetime"
 *     value={dueDate}
 *     onChange={setDueDate}
 *   />
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { Clock, CalendarDays, AlertTriangle } from 'lucide-react';

// ── Constants ─────────────────────────────────────────────────────────────
const ITEM_HEIGHT = 40;           // px per list item
const VISIBLE_H = 160;          // visible scroll window height
const PAD = (VISIBLE_H - ITEM_HEIGHT) / 2;  // centres selected item

// Duration mode options
const DURATION_HOURS = [0, 1, 2, 3, 4, 5];
const DURATION_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Datetime mode options
const DAY_HOURS = Array.from({ length: 24 }, (_, i) => i);   // 00–23
const DAY_MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

// Quick-select presets for duration mode
const DURATION_PRESETS = [
    { label: '30 min', value: 30 },
    { label: '45 min', value: 45 },
    { label: '1 hr', value: 60 },
    { label: '1½ hr', value: 90 },
    { label: '2 hr', value: 120 },
    { label: '2½ hr', value: 150 },
    { label: '3 hr', value: 180 },
];


// ── Scroll handler ────────────────────────────────────────────────────────
// Reads the current scroll position and maps it to the nearest option.
function useScrollPicker(options, initial, onChange) {
    const ref = useRef(null);
    const [value, setValue] = useState(initial);

    // Scroll wheel to selected item whenever value changes
    useEffect(() => {
        const idx = options.indexOf(value);
        if (ref.current && idx !== -1) {
            ref.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
        }
    }, [value, options]);

    const handleScroll = useCallback(() => {
        if (!ref.current) return;
        const idx = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
        const clamped = Math.max(0, Math.min(idx, options.length - 1));
        const picked = options[clamped];
        if (picked !== value) {
            setValue(picked);
            onChange(picked);
        }
    }, [options, value, onChange]);

    const jump = useCallback((newVal) => {
        setValue(newVal);
        onChange(newVal);
    }, [onChange]);

    return { ref, value, handleScroll, jump };
}


// ── Single scroll wheel ───────────────────────────────────────────────────
function WheelColumn({ options, pickerRef, onScroll, selected, format }) {
    return (
        <div
            ref={pickerRef}
            onScroll={onScroll}
            className="overflow-y-scroll text-center relative z-10 scrollbar-none"
            style={{ height: VISIBLE_H, width: 70, scrollSnapType: 'y mandatory' }}
        >
            <div style={{ height: PAD }} />
            {options.map((opt) => (
                <div
                    key={opt}
                    style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }}
                    className={`flex items-center justify-center font-black
                      transition-all cursor-pointer
                      ${opt === selected
                            ? 'text-indigo-600 dark:text-indigo-400 text-xl'
                            : 'text-slate-400 dark:text-slate-500 text-base hover:text-slate-600'
                        }`}
                    onClick={() => {
                        // Allow click-to-select as well as scroll
                        if (pickerRef.current) {
                            const idx = options.indexOf(opt);
                            pickerRef.current.scrollTo({ top: idx * ITEM_HEIGHT, behavior: 'smooth' });
                        }
                    }}
                >
                    {format ? format(opt) : String(opt).padStart(2, '0')}
                </div>
            ))}
            <div style={{ height: PAD }} />
        </div>
    );
}


// ── Wheel frame with selection highlight ─────────────────────────────────
function WheelFrame({ children }) {
    return (
        <div className="relative flex items-center gap-1">
            {/* Selection highlight bar */}
            <div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2
                   pointer-events-none z-0 rounded-2xl
                   bg-indigo-50 dark:bg-indigo-900/40
                   border-y-2 border-indigo-200 dark:border-indigo-700"
                style={{ height: ITEM_HEIGHT }}
            />

            {/* Top fade */}
            <div
                className="absolute inset-x-0 top-0 pointer-events-none z-20"
                style={{
                    height: PAD,
                    background: 'linear-gradient(to bottom, white, transparent)',
                }}
            />

            {/* Bottom fade */}
            <div
                className="absolute inset-x-0 bottom-0 pointer-events-none z-20"
                style={{
                    height: PAD,
                    background: 'linear-gradient(to top, white, transparent)',
                }}
            />

            {children}
        </div>
    );
}


// ══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT
// ══════════════════════════════════════════════════════════════════════════

export function ExamTimePicker({ mode = 'duration', value, onChange }) {

    // ── Duration mode ────────────────────────────────────────────────────
    if (mode === 'duration') {
        const initHr = Math.floor((value || 60) / 60);
        const initMin = Math.round(((value || 60) % 60) / 5) * 5;
        const totalMinutes = (h, m) => h * 60 + m;

        const hourPicker = useScrollPicker(
            DURATION_HOURS,
            initHr,
            (h) => onChange(totalMinutes(h, minPicker.value)),
        );
        const minPicker = useScrollPicker(
            DURATION_MINUTES,
            initMin,
            (m) => onChange(totalMinutes(hourPicker.value, m)),
        );

        const total = totalMinutes(hourPicker.value, minPicker.value);

        return (
            <div className="space-y-4">

                {/* Quick presets */}
                <div className="flex flex-wrap gap-2">
                    {DURATION_PRESETS.map((p) => (
                        <button
                            key={p.value}
                            type="button"
                            onClick={() => {
                                const h = Math.floor(p.value / 60);
                                const m = p.value % 60;
                                hourPicker.jump(h);
                                minPicker.jump(m);
                                onChange(p.value);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black
                          transition-all border-2
                          ${total === p.value
                                    ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400'
                                    : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-indigo-300'
                                }`}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Wheels */}
                <WheelFrame>
                    <WheelColumn
                        options={DURATION_HOURS}
                        pickerRef={hourPicker.ref}
                        onScroll={hourPicker.handleScroll}
                        selected={hourPicker.value}
                    />
                    <span className="text-2xl font-black text-slate-300 dark:text-slate-600
                           relative z-10 pb-1 select-none">
                        :
                    </span>
                    <WheelColumn
                        options={DURATION_MINUTES}
                        pickerRef={minPicker.ref}
                        onScroll={minPicker.handleScroll}
                        selected={minPicker.value}
                    />
                </WheelFrame>

                {/* Summary */}
                <div className="flex items-center gap-2 py-2.5 px-4 rounded-2xl
                        bg-indigo-50 dark:bg-indigo-900/30
                        border border-indigo-100 dark:border-indigo-800">
                    <Clock size={14} className="text-indigo-500" />
                    <p className="text-sm font-black text-indigo-700 dark:text-indigo-300">
                        {total === 0
                            ? 'No time limit'
                            : total < 60
                                ? `${total} minutes`
                                : total % 60 === 0
                                    ? `${total / 60} hour${total / 60 !== 1 ? 's' : ''}`
                                    : `${Math.floor(total / 60)} hr ${total % 60} min`
                        }
                    </p>
                </div>

                {/* No time limit toggle */}
                <button
                    type="button"
                    onClick={() => { hourPicker.jump(0); minPicker.jump(0); onChange(0); }}
                    className={`w-full py-2 rounded-2xl text-xs font-black border-2
                      transition-all
                      ${total === 0
                            ? 'border-slate-300 bg-slate-100 text-slate-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:border-slate-300'
                        }`}
                >
                    {total === 0 ? '✓ No time limit set' : 'Remove time limit'}
                </button>
            </div>
        );
    }

    // Safeguard: Ensure value is a true date string; if it's a raw number or empty, fallback to a clean tomorrow timestamp
    const isStringDate = typeof value === 'string' && !isNaN(Date.parse(value));
    const base = isStringDate ? new Date(value) : new Date(Date.now() + 86400000);
    // ── Datetime mode (assignment due date) ──────────────────────────────
    const hourPicker = useScrollPicker(
        DAY_HOURS,
        base.getHours(),
        (h) => onChange(buildISO(h, minPicker.value)),
    );
    const minPicker = useScrollPicker(
        DAY_MINUTES,
        Math.round(base.getMinutes() / 5) * 5,
        (m) => onChange(buildISO(hourPicker.value, m)),
    );

    const { hour, minute } = { hour: hourPicker.value, minute: minPicker.value };
    const hours = DAY_HOURS;
    const minutes = DAY_MINUTES;


    // ── Datetime mode (assignment due date) ──────────────────────────────
    const dateStr = base.toISOString().slice(0, 10);   // YYYY-MM-DD
    const isPast = isStringDate ? new Date(value) < new Date() : false;

    const buildISO = (h, m) => {
        // Build timestamp strictly tracking current date state input
        const currentTargetDate = document.querySelector('input[type="date"]')?.value || dateStr;
        const d = new Date(`${currentTargetDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
        return d.toISOString();
    };


    return (
        <div className="space-y-3">

            {/* Date selector */}
            <div>
                <label className="block text-xs font-black uppercase tracking-widest
                           text-slate-500 dark:text-slate-400 mb-1.5">
                    Due Date
                </label>
                <input
                    type="date"
                    value={dateStr}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => onChange(buildISO(hour, minute).replace(
                        /^\d{4}-\d{2}-\d{2}/,
                        e.target.value,
                    ))}
                    className="w-full border-2 border-slate-200 dark:border-slate-700
                     dark:bg-slate-800 dark:text-white p-3 rounded-2xl
                     outline-none text-sm focus:border-indigo-500 transition-colors"
                />
            </div>

            {/* Time wheels */}
            <div>
                <label className="block text-xs font-black uppercase tracking-widest
                           text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1">
                    <CalendarDays size={12} /> Due Time
                </label>

                <div className="border-2 border-slate-200 dark:border-slate-700
                        rounded-2xl p-3 bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center justify-center gap-1">

                        {/* Hours */}
                        <div
                            ref={hourPicker.ref}
                            onScroll={hourPicker.handleScroll}
                            className="overflow-y-scroll text-center relative z-10 scrollbar-none"
                            style={{ height: VISIBLE_H, width: 70, scrollSnapType: 'y mandatory' }}
                        >
                            <div style={{ height: PAD }} />
                            {hours.map((h) => (
                                <div
                                    key={h}
                                    style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }}
                                    className={`flex items-center justify-center font-black transition-all
                              ${h === hour
                                            ? 'text-indigo-600 dark:text-indigo-400 text-xl'
                                            : 'text-slate-400 dark:text-slate-500 text-base'
                                        }`}
                                >
                                    {String(h).padStart(2, '0')}
                                </div>
                            ))}
                            <div style={{ height: PAD }} />
                        </div>

                        <div className="flex items-center text-xl font-black text-slate-400">:</div>

                        {/* Minutes */}
                        <div
                            ref={minPicker.ref}
                            onScroll={minPicker.handleScroll}
                            className="overflow-y-scroll text-center relative z-10 scrollbar-none"
                            style={{ height: VISIBLE_H, width: 70, scrollSnapType: 'y mandatory' }}
                        >
                            <div style={{ height: PAD }} />
                            {minutes.map((m) => (
                                <div
                                    key={m}
                                    style={{ height: ITEM_HEIGHT, scrollSnapAlign: 'center' }}
                                    className={`flex items-center justify-center font-black transition-all
                              ${m === minute
                                            ? 'text-indigo-600 dark:text-indigo-400 text-xl'
                                            : 'text-slate-400 dark:text-slate-500 text-base'
                                        }`}
                                >
                                    {String(m).padStart(2, '0')}
                                </div>
                            ))}
                            <div style={{ height: PAD }} />
                        </div>

                    </div>
                </div>
            </div>

            {/* Summary */}
            <p className="text-xs text-slate-400 dark:text-slate-500">
                Due:{' '}
                <span className="font-bold text-indigo-500">
                    {new Date(dateStr).toLocaleDateString('en-ZA', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                    })}
                    {' at '}
                    {String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}
                </span>
            </p>

            {isPast && (
                <p className="text-xs font-bold text-rose-500 flex items-center gap-1">
                    <AlertTriangle size={12} /> This time has already passed
                </p>
            )}

        </div>
    );
}

export default ExamTimePicker;