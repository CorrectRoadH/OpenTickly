import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";

import { AppCheckbox } from "@opentickly/web-ui";
import { DatePickerButton } from "../../shared/ui/DatePickerButton.tsx";
import { PickerDropdown } from "../../shared/ui/PickerDropdown.tsx";

type ClientOption = {
  id: number;
  name: string;
};

type ProjectEditorAdvancedProps = {
  billable: boolean;
  clientId: number | null;
  clients: ClientOption[];
  endDate: string;
  estimatedHours: number;
  fixedFee: number;
  onBillableChange: (value: boolean) => void;
  onClientChange: (clientId: number | null) => void;
  onCreateClient: (name: string) => void;
  onEndDateChange: (value: string) => void;
  onEstimatedHoursChange: (value: number) => void;
  onFixedFeeChange: (value: number) => void;
  onRecurringChange: (value: boolean) => void;
  onStartDateChange: (value: string) => void;
  onTemplateChange: (value: boolean) => void;
  recurring: boolean;
  startDate: string;
  template: boolean;
};

function ToggleSwitch({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: boolean) => void;
  value: boolean;
}): ReactElement {
  return (
    <button
      aria-label={label}
      aria-pressed={value}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
        value ? "bg-[var(--track-accent-soft)]" : "bg-[var(--track-control-disabled-strong)]"
      }`}
      onClick={() => onChange(!value)}
      type="button"
    >
      <span
        className={`inline-block size-5 rounded-full bg-white transition ${
          value ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function ProjectEditorAdvanced({
  billable,
  clientId,
  clients,
  endDate,
  estimatedHours,
  fixedFee,
  onBillableChange,
  onClientChange,
  onCreateClient,
  onEndDateChange,
  onEstimatedHoursChange,
  onFixedFeeChange,
  onRecurringChange,
  onStartDateChange,
  onTemplateChange,
  recurring,
  startDate,
  template,
}: ProjectEditorAdvancedProps): ReactElement {
  const { t } = useTranslation("projects");
  const [clientPickerOpen, setClientPickerOpen] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const selectedClient = clientId ? clients.find((c) => c.id === clientId) : null;

  const filteredClients = (() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(query));
  })();

  const showEstimatedInput = estimatedHours > 0;
  const showFixedFeeInput = fixedFee > 0;

  return (
    <div className="space-y-3">
      {/* Client */}
      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
          {t("client")}
        </p>
        <div className="relative">
          <button
            aria-label={t("selectOrCreateClient")}
            className="flex h-11 w-full items-center rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)] px-3 text-left text-[14px] text-white"
            onClick={() => setClientPickerOpen((prev) => !prev)}
            type="button"
          >
            <span
              className={
                selectedClient ? "text-white" : "text-[var(--track-control-placeholder-muted)]"
              }
            >
              {selectedClient?.name ?? t("selectOrCreateClient")}
            </span>
          </button>
          {clientPickerOpen ? (
            <PickerDropdown
              search={{
                onChange: setClientSearch,
                placeholder: t("searchOrCreateClient"),
                value: clientSearch,
              }}
              testId="client-picker"
              footer={
                clientSearch.trim() && filteredClients.length === 0 ? (
                  <button
                    className="flex items-center gap-3 text-[12px] font-medium text-[var(--track-overlay-text-accent)]"
                    onClick={() => {
                      onCreateClient(clientSearch.trim());
                      setClientSearch("");
                      setClientPickerOpen(false);
                    }}
                    type="button"
                  >
                    <span className="text-[18px] leading-none">+</span>
                    <span>{t("createClientName", { name: clientSearch.trim() })}</span>
                  </button>
                ) : undefined
              }
            >
              {/* No client option */}
              <button
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/4"
                onClick={() => {
                  onClientChange(null);
                  setClientSearch("");
                  setClientPickerOpen(false);
                }}
                type="button"
              >
                <span className="text-[12px] font-medium text-[var(--track-overlay-text)]">
                  {t("clearClient")}
                </span>
              </button>
              {filteredClients.map((c) => (
                <button
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-white/4"
                  key={c.id}
                  onClick={() => {
                    onClientChange(c.id);
                    setClientSearch("");
                    setClientPickerOpen(false);
                  }}
                  type="button"
                >
                  <span className="truncate text-[12px] font-medium text-white">{c.name}</span>
                </button>
              ))}
            </PickerDropdown>
          ) : null}
        </div>
      </div>

      {/* Timeframe */}
      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
          {t("timeframe")}
        </p>
        <div className="flex items-center gap-2">
          <DatePickerButton
            ariaLabel={t("startDate")}
            className="h-9 flex-1 rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)] px-3 text-left text-[12px] text-white"
            onChange={onStartDateChange}
            placeholder={t("startDate")}
            value={startDate}
          />
          <span className="text-[12px] text-[var(--track-text-muted)]">-</span>
          <DatePickerButton
            ariaLabel={t("endDate")}
            className="h-9 flex-1 rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)] px-3 text-left text-[12px] text-white"
            onChange={onEndDateChange}
            placeholder={t("noEndDate")}
            value={endDate}
          />
        </div>
      </div>

      {/* Recurring */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--track-border)] bg-[var(--track-control-surface-muted)] px-3 py-2.5">
        <span className="text-[14px] text-white">{t("recurring")}</span>
        <ToggleSwitch label={t("recurring")} onChange={onRecurringChange} value={recurring} />
      </div>

      {/* Time estimate */}
      <div className="rounded-lg border border-[var(--track-border)] bg-[var(--track-control-surface-muted)] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-white">{t("timeEstimate")}</span>
          <ToggleSwitch
            label={t("timeEstimate")}
            onChange={(on) => {
              if (on && estimatedHours === 0) onEstimatedHoursChange(1);
              if (!on) onEstimatedHoursChange(0);
            }}
            value={showEstimatedInput}
          />
        </div>
        {showEstimatedInput ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              aria-label={t("estimatedHours")}
              className="h-9 w-24 rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)] px-3 text-[12px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              min={0}
              onChange={(event) => onEstimatedHoursChange(Number(event.target.value) || 0)}
              type="number"
              value={estimatedHours || ""}
            />
            <span className="text-[12px] text-[var(--track-text-muted)]">{t("hours")}</span>
          </div>
        ) : null}
      </div>

      {/* Billable */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--track-border)] bg-[var(--track-control-surface-muted)] px-3 py-2.5">
        <span className="text-[14px] text-white">{t("billable")}</span>
        <ToggleSwitch label={t("billable")} onChange={onBillableChange} value={billable} />
      </div>

      {/* Fixed fee */}
      <div className="rounded-lg border border-[var(--track-border)] bg-[var(--track-control-surface-muted)] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-white">{t("fixedFee")}</span>
          <ToggleSwitch
            label={t("fixedFee")}
            onChange={(on) => {
              if (on && fixedFee === 0) onFixedFeeChange(1);
              if (!on) onFixedFeeChange(0);
            }}
            value={showFixedFeeInput}
          />
        </div>
        {showFixedFeeInput ? (
          <div className="mt-3 flex items-center gap-2">
            <input
              aria-label={t("fixedFeeAmount")}
              className="h-9 w-28 rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)] px-3 text-[12px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              min={0}
              onChange={(event) => onFixedFeeChange(Number(event.target.value) || 0)}
              step="0.01"
              type="number"
              value={fixedFee || ""}
            />
            <span className="text-[12px] text-[var(--track-text-muted)]">USD</span>
          </div>
        ) : null}
      </div>

      {/* Template */}
      <label className="flex items-center justify-between rounded-lg border border-[var(--track-border)] bg-[var(--track-control-surface-muted)] px-3 py-2.5">
        <span className="text-[14px] text-white">{t("useAsTemplate")}</span>
        <AppCheckbox
          aria-label={t("useAsTemplate")}
          checked={template}
          onChange={(event) => onTemplateChange(event.target.checked)}
        />
      </label>
    </div>
  );
}
