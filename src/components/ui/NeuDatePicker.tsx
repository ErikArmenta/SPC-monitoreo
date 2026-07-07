"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateRange {
  startDate: string;
  endDate: string;
}

interface NeuDatePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  className?: string;
}

interface PopoverPos {
  top: number;
  right: number;
}

export default function NeuDatePicker({
  value,
  onChange,
  className,
}: NeuDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popoverPos, setPopoverPos] = useState<PopoverPos>({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideButton = buttonRef.current?.contains(target);
      const insidePopover = popoverRef.current?.contains(target);
      if (!insideButton && !insidePopover) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopoverPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setIsOpen((prev) => !prev);
  };

  const handleStartDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, startDate: e.target.value });
  };

  const handleEndDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...value, endDate: e.target.value });
  };

  const displayLabel =
    value.startDate && value.endDate
      ? `${value.startDate} — ${value.endDate}`
      : value.startDate
      ? `Desde ${value.startDate}`
      : "Filtrar por fecha";

  return (
    <div className={cn("relative inline-block", className)}>
      {/* Calendar toggle button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={cn(
          "flex items-center gap-2 bg-[#e0e5ec] rounded-[15px] px-4 py-2.5",
          "text-sm text-gray-600 font-medium",
          "transition-shadow duration-150",
          isOpen
            ? "shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]"
            : "shadow-[6px_6px_12px_#b8bec7,_-6px_-6px_12px_#ffffff] active:shadow-[inset_4px_4px_8px_#b8bec7,_inset_-4px_-4px_8px_#ffffff]"
        )}
        aria-label="Abrir selector de fechas"
        aria-expanded={isOpen}
      >
        <Calendar size={16} className="text-[#1565C0]" />
        <span className="truncate max-w-[180px]">{displayLabel}</span>
      </button>

      {/* Floating popover */}
      {isOpen && (
        <div
          ref={popoverRef}
          style={{
            position: "fixed",
            top: popoverPos.top,
            right: popoverPos.right,
            zIndex: 9999,
          }}
          className={cn(
            "bg-[#e0e5ec] rounded-[20px] p-5 w-72",
            "shadow-[8px_8px_16px_#b8bec7,_-8px_-8px_16px_#ffffff]"
          )}
        >
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Rango de fechas
          </p>

          <div className="flex flex-col gap-4">
            {/* Start date */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                Fecha inicio
              </label>
              <input
                type="date"
                value={value.startDate}
                onChange={handleStartDate}
                max={value.endDate || undefined}
                className={cn(
                  "w-full bg-[#e0e5ec] rounded-[12px] px-3 py-2 text-sm text-gray-700",
                  "shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff]",
                  "outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150",
                  "cursor-pointer"
                )}
              />
            </div>

            {/* End date */}
            <div>
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">
                Fecha fin
              </label>
              <input
                type="date"
                value={value.endDate}
                onChange={handleEndDate}
                min={value.startDate || undefined}
                className={cn(
                  "w-full bg-[#e0e5ec] rounded-[12px] px-3 py-2 text-sm text-gray-700",
                  "shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff]",
                  "outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150",
                  "cursor-pointer"
                )}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-5">
            <button
              type="button"
              onClick={() => {
                onChange({ startDate: "", endDate: "" });
                setIsOpen(false);
              }}
              className={cn(
                "flex-1 text-xs text-gray-500 bg-[#e0e5ec] rounded-[12px] py-2",
                "shadow-[4px_4px_8px_#b8bec7,_-4px_-4px_8px_#ffffff]",
                "active:shadow-[inset_3px_3px_6px_#b8bec7,_inset_-3px_-3px_6px_#ffffff]",
                "transition-shadow duration-150"
              )}
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className={cn(
                "flex-1 text-xs font-semibold text-white bg-[#1565C0] rounded-[12px] py-2",
                "shadow-[4px_4px_8px_#0d4a8f,_-4px_-4px_8px_#1d80f1]",
                "active:shadow-[inset_3px_3px_6px_#0d4a8f,_inset_-3px_-3px_6px_#1d80f1]",
                "transition-shadow duration-150"
              )}
            >
              Aplicar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
