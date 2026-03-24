import { Button, SHAPE, type ButtonProps } from "baseui/button";

import { getButtonOverrides, type AppButtonTone } from "./buttonStyles.ts";

type AppButtonProps = Omit<ButtonProps, "kind"> & {
  tone?: AppButtonTone;
};

export function AppButton({ overrides, tone = "primary", ...props }: AppButtonProps) {
  return (
    <Button overrides={getButtonOverrides(tone, overrides)} shape={SHAPE.default} {...props} />
  );
}
