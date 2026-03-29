import { Button, SHAPE, type ButtonProps } from "baseui/button";

import { getButtonOverrides, type AppButtonSize, type AppButtonTone } from "./buttonStyles.ts";

type AppButtonProps = Omit<ButtonProps, "kind" | "size"> & {
  tone?: AppButtonTone;
  size?: AppButtonSize;
};

export function AppButton({
  overrides,
  tone = "primary",
  size = "default",
  ...props
}: AppButtonProps) {
  return (
    <Button
      overrides={getButtonOverrides(tone, size, overrides)}
      shape={SHAPE.default}
      {...props}
    />
  );
}
