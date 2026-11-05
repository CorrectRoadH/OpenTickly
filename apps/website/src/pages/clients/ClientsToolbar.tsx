import { AppInput, DirectoryStatusFilter } from "@opentickly/web-ui";
import { useTranslation } from "react-i18next";
import { SearchIcon } from "../../shared/ui/icons.tsx";
export function ClientsToolbar({
  selectedStatuses,
  onStatusesChange,
  search,
  onSearchChange,
  statusMessage,
}: {
  selectedStatuses: Set<"active" | "inactive">;
  onStatusesChange: (values: Set<"active" | "inactive">) => void;
  search: string;
  onSearchChange: (value: string) => void;
  statusMessage: string | null;
}) {
  const { t } = useTranslation("clients");
  return (
    <div className="flex flex-wrap items-center gap-3" data-testid="clients-filter-bar">
      <DirectoryStatusFilter
        onChange={onStatusesChange}
        options={[
          { label: t("active"), value: "active" as const },
          { label: t("inactive"), value: "inactive" as const },
        ]}
        selected={selectedStatuses}
      />
      <AppInput
        className="w-[180px]"
        leadingIcon={<SearchIcon className="size-3.5" />}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={t("searchClients")}
        size="sm"
        value={search}
      />
      {statusMessage ? (
        <span className="ml-auto text-[12px] text-[var(--track-accent-text)]">{statusMessage}</span>
      ) : null}
    </div>
  );
}
