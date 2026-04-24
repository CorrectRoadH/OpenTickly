import { AppPanel } from "@opentickly/web-ui";
import { Link, useNavigate } from "@tanstack/react-router";
import { type FormEvent, type ReactElement, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { WebApiError } from "../../shared/api/web-client.ts";
import type { WorkspaceInviteInfo } from "../../shared/api/generated/web/types.gen.ts";
import {
  useAcceptWorkspaceInviteMutation,
  useAcceptWorkspaceInviteSignupMutation,
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
        <Link
          className="inline-block rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-emerald-600 hover:text-emerald-800"
          to="/login"
        >
          {t("acceptInviteGoToLogin")}
        </Link>
      </InviteStatusPanel>
    );
  }

  const invite = inviteQuery.data;

  if (invite.status === "expired") {
    return (
      <InviteStatusPanel heading={t("acceptInviteExpired")} tone="error">
        <p className="text-sm leading-6 text-slate-600">
          {t("acceptInviteExpiredHint", { inviter: invite.inviter_name })}
        </p>
      </InviteStatusPanel>
    );
  }

  if (invite.status === "consumed") {
    return (
      <InviteStatusPanel heading={t("acceptInviteConsumed")}>
        <Link
          className="inline-block rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-emerald-600 hover:text-emerald-800"
          to="/login"
        >
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
      <InviteStatusPanel heading={t("acceptInviteWrongAccount")} tone="error">
        <p className="text-sm leading-6 text-slate-600">
          {t("acceptInviteWrongAccountHint", {
            sessionEmail: sessionQuery.data?.user?.email ?? "",
            inviteEmail: invite.email,
          })}
        </p>
      </InviteStatusPanel>
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
        <p className="text-sm leading-6 text-slate-600">{errorMessage}</p>
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
    <main className="min-h-screen px-4 py-8">
      <AppPanel className="mx-auto max-w-2xl" tone="light">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">
              {t("acceptInviteEyebrow")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              {t("acceptInviteHeading", { workspace: invite.workspace_name })}
            </h1>
            <p className="text-sm leading-6 text-slate-600">
              {t("acceptInviteBlurb", {
                inviter: invite.inviter_name || t("acceptInviteUnknownInviter"),
                organization: invite.organization_name,
                email: invite.email,
              })}
            </p>
          </div>

          <div className="flex gap-2 border-b border-slate-200">
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
      </AppPanel>
    </main>
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
          className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        className="w-full rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={!canSubmit}
        type="submit"
      >
        {signupMutation.isPending ? t("acceptInviteSubmitting") : t("acceptInviteCreateAndJoin")}
      </button>
    </form>
  );
}

function InviteLoginHint({ email }: { email: string; token: string }): ReactElement {
  const { t } = useTranslation("members");
  return (
    <div className="space-y-4">
      <p className="text-sm leading-6 text-slate-600">{t("acceptInviteLoginHint", { email })}</p>
      <p className="text-xs leading-5 text-slate-500">{t("acceptInviteLoginReopenHint")}</p>
      <Link
        className="inline-block rounded-2xl bg-emerald-700 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-600"
        to="/login"
      >
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
  tone?: "error";
}): ReactElement {
  const { t } = useTranslation("members");
  const eyebrowClass =
    tone === "error"
      ? "text-xs font-semibold uppercase tracking-[0.24em] text-rose-700"
      : "text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700";
  return (
    <main className="min-h-screen px-4 py-8">
      <AppPanel className="mx-auto max-w-2xl" tone="light">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className={eyebrowClass}>{t("acceptInviteEyebrow")}</p>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">{heading}</h1>
          </div>
          {children}
        </div>
      </AppPanel>
    </main>
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
          ? "border-b-2 border-emerald-700 px-3 py-2 text-sm font-medium text-slate-950"
          : "border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-800"
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
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-600">
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
  "h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-emerald-600";
const lockedFieldClassName =
  "h-10 w-full rounded-md border border-slate-200 bg-slate-100 px-3 text-sm text-slate-500 outline-none";

export default AcceptInvitePage;
