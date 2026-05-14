/* @vitest-environment jsdom */
import type { InputHTMLAttributes, ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ReportsDescriptionFilter } from "./ReportsDescriptionFilter.tsx";
import { ReportsProjectFilter } from "./ReportsProjectFilter.tsx";

vi.mock("@opentickly/web-ui", () => ({
  AppCheckbox: (props: InputHTMLAttributes<HTMLInputElement>) => (
    <input type="checkbox" {...props} />
  ),
  AppInput: ({
    leadingIcon: _leadingIcon,
    inputClassName: _inputClassName,
    ...props
  }: InputHTMLAttributes<HTMLInputElement> & {
    inputClassName?: string;
    leadingIcon?: ReactNode;
  }) => <input {...props} />,
}));

vi.mock("react-i18next", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-i18next")>();
  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string, values?: Record<string, string>) =>
        values?.value ? `${key}: ${values.value}` : key,
    }),
  };
});

describe("reports filters", () => {
  it("exposes description dropdown state to assistive technology", () => {
    render(<ReportsDescriptionFilter onChange={vi.fn()} value="" />);

    const trigger = screen.getByTestId("reports-filter-description");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).not.toHaveAttribute("aria-controls");

    fireEvent.click(trigger);

    const dropdown = screen.getByTestId("reports-filter-description-dropdown");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-controls", dropdown.id);
  });

  it("exposes project dropdown state to assistive technology", () => {
    render(
      <ReportsProjectFilter
        onClear={vi.fn()}
        onToggle={vi.fn()}
        options={[{ id: 1, label: "Website" }]}
        selected={new Set()}
      />,
    );

    const trigger = screen.getByTestId("reports-filter-project");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).not.toHaveAttribute("aria-controls");

    fireEvent.click(trigger);

    const dropdownId = trigger.getAttribute("aria-controls");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(dropdownId).toBeTruthy();
    expect(document.getElementById(dropdownId!)).toBeInTheDocument();
  });
});
