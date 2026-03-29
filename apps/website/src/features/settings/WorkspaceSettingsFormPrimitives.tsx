import { Upload, Trash2 } from "lucide-react";
import { type InputHTMLAttributes, type ReactElement, useRef, useState } from "react";
import { toast } from "sonner";

import { postWorkspaceLogo, deleteWorkspaceLogo } from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";

export function SettingsCard(props: {
  children: ReactElement | ReactElement[];
  description: string;
  title: string;
}): ReactElement {
  return (
    <section className="overflow-hidden rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] shadow-[0px_1px_3px_0px_var(--track-shadow-subtle)]">
      <header className="border-b border-[var(--track-border)] px-5 py-[18px]">
        <h2 className="text-[14px] font-semibold leading-[22.96px] text-[var(--track-text)]">
          {props.title}
        </h2>
        <p className="text-[14px] font-medium leading-[21.98px] text-[var(--track-text-soft)]">
          {props.description}
        </p>
      </header>
      <div className="px-5">{props.children}</div>
    </section>
  );
}

export function LogoCard({
  logoUrl,
  workspaceId,
  onLogoChange,
}: {
  logoUrl: string;
  workspaceId: number;
  onLogoChange: (url: string) => void;
}): ReactElement {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File): Promise<void> {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await unwrapWebApiResult(
        postWorkspaceLogo({
          path: { workspace_id: workspaceId },
          body: formData as never,
          bodySerializer: (body) => body as FormData,
        }),
      );
      onLogoChange(result.logo ?? "");
      toast.success("Logo uploaded");
    } catch {
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(): Promise<void> {
    setUploading(true);
    try {
      await unwrapWebApiResult(
        deleteWorkspaceLogo({
          path: { workspace_id: workspaceId },
        }),
      );
      onLogoChange("");
      toast.success("Logo removed");
    } catch {
      toast.error("Failed to remove logo");
    } finally {
      setUploading(false);
    }
  }

  const hasLogo = logoUrl.length > 0;

  return (
    <div className="flex h-[216px] w-[216px] shrink-0 flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-[var(--track-border)] bg-[var(--track-surface)] px-[22px] py-[22px] shadow-[0px_1px_3px_0px_var(--track-shadow-subtle)]">
      <input
        accept="image/png,image/jpeg,image/gif,image/svg+xml"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void handleUpload(file);
          }
          event.target.value = "";
        }}
        ref={fileInputRef}
        type="file"
      />

      {hasLogo ? (
        <>
          <img
            alt="Workspace logo"
            className="mb-3 max-h-[120px] max-w-[160px] rounded-[8px] object-contain"
            src={logoUrl}
          />
          <div className="flex gap-2">
            <button
              className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-[12px] font-medium text-[var(--track-text-muted)] hover:text-white"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <Upload className="size-3" />
              Replace
            </button>
            <button
              className="flex items-center gap-1 rounded-[6px] px-2 py-1 text-[12px] font-medium text-red-400 hover:text-red-300"
              disabled={uploading}
              onClick={() => void handleDelete()}
              type="button"
            >
              <Trash2 className="size-3" />
              Remove
            </button>
          </div>
        </>
      ) : (
        <button
          className="flex flex-col items-center gap-3"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          type="button"
        >
          <Upload className="size-8 text-[var(--track-text-muted)]" />
          <span className="text-center text-[12px] font-medium leading-4 text-[var(--track-text-muted)]">
            {uploading ? "Uploading…" : "Upload your workspace logo"}
          </span>
        </button>
      )}
    </div>
  );
}

export function FieldLabel({ label }: { label: string }): ReactElement {
  return (
    <label className="mb-[10px] flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--track-text)]">
      <span>{label}</span>
      <span className="flex size-4 items-center justify-center rounded-full border border-[var(--track-control-disabled)] text-[10px] text-[var(--track-text-soft)]">
        i
      </span>
    </label>
  );
}

export function SectionCaption({ children }: { children: string }): ReactElement {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.44px] text-[var(--track-text-soft)]">
      {children}
    </p>
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
    <label className="flex cursor-pointer items-center gap-[10px] text-[14px] font-medium leading-[14px] text-[var(--track-text)]">
      <input checked={props.checked} className="sr-only" onChange={props.onChange} type="radio" />
      <span className="flex size-[14px] items-center justify-center rounded-full border border-[var(--track-text-disabled)]">
        {props.checked ? (
          <span className="size-[6px] rounded-full bg-[var(--track-accent-secondary)]" />
        ) : null}
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
    <label className="flex cursor-pointer items-center gap-2 text-[14px] font-medium leading-[17px] text-[var(--track-text-soft)]">
      <input
        checked={props.checked}
        className="sr-only"
        onChange={(event) => {
          props.onChange(event.target.checked);
        }}
        type="checkbox"
      />
      <span className="flex size-[14px] items-center justify-center rounded-[4px] border border-[var(--track-border)] bg-[var(--track-surface)]">
        {props.checked ? (
          <span className="size-[8px] rounded-[2px] bg-[var(--track-accent-secondary)]" />
        ) : null}
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
    <div className="border-b border-[var(--track-surface-muted)] py-5 last:border-b-0">
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
            props.checked ? "bg-[var(--track-accent-secondary)]" : "bg-[var(--track-panel)]"
          }`}
        >
          <span
            className={`size-[12px] rounded-full transition-transform ${
              props.checked
                ? "translate-x-[12px] bg-[var(--track-surface)]"
                : "translate-x-0 bg-[var(--track-border)]"
            }`}
          />
        </span>
        <span className="block">
          <span className="block text-[14px] font-semibold leading-[22.96px] text-[var(--track-text-soft)]">
            {props.title}
          </span>
          <span className="block text-[14px] font-medium leading-[21.98px] text-[var(--track-text-soft)]">
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
  "w-full rounded-[8px] border border-[var(--track-text-disabled)] bg-[var(--track-surface)] px-3 py-[8.5px] text-[14px] font-medium text-[var(--track-text)] outline-none transition focus:border-[var(--track-accent-secondary)]";
