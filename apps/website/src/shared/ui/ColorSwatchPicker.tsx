import type { ReactElement } from "react";

type ColorSwatchPickerProps = {
  colors: readonly string[];
  onSelect: (color: string) => void;
  selected: string;
};

export function ColorSwatchPicker({
  colors,
  onSelect,
  selected,
}: ColorSwatchPickerProps): ReactElement {
  return (
    <div className="grid grid-cols-5 gap-2">
      {colors.map((color) => (
        <button
          aria-label={`Select color ${color}`}
          className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${
            selected === color
              ? "border-white/80 bg-white/8"
              : "border-transparent hover:border-white/25"
          }`}
          key={color}
          onClick={() => onSelect(color)}
          type="button"
        >
          <span
            className="h-5 w-5 rounded-full border border-black/20"
            style={{ backgroundColor: color }}
          />
        </button>
      ))}
    </div>
  );
}
