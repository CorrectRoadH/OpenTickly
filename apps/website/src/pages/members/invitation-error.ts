import { WebApiError } from "../../shared/api/web-client.ts";

type Translate = (key: string) => string;

export function resolveInvitationError(
  error: unknown,
  t: Translate,
  fallbackKey: "couldNotResendInvite" | "couldNotSendInvitation",
): string {
  if (!(error instanceof WebApiError)) {
    return t(fallbackKey);
  }

  const code = invitationErrorCode(error);
  const messageKey = invitationErrorMessageKey(code);
  if (messageKey) {
    return t(messageKey);
  }
  if (error.status === 422) {
    return t(fallbackKey);
  }
  return error.userMessage || t(fallbackKey);
}

function invitationErrorMessageKey(code: string | null): string | null {
  switch (code) {
    case "smtp_not_configured":
      return "toast:emailSendingNotConfigured";
    case "site_url_not_configured":
      return "toast:siteUrlNotConfigured";
    case "connect_failed":
      return "toast:testEmailConnectFailed";
    case "tls_failed":
      return "toast:testEmailTlsFailed";
    case "auth_failed":
      return "toast:testEmailAuthFailed";
    case "recipient_rejected":
      return "toast:testEmailRecipientRejected";
    case "timeout":
      return "toast:testEmailTimeout";
    default:
      return null;
  }
}

function invitationErrorCode(error: WebApiError): string | null {
  if (error.status === 422) {
    const data = error.data;
    if (typeof data === "object" && data !== null && "error" in data) {
      const code = (data as { error?: unknown }).error;
      if (typeof code === "string") {
        return code;
      }
    }
  }

  const message = error.userMessage ?? "";
  if (message.includes("smtp_not_configured") || message.includes("SMTP")) {
    return "smtp_not_configured";
  }
  if (message.includes("site_url_not_configured") || message.includes("site URL")) {
    return "site_url_not_configured";
  }
  return null;
}
