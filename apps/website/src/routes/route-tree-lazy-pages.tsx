import { lazyNamed } from "./route-tree-shared.tsx";

/* ---------- lazy page imports ---------- */

export const AuthPage = lazyNamed(() => import("../pages/auth/AuthPage.tsx"), "AuthPage");
export const VerifyEmailPage = lazyNamed(
  () => import("../pages/auth/VerifyEmailPage.tsx"),
  "VerifyEmailPage",
);
export const InviteStatusJoinedPage = lazyNamed(
  () => import("../pages/members/InviteStatusJoinedPage.tsx"),
  "InviteStatusJoinedPage",
);
export const AccountPage = lazyNamed(
  () => import("../pages/account/AccountPage.tsx"),
  "AccountPage",
);
export const ProfilePage = lazyNamed(
  () => import("../pages/profile/ProfilePage.tsx"),
  "ProfilePage",
);
export const InstanceAdminPage = lazyNamed(
  () => import("../pages/instance-admin/InstanceAdminPage.tsx"),
  "InstanceAdminPage",
);
export const OrganizationSettingsPage = lazyNamed(
  () => import("../pages/settings/OrganizationSettingsPage.tsx"),
  "OrganizationSettingsPage",
);
export const WorkspaceSettingsPage = lazyNamed(
  () => import("../pages/settings/WorkspaceSettingsPage.tsx"),
  "WorkspaceSettingsPage",
);
export const WorkspaceOverviewPage = lazyNamed(
  () => import("../pages/shell/WorkspaceOverviewPage.tsx"),
  "WorkspaceOverviewPage",
);
export const WorkspaceReportsPage = lazyNamed(
  () => import("../pages/shell/WorkspaceReportsPage.tsx"),
  "WorkspaceReportsPage",
);
export const WorkspaceTimerPage = lazyNamed(
  () => import("../pages/shell/WorkspaceTimerPage.tsx"),
  "WorkspaceTimerPage",
);
export const WorkspaceMembersPage = lazyNamed(
  () => import("../pages/members/WorkspaceMembersPage.tsx"),
  "WorkspaceMembersPage",
);
export const WorkspaceImportPage = lazyNamed(
  () => import("../pages/import/WorkspaceImportPage.tsx"),
  "WorkspaceImportPage",
);
export const PermissionConfigPage = lazyNamed(
  () => import("../pages/permission-config/PermissionConfigPage.tsx"),
  "PermissionConfigPage",
);
export const ProjectsPage = lazyNamed(
  () => import("../pages/projects/ProjectsPage.tsx"),
  "ProjectsPage",
);
export const ProjectDetailPage = lazyNamed(
  () => import("../pages/projects/ProjectDetailPage.tsx"),
  "ProjectDetailPage",
);
export const ProjectDashboardPage = lazyNamed(
  () => import("../pages/projects/ProjectDashboardPage.tsx"),
  "ProjectDashboardPage",
);
export const ClientsPage = lazyNamed(
  () => import("../pages/clients/ClientsPage.tsx"),
  "ClientsPage",
);
export const ClientDetailPage = lazyNamed(
  () => import("../pages/clients/ClientDetailPage.tsx"),
  "ClientDetailPage",
);
export const GroupsPage = lazyNamed(() => import("../pages/groups/GroupsPage.tsx"), "GroupsPage");
export const TasksPage = lazyNamed(() => import("../pages/tasks/TasksPage.tsx"), "TasksPage");
export const TagsPage = lazyNamed(() => import("../pages/tags/TagsPage.tsx"), "TagsPage");
export const TagDetailPage = lazyNamed(
  () => import("../pages/tags/TagDetailPage.tsx"),
  "TagDetailPage",
);
export const ApprovalsPage = lazyNamed(
  () => import("../pages/approvals/ApprovalsPage.tsx"),
  "ApprovalsPage",
);
export const GoalsPage = lazyNamed(() => import("../pages/goals/GoalsPage.tsx"), "GoalsPage");
export const IntegrationsPage = lazyNamed(
  () => import("../pages/integrations/IntegrationsPage.tsx"),
  "IntegrationsPage",
);
export const InvoiceEditorPage = lazyNamed(
  () => import("../pages/invoices/InvoiceEditorPage.tsx"),
  "InvoiceEditorPage",
);
export const InvoicesPage = lazyNamed(
  () => import("../pages/invoices/InvoicesPage.tsx"),
  "InvoicesPage",
);
export const AuditLogPage = lazyNamed(
  () => import("../pages/audit-log/AuditLogPage.tsx"),
  "AuditLogPage",
);
export const SubscriptionPage = lazyNamed(
  () => import("../pages/subscription/SubscriptionPage.tsx"),
  "SubscriptionPage",
);

export const MobileShell = lazyNamed(
  () => import("../pages/mobile/MobileShell.tsx"),
  "MobileShell",
);
export const MobileTimerPage = lazyNamed(
  () => import("../pages/mobile/MobileTimerPage.tsx"),
  "MobileTimerPage",
);
export const MobileCalendarPage = lazyNamed(
  () => import("../pages/mobile/MobileCalendarPage.tsx"),
  "MobileCalendarPage",
);
export const MobileReportPage = lazyNamed(
  () => import("../pages/mobile/MobileReportPage.tsx"),
  "MobileReportPage",
);
export const MobileMePage = lazyNamed(
  () => import("../pages/mobile/MobileMePage.tsx"),
  "MobileMePage",
);
