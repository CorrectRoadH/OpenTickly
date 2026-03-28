import { type HTMLAttributes, type ReactElement, type ReactNode } from "react";

type PageProps = {
  children: ReactNode;
  widthClassName?: string;
} & HTMLAttributes<HTMLDivElement>;

export function Page({
  children,
  className,
  widthClassName = "max-w-none",
  ...props
}: PageProps): ReactElement {
  return (
    <div className={`min-h-full px-5 py-5 ${className ?? ""}`} {...props}>
      <div className={`w-full ${widthClassName}`}>{children}</div>
    </div>
  );
}
