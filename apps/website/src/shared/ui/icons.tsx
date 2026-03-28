import type { ComponentPropsWithoutRef, ReactElement } from "react";

type IconProps = ComponentPropsWithoutRef<"svg">;

function Icon(props: IconProps & { children: ReactElement }): ReactElement {
  const { children, ...rest } = props;
  return (
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 16 16"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function ArchiveIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <rect x="2.5" y="2.5" width="11" height="4" rx="0.8" />
        <path d="M3.5 6.5v6a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-6" />
        <path d="M6.5 9.5h3" />
      </>
    </Icon>
  );
}

export function ApprovalsIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="8" cy="8" r="5.25" />
        <path d="m5.5 8 1.6 1.6L10.7 6" />
      </>
    </Icon>
  );
}

export function BellIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M4.5 6.8a3.5 3.5 0 1 1 7 0v3.1l1 1H3.5l1-1Z" />
        <path d="M6.5 12.2a1.5 1.5 0 0 0 3 0" />
      </>
    </Icon>
  );
}

export function CalendarIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <rect x="2.5" y="3.5" width="11" height="9.5" rx="1.5" />
        <path d="M5 2.8v2M11 2.8v2M2.5 6.3h11" />
      </>
    </Icon>
  );
}

export function CheckIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="m4.5 8.2 2.2 2.2 4.8-4.8" />
    </Icon>
  );
}

export function ChevronDownIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="m4.5 6.5 3.5 3 3.5-3" />
    </Icon>
  );
}

export function ChevronRightIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="m6 4.5 3.5 3.5L6 11.5" />
    </Icon>
  );
}

export function ClientsIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="8" cy="5.2" r="2.1" />
        <path d="M4.3 12.5c.4-2 1.8-3.3 3.7-3.3s3.3 1.3 3.7 3.3" />
        <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
      </>
    </Icon>
  );
}

export function CloseIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="m4.5 4.5 7 7M11.5 4.5l-7 7" />
    </Icon>
  );
}

export function CopyIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <rect x="5.3" y="3.3" width="7" height="8.2" rx="1.4" />
        <path d="M4.3 10.7H4A1.5 1.5 0 0 1 2.5 9.2V4.8A1.5 1.5 0 0 1 4 3.3h4" />
      </>
    </Icon>
  );
}

export function DollarIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M8 2.5v11" />
        <path d="M10.5 4.5c0-1.1-.9-2-2-2H7.5c-1.1 0-2 .9-2 2s.9 2 2 2v1c1.1 0 2 .9 2 2s-.9 2-2 2H7" />
      </>
    </Icon>
  );
}

export function EditIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M3 11.7V13h1.3l6.1-6.1-1.3-1.3Z" />
        <path d="m8.8 4.5 1.3-1.3a1 1 0 0 1 1.4 0l1.3 1.3a1 1 0 0 1 0 1.4l-1.3 1.3" />
      </>
    </Icon>
  );
}

export function FocusIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="8" cy="8" r="5.5" />
        <circle cx="8" cy="8" r="2" />
      </>
    </Icon>
  );
}

export function GoalsIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="m4.1 9.7 5.6-5.4 1.8.2-.3 1.9-5.5 5.3Z" />
        <path d="M8.8 4.9 11.9 3" />
        <path d="m4.3 10.9-1 2.1 2.2-.9" />
      </>
    </Icon>
  );
}

export function GridIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" />
        <rect x="9" y="2.5" width="4.5" height="4.5" rx="1" />
        <rect x="2.5" y="9" width="4.5" height="4.5" rx="1" />
        <rect x="9" y="9" width="4.5" height="4.5" rx="1" />
      </>
    </Icon>
  );
}

export function HelpIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="8" cy="8" r="5.5" />
        <path d="M6.5 6.2a1.8 1.8 0 1 1 2.8 1.5c-.7.5-1.1.8-1.1 1.8" />
        <path d="M8 11.7h.01" />
      </>
    </Icon>
  );
}

export function ImportIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M8 2.8v6.2" />
        <path d="m5.4 6.7 2.6 2.6 2.6-2.6" />
        <path d="M3.2 11v.8c0 .8.7 1.5 1.5 1.5h6.6c.8 0 1.5-.7 1.5-1.5V11" />
      </>
    </Icon>
  );
}

export function IntegrationsIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M6.2 2.8v2.1L4.4 6.7H2.8v2.6h1.6l1.8 1.8v2.1h2.6v-2.1l1.8-1.8h1.6V6.7h-1.6L8.8 4.9V2.8Z" />
    </Icon>
  );
}

export function InvoicesIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M4 2.8h8v10.4l-1.4-1-1.3 1-1.3-1-1.3 1-1.3-1-1.4 1Z" />
        <path d="M5.7 5.3h4.6M5.7 7.8h4.6" />
      </>
    </Icon>
  );
}

