import { AppButton } from "@opentickly/web-ui";
import type { ChangeEvent, ReactElement, RefObject } from "react";
import { useTranslation } from "react-i18next";

import { ImportIcon, PlusIcon } from "../../shared/ui/icons.tsx";

type ArchiveImportSectionProps = {
  inputRef: RefObject<HTMLInputElement | null>;
  isPending: boolean;
  onArchiveChange: (archive: File | null) => void;
  onOrganizationNameChange: (name: string) => void;
  onUpload: () => void;
  organizationName: string;
  selectedArchive: File | null;
};

export function ArchiveImportSection({
  inputRef,
  isPending,
  onArchiveChange,
  onOrganizationNameChange,
  onUpload,
  organizationName,
  selectedArchive,
}: ArchiveImportSectionProps): ReactElement {
  const { t } = useTranslation("import");

  return (
    <section className="rounded-[8px] border border-dashed border-[var(--track-border)] bg-[var(--track-surface-muted)] p-5">
      <div className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)] text-[var(--track-accent-text)]">
          <ImportIcon className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
            {t("step1")}
          </p>
          <h2 className="mt-2 text-[14px] font-semibold leading-[23px] text-white">
            {t("createOrgFromZip")}
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-[var(--track-text-muted)]">
            {t("zipUploadDescription")}
          </p>
        </div>
      </div>

      <label className="mt-5 block">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--track-text-soft)]">
          {t("newOrgName")}
        </span>
        <input
          className="mt-2 h-11 w-full rounded-[8px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px] text-white outline-none transition focus:border-[var(--track-accent-text)]"
          onChange={(event) => onOrganizationNameChange(event.target.value)}
          placeholder={t("importedOrg")}
          type="text"
          value={organizationName}
        />
      </label>

      <div className="mt-5 rounded-[8px] bg-black/20 px-4 py-3 text-[12px] leading-6 text-[var(--track-text-muted)]">
        {t("zipHint")}
        <span className="mx-1 rounded bg-black/30 px-1.5 py-0.5 font-mono text-[12px] text-white">
          {t("zipHintExample")}
        </span>
        {t("zipHintEnd")}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <AppButton disabled={isPending} onClick={() => inputRef.current?.click()}>
          <PlusIcon className="size-3.5" />
          {t("chooseZip")}
        </AppButton>
        <input
          ref={inputRef}
          accept=".zip,application/zip"
          className="sr-only"
          onChange={(event: ChangeEvent<HTMLInputElement>) =>
            onArchiveChange(event.target.files?.[0] ?? null)
          }
          type="file"
        />
        <span className="min-w-0 truncate text-[12px] text-[var(--track-text-muted)]">
          {selectedArchive ? selectedArchive.name : t("noFileSelected")}
        </span>
      </div>

      {selectedArchive ? (
        <div className="mt-4">
          <AppButton
            disabled={organizationName.trim().length === 0 || isPending}
            onClick={onUpload}
          >
            {isPending ? t("importing") : t("uploadImport")}
          </AppButton>
          {organizationName.trim().length === 0 ? (
            <p className="mt-2 text-[12px] text-[var(--track-text-muted)]">
              {t("enterOrgNameHint")}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
