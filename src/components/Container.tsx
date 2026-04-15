import { JSX, splitProps } from "solid-js";
import { Dynamic } from "solid-js/web";
import clsx from "clsx";

type Width = "narrow" | "default" | "wide" | "full";

interface ContainerProps extends JSX.HTMLAttributes<HTMLDivElement> {
  width?: Width;
  as?: string;
}

const widthClasses: Record<Width, string> = {
  narrow: "max-w-2xl",
  default: "max-w-5xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

export function Container(props: ContainerProps) {
  const [local, rest] = splitProps(props, ["width", "as", "class", "children"]);

  return (
    <Dynamic
      component={local.as ?? "div"}
      {...rest}
      class={clsx(
        "w-full mx-auto px-5 sm:px-8",
        widthClasses[local.width ?? "default"],
        local.class
      )}
    >
      {local.children}
    </Dynamic>
  );
}
