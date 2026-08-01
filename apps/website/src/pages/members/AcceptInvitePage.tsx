import { Link, useNavigate } from "@tanstack/react-router";
import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { type FormEvent, type ReactElement, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { PublicMainPanelFrame } from "../../app/PublicMainPanelFrame.tsx";
import { PublicStatusPage } from "../../app/PublicStatusPage.tsx";
import { WebApiError } from "../../shared/api/web-client.ts";
import type { WorkspaceInviteInfo } from "../../shared/api/generated/web/types.gen.ts";
import {
  useAcceptWorkspaceInviteMutation,
  useAcceptWorkspaceInviteSignupMutation,
  useLogoutMutation,
  useSessionBootstrapQuery,
  useWorkspaceInviteQuery,
} from "../../shared/query/web-shell.ts";

type AcceptInvitePageProps = {
  token?: string;
};

export function AcceptInvitePage({ token }: AcceptInvitePageProps): ReactElement {
  const { t } = useTranslation("members");

  if (!token) {
    return <InviteStatusPanel heading={t("acceptInviteMissingToken")} tone="error" />;
  }

  return <AcceptInviteFlow token={token} />;
}

function AcceptInviteFlow({ token }: { token: string }): ReactElement {
  const { t } = useTranslation("members");
  const inviteQuery = useWorkspaceInviteQuery(token);
  const sessionQuery = useSessionBootstrapQuery();

  if (inviteQuery.isPending) {
    return <InviteStatusPanel heading={t("acceptInviteLoading")} />;
  }

  if (inviteQuery.isError || !inviteQuery.data) {
    const notFound = inviteQuery.error instanceof WebApiError && inviteQuery.error.status === 404;
    return (
      <InviteStatusPanel
        heading={notFound ? t("acceptInviteNotFound") : t("acceptInviteUnavailable")}
        tone="error"
      >
        <Link className={primaryLinkClassName} to="/login">
          {t("acceptInviteGoToLogin")}
        </Link>
      </InviteStatusPanel>
    );
  }

  const invite = inviteQuery.data;

  if (invite.status === "expired") {
    return (
      <InviteStatusPanel heading={t("acceptInviteExpired")} tone="error">
        <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
          {t("acceptInviteExpiredHint", { inviter: invite.inviter_name })}
        </p>
      </InviteStatusPanel>
    );
  }

  if (invite.status === "consumed") {
    return (
      <InviteStatusPanel heading={t("acceptInviteConsumed")} tone="success">
        <Link className={primaryLinkClassName} to="/login">
          {t("acceptInviteGoToLogin")}
        </Link>
      </InviteStatusPanel>
    );
  }

  // Session query is still loading → wait so we can decide the right branch.
  if (sessionQuery.isPending) {
    return <InviteStatusPanel heading={t("acceptInviteLoading")} />;
  }

  const sessionEmail = sessionQuery.data?.user?.email?.toLowerCase() ?? null;
  const inviteEmail = invite.email.toLowerCase();
  const loggedIn = sessionEmail !== null;
  const matches = sessionEmail === inviteEmail;

  if (loggedIn && matches) {
    return <AutoAcceptFlow invite={invite} token={token} />;
  }

  if (loggedIn && !matches) {
    return (
      <WrongAccountStatus
        inviteEmail={invite.email}
        sessionEmail={sessionQuery.data?.user?.email ?? ""}
      />
    );
  }

  return <InviteAuthChoice invite={invite} token={token} />;
}

function AutoAcceptFlow({
  invite,
  token,
}: {
  invite: WorkspaceInviteInfo;
  token: string;
}): ReactElement {
  const { t } = useTranslation("members");
  const navigate = useNavigate();
  const acceptMutation = useAcceptWorkspaceInviteMutation();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    acceptMutation
      .mutateAsync(token)
      .then((accepted) => {
        if (cancelled) return;
        void navigate({
          to: "/invite-status/joined",
          search: {
            workspaceId: accepted.workspace_id,
            workspaceName: accepted.workspace_name,
          },
        });
      })
      .catch((error) => {
        if (cancelled) return;
        setErrorMessage(resolveApiError(error, t("acceptInviteFailed")));
      });
    return () => {
      cancelled = true;
    };
    // Token is stable for the life of this page; rerunning on mutation identity change would double-fire.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (errorMessage) {
    return (
      <InviteStatusPanel heading={t("acceptInviteFailed")} tone="error">
        <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">{errorMessage}</p>
      </InviteStatusPanel>
    );
  }

  return (
    <InviteStatusPanel heading={t("acceptInviteJoining", { workspace: invite.workspace_name })} />
  );
}

