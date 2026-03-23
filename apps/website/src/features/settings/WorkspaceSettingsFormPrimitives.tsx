import { type InputHTMLAttributes, type ReactElement } from "react";

export function SettingsCard(props: {
  children: ReactElement | ReactElement[];
  description: string;
  title: string;
}): ReactElement {
  return (
    <section className="overflow-hidden rounded-[8px] border border-[#3a3a3a] bg-[#1b1b1b] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.32)]">
      <header className="border-b border-[#3a3a3a] px-5 py-[18px]">
        <h2 className="text-[14px] font-semibold leading-[22.96px] text-[#fafafa]">
          {props.title}
        </h2>
        <p className="text-[14px] font-medium leading-[21.98px] text-[#999]">{props.description}</p>
      </header>
      <div className="px-5">{props.children}</div>
    </section>
  );
}

export function LogoCard(): ReactElement {
  return (
    <div className="flex h-[216px] w-[216px] shrink-0 flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-[#3a3a3a] bg-[#1b1b1b] px-[22px] py-[22px] shadow-[0px_1px_3px_0px_rgba(0,0,0,0.32)]">
      <div className="pb-6 text-center">
        <div className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#888]">
          Made with
        </div>
        <div className="text-[34px] font-semibold leading-none text-[#b1b1b1]">toggl</div>
      </div>
      <p className="text-center text-[12px] font-medium leading-4 text-[#b1b1b1]">
        <span className="text-[#cd7fc2] underline">Upgrade</span> to use your logo on invoices and
        PDF exports
      </p>
    </div>
  );
}

export function FieldLabel({ label }: { label: string }): ReactElement {
  return (
    <label className="mb-[10px] flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.4px] text-[#fafafa]">
      <span>{label}</span>
      <span className="flex size-4 items-center justify-center rounded-full border border-[#4a4a4a] text-[10px] text-[#999]">
        i
      </span>
    </label>
  );
}

export function SectionCaption({ children }: { children: string }): ReactElement {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.44px] text-[#999]">{children}</p>
  );
}

export function RadioGroup(props: { children: ReactElement[]; label: string }): ReactElement {
  return (
    <div className="space-y-[10px] py-5">
      <SectionCaption>{props.label}</SectionCaption>
      <div className="space-y-[10px]">{props.children}</div>
    </div>
  );
}

export function RadioOption(props: {
  checked: boolean;
  label: string;
  onChange: () => void;
}): ReactElement {
  return (
    <label className="flex cursor-pointer items-center gap-[10px] text-[14px] font-medium leading-[14px] text-[#fafafa]">
      <input checked={props.checked} className="sr-only" onChange={props.onChange} type="radio" />
      <span className="flex size-[14px] items-center justify-center rounded-full border border-[#767676]">
        {props.checked ? <span className="size-[6px] rounded-full bg-[#cd7fc2]" /> : null}
      </span>
      <span>{props.label}</span>
    </label>
  );
}

export function CheckboxOption(props: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}): ReactElement {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[14px] font-medium leading-[17px] text-[#999]">
      <input
        checked={props.checked}
        className="sr-only"
        onChange={(event) => {
          props.onChange(event.target.checked);
        }}
        type="checkbox"
      />
      <span className="flex size-[14px] items-center justify-center rounded-[4px] border border-[#252525] bg-[#1b1b1b]">
        {props.checked ? <span className="size-[8px] rounded-[2px] bg-[#cd7fc2]" /> : null}
      </span>
      <span>{props.label}</span>
    </label>
  );
}

export function ToggleSection(props: {
  checked: boolean;
  children?: ReactElement | null;
  description: string;
  title: string;
  onChange: (checked: boolean) => void;
}): ReactElement {
  return (
    <div className="border-b border-[#232323] py-5 last:border-b-0">
      <label className="flex cursor-pointer items-start gap-5">
        <input
          checked={props.checked}
          className="sr-only"
          onChange={(event) => {
            props.onChange(event.target.checked);
          }}
          type="checkbox"
        />
        <span
          className={`mt-[5px] flex h-[16px] w-[28px] shrink-0 items-center rounded-full px-[2px] transition-colors ${
            props.checked ? "bg-[#cd7fc2]" : "bg-[#202020]"
          }`}
        >
          <span
            className={`size-[12px] rounded-full transition-transform ${
              props.checked ? "translate-x-[12px] bg-[#1b1b1b]" : "translate-x-0 bg-[#252525]"
            }`}
          />
        </span>
        <span className="block">
          <span className="block text-[14px] font-semibold leading-[22.96px] text-[#999]">
            {props.title}
          </span>
          <span className="block text-[14px] font-medium leading-[21.98px] text-[#999]">
            {props.description}
          </span>
          {props.children}
        </span>
      </label>
    </div>
  );
}

export function HiddenField(props: InputHTMLAttributes<HTMLInputElement>): ReactElement {
  return <input {...props} className="hidden" />;
}

export const textInputClassName =
  "w-full rounded-[8px] border border-[#666] bg-[#1b1b1b] px-3 py-[8.5px] text-[14px] font-medium text-[#fafafa] outline-none transition focus:border-[#cd7fc2]";
