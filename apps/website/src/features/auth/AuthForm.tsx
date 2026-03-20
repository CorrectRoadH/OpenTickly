import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { Link } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { type ReactElement } from "react";
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
  mode: AuthMode;
  onSubmit: (payload: LoginRequestDto | RegisterRequestDto) => Promise<void> | void;
};

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export function AuthForm({ errorMessage, mode, onSubmit }: AuthFormProps): ReactElement {
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
    <AppPanel className="mx-auto w-full max-w-xl bg-white/95">
      <form className="space-y-5" onSubmit={form.handleSubmit(handleSubmit)}>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
            {mode === "login" ? "Log in to OpenToggl" : "Create your OpenToggl account"}
          </h1>
          <p className="text-sm leading-6 text-slate-600">
            {mode === "login"
              ? "Use your account credentials to bootstrap the workspace shell."
              : "Create an account and continue directly into your workspace shell."}
          </p>
        </div>

        {mode === "register" ? (
          <Field label="Full name">
            <input
              className="rounded-2xl border border-slate-300 px-4 py-3"
              {...form.register("fullName")}
            />
          </Field>
        ) : null}

        <Field label="Email">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            type="email"
            {...form.register("email")}
          />
        </Field>

        <Field label="Password">
          <input
            className="rounded-2xl border border-slate-300 px-4 py-3"
            type="password"
            {...form.register("password")}
          />
        </Field>

        <AppButton type="submit">{mode === "login" ? "Log in" : "Register"}</AppButton>

        {errorMessage ? (
          <p
            className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}

        <p className="text-sm text-slate-600">
          {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
          <Link
            className="font-semibold text-emerald-800 underline-offset-4 hover:underline"
            to={mode === "login" ? "/register" : "/login"}
          >
            {mode === "login" ? "Register" : "Log in"}
          </Link>
        </p>
      </form>
    </AppPanel>
  );
}

function Field(props: { children: ReactElement; label: string }): ReactElement {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {props.label}
      {props.children}
    </label>
  );
}