function InviteAuthChoice({
  invite,
  token,
}: {
  invite: WorkspaceInviteInfo;
  token: string;
}): ReactElement {
  const { t } = useTranslation("members");
  const [mode, setMode] = useState<"signup" | "login">("signup");

  return (
    <PublicMainPanelFrame
      badge={t("acceptInviteEyebrow")}
      description={t("acceptInviteBlurb", {
        inviter: invite.inviter_name || t("acceptInviteUnknownInviter"),
        organization: invite.organization_name,
        email: invite.email,
      })}
      title={t("acceptInviteHeading", { workspace: invite.workspace_name })}
    >
      <div className="space-y-6">
        <div className="flex gap-2 border-b border-[var(--track-border)]">
          <TabButton active={mode === "signup"} onClick={() => setMode("signup")}>
            {t("acceptInviteCreateAccount")}
          </TabButton>
          <TabButton active={mode === "login"} onClick={() => setMode("login")}>
            {t("acceptInviteHaveAccount")}
          </TabButton>
        </div>

        {mode === "signup" ? (
          <InviteSignupForm invite={invite} token={token} />
        ) : (
          <InviteLoginHint email={invite.email} token={token} />
        )}
      </div>
    </PublicMainPanelFrame>
  );
}

function InviteSignupForm({
  invite,
  token,
}: {
  invite: WorkspaceInviteInfo;
  token: string;
}): ReactElement {
  const { t } = useTranslation("members");
  const navigate = useNavigate();
  const signupMutation = useAcceptWorkspaceInviteSignupMutation();
  const [fullname, setFullname] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const trimmedFullname = fullname.trim();
  const canSubmit = Boolean(trimmedFullname && password) && !signupMutation.isPending;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) return;
    setErrorMessage(null);
    try {
      await signupMutation.mutateAsync({
        token,
        body: {
          fullname: trimmedFullname,
          password,
          timezone: resolveBrowserTimezone(),
        },
      });
      void navigate({
        to: "/invite-status/joined",
        search: {
          workspaceId: invite.workspace_id,
          workspaceName: invite.workspace_name,
        },
      });
    } catch (error) {
      setErrorMessage(resolveApiError(error, t("acceptInviteFailed")));
    }
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <Field label={t("acceptInviteEmailLabel")}>
        <input
          className={lockedFieldClassName}
          disabled
          readOnly
          type="email"
          value={invite.email}
        />
      </Field>
      <Field label={t("acceptInviteFullNameLabel")}>
        <input
          autoComplete="name"
          className={fieldClassName}
          onChange={(event) => setFullname(event.target.value)}
          type="text"
          value={fullname}
        />
      </Field>
      <Field label={t("acceptInvitePasswordLabel")}>
        <input
          autoComplete="new-password"
          className={fieldClassName}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          value={password}
        />
      </Field>

      {errorMessage ? (
        <p
          className="rounded-[6px] border border-[var(--track-state-error-border)] bg-[var(--track-danger-tint)] px-3 py-2 text-[14px] leading-5 text-[var(--track-state-error-text)]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <button className={primaryButtonClassName} disabled={!canSubmit} type="submit">
        {signupMutation.isPending ? t("acceptInviteSubmitting") : t("acceptInviteCreateAndJoin")}
      </button>
    </form>
  );
}

