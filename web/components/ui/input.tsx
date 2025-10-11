import * as React from "react";
import { cn } from "../../lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-12 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-100 shadow-[0_0_18px_rgba(124,131,253,0.25)] backdrop-blur-xl transition-all placeholder:text-slate-400 focus:border-echoLavender/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-echoLavender/60 focus-visible:ring-offset-2 focus-visible:ring-offset-echoDark disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

export { Input };
