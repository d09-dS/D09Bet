"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import { de, enUS } from "react-day-picker/locale";
import { Calendar, ChevronLeft, ChevronRight, Clock, ChevronUp, ChevronDown } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

interface DateTimeInputProps {
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  required?: boolean;
  className?: string;
  type?: "date" | "datetime-local" | "time";
}

/* ── Time spinner: up/down buttons around a number ── */
function TimeSpinner({
  value,
  onChange,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  max: number;
}) {
  const num = parseInt(value, 10);
  const inc = () => onChange(String((num + 1) % (max + 1)).padStart(2, "0"));
  const dec = () => onChange(String((num - 1 + max + 1) % (max + 1)).padStart(2, "0"));

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={inc}
        className="h-6 w-10 flex items-center justify-center rounded-t-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ChevronUp className="h-3.5 w-3.5" />
      </button>
      <div className="h-9 w-10 flex items-center justify-center rounded-lg border border-input bg-secondary/50 text-sm font-bold tabular-nums text-white">
        {value}
      </div>
      <button
        type="button"
        onClick={dec}
        className="h-6 w-10 flex items-center justify-center rounded-b-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <ChevronDown className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function DateTimeInput({
  value = "",
  onChange,
  className,
}: DateTimeInputProps) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedDate = value ? new Date(value) : undefined;
  const [hour, setHour] = useState(selectedDate ? String(selectedDate.getHours()).padStart(2, "0") : "12");
  const [minute, setMinute] = useState(selectedDate ? String(selectedDate.getMinutes()).padStart(2, "0") : "00");

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setHour(String(d.getHours()).padStart(2, "0"));
      setMinute(String(d.getMinutes()).padStart(2, "0"));
    }
  }, [value]);

  function emitValue(date: Date, h: string, m: string) {
    const d = new Date(date);
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    onChange?.({ target: { value: `${yyyy}-${mm}-${dd}T${h}:${m}` } });
  }

  function handleDaySelect(day: Date | undefined) {
    if (!day) return;
    emitValue(day, hour, minute);
  }

  function handleTimeChange(h: string, m: string) {
    setHour(h);
    setMinute(m);
    if (selectedDate) emitValue(selectedDate, h, m);
  }

  const displayValue = selectedDate
    ? selectedDate.toLocaleDateString(locale === "de" ? "de-DE" : "en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  // Today at midnight for disabling past days
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 8, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);
    return () => {
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  // Close on click outside (check both trigger and popup)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        popupRef.current && !popupRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-10 w-full items-center gap-3 rounded-xl border bg-secondary/30 px-3 text-sm transition-all text-left",
          open
            ? "border-primary ring-2 ring-primary/20"
            : "border-input hover:border-primary/30",
          !displayValue && "text-muted-foreground",
        )}
      >
        <Calendar className={cn("h-4 w-4 shrink-0", open ? "text-primary" : "text-muted-foreground")} />
        <span className="flex-1 truncate">
          {displayValue || (locale === "de" ? "Datum & Uhrzeit wählen" : "Select date & time")}
        </span>
      </button>

      {open && createPortal(
        <AnimatePresence>
          <motion.div
            ref={popupRef}
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="fixed z-[9998] rounded-xl border border-border bg-popover shadow-xl"
            style={{ top: pos.top, left: pos.left }}
          >
            <style>{`
              .dotbet-cal .rdp-day { padding: 2px; }
              .dotbet-cal .rdp-day_button {
                width: 36px; height: 36px; border-radius: 8px;
                font-size: 14px; font-weight: 500;
                transition: background 0.15s, color 0.15s;
                display: flex; align-items: center; justify-content: center;
              }
              .dotbet-cal .rdp-day_button:hover:not(:disabled) {
                background: rgba(245,158,11,0.1); color: #F59E0B;
              }
              .dotbet-cal .rdp-selected .rdp-day_button {
                background: #F59E0B !important; color: #0A0E13 !important;
                font-weight: 700;
              }
              .dotbet-cal .rdp-today .rdp-day_button {
                border: 1px solid rgba(245,158,11,0.5);
              }
              .dotbet-cal .rdp-disabled .rdp-day_button {
                color: rgba(148,163,184,0.25) !important;
                pointer-events: none;
                text-decoration: line-through;
              }
              .dotbet-cal .rdp-outside .rdp-day_button {
                color: rgba(148,163,184,0.3);
              }
              .dotbet-cal .rdp-chevron { display: none; }
            `}</style>

            <DayPicker
              className="dotbet-cal"
              mode="single"
              selected={selectedDate}
              onSelect={handleDaySelect}
              locale={locale === "de" ? de : enUS}
              disabled={{ before: today }}
              showOutsideDays
              classNames={{
                root: "p-3",
                months: "flex flex-col",
                month_caption: "flex items-center justify-center mb-2",
                caption_label: "text-sm font-semibold",
                nav: "flex items-center justify-between absolute top-3 left-3 right-3",
                button_previous: "h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
                button_next: "h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground",
                month_grid: "w-full border-collapse",
                weekdays: "flex",
                weekday: "w-10 text-center text-xs font-medium text-muted-foreground py-1",
                week: "flex",
              }}
              components={{
                Chevron: ({ orientation }) =>
                  orientation === "left" ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  ),
              }}
            />

            {/* Time picker with spinners */}
            <div className="border-t border-border px-4 py-3 flex items-center justify-center gap-3">
              <Clock className="h-4 w-4 text-white shrink-0" />
              <TimeSpinner
                value={hour}
                onChange={(h) => handleTimeChange(h, minute)}
                max={23}
              />
              <span className="text-lg font-bold text-white">:</span>
              <TimeSpinner
                value={minute}
                onChange={(m) => handleTimeChange(hour, m)}
                max={59}
              />
              <span className="text-xs text-white ml-1">
                {locale === "de" ? "Uhr" : "h"}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}
