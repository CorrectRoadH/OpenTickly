import type {
  ProjectListEnvelopeDto,
  ProjectMembersEnvelopeDto,
  ProjectSummaryDto,
  WebCurrentUserProfileDto,
  WebOrganizationSettingsDto,
  WebSessionBootstrapDto,
  WorkspaceMemberDto,
  WorkspaceMembersEnvelopeDto,
  WorkspaceSettingsEnvelopeDto,
  WebWorkspaceSettingsDto,
} from "../../shared/api/web-contract.ts";

type ClientSummaryFixture = {
  active: boolean;
  id: number;
  name: string;
  workspace_id: number;
};

type ClientListFixture = {
  clients: ClientSummaryFixture[];
};

type TagSummaryFixture = {
  active: boolean;
  id: number;
  name: string;
  workspace_id: number;
};

type TagListFixture = {
  tags: TagSummaryFixture[];
};

type GroupSummaryFixture = {
  active: boolean;
  id: number;
  name: string;
  workspace_id: number;
};

type GroupListFixture = {
  groups: GroupSummaryFixture[];
};

type TaskSummaryFixture = {
  active: boolean;
  id: number;
  name: string;
  workspace_id: number;
};

type TaskListFixture = {
  tasks: TaskSummaryFixture[];
};

type WorkspacePermissionsFixture = Pick<
  WebWorkspaceSettingsDto,
  | "only_admins_may_create_projects"
  | "only_admins_may_create_tags"
  | "only_admins_see_team_dashboard"
  | "limit_public_project_data"
>;

type WorkspacePermissionsEnvelopeFixture = {
  workspace: WorkspacePermissionsFixture;
};

export function createSessionFixture(
  overrides?: Partial<WebSessionBootstrapDto>,
): WebSessionBootstrapDto {
  return {
    current_organization_id: 14,
    current_workspace_id: 202,
    organization_subscription: {
      plan_name: "Starter",
      state: "active",
    },
    organizations: [createOrganizationFixture()],
    user: createProfileFixture(),
    workspace_capabilities: {
      context: {
        scope: "workspace",
        organization_id: 14,
        workspace_id: 202,
      },
      capabilities: [
        {
          key: "reports",
          enabled: true,
          source: "billing",
        },
      ],
    },
    workspace_quota: {
      organization_id: 14,
      remaining: 20,
      resets_in_secs: 600,
      total: 100,
    },
    workspace_subscription: {
      plan_name: "Starter",
      state: "active",
    },
    site_url: "",
    workspaces: [
      createWorkspaceFixture(),
      createWorkspaceFixture({
        id: 303,
        name: "North Ridge Studio",
        default_currency: "EUR",
      }),
    ],
    ...overrides,
  };
}

export function createProfileFixture(
  overrides?: Partial<WebCurrentUserProfileDto>,
): WebCurrentUserProfileDto {
  return {
    id: 99,
    email: "alex@example.com",
    fullname: "Alex North",
    api_token: "api-token-99",
    timezone: "Europe/Tallinn",
    default_workspace_id: 202,
    beginning_of_week: 1,
    country_id: 70,
    has_password: true,
    "2fa_enabled": true,
    is_instance_admin: false,
    ...overrides,
  };
}

export function createOrganizationFixture(
  overrides?: Partial<WebOrganizationSettingsDto>,
): WebOrganizationSettingsDto {
  return {
    id: 14,
    name: "North Ridge Org",
    admin: true,
    max_workspaces: 12,
    pricing_plan_name: "Starter",
    is_multi_workspace_enabled: true,
    user_count: 8,
    ...overrides,
  };
}

export function createWorkspaceFixture(
  overrides?: Partial<WebWorkspaceSettingsDto>,
): WebWorkspaceSettingsDto {
  return {
    id: 202,
    organization_id: 14,
    name: "North Ridge Delivery",
    logo_url: "https://cdn.example.com/logo.png",
    default_currency: "USD",
    default_hourly_rate: 175,
    rounding: 1,
    rounding_minutes: 15,
    reports_collapse: true,
    only_admins_may_create_projects: false,
    only_admins_may_create_tags: true,
    only_admins_see_team_dashboard: false,
    projects_billable_by_default: true,
    projects_private_by_default: false,
    projects_enforce_billable: true,
    limit_public_project_data: false,
    admin: true,
    premium: true,
    role: "admin",
    ...overrides,
  };
}

export function createWorkspaceSettingsEnvelopeFixture(
  overrides?: Partial<WorkspaceSettingsEnvelopeDto>,
): WorkspaceSettingsEnvelopeDto {
  return {
    workspace: createWorkspaceFixture(),
    preferences: {
      hide_start_end_times: false,
      report_locked_at: "",
      show_timesheet_view: true,
      required_time_entry_fields: [],
    },
    subscription: {
      plan_name: "Starter",
      state: "active",
    },
    capabilities: {
      context: {
        scope: "workspace",
        organization_id: 14,
        workspace_id: 202,
      },
      capabilities: [
        {
          key: "reports",
          enabled: true,
          source: "billing",
        },
      ],
    },
    quota: {
      organization_id: 14,
      remaining: 20,
      resets_in_secs: 600,
      total: 100,
    },
    ...overrides,
  };
}

