import { ShellPageHeader, ShellSurfaceCard, ShellToast } from "@opentoggl/web-ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ReactElement, useCallback, useEffect, useState } from "react";

import { TrackingIcon } from "../../features/tracking/tracking-icons.tsx";
import type {
  ModelsRate,
  RatesCreationRequest,
} from "../../shared/api/generated/public-track/types.gen.ts";
import { createRate, getRatesByLevel } from "../../shared/api/public/track/index.ts";
import { unwrapWebApiResult } from "../../shared/api/web-client.ts";
import { useSession } from "../../shared/session/session-context.tsx";

const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "AUD",
  "JPY",
  "CHF",
  "SEK",
  "NOK",
  "DKK",
  "NZD",
  "BRL",
  "INR",
  "PLN",
  "CZK",
  "HUF",
  "RON",
  "BGN",
  "HRK",
  "MXN",
  "ZAR",
  "SGD",
  "HKD",
  "CNY",
  "KRW",
] as const;

type BillingMode = "billable" | "non-billable";

type Toast = {
  description: string;
  title: string;
  tone: "error" | "success";
};

const workspaceRateQueryKey = (workspaceId: number) => ["workspace-rate", workspaceId] as const;

function useWorkspaceRateQuery(workspaceId: number) {
  return useQuery({
    queryFn: () =>
      unwrapWebApiResult(
        getRatesByLevel({
          path: {
            workspace_id: workspaceId,
            level: "workspace",
            level_id: workspaceId,
          },
          query: { type: "billable_rates" },
        }),
      ),
    queryKey: workspaceRateQueryKey(workspaceId),
  });
}

function useCreateWorkspaceRateMutation(workspaceId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RatesCreationRequest) =>
      unwrapWebApiResult(
        createRate({
          path: { workspace_id: workspaceId },
          body: request,
        }),
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workspaceRateQueryKey(workspaceId),
      });
    },
  });
}

export function BillableRatesPage(): ReactElement {
  const session = useSession();
  const workspaceId = session.currentWorkspace.id;
  const defaultCurrency = session.currentWorkspace.defaultCurrency ?? "USD";
  const defaultHourlyRate = session.currentWorkspace.defaultHourlyRate ?? 0;

  const rateQuery = useWorkspaceRateQuery(workspaceId);
  const rateMutation = useCreateWorkspaceRateMutation(workspaceId);

  const currentRate = findActiveRate(rateQuery.data);

  const [billingMode, setBillingMode] = useState<BillingMode>("billable");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [toast, setToast] = useState<Toast | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (currentRate) {
      setHourlyRate(formatRateAmount(currentRate.amount));
      setBillingMode(currentRate.amount === 0 ? "non-billable" : "billable");
    } else {
      setHourlyRate(formatRateAmount(defaultHourlyRate));
      setBillingMode(defaultHourlyRate > 0 ? "billable" : "non-billable");
    }
    setCurrency(defaultCurrency);
    setIsDirty(false);
  }, [currentRate, defaultHourlyRate, defaultCurrency]);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(timeout);
  }, [toast]);

  const handleSave = useCallback(() => {
    const amount = billingMode === "non-billable" ? 0 : parseFloat(hourlyRate) || 0;

    rateMutation.mutate(
      {
        level: "workspace",
        level_id: workspaceId,
        amount: amount * 100,
        mode: "override-all",
        type: "billable_rates",
      },
      {
        onSuccess: () => {
          setToast({
            title: "Saved",
            description: "Workspace billable rate has been updated.",
            tone: "success",
          });
          setIsDirty(false);
        },
        onError: () => {
          setToast({
            title: "Error",
            description: "Could not save the workspace rate. Try again.",
            tone: "error",
          });
        },
      },
    );
  }, [billingMode, hourlyRate, workspaceId, rateMutation]);

  return (
    <div className="min-h-full bg-[var(--track-surface)]" data-testid="billable-rates-page">
      <div className="max-w-[1384px]">
        <header className="bg-[var(--track-surface)]">
          <ShellPageHeader bordered title="Billable Rates" />
        </header>

        <div className="flex flex-col gap-5 px-5 pb-10 pt-5">
          <AboutBillableRatesSection />
          <AboutLaborCostsSection />

          <WorkspaceRateSection
            billingMode={billingMode}
            currency={currency}
            hourlyRate={hourlyRate}
            isSaving={rateMutation.isPending}
            isDirty={isDirty}
            isLoading={rateQuery.isPending}
            onBillingModeChange={(mode) => {
              setBillingMode(mode);
              setIsDirty(true);
            }}
            onCurrencyChange={(c) => {
              setCurrency(c);
              setIsDirty(true);
            }}
            onHourlyRateChange={(val) => {
              setHourlyRate(val);
              setIsDirty(true);
            }}
            onSave={handleSave}
          />

          <WorkspaceMemberRatesSection />
        </div>
      </div>

      {toast ? <ShellToast {...toast} /> : null}
    </div>
  );
}

