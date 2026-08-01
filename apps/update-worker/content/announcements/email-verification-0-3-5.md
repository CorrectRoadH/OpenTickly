---
id: "email-verification-0-3-5-2026-08"
title: "Upgrade to 0.3.5 if you require email verification"
severity: "warning"
publishedAt: "2026-08-01"
link: "https://github.com/CorrectRoadH/OpenTickly/releases/tag/v0.3.5"
---

If "Require email verification" is turned on in instance admin settings, upgrade
OpenTickly to version 0.3.5. In earlier versions the verification link failed
and the resend request silently did nothing, so new users could never finish
signing up. 0.3.5 also releases an email address held by an abandoned signup,
and includes the SMTP delivery fixes from 0.3.4.