export function createWorkspacePermissionsFixture(
  overrides?: Partial<WorkspacePermissionsEnvelopeFixture>,
): WorkspacePermissionsEnvelopeFixture {
  return {
    workspace: {
      only_admins_may_create_projects: false,
      only_admins_may_create_tags: true,
      only_admins_see_team_dashboard: false,
      limit_public_project_data: false,
      ...overrides?.workspace,
    },
    ...overrides,
  };
}

export function createWorkspaceMemberFixture(
  overrides?: Partial<WorkspaceMemberDto>,
): WorkspaceMemberDto {
  return {
    id: 1,
    workspace_id: 202,
    email: "alex@example.com",
    name: "Alex Johnson",
    role: "admin",
    status: "joined",
    hourly_rate: 0,
    labor_cost: 0,
    ...overrides,
  };
}

export function createWorkspaceMembersFixture(
  overrides?: Partial<WorkspaceMembersEnvelopeDto>,
): WorkspaceMembersEnvelopeDto {
  return {
    members: [
      createWorkspaceMemberFixture(),
      createWorkspaceMemberFixture({
        id: 2,
        email: "bailey@example.com",
        name: "Bailey Lee",
        role: "admin",
      }),
      createWorkspaceMemberFixture({
        id: 3,
        email: "casey@example.com",
        name: "Casey Smith",
        role: "member",
      }),
    ],
    ...overrides,
  };
}

export function createProjectSummaryFixture(
  overrides?: Partial<ProjectSummaryDto>,
): ProjectSummaryDto {
  return {
    id: 1001,
    name: "Website Revamp",
    workspace_id: 202,
    active: true,
    pinned: false,
    client_name: "North Ridge Client",
    template: false,
    actual_seconds: 14400,
    tracked_seconds_current_period: 5400,
    tracked_seconds_previous_period: 3600,
    recurring_period: "weekly",
    recurring_period_start: "2026-03-17",
    recurring_period_end: "2026-03-23",
    ...overrides,
  };
}

export function createProjectsFixture(
  overrides?: Partial<ProjectListEnvelopeDto>,
): ProjectListEnvelopeDto {
  return {
    projects: [
      createProjectSummaryFixture(),
      createProjectSummaryFixture({
        id: 1002,
        name: "Community Launch",
        active: false,
        pinned: true,
      }),
    ],
    ...overrides,
  };
}

export function createProjectMembersFixture(
  overrides?: Partial<ProjectMembersEnvelopeDto>,
): ProjectMembersEnvelopeDto {
  return {
    members: [
      {
        project_id: 1001,
        member_id: 99,
        role: "admin",
      },
    ],
    ...overrides,
  };
}

export function createClientSummaryFixture(
  overrides?: Partial<ClientSummaryFixture>,
): ClientSummaryFixture {
  return {
    id: 501,
    name: "North Ridge Client",
    workspace_id: 202,
    active: true,
    ...overrides,
  };
}

export function createClientsFixture(overrides?: Partial<ClientListFixture>): ClientListFixture {
  return {
    clients: [
      createClientSummaryFixture(),
      createClientSummaryFixture({
        id: 502,
        name: "Studio Partner",
        active: false,
      }),
    ],
    ...overrides,
  };
}

export function createTagSummaryFixture(overrides?: Partial<TagSummaryFixture>): TagSummaryFixture {
  return {
    id: 701,
    name: "Urgent",
    workspace_id: 202,
    active: true,
    ...overrides,
  };
}

export function createTaskSummaryFixture(
  overrides?: Partial<TaskSummaryFixture>,
): TaskSummaryFixture {
  return {
    id: 601,
    name: "Prep launch brief",
    workspace_id: 202,
    active: true,
    ...overrides,
  };
}

export function createTasksFixture(overrides?: Partial<TaskListFixture>): TaskListFixture {
  return {
    tasks: [
      createTaskSummaryFixture(),
      createTaskSummaryFixture({
        id: 602,
        name: "Retro follow-up",
        active: false,
      }),
    ],
    ...overrides,
  };
}

export function createGroupSummaryFixture(
  overrides?: Partial<GroupSummaryFixture>,
): GroupSummaryFixture {
  return {
    id: 901,
    name: "Marketing pod",
    workspace_id: 202,
    active: true,
    ...overrides,
  };
}

export function createGroupsFixture(overrides?: Partial<GroupListFixture>): GroupListFixture {
  return {
    groups: [
      createGroupSummaryFixture(),
      createGroupSummaryFixture({
        id: 902,
        name: "Contractors",
        active: false,
      }),
    ],
    ...overrides,
  };
}

export function createTagsFixture(overrides?: Partial<TagListFixture>): TagListFixture {
  return {
    tags: [
      createTagSummaryFixture(),
      createTagSummaryFixture({
        id: 702,
        name: "Ops",
        active: false,
      }),
    ],
    ...overrides,
  };
}