function AboutBillableRatesSection(): ReactElement {
  return (
    <ShellSurfaceCard>
      <div className="flex gap-3 p-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)]">
          <TrackingIcon className="h-4 w-4 text-[var(--track-accent)]" name="dollar" />
        </div>
        <div>
          <h2 className="mb-2 text-[14px] font-semibold leading-5 text-[var(--track-text)]">
            About Billable Rates
          </h2>
          <p className="mb-3 text-[13px] leading-5 text-[var(--track-text-soft)]">
            Billable rates determine how much to charge for tracked time. There are 5 levels of
            billable rates, each overriding the previous one:
          </p>
          <ol className="list-inside list-decimal space-y-1 text-[13px] leading-5 text-[var(--track-text-soft)]">
            <li>
              <strong className="text-[var(--track-text)]">Workspace rate</strong> &mdash; the
              default rate for all time entries in the workspace
            </li>
            <li>
              <strong className="text-[var(--track-text)]">Workspace member rate</strong> &mdash;
              overrides the workspace rate for a specific member
            </li>
            <li>
              <strong className="text-[var(--track-text)]">Project rate</strong> &mdash; overrides
              workspace-level rates for all entries in a project
            </li>
            <li>
              <strong className="text-[var(--track-text)]">Project member rate</strong> &mdash;
              overrides the project rate for a specific member
            </li>
            <li>
              <strong className="text-[var(--track-text)]">Task-specific rate</strong> &mdash;
              overrides all other rates for a specific task
            </li>
          </ol>
        </div>
      </div>
    </ShellSurfaceCard>
  );
}

function AboutLaborCostsSection(): ReactElement {
  return (
    <ShellSurfaceCard>
      <div className="flex gap-3 p-5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--track-accent-soft)]">
          <TrackingIcon className="h-4 w-4 text-[var(--track-accent)]" name="members" />
        </div>
        <div>
          <h2 className="mb-2 text-[14px] font-semibold leading-5 text-[var(--track-text)]">
            About Labor Costs
          </h2>
          <p className="text-[13px] leading-5 text-[var(--track-text-soft)]">
            Labor costs represent the internal cost of a team member's time. Use them alongside
            billable rates to calculate profit margins. Labor costs follow the same 5-level
            hierarchy as billable rates but are only visible to workspace admins.
          </p>
        </div>
      </div>
    </ShellSurfaceCard>
  );
}

type WorkspaceRateSectionProps = {
  billingMode: BillingMode;
  currency: string;
  hourlyRate: string;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  onBillingModeChange: (mode: BillingMode) => void;
  onCurrencyChange: (currency: string) => void;
  onHourlyRateChange: (value: string) => void;
  onSave: () => void;
};

