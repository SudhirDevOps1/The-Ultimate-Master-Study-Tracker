import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className, ...props }: PanelProps) {
  return (
    <section 
      className={cn("f7-card transition-all hover:border-white/10", className)} 
      {...props}
    >
      <div className="f7-card-content">
        {children}
      </div>
    </section>
  );
}
