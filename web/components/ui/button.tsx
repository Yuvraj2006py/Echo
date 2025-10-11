import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "group relative inline-flex items-center justify-center overflow-hidden rounded-full text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-echoLavender/70 focus-visible:ring-offset-2 focus-visible:ring-offset-echoDark disabled:pointer-events-none disabled:opacity-60",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-echoBlue via-echoLavender to-echoBlue text-white shadow-glow hover:shadow-[0_0_30px_rgba(124,131,253,0.6)] hover:brightness-110",
        outline:
          "border border-white/20 bg-white/5 text-echoLavender hover:bg-white/10 hover:shadow-glow",
        ghost:
          "text-echoLavender/80 hover:bg-white/5 hover:text-white",
        subtle:
          "bg-white/10 text-white shadow-[0_0_14px_rgba(124,131,253,0.25)] hover:bg-white/20"
      },
      size: {
        default: "h-11 px-6",
        sm: "h-9 px-4 text-sm",
        lg: "h-12 px-10 text-base",
        icon: "h-11 w-11 rounded-full"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
