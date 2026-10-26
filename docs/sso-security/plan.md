# SAML security implementation

- [Design and acceptance contract](README.md): implemented; primary agent owns design and integration.
- Independent native Codex / GPT-6.1 Sol review: four blockers corrected and
  focused re-review approved implementation; review pane closed.
- Implementation: complete, limited to confirmed security boundaries.
- Verification: [targeted acceptance passed](acceptance.md), including real cross-site
  Chromium/PostgreSQL/Redis/SAML, static checks and website build; no deployment.
- Delivery: commit and push authorized by user.
- Environment: temporary hash-verified harness-lint 0.6.0 and Grit available;
  new security rule identifies all three old unsafe code patterns. Dedicated
  PostgreSQL/Redis test instances isolate validation from existing runtimes.
