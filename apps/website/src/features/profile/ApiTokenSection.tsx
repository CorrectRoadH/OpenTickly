import { AppButton, AppPanel } from "@opentoggl/web-ui";
import { type ReactElement } from "react";

type ApiTokenSectionProps = {
  isRotating?: boolean;
  onRotate: () => Promise<void> | void;
  token: string;
};

export function ApiTokenSection({
  isRotating = false,
  onRotate,
  token,
}: ApiTokenSectionProps): ReactElement {
  return (
    <AppPanel className="border-white/8 bg-[#1f1f23]" data-testid="api-token-section">
      <div className="space-y-5">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold text-white">API token</h2>
          <p className="text-sm leading-6 text-slate-400">
            Use this token for the Wave 1 account-level API entrypoints, including Basic auth with
            the token as both username and password.
          </p>
        </div>

        <label className="flex flex-col gap-2 text-sm font-medium text-slate-300">
          Current token
          <input
            className="rounded-xl border border-white/10 bg-[#18181c] px-4 py-3 font-mono text-sm text-white"
            readOnly
            value={token}
          />
        </label>

        <div className="flex flex-wrap items-center gap-3">
          <AppButton
            disabled={isRotating}
            onClick={() => {
              void onRotate();
            }}
          >
            {isRotating ? "Rotating token…" : "Rotate token"}
          </AppButton>
          <p className="text-sm leading-6 text-slate-400">
            Rotating immediately replaces the current token shown here.
          </p>
        </div>
      </div>
    </AppPanel>
  );
}
