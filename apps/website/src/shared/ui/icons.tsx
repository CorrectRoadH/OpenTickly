import type { ComponentPropsWithoutRef, ReactElement } from "react";
import {
  Archive,
  Bell,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDollarSign,
  CircleHelp,
  Clock,
  Copy,
  CreditCard,
  Download,
  Ellipsis,
  FileText,
  FolderOpen,
  Grid2x2,
  List,
  Menu,
  Minus,
  PanelRight,
  Pencil,
  Pin,
  Play,
  Plus,
  Puzzle,
  Search,
  Settings,
  Square,
  Tags,
  Timer,
  Trash2,
  User,
  Users,
  X,
  type LucideIcon as LucideIconType,
  type LucideProps,
} from "lucide-react";

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

function lucide(LucideIcon: LucideIconType) {
  return function WrappedIcon(props: LucideProps): ReactElement {
    return <LucideIcon aria-hidden="true" strokeWidth={1.7} size={16} {...props} />;
  };
}

export const ArchiveIcon = lucide(Archive);
export const ApprovalsIcon = lucide(CircleCheck);
export const BellIcon = lucide(Bell);
export const CalendarIcon = lucide(Calendar);
export const CheckIcon = lucide(Check);
export const ChevronDownIcon = lucide(ChevronDown);
export const ChevronRightIcon = lucide(ChevronRight);
export const ClientsIcon = lucide(User);
export const CloseIcon = lucide(X);
export const CopyIcon = lucide(Copy);
export const DollarIcon = lucide(CircleDollarSign);
export const EditIcon = lucide(Pencil);
export const GridIcon = lucide(Grid2x2);
export const HelpIcon = lucide(CircleHelp);
export const ImportIcon = lucide(Download);
export const IntegrationsIcon = lucide(Puzzle);
export const InvoicesIcon = lucide(FileText);
export const ListIcon = lucide(List);
export const MembersIcon = lucide(Users);
export const MenuIcon = lucide(Menu);
export const MinusIcon = lucide(Minus);
export const MoreIcon = lucide(Ellipsis);
export const PanelRightIcon = lucide(PanelRight);
export const PinIcon = lucide(Pin);
export const PlayIcon = lucide(Play);
export const PlusIcon = lucide(Plus);
export const ProjectsIcon = lucide(FolderOpen);
export const SearchIcon = lucide(Search);
export const SettingsIcon = lucide(Settings);
export const StopIcon = lucide(Square);
export const SubscriptionIcon = lucide(CreditCard);
export const TagsIcon = lucide(Tags);
export const TimerIcon = lucide(Timer);
export const TrackIcon = lucide(Clock);
export const TrashIcon = lucide(Trash2);
export const ProfileIcon = lucide(User);

// Product-specific icons with no Lucide equivalent
export function AuditLogIcon(props: IconProps): ReactElement {
  return (
    <Icon {...props}>
      <>
        <path d="M4.5 2.5h7a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1Z" />
        <path d="M6 5.5h4M6 8h4M6 10.5h2.5" />
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
