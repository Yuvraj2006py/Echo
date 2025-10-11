import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-wide text-echoLavender/90 backdrop-blur-xl transition-all duration-300",
  {
    variants: {
      variant: {
        default: "shadow-[0_0_14px_rgba(124,131,253,0.35)]",
        outline: "border-echoLavender/60 bg-transparent text-echoLavender",
        positive: "border-emerald-300/40 bg-emerald-400/10 text-emerald-200",
        negative: "border-rose-300/40 bg-rose-400/10 text-rose-200"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
