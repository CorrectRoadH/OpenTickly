import { z } from "zod";

const tokenSchema = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : undefined),
  z.string().min(1).optional(),
);

export type ResetPasswordSearch = {
  token?: unknown;
};

export function parseResetPasswordSearch(search: ResetPasswordSearch | undefined): {
  token?: string;
} {
  const parsed = tokenSchema.safeParse(search?.token);
  return {
    token: parsed.success ? parsed.data : undefined,
  };
}
