import { Upload } from "lucide-react";
import { type InputHTMLAttributes, type ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { AppCheckbox, AppSwitch } from "@opentickly/web-ui";

import { deleteWorkspaceLogo, client } from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult, WebApiError } from "../../shared/api/web-client.ts";
import type { PostWorkspaceLogoResponses } from "../../shared/api/generated/public-track/types.gen.ts";
import { ImageUploadZone } from "../../shared/ui/ImageUploadZone.tsx";

export function SettingsCard(props: {
  children: ReactElement | ReactElement[];
  description: string;
  title: string;
}): ReactElement {
  return (
    <section className="overflow-hidden rounded-[10px] border-2 border-[var(--track-border)] bg-[var(--track-surface)] shadow-[var(--track-depth-shadow-rest)]">
      <header className="border-b border-[var(--track-border)] px-4 py-4">
        <h2 className="text-[14px] font-semibold leading-[22.96px] text-[var(--track-text)]">
          {props.title}
        </h2>
        <p className="text-[14px] font-medium leading-[21.98px] text-[var(--track-text-soft)]">
          {props.description}
        </p>
      </header>
      <div className="px-4">{props.children}</div>
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
  const { t } = useTranslation("settings");

  async function handleUpload(file: File): Promise<void> {
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await unwrapWebApiResult(
        client.post<PostWorkspaceLogoResponses>({
          body: formData,
          bodySerializer: null,
          headers: { "Content-Type": null },
          url: `/workspaces/${workspaceId}/logo`,
        }),
      );
      onLogoChange(result.logo ?? "");
      toast.success(t("logoUploaded", { ns: "toast" }));
    } catch (err) {
      toast.error(
        err instanceof WebApiError ? err.userMessage : t("failedToUploadLogo", { ns: "toast" }),
      );
    }
  }

  async function handleDelete(): Promise<void> {
    try {
      await unwrapWebApiResult(
        deleteWorkspaceLogo({
          path: { workspace_id: workspaceId },
        }),
      );
      onLogoChange("");
      toast.success(t("logoRemoved", { ns: "toast" }));
    } catch (err) {
      toast.error(
        err instanceof WebApiError ? err.userMessage : t("failedToRemoveLogo", { ns: "toast" }),
      );
    }
  }

  return (
    <ImageUploadZone
      accept="image/png,image/jpeg,image/gif,image/svg+xml"
      imageUrl={logoUrl || null}
      onDelete={handleDelete}
      onUpload={handleUpload}
      placeholder={
        <>
          <Upload className="size-8 text-[var(--track-text-muted)] transition-colors group-hover:text-[var(--track-accent-text)]" />
          <span className="text-center text-[12px] font-medium leading-4 text-[var(--track-text-muted)]">
            {t("uploadYourWorkspaceLogo")}
          </span>
        </>
      }
      variant="square"
    >
      <img
        alt={t("workspaceLogo")}
        className="mb-3 max-h-[120px] max-w-[160px] rounded-[8px] object-contain"
        src={logoUrl}
      />
    </ImageUploadZone>
  );
}

export function FieldLabel({ label }: { label: string }): ReactElement {
  return (
    <label className="mb-[10px] flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.4px] text-[var(--track-text)]">
      <span>{label}</span>
      <span className="flex size-4 items-center justify-center rounded-full border-2 border-[var(--track-control-disabled)] text-[10px] text-[var(--track-text-soft)]">
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
      <span className="flex size-[18px] items-center justify-center rounded-full border-2 border-[var(--track-control-border)] bg-[var(--track-state-neutral-surface)] shadow-[var(--track-depth-shadow-active)] transition-all duration-[var(--duration-press)]">
        {props.checked ? (
          <span className="size-[8px] rounded-full bg-[var(--track-accent)]" />
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
      <AppCheckbox
        checked={props.checked}
        onChange={(event) => {
          props.onChange(event.target.checked);
        }}
      />
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
    <div className="border-b border-[var(--track-surface-muted)] py-4 last:border-b-0">
      <label className="flex cursor-pointer items-start gap-4">
        <AppSwitch
          aria-label={props.title}
          checked={props.checked}
          className="mt-[3px]"
          onChange={props.onChange}
          size="sm"
        />
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
  "w-full rounded-[8px] border-2 border-[var(--track-border-input)] bg-[var(--track-input-bg)] px-3 py-[8.5px] text-[14px] font-medium text-[var(--track-text)] shadow-[var(--track-depth-shadow-rest)] outline-none transition-all duration-[var(--duration-press)] focus:-translate-y-px focus:border-[var(--track-accent-border)] focus:shadow-[var(--track-depth-shadow-hover)]";
