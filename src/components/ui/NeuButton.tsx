import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes } from "react";

interface NeuButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary";
  children: React.ReactNode;
  className?: string;
}

export default function NeuButton({
  variant = "default",
  children,
  className,
  ...props
}: NeuButtonProps) {
  return (
    <button
      className={cn(
        "bg-[#e0e5ec] rounded-[15px] shadow-neu-flat px-5 py-2.5 font-medium text-sm text-gray-700",
        "transition-shadow duration-150 active:shadow-neu-pressed",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && "bg-[#1565C0] text-white shadow-[6px_6px_12px_#0d4a8f,_-6px_-6px_12px_#1d80f1] active:shadow-[inset_4px_4px_8px_#0d4a8f,_inset_-4px_-4px_8px_#1d80f1]",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
