import { type ChangeEvent, type ReactElement, useState } from "react";

import { DatePickerButton } from "../../shared/ui/DatePickerButton.tsx";
import { TRACK_COLOR_SWATCHES } from "../../shared/lib/project-colors.ts";
import { ColorSwatchPicker } from "../../shared/ui/ColorSwatchPicker.tsx";
import { useFilteredList } from "../../shared/ui/useFilteredList.ts";

type ClientOption = {
  id: number;
  name: string;
};

type ProjectEditorAdvancedProps = {
  billable: boolean;
  clientId: number | null;
  clients: ClientOption[];
  color: string;
  endDate: string;
  estimatedHours: number;
  fixedFee: number;
  onBillableChange: (value: boolean) => void;
  onClientChange: (clientId: number | null) => void;
  onColorChange: (value: string) => void;
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
  color,
  endDate,
  estimatedHours,
  fixedFee,
  onBillableChange,
  onClientChange,
  onColorChange,
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
  const [clientQuery, setClientQuery] = useState("");
  const matchClient = (c: ClientOption, q: string) => c.name.toLowerCase().includes(q);
  const filteredClients = useFilteredList(clients, clientQuery, matchClient);

  const showEstimatedInput = estimatedHours > 0;
  const showFixedFeeInput = fixedFee > 0;

  return (
    <div className="space-y-3">
      {/* Client */}
      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
          Client
        </p>
        <div className="relative">
          <input
            aria-label="Search or create client"
            className="h-11 w-full rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)] px-3 text-[14px] text-white outline-none focus:border-[var(--track-accent-soft)]"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              setClientQuery(event.target.value);
              if (!event.target.value.trim()) {
                onClientChange(null);
              }
            }}
            placeholder="Select or create a client"
            value={
              clientQuery || (clientId ? (clients.find((c) => c.id === clientId)?.name ?? "") : "")
            }
          />
          {clientQuery.trim() ? (
            <div className="absolute left-0 top-[calc(100%+4px)] z-10 max-h-[160px] w-full overflow-y-auto rounded-[10px] border border-[var(--track-overlay-border-strong)] bg-[var(--track-overlay-surface)] shadow-[0_12px_28px_var(--track-shadow-overlay)]">
              {filteredClients.map((c) => (
                <button
                  className="flex w-full items-center px-3 py-2 text-left text-[12px] text-white hover:bg-[var(--track-tooltip-surface)]"
                  key={c.id}
                  onClick={() => {
                    onClientChange(c.id);
                    setClientQuery("");
                  }}
                  type="button"
                >
                  {c.name}
                </button>
              ))}
              {filteredClients.length === 0 ? (
                <button
                  className="flex w-full items-center px-3 py-2 text-left text-[12px] text-[var(--track-accent-text)] hover:bg-[var(--track-tooltip-surface)]"
                  onClick={() => {
                    onCreateClient(clientQuery.trim());
                    setClientQuery("");
                  }}
                  type="button"
                >
                  Create client "{clientQuery.trim()}"
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
        {clientId ? (
          <button
            className="mt-1 text-[12px] text-[var(--track-text-muted)] hover:text-white"
            onClick={() => {
              onClientChange(null);
              setClientQuery("");
            }}
            type="button"
          >
            Clear client
          </button>
        ) : null}
      </div>

      {/* Timeframe */}
      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
          Timeframe
        </p>
        <div className="flex items-center gap-2">
          <DatePickerButton
            ariaLabel="Start date"
            className="h-9 flex-1 rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)] px-3 text-left text-[12px] text-white"
            onChange={onStartDateChange}
            placeholder="Start date"
            value={startDate}
          />
          <span className="text-[12px] text-[var(--track-text-muted)]">-</span>
          <DatePickerButton
            ariaLabel="End date"
            className="h-9 flex-1 rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)] px-3 text-left text-[12px] text-white"
            onChange={onEndDateChange}
            placeholder="No end date"
            value={endDate}
          />
        </div>
      </div>

      {/* Recurring */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--track-border)] bg-[var(--track-control-surface-muted)] px-3 py-2.5">
        <span className="text-[14px] text-white">Recurring</span>
        <ToggleSwitch label="Recurring" onChange={onRecurringChange} value={recurring} />
      </div>

      {/* Time estimate */}
      <div className="rounded-lg border border-[var(--track-border)] bg-[var(--track-control-surface-muted)] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-white">Time estimate</span>
          <ToggleSwitch
            label="Time estimate"
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
              aria-label="Estimated hours"
              className="h-9 w-24 rounded-md border border-[var(--track-border)] bg-[var(--track-control-surface)] px-3 text-[12px] text-white outline-none focus:border-[var(--track-accent-soft)]"
              min={0}
              onChange={(event) => onEstimatedHoursChange(Number(event.target.value) || 0)}
              type="number"
              value={estimatedHours || ""}
            />
            <span className="text-[12px] text-[var(--track-text-muted)]">hours</span>
          </div>
        ) : null}
      </div>

      {/* Billable */}
      <div className="flex items-center justify-between rounded-lg border border-[var(--track-border)] bg-[var(--track-control-surface-muted)] px-3 py-2.5">
        <span className="text-[14px] text-white">Billable</span>
        <ToggleSwitch label="Billable" onChange={onBillableChange} value={billable} />
      </div>

      {/* Fixed fee */}
      <div className="rounded-lg border border-[var(--track-border)] bg-[var(--track-control-surface-muted)] px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[14px] text-white">Fixed fee</span>
          <ToggleSwitch
            label="Fixed fee"
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
              aria-label="Fixed fee amount"
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

      {/* Color */}
      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
          Color
        </p>
        <ColorSwatchPicker
          colors={TRACK_COLOR_SWATCHES}
          onSelect={onColorChange}
          selected={color}
        />
      </div>

      {/* Template */}
      <label className="flex items-center justify-between rounded-lg border border-[var(--track-border)] bg-[var(--track-control-surface-muted)] px-3 py-2.5">
        <span className="text-[14px] text-white">Use as template</span>
        <input
          aria-label="Use as template"
          checked={template}
          className="size-4"
          onChange={(event) => onTemplateChange(event.target.checked)}
          type="checkbox"
        />
      </label>
    </div>
  );
}
