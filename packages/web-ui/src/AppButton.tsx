import { Button, KIND, SHAPE, type ButtonProps } from "baseui/button";

export function AppButton(props: ButtonProps) {
  return (
    <Button
      kind={KIND.secondary}
      overrides={{
        BaseButton: {
          style: {
            borderColor: "#c6d8cb",
            color: "#163227",
            fontWeight: 600,
          },
        },
      }}
      shape={SHAPE.pill}
      {...props}
    />
  );
}
