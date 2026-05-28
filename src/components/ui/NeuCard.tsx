import { cn } from "@/lib/utils";

interface NeuCardProps {
  children: React.ReactNode;
  className?: string;
}

export default function NeuCard({ children, className }: NeuCardProps) {
  return (
    <div
      className={cn(
        "bg-[#e0e5ec] rounded-[20px] shadow-neu-flat",
        className
      )}
    >
      {children}
    </div>
  );
}
