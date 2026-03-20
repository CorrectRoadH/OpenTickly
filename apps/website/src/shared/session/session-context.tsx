import { createContext, useContext, type ReactNode } from "react";

import type { SessionBootstrapViewModel } from "../../entities/session/session-bootstrap.ts";

export type SessionSnapshot = SessionBootstrapViewModel;

export const defaultSessionSnapshot: SessionSnapshot = {
  availableWorkspaces: [
    {
      id: 202,
      isCurrent: true,
      name: "North Ridge Delivery",
      organizationId: 14,
    },
  ],
  currentOrganization: {
    id: 14,
    isAdmin: true,
    isMultiWorkspaceEnabled: true,
    maxWorkspaces: 12,
    name: "North Ridge Org",
    planName: "Starter",
    userCount: 8,
  },
  currentWorkspace: {
    id: 202,
    isAdmin: true,
    isCurrent: true,
    isPremium: true,
    limitPublicProjectData: false,
    logoUrl: null,
    name: "North Ridge Delivery",
    onlyAdminsMayCreateProjects: false,
    onlyAdminsMayCreateTags: false,
    onlyAdminsSeeTeamDashboard: false,
    organizationId: 14,
    projectsBillableByDefault: true,
    projectsEnforceBillable: true,
    projectsPrivateByDefault: false,
    reportsCollapse: true,
    role: "admin",
    rounding: 1,
    roundingMinutes: 15,
    defaultCurrency: "USD",
    defaultHourlyRate: 175,
  },
  user: {
    beginningOfWeek: 1,
    defaultWorkspaceId: 202,
    email: "alex@example.com",
    fullName: "Alex North",
    hasPassword: true,
    id: 99,
    imageUrl: null,
    timezone: "Europe/Tallinn",
    twoFactorEnabled: true,
  },
  workspaceCapabilities: null,
  workspaceQuota: null,
};

const SessionContext = createContext<SessionSnapshot | null>(null);

type SessionProviderProps = {
  children: ReactNode;
  value: SessionSnapshot;
};

export function SessionProvider({ children, value }: SessionProviderProps) {
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionSnapshot {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error("SessionProvider is required");
  }

  return session;
}
