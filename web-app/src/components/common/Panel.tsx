import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <section 
      className={cn("glass transition-all hover:border-white/20", className)} 
      {...props}
    >
      <div className="p-6">
        {children}
      </div>
    </section>
  );
}
