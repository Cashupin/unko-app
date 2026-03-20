"use client";

import { useState, useRef, useEffect } from "react";

const MONTH_NAMES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const MONTH_NAMES_SHORT = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const DAY_NAMES = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sá", "Do"];

type CalendarView = "day" | "month" | "year";

function formatDisplay(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return `${d} de ${MONTH_NAMES[m - 1]} de ${y}`;
}

function todayYMD(): string {
  return new Date().toISOString().slice(0, 10);
}

const ChevronLeft = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="10 4 6 8 10 12" />
  </svg>
);

const ChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="6 4 10 8 6 12" />
  </svg>
);

const navBtn = "flex items-center justify-center h-7 w-7 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-500 dark:text-zinc-400 transition-colors";

type DropdownPos = { top: number; left: number; width: number };

export function DatePicker({
  name,
  value: valueProp,
  defaultValue = "",
  onChange,
  min,
  max,
  placeholder = "Seleccionar fecha",
  id,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  placeholder?: string;
  id?: string;
}) {
  const isControlled = valueProp !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = isControlled ? valueProp! : internalValue;

  const [open, setOpen] = useState(false);
  const [view, setView] = useState<CalendarView>("day");
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);

  const initialDate = value ? new Date(value + "T00:00:00") : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());

  const buttonRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  function computePos() {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 280) });
  }

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        calendarRef.current?.contains(target)
      ) return;
      setOpen(false);
      setView("day");
    }
    if (open) {
      document.addEventListener("pointerdown", onPointerDown);
      return () => document.removeEventListener("pointerdown", onPointerDown);
    }
  }, [open]);

  function select(ymd: string) {
    if (!isControlled) setInternalValue(ymd);
    onChange?.(ymd);
    setOpen(false);
    setView("day");
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  // Derived values for selected date
  const selectedDate = value ? new Date(value + "T00:00:00") : null;
  const selectedYear = selectedDate?.getFullYear() ?? null;
  const selectedMonth = selectedDate?.getMonth() ?? null;

  // Year grid (decade)
  const decadeStart = Math.floor(viewYear / 10) * 10;

  // Day grid
  const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
  const startOffset = (firstDayOfMonth.getDay() + 6) % 7; // 0 = Monday
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const today = todayYMD();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div>
      {name && <input type="hidden" name={name} value={value} />}

      {/* Trigger */}
      <button
        ref={buttonRef}
        type="button"
        id={id}
        onClick={() => {
          if (!open) { computePos(); setView("day"); setOpen(true); }
          else setOpen(false);
        }}
        className={`w-full flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-left transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-500 ${
          value
            ? "border-zinc-200 bg-white text-zinc-900 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-100"
            : "border-zinc-200 bg-white text-zinc-400 dark:border-zinc-700 dark:bg-zinc-700 dark:text-zinc-500"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-60">
          <rect x="2" y="3" width="12" height="11" rx="2" />
          <line x1="5" y1="1" x2="5" y2="5" />
          <line x1="11" y1="1" x2="11" y2="5" />
          <line x1="2" y1="7" x2="14" y2="7" />
        </svg>
        <span className="flex-1 truncate">
          {value ? formatDisplay(value) : placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className={`shrink-0 opacity-40 transition-transform duration-150 ${open ? "rotate-180" : ""}`}>
          <polyline points="4 6 8 10 12 6" />
        </svg>
      </button>

      {/* Calendar — fixed positioned to avoid pushing form content */}
      {open && dropdownPos && (
        <div
          ref={calendarRef}
          style={{
            position: "fixed",
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
          }}
          className="rounded-xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-700 dark:bg-zinc-800 p-3"
        >

          {/* ── DAY VIEW ── */}
          {view === "day" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={prevMonth} className={navBtn} aria-label="Mes anterior">
                  <ChevronLeft />
                </button>
                <div className="flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => setView("month")}
                    className="px-1.5 py-0.5 rounded-md text-sm font-semibold capitalize text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {MONTH_NAMES[viewMonth]}
                  </button>
                  <button
                    type="button"
                    onClick={() => setView("year")}
                    className="px-1.5 py-0.5 rounded-md text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {viewYear}
                  </button>
                </div>
                <button type="button" onClick={nextMonth} className={navBtn} aria-label="Mes siguiente">
                  <ChevronRight />
                </button>
              </div>

              <div className="grid grid-cols-7 mb-1">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-[10px] font-medium text-zinc-400 dark:text-zinc-500 pb-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  if (day === null) return <div key={`e-${i}`} />;
                  const ymd = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const isSelected = ymd === value;
                  const isToday = ymd === today;
                  const isDisabled = (!!min && ymd < min) || (!!max && ymd > max);

                  return (
                    <button
                      key={ymd}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => select(ymd)}
                      className={`text-sm py-1.5 rounded-lg transition-colors disabled:opacity-25 disabled:cursor-not-allowed ${
                        isSelected
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                          : isToday
                          ? "bg-zinc-100 text-zinc-900 font-medium dark:bg-zinc-600 dark:text-zinc-100"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>

              {value && (
                <button
                  type="button"
                  onClick={() => select("")}
                  className="mt-2 w-full text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 py-1 transition-colors"
                >
                  Limpiar fecha
                </button>
              )}
            </>
          )}

          {/* ── MONTH VIEW ── */}
          {view === "month" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setViewYear(y => y - 1)} className={navBtn} aria-label="Año anterior">
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={() => setView("year")}
                  className="px-1.5 py-0.5 rounded-md text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                >
                  {viewYear}
                </button>
                <button type="button" onClick={() => setViewYear(y => y + 1)} className={navBtn} aria-label="Año siguiente">
                  <ChevronRight />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {MONTH_NAMES_SHORT.map((label, i) => {
                  const isSelected = selectedYear === viewYear && selectedMonth === i;
                  const isCurrentNav = i === viewMonth;

                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => { setViewMonth(i); setView("day"); }}
                      className={`py-2.5 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                          : isCurrentNav
                          ? "bg-zinc-100 text-zinc-900 font-medium dark:bg-zinc-600 dark:text-zinc-100"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* ── YEAR VIEW ── */}
          {view === "year" && (
            <>
              <div className="flex items-center justify-between mb-3">
                <button type="button" onClick={() => setViewYear(y => y - 10)} className={navBtn} aria-label="Década anterior">
                  <ChevronLeft />
                </button>
                <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {decadeStart} – {decadeStart + 11}
                </span>
                <button type="button" onClick={() => setViewYear(y => y + 10)} className={navBtn} aria-label="Década siguiente">
                  <ChevronRight />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 12 }, (_, i) => decadeStart + i).map(year => {
                  const isSelected = selectedYear === year;
                  const isCurrentNav = year === viewYear;

                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => { setViewYear(year); setView("month"); }}
                      className={`py-2.5 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 font-medium"
                          : isCurrentNav
                          ? "bg-zinc-100 text-zinc-900 font-medium dark:bg-zinc-600 dark:text-zinc-100"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {year}
                    </button>
                  );
                })}
              </div>
            </>
          )}

        </div>
      )}
    </div>
  );
}
