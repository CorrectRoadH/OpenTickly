export function isOverviewNavActive(pathname: string, overviewPath?: string): boolean {
  return Boolean(overviewPath) && pathname === overviewPath;
}

export function isTimerNavActive(pathname: string, timerPath?: string): boolean {
  return Boolean(timerPath) && pathname === timerPath;
}

export function isSectionNavActive(pathname: string, to?: string): boolean {
  if (!to) {
    return false;
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}
