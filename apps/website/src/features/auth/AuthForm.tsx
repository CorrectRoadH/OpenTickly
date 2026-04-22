import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import type { LoginRequestDto, RegisterRequestDto } from "../../shared/api/web-contract.ts";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const registerSchema = loginSchema.extend({
  fullName: z.string().optional(),
});

type AuthMode = "login" | "register";

type AuthFormProps = {
  errorMessage?: string | null;
  isSubmitting?: boolean;
  mode: AuthMode;
  onSubmit: (payload: LoginRequestDto | RegisterRequestDto) => Promise<void> | void;
};

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

const fieldClassName =
  "h-9 w-full rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px] text-[var(--track-text)] shadow-[0_1px_0_0_var(--track-depth-border)] outline-none transition-[border-color,box-shadow] duration-[var(--duration-fast)] placeholder:text-[var(--track-text-soft)] focus:border-[var(--track-accent)]";

export function AuthForm({
  errorMessage,
  isSubmitting = false,
  mode,
  onSubmit,
}: AuthFormProps): ReactElement {
  const { t } = useTranslation("auth");
  const form = useForm<LoginFormValues & RegisterFormValues>({
    defaultValues: {
      email: "",
      fullName: "",
      password: "",
    },
  });

  async function handleSubmit(values: LoginFormValues & RegisterFormValues) {
    if (mode === "register") {
      const parsed = registerSchema.parse(values);
      await onSubmit({
        email: parsed.email,
        fullname: parsed.fullName,
        password: parsed.password,
        timezone: resolveBrowserTimezone(),
      });
      return;
    }

    const parsed = loginSchema.parse(values);
    await onSubmit(parsed);
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
      {mode === "register" ? (
        <Field label={t("fullName")}>
          <input className={fieldClassName} {...form.register("fullName")} />
        </Field>
      ) : null}

      <Field label={t("email")}>
        <input
          className={fieldClassName}
          placeholder={t("emailPlaceholder")}
          type="email"
          {...form.register("email")}
        />
      </Field>

      <Field label={t("password")}>
        <input
          className={fieldClassName}
          placeholder={t("passwordPlaceholder")}
          type="password"
          {...form.register("password")}
        />
      </Field>

      {mode === "login" ? (
        <div className="flex justify-end">
          <Link
            className="text-[13px] text-[var(--track-accent-text)] underline-offset-4 hover:underline"
            to="/forgot-password"
          >
            {t("forgotPasswordLink")}
          </Link>
        </div>
      ) : null}

      <button
        className="flex h-9 w-full items-center justify-center rounded-[6px] border border-[var(--track-accent)] bg-[var(--track-accent)] px-3 text-[14px] font-semibold text-[var(--track-button-text)] shadow-[var(--track-depth-accent-shadow)] transition-[transform,box-shadow,background] duration-[var(--duration-fast)] ease-[var(--ease-spring)] hover:-translate-y-px hover:bg-[var(--track-accent-fill-hover)] hover:shadow-[var(--track-depth-accent-shadow-hover)] active:translate-y-px active:shadow-[var(--track-depth-shadow-active)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? t("submitting") : mode === "login" ? t("logIn") : t("register")}
      </button>

      {errorMessage ? (
        <p
          className="rounded-[6px] border border-[var(--track-state-error-border)] bg-[var(--track-danger-tint)] px-3 py-2 text-[14px] leading-5 text-[var(--track-accent-text)]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
        {mode === "login" ? t("needAnAccount") : t("alreadyHaveAnAccount")}{" "}
        <Link
          className="font-semibold text-[var(--track-accent-text)] underline-offset-4 hover:underline"
          to={mode === "login" ? "/register" : "/login"}
        >
          {mode === "login" ? t("register") : t("logIn")}
        </Link>
      </p>
    </form>
  );
}

function resolveBrowserTimezone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof tz === "string" && tz.length > 0 ? tz : undefined;
  } catch {
    return undefined;
  }
}

function Field(props: { children: ReactElement; label: string }): ReactElement {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-[11px] font-semibold uppercase text-[var(--track-text-muted)]">
        {props.label}
      </span>
      {props.children}
    </label>
  );
}
