import { cn } from "@/lib/utils";
import { InputHTMLAttributes } from "react";

interface NeuInputProps extends InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export default function NeuInput({ className, ...props }: NeuInputProps) {
  return (
    <input
      className={cn(
        "bg-[#e0e5ec] rounded-[15px] shadow-neu-pressed px-4 py-2.5 w-full",
        "text-gray-700 placeholder-gray-400 text-sm",
        "outline-none focus:ring-2 focus:ring-[#1565C0]/20 transition-shadow duration-150",
        className
      )}
      {...props}
    />
  );
}
