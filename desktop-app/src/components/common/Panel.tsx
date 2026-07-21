import type { ReactNode, HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface PanelProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  className?: string;
}

export function Panel({ children, className, ...props }: PanelProps) {
  return <section className={cn("glass rounded-3xl p-4 md:p-5", className)} {...props}>{children}</section>;
}
