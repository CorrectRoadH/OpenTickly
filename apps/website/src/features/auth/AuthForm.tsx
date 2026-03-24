import { Link } from "@tanstack/react-router";
import { type ReactElement } from "react";
import { useForm } from "react-hook-form";
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
  "h-9 w-full rounded-[6px] border border-[var(--track-border)] bg-[var(--track-surface)] px-3 text-[14px] text-[var(--track-text)] outline-none transition placeholder:text-[var(--track-text-soft)] focus:border-[var(--track-accent)]";

export function AuthForm({
  errorMessage,
  isSubmitting = false,
  mode,
  onSubmit,
}: AuthFormProps): ReactElement {
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
      });
      return;
    }

    const parsed = loginSchema.parse(values);
    await onSubmit(parsed);
  }

  return (
    <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
      {mode === "register" ? (
        <Field label="Full name">
          <input className={fieldClassName} {...form.register("fullName")} />
        </Field>
      ) : null}

      <Field label="Email">
        <input
          className={fieldClassName}
          placeholder="name@company.com"
          type="email"
          {...form.register("email")}
        />
      </Field>

      <Field label="Password">
        <input
          className={fieldClassName}
          placeholder="Enter your password"
          type="password"
          {...form.register("password")}
        />
      </Field>

      <button
        className="flex h-9 w-full items-center justify-center rounded-[6px] border border-[var(--track-accent)] bg-[var(--track-accent)] px-3 text-[14px] font-semibold text-black transition hover:bg-[var(--track-accent)]/90 disabled:cursor-not-allowed disabled:opacity-70"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Submitting…" : mode === "login" ? "Log in" : "Register"}
      </button>

      {errorMessage ? (
        <p
          className="rounded-[6px] border border-[#7a435f] bg-[rgba(71,36,67,0.5)] px-3 py-2 text-[14px] leading-5 text-[var(--track-accent-text)]"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <p className="text-[14px] leading-5 text-[var(--track-text-muted)]">
        {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
        <Link
          className="font-semibold text-[var(--track-accent-text)] underline-offset-4 hover:underline"
          to={mode === "login" ? "/register" : "/login"}
        >
          {mode === "login" ? "Register" : "Log in"}
        </Link>
      </p>
    </form>
  );
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
