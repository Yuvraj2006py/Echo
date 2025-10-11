import * as React from "react";
import { cn } from "../../lib/utils";

export interface SwitchProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onChange"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, ...props }, ref) => (
    <button
      ref={ref}
      role="switch"
      aria-checked={checked}
      onClick={(event) => {
        props.onClick?.(event);
        if (!event.defaultPrevented) {
          onCheckedChange?.(!checked);
        }
      }}
      className={cn(
        "relative inline-flex h-6 w-12 items-center rounded-full border border-white/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-echoLavender/60 focus-visible:ring-offset-2 focus-visible:ring-offset-echoDark",
        checked
          ? "bg-echoBlue shadow-glow"
          : "bg-white/10 shadow-[0_0_12px_rgba(124,131,253,0.2)]",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white text-xs font-semibold text-echoBlue transition-transform duration-300",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
      <span className="sr-only">Toggle</span>
    </button>
  )
);
Switch.displayName = "Switch";
