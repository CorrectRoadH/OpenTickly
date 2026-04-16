/**
 * Fetches the releases list for a GitHub repo, cached on Cloudflare's edge
 * cache for 5 minutes. The Worker is the single upstream client, so GH's
 * 60/hr unauthenticated rate limit / IP is plenty — one live fetch every
 * 5min = 12/hr from any given colo.
 */

export interface GithubRelease {
  tag_name: string;
  name: string | null;
  html_url: string;
  published_at: string | null;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
}

const CACHE_TTL_SECONDS = 300;
const RELEASES_PER_PAGE = 30;

export async function fetchReleases(repo: string, token?: string): Promise<GithubRelease[]> {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) {
    throw new Error(`github: invalid repo "${repo}"`);
  }
  const url = `https://api.github.com/repos/${repo}/releases?per_page=${RELEASES_PER_PAGE}`;
  const headers: Record<string, string> = {
    "User-Agent": "opentoggl-update-worker",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  // `cf.cacheTtl` + `cacheEverything` makes CF's HTTP cache keep this response
  // for CACHE_TTL_SECONDS regardless of GH's own cache headers. The cache key
  // is the URL, so every colo shares the same entry.
  const resp = await fetch(url, {
    headers,
    cf: { cacheTtl: CACHE_TTL_SECONDS, cacheEverything: true },
  });
  if (!resp.ok) {
    throw new Error(`github: ${resp.status} ${resp.statusText}`);
  }
  const body = (await resp.json()) as unknown;
  if (!Array.isArray(body)) {
    throw new Error("github: releases response is not an array");
  }
  return body as GithubRelease[];
}
