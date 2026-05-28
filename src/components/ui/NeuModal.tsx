"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type ModalLevel = 1 | 2 | 3;

interface NeuModalProps {
  isOpen: boolean;
  onClose: () => void;
  level?: ModalLevel;
  onLevelChange?: (level: ModalLevel) => void;
  children: React.ReactNode;
  className?: string;
  title?: string;
}

const levelHeights: Record<ModalLevel, string> = {
  1: "30vh",
  2: "60vh",
  3: "90vh",
};

export default function NeuModal({
  isOpen,
  onClose,
  level = 1,
  onLevelChange,
  children,
  className,
  title,
}: NeuModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        ref={contentRef}
        className={cn(
          "relative w-full max-w-2xl bg-[#e0e5ec] rounded-t-[24px]",
          "shadow-[0_-8px_32px_#b8bec7,_0_-2px_8px_#ffffff]",
          "transition-all duration-300 ease-in-out overflow-hidden flex flex-col",
          className
        )}
        style={{ height: levelHeights[level] }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-[#b8bec7]" />
        </div>

        {/* Level controls */}
        {onLevelChange && (
          <div className="flex justify-center gap-2 pb-2 flex-shrink-0">
            {([1, 2, 3] as ModalLevel[]).map((lvl) => (
              <button
                key={lvl}
                onClick={() => onLevelChange(lvl)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-150",
                  level === lvl
                    ? "bg-[#1565C0] scale-125"
                    : "bg-[#b8bec7] hover:bg-[#a3b1c6]"
                )}
                aria-label={`Expandir nivel ${lvl}`}
              />
            ))}
          </div>
        )}

        {/* Title */}
        {title && (
          <div className="px-6 pb-3 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-700">{title}</h2>
          </div>
        )}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}