function InviteLoginHint({ email }: { email: string; token: string }): ReactElement {
  const { t } = useTranslation("members");
  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
        {t("acceptInviteLoginHint", { email })}
      </p>
      <p className="text-[12px] leading-5 text-[var(--track-text-soft)]">
        {t("acceptInviteLoginReopenHint")}
      </p>
      <Link className={primaryLinkClassName} to="/login">
        {t("acceptInviteGoToLogin")}
      </Link>
    </div>
  );
}

function InviteStatusPanel({
  children,
  heading,
  tone,
}: {
  children?: ReactElement | ReactElement[];
  heading: string;
  tone?: "error" | "success";
}): ReactElement {
  const { t } = useTranslation("members");
  return (
    <PublicStatusPage
      badge={t("acceptInviteEyebrow")}
      icon={tone === "error" ? CircleAlert : tone === "success" ? CircleCheck : LoaderCircle}
      title={heading}
      tone={tone ?? "neutral"}
    >
      {children}
    </PublicStatusPage>
  );
}

function WrongAccountStatus({
  inviteEmail,
  sessionEmail,
}: {
  inviteEmail: string;
  sessionEmail: string;
}): ReactElement {
  const { t } = useTranslation("members");
  const { t: tAppShell } = useTranslation("appShell");
  const logoutMutation = useLogoutMutation();

  async function handleLogout(): Promise<void> {
    try {
      await logoutMutation.mutateAsync();
      window.location.reload();
    } catch {
      // The mutation state renders the localized recovery message below the action.
    }
  }

  return (
    <PublicStatusPage
      badge={t("acceptInviteEyebrow")}
      description={t("acceptInviteWrongAccountHint", { inviteEmail, sessionEmail })}
      icon={CircleAlert}
      title={t("acceptInviteWrongAccount")}
      tone="error"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button
            className={primaryButtonClassName}
            disabled={logoutMutation.isPending}
            onClick={() => void handleLogout()}
            type="button"
          >
            {tAppShell("logOut")}
          </button>
        </div>
        {logoutMutation.isError ? (
          <p className="text-[14px] text-[var(--track-state-error-text)]" role="alert">
            {t("acceptInviteUnavailable")}
          </p>
        ) : null}
      </div>
    </PublicStatusPage>
  );
}

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: string;
  onClick: () => void;
}): ReactElement {
  return (
    <button
      className={
        active
          ? "border-b-2 border-[var(--track-accent)] px-3 py-2 text-[14px] font-semibold text-[var(--track-text)]"
          : "border-b-2 border-transparent px-3 py-2 text-[14px] font-medium text-[var(--track-text-muted)] hover:text-[var(--track-text)]"
      }
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function Field({ children, label }: { children: ReactElement; label: string }): ReactElement {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase text-[var(--track-text-muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function resolveApiError(error: unknown, fallback: string): string {
  if (error instanceof WebApiError) {
    if (typeof error.userMessage === "string" && error.userMessage.length > 0) {
      return error.userMessage;
    }
    if (typeof error.data === "string" && error.data.length > 0) {
      return error.data;
    }
    if (
      typeof error.data === "object" &&
      error.data !== null &&
      "message" in error.data &&
      typeof error.data.message === "string" &&
      error.data.message.length > 0
    ) {
      return error.data.message;
    }
  }
  return fallback;
}

function resolveBrowserTimezone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length > 0 ? tz : undefined;
  } catch {
    return undefined;
  }
}

const fieldClassName =
  "h-9 w-full rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px] text-[var(--track-text)] outline-none transition focus:border-[var(--track-accent)]";
const lockedFieldClassName =
  "h-9 w-full rounded-[6px] border border-[var(--track-border)] bg-[var(--track-canvas)] px-3 text-[14px] text-[var(--track-text-muted)] outline-none";
const primaryButtonClassName =
  "inline-flex h-9 items-center justify-center rounded-[6px] border border-[var(--track-accent)] bg-[var(--track-accent)] px-4 text-[14px] font-semibold text-[var(--track-button-text)] shadow-[var(--track-depth-accent-shadow)] transition hover:bg-[var(--track-accent-fill-hover)] disabled:cursor-not-allowed disabled:opacity-50";
const primaryLinkClassName = primaryButtonClassName;

export default AcceptInvitePage;
