# Issue #118: recover sessions after organization deletion

Deleting an organization cascades its workspaces, memberships and `web_user_homes`
row. The Redis home and session-shell projections could outlive those rows,
return a deleted workspace, and attempt to recreate its owner membership. Once
those caches expired, provisioning created another organization even when the
user still belonged to an existing workspace.

## Repair within the existing session contract

- Read the home and session shell from their authoritative repositories instead
  of caching these mutable membership projections. Old Redis values are ignored;
  no cache flush, schema migration or user intervention is required on upgrade.
- Under the existing provisioning mutex, list the user's surviving workspaces.
  Keep a valid home; otherwise select the valid default workspace, or the first
  available workspace in repository ID order. Persist the repaired home.
- Preserve an accessible default workspace; replace a missing/deleted default
  with the recovered home. The same response must expose the corrected default,
  not the user snapshot taken before provisioning.
- Only provision a new organization/workspace when no workspace remains.
  Ensure owner membership only for that newly provisioned workspace; selecting
  an existing workspace must not change the user's role.
- Preserve the DELETE endpoint and existing frontend navigation. Recovery applies
  to session bootstrap and fresh login, including users affected before upgrade.

This adds database reads to session bootstrap in exchange for removing stale
home/shell projections. It does not introduce a new persistence model, API,
permission model or cross-process provisioning mechanism. Cross-process races
in initial provisioning remain outside this repair.

## Verification

`TestOrganizationDeletionRecoversSession` uses real PostgreSQL and Redis and
first reproduced the stale deleted home. It covers deletion of the only
organization and recovery into an existing workspace as an ordinary member,
checks immediate session/bootstrap and fresh login, persistent default and home
selection, absence of duplicate organizations, and unchanged membership role.

`organization-deletion-session.spec.ts` exercises the real Danger Zone UI,
redirect to Timer, reuse of the remaining organization, creation when none
remains, fresh login and reload, and captures the recovered page.
