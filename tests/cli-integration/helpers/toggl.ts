import { execa } from "execa";
import type { TestUser } from "./types.ts";

const apiUrl = () =>
  process.env.OPENTOGGL_CLI_TEST_URL ?? "http://127.0.0.1:8080/api/v9";

export async function toggl(
  args: string[],
  opts: { user: TestUser },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return execa("toggl", args, {
    env: {
      TOGGL_API_TOKEN: opts.user.apiToken,
      TOGGL_API_URL: apiUrl(),
      TOGGL_DISABLE_HTTP_CACHE: "1",
    },
    reject: false,
  });
}

export async function togglJson<T = unknown>(
  args: string[],
  opts: { user: TestUser },
): Promise<T> {
  const result = await toggl([...args, "--json"], opts);
  if (result.exitCode !== 0) {
    throw new Error(
      `toggl ${args.join(" ")} failed (exit ${result.exitCode}): ${result.stderr || result.stdout}`,
    );
  }
  return JSON.parse(result.stdout) as T;
}

export async function togglExpectFail(
  args: string[],
  opts: { user: TestUser },
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const result = await toggl(args, opts);
  if (result.exitCode === 0) {
    throw new Error(
      `expected toggl ${args.join(" ")} to fail, but it succeeded: ${result.stdout}`,
    );
  }
  return result;
}
