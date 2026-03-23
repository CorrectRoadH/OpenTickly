import { type HTMLAttributes, type ReactElement, type ReactNode } from "react";

type ShellPageProps = {
  children: ReactNode;
  widthClassName?: string;
} & HTMLAttributes<HTMLDivElement>;

export function ShellPage({
  children,
  className,
  widthClassName = "max-w-[1040px]",
  ...props
}: ShellPageProps): ReactElement {
  return (
    <div className={`min-h-full px-6 py-6 ${className ?? ""}`} {...props}>
      <div className={`mx-auto w-full ${widthClassName}`}>{children}</div>
    </div>
  );
}