export function ListIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M3 4.5h10M3 8h10M3 11.5h10" />
        <path d="M2 4.5h.01M2 8h.01M2 11.5h.01" />
      </>
    </Icon>
  );
}

export function ManualModeIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M3.5 5.5v5M12.5 5.5v5" />
        <path d="M3.5 8h9" />
        <path d="M6.5 5.5 3.5 8l3 2.5M9.5 5.5l3 2.5-3 2.5" />
      </>
    </Icon>
  );
}

export function MembersIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="6" cy="5.5" r="1.8" />
        <circle cx="10.7" cy="6.2" r="1.5" />
        <path d="M3.7 11.9c.3-1.6 1.4-2.7 3-2.7s2.7 1.1 3 2.7" />
        <path d="M9.2 11.5c.2-1.1.9-1.9 2-2.2" />
      </>
    </Icon>
  );
}

export function MenuIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M3 4.5h7M3 8h5M3 11.5h7" />
        <path d="m10.5 8 2-2M10.5 8l2 2" />
      </>
    </Icon>
  );
}

export function MinusIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M3 8h10" />
    </Icon>
  );
}

export function MoreIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="4.2" cy="8" r=".8" fill="currentColor" stroke="none" />
        <circle cx="8" cy="8" r=".8" fill="currentColor" stroke="none" />
        <circle cx="11.8" cy="8" r=".8" fill="currentColor" stroke="none" />
      </>
    </Icon>
  );
}

export function OverviewIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <rect x="2.5" y="3" width="11" height="2.5" rx="1" />
        <rect x="2.5" y="7" width="7.5" height="2.5" rx="1" />
        <rect x="2.5" y="11" width="9.5" height="2.5" rx="1" />
      </>
    </Icon>
  );
}

export function PlanIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="8" cy="8" r="5.5" />
        <path d="m8 4.3 2.4 4.2L8 11.7 5.6 8.5Z" />
      </>
    </Icon>
  );
}

export function PlayIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="m4.2 3.6 8.2 4.4-8.2 4.4Z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <path d="M8 3v10M3 8h10" />
    </Icon>
  );
}

export function ProfileIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="8" cy="5.1" r="2.3" />
        <path d="M4.1 12.8c.5-2.2 2-3.5 3.9-3.5s3.4 1.3 3.9 3.5" />
      </>
    </Icon>
  );
}

export function ProjectsIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M2.8 5.2h3.1l1 1h6.3v5.7a1 1 0 0 1-1 1H3.8a1 1 0 0 1-1-1Z" />
        <path d="M2.8 5.5V4.2a1 1 0 0 1 1-1H6l1 1h5.2a1 1 0 0 1 1 1v.3" />
      </>
    </Icon>
  );
}

export function ReportsIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M3.2 12.5V9.2M7.2 12.5V5.8M11.2 12.5V7.3" />
        <path d="M2.5 12.5h10.8" />
      </>
    </Icon>
  );
}

export function SearchIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="6.7" cy="6.7" r="3.7" />
        <path d="m9.5 9.5 3 3" />
      </>
    </Icon>
  );
}

export function SettingsIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="8" cy="8" r="2.1" />
        <path d="M8 2.8v1.5M8 11.7v1.5M3.6 4.4l1 1M11.4 12.2l1 1M2.8 8h1.5M11.7 8h1.5M3.6 11.6l1-1M11.4 3.8l1-1" />
      </>
    </Icon>
  );
}

export function StopIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <rect x="3.8" y="3.8" width="8.4" height="8.4" rx="1.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function SubscriptionIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <rect x="2.5" y="4" width="11" height="8" rx="1.5" />
        <path d="M2.5 6.3h11M4.5 9.5H7" />
      </>
    </Icon>
  );
}

export function TagsIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M3 7.2V3h4.2l5 5-4.1 4.1Z" />
        <circle cx="5.1" cy="5.1" r=".8" fill="currentColor" stroke="none" />
      </>
    </Icon>
  );
}

export function TimerIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="8" cy="8" r="5.3" />
        <path d="M8 5.2V8l2.2 1.5M6 2.8h4" />
      </>
    </Icon>
  );
}

export function TimesheetIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M3 4.5h10M3 8h10M3 11.5h10" />
        <path d="M5.5 3v10M10.5 3v10" />
      </>
    </Icon>
  );
}

export function TrackIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 4.5V8l2 1.8" />
      </>
    </Icon>
  );
}

export function TrashIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M3.5 5h9M6 5V3.8a.8.8 0 0 1 .8-.8h2.4a.8.8 0 0 1 .8.8V5" />
        <path d="M4.5 5v7.2a1 1 0 0 0 1 1h5a1 1 0 0 0 1-1V5" />
        <path d="M6.8 7.5v3M9.2 7.5v3" />
      </>
    </Icon>
  );
}
