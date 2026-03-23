import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import {
  mapSessionBootstrap,
  type SessionBootstrapViewModel,
} from "../../entities/session/session-bootstrap.ts";
import type { WebSessionBootstrapDto } from "../api/web-contract.ts";

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

type SessionContextValue = {
  session: SessionSnapshot;
  setCurrentWorkspaceId: (workspaceId: number) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

type SessionProviderProps = {
  children: ReactNode;
  requestedWorkspaceId?: number;
  sessionBootstrap: WebSessionBootstrapDto;
};

export function SessionProvider({
  children,
  requestedWorkspaceId,
  sessionBootstrap,
}: SessionProviderProps) {
  const fallbackWorkspaceId =
    sessionBootstrap.current_workspace_id ?? sessionBootstrap.workspaces[0]?.id ?? 0;
  const [currentWorkspaceId, setCurrentWorkspaceId] = useState(
    requestedWorkspaceId ?? fallbackWorkspaceId,
  );

  useEffect(() => {
    if (requestedWorkspaceId != null) {
      setCurrentWorkspaceId(requestedWorkspaceId);
    }
  }, [requestedWorkspaceId]);

  const session = useMemo(
    () =>
      mapSessionBootstrap(sessionBootstrap, {
        requestedWorkspaceId: currentWorkspaceId,
      }),
    [currentWorkspaceId, sessionBootstrap],
  );
  const value = useMemo(
    () => ({
      session,
      setCurrentWorkspaceId,
    }),
    [session],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionSnapshot {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error("SessionProvider is required");
  }

  return session.session;
}

export function useSessionActions(): Pick<SessionContextValue, "setCurrentWorkspaceId"> {
  const session = useContext(SessionContext);

  if (!session) {
    throw new Error("SessionProvider is required");
  }

  return {
    setCurrentWorkspaceId: session.setCurrentWorkspaceId,
  };
}
