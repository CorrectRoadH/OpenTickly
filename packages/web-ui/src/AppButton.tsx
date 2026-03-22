import { Button, KIND, SHAPE, type ButtonProps } from "baseui/button";

export function AppButton(props: ButtonProps) {
  return (
    <Button
      kind={KIND.secondary}
      overrides={{
        BaseButton: {
          style: {
            backgroundColor: "#c792d1",
            borderColor: "#c792d1",
            color: "#18181b",
            fontWeight: 600,
            borderRadius: "0.75rem",
          },
        },
      }}
      shape={SHAPE.default}
      {...props}
    />
  );
}
