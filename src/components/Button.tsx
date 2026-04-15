import { JSX, splitProps } from "solid-js";
import clsx from "clsx";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends JSX.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const variantClasses: Record<Variant, string> = {
  primary: clsx(
    "bg-brand-primary text-white font-semibold",
    "hover:bg-brand-primary-dark",
    "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
    "shadow-sm hover:shadow-md",
    "active:scale-[0.98]"
  ),
  secondary: clsx(
    "bg-brand-secondary text-white font-semibold",
    "hover:bg-violet-600",
    "focus-visible:ring-2 focus-visible:ring-brand-secondary focus-visible:ring-offset-2",
    "shadow-sm hover:shadow-md"
  ),
  ghost: clsx(
    "bg-transparent text-brand-muted font-medium",
    "hover:bg-black/5 hover:text-brand-text",
    "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
  ),
  outline: clsx(
    "bg-transparent text-brand-text font-medium border border-brand-border",
    "hover:border-brand-primary hover:text-brand-primary hover:bg-brand-primary-light/30",
    "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
  ),
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-pill",
  md: "h-10 px-5 text-sm rounded-pill",
  lg: "h-12 px-7 text-base rounded-pill",
};

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "fullWidth",
    "class",
    "children",
  ]);

  return (
    <button
      {...rest}
      class={clsx(
        "inline-flex items-center justify-center gap-2",
        "transition-all duration-[150ms] ease-out",
        "cursor-pointer select-none",
        "disabled:opacity-50 disabled:pointer-events-none",
        variantClasses[local.variant ?? "primary"],
        sizeClasses[local.size ?? "md"],
        local.fullWidth && "w-full",
        local.class
      )}
    >
      {local.children}
    </button>
  );
}
