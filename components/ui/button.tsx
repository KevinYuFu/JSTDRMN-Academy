import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[25px] text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a837e6]",
  {
    variants: {
      variant: {
        default: "border border-white bg-[#9a00ff] text-white shadow-[0_5px_10px_rgba(0,0,0,.16)] hover:bg-[#a837e6]",
        black: "border border-white/20 bg-black text-white shadow-[0_5px_10px_rgba(0,0,0,.16)] hover:bg-white/10",
        ghost: "bg-transparent text-white/80 hover:text-white",
        cream: "bg-[#fff2cc] text-black hover:bg-white",
      },
      size: {
        default: "h-10 px-5",
        sm: "h-9 px-4",
        lg: "h-11 px-6",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
