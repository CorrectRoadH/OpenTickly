import { Button, KIND, SHAPE, type ButtonProps } from "baseui/button";

export function AppButton(props: ButtonProps) {
  return (
    <Button
      kind={KIND.secondary}
      overrides={{
        BaseButton: {
          style: {
            backgroundColor: "var(--track-button)",
            borderColor: "var(--track-button)",
            color: "#121212",
            fontWeight: 600,
            borderRadius: "8px",
            minHeight: "36px",
          },
        },
      }}
      shape={SHAPE.default}
      {...props}
    />
  );
}