function WorkspaceRateSection(props: WorkspaceRateSectionProps): ReactElement {
  return (
    <ShellSurfaceCard>
      <div className="p-5">
        <h2 className="mb-5 text-[14px] font-semibold leading-5 text-[var(--track-text)]">
          Workspace Rate
        </h2>

        {props.isLoading ? (
          <div className="py-8 text-center text-[13px] text-[var(--track-text-muted)]">
            Loading workspace rate...
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <BillingModeField onChange={props.onBillingModeChange} value={props.billingMode} />

            {props.billingMode === "billable" ? (
              <div className="flex flex-wrap items-end gap-4">
                <HourlyRateField onChange={props.onHourlyRateChange} value={props.hourlyRate} />
                <CurrencyField onChange={props.onCurrencyChange} value={props.currency} />
              </div>
            ) : null}

            <div>
              <button
                className="rounded-[8px] bg-[var(--track-accent)] px-4 py-[6px] text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                disabled={!props.isDirty || props.isSaving}
                onClick={props.onSave}
                type="button"
              >
                {props.isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </ShellSurfaceCard>
  );
}

function BillingModeField(props: {
  onChange: (mode: BillingMode) => void;
  value: BillingMode;
}): ReactElement {
  return (
    <fieldset>
      <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
        Billing
      </legend>
      <div className="flex gap-4">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--track-text)]">
          <input
            checked={props.value === "billable"}
            className="accent-[var(--track-accent)]"
            name="billing-mode"
            onChange={() => props.onChange("billable")}
            type="radio"
          />
          Billable
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-[var(--track-text)]">
          <input
            checked={props.value === "non-billable"}
            className="accent-[var(--track-accent)]"
            name="billing-mode"
            onChange={() => props.onChange("non-billable")}
            type="radio"
          />
          Non-billable
        </label>
      </div>
    </fieldset>
  );
}

function HourlyRateField(props: {
  onChange: (value: string) => void;
  value: string;
}): ReactElement {
  return (
    <div>
      <label
        className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]"
        htmlFor="hourly-rate-input"
      >
        Hourly Rate
      </label>
      <input
        className="h-9 w-[160px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-input-bg)] px-3 text-[13px] text-[var(--track-text)] outline-none focus:border-[var(--track-accent)]"
        id="hourly-rate-input"
        inputMode="decimal"
        onChange={(e) => props.onChange(e.target.value)}
        placeholder="0.00"
        type="text"
        value={props.value}
      />
    </div>
  );
}

function CurrencyField(props: {
  onChange: (currency: string) => void;
  value: string;
}): ReactElement {
  return (
    <div>
      <label
        className="mb-2 block text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]"
        htmlFor="currency-select"
      >
        Currency
      </label>
      <select
        className="h-9 w-[120px] rounded-[8px] border border-[var(--track-border)] bg-[var(--track-input-bg)] px-3 text-[13px] text-[var(--track-text)] outline-none focus:border-[var(--track-accent)]"
        id="currency-select"
        onChange={(e) => props.onChange(e.target.value)}
        value={props.value}
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}

function WorkspaceMemberRatesSection(): ReactElement {
  return (
    <ShellSurfaceCard>
      <div className="p-5">
        <div className="flex items-center gap-2">
          <h2 className="text-[14px] font-semibold leading-5 text-[var(--track-text)]">
            Workspace member rate and labor cost
          </h2>
          <span className="rounded-[4px] bg-[var(--track-accent)] px-[6px] py-[2px] text-[10px] font-bold uppercase tracking-wider text-white">
            Premium
          </span>
        </div>
        <p className="mt-2 text-[13px] leading-5 text-[var(--track-text-soft)]">
          Set individual billable rates and labor costs for each workspace member. Member rates
          override the workspace-level rate.
        </p>
        <div className="mt-4 rounded-[8px] border border-[var(--track-border)]">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--track-border)]">
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                  Member
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                  Billable Rate
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--track-text-muted)]">
                  Labor Cost
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="px-4 py-6 text-center text-[var(--track-text-muted)]" colSpan={3}>
                  Member rates will be available when the workspace member list is loaded.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </ShellSurfaceCard>
  );
}

/**
 * Find the active (non-deleted) rate from the API response array.
 * The API returns rates sorted by start date; the active one has no deleted_at.
 */
function findActiveRate(rates: Array<ModelsRate> | undefined): ModelsRate | undefined {
  if (!rates || rates.length === 0) return undefined;
  return rates.find((r) => !r.deleted_at) ?? rates[0];
}

/**
 * Format rate amount from cents to display value.
 * The API stores rates in cents; display as decimal dollars.
 */
function formatRateAmount(amount: number | undefined): string {
  if (amount === undefined || amount === 0) return "0.00";
  return (amount / 100).toFixed(2);
}
