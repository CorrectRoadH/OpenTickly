import { type HTMLAttributes, type ReactElement, type ReactNode } from "react";

type ShellPageProps = {
  children: ReactNode;
  widthClassName?: string;
} & HTMLAttributes<HTMLDivElement>;

export function ShellPage({
  children,
  className,
  widthClassName = "max-w-none",
  ...props
}: ShellPageProps): ReactElement {
  return (
    <div className={`min-h-full px-5 py-5 ${className ?? ""}`} {...props}>
      <div className={`w-full ${widthClassName}`}>{children}</div>
    </div>
  );
}
