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

  const projectListMatch = to.match(/^\/projects\/(\d+)\/list$/);
  if (projectListMatch) {
    return pathname === to || pathname.startsWith(`/${projectListMatch[1]}/projects/`);
  }

  const settingsBase = to.match(/^(\/\d+\/settings)\/[^/]+$/);
  if (settingsBase) {
    return pathname === to || pathname.startsWith(`${settingsBase[1]}/`);
  }

  return pathname === to || pathname.startsWith(`${to}/`);
}
