import { type ReactElement } from "react";
import { useSession } from "../../shared/session/session-context.tsx";

export function WorkspaceOverviewPage(): ReactElement {
  const session = useSession();
  const memberCount = session.currentOrganization?.userCount ?? 1;
  const trackedProjects = [
    { color: "#ff9a8a", duration: "2:44:50", name: "波粒时间" },
    { color: "#88dd83", duration: "0:38:28", name: "处理事务" },
    { color: "#edd86e", duration: "1:21:18", name: "吃饭/散步/放松" },
    { color: "#f4c76a", duration: "0:27:58", name: "记录思考 / rethink" },
    { color: "#ffb96d", duration: "1:30:52", name: "学习与拆解 Agent" },
  ];
  const weekBars = [
    { day: "Mon 03-23", hours: 6.72 },
    { day: "Tue 03-24", hours: 0 },
    { day: "Wed 03-25", hours: 0 },
    { day: "Thu 03-26", hours: 0 },
    { day: "Fri 03-27", hours: 0 },
    { day: "Sat 03-28", hours: 0 },
    { day: "Sun 03-29", hours: 0 },
  ];

  return (
    <div
      className="relative min-h-[728px] overflow-hidden bg-[#161616] px-3 py-4 text-white md:px-4"
      data-testid="workspace-overview-page"
    >
      <OverviewBackdrop />

      <div className="relative z-10 w-full max-w-[1024px] space-y-[10px]">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h1 className="text-[24px] font-semibold leading-[32px] text-white">Admin Overview</h1>
            <p className="text-[12px] leading-[16px] text-[#a4a4a4]">
              Set up your organization and keep your team on track
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 text-[10px] uppercase tracking-[0.04em] text-[#bfbfbf] md:items-end">
            <div className="flex items-center gap-2">
              <span className="normal-case tracking-normal text-[#d6d6d6]">Set as default view</span>
              <div className="flex h-[14px] w-[28px] items-center rounded-full bg-[#2b2b2b] px-[2px]">
                <div className="size-[10px] rounded-full bg-white" />
              </div>
              <span className="text-[#e57bd9]">Refresh charts</span>
              <span className="text-[#7f7f7f]">0</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-[14px] w-[28px] rounded-[4px] bg-[#0b0b0b] shadow-[inset_0_0_0_1px_#2b2b2b]" />
              <span className="text-[#c88ec0]">View all plans</span>
            </div>
          </div>
        </div>

        <div className="grid gap-[10px] lg:grid-cols-[minmax(0,430px)_214px]">
          <OverviewSurface className="bg-[#42213f] px-4 py-[13px]">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium leading-[16px] text-white">
                  Unlock your admin overview
                </p>
                <p className="mt-1 text-[11px] leading-[16px] text-[#cba3c7]">
                  Finish the steps below to see project and team activity.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-medium text-white">25%</span>
                <div className="h-[3px] w-[64px] overflow-hidden rounded-full bg-[#5f3a5b]">
                  <div className="h-full w-1/4 rounded-full bg-[#d686cc]" />
                </div>
                <span className="text-[#cba3c7]">⌄</span>
              </div>
            </div>
          </OverviewSurface>

          <OverviewSurface className="px-3 py-3">
            <div className="flex h-full flex-col gap-3">
              <div className="flex items-start justify-between">
                <p className="text-[40px] font-semibold leading-[1] text-white">{memberCount}</p>
                <div className="flex items-center gap-[-2px]">
                  {["#f9d7f4", "#f9e7cb", "#fff0d4", "#e57bd9", "#fbe5fb"].map((color, index) => (
                    <span
                      className="relative inline-flex size-[16px] items-center justify-center rounded-full border border-[#1c1c1c] text-[8px] font-semibold text-black"
                      key={index}
                      style={{
                        backgroundColor: color,
                        marginLeft: index === 0 ? 0 : "-4px",
                      }}
                    >
                      {index === 3 ? "👥" : "•"}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[14px] font-medium leading-[20px] text-white">
                  Members in your organization
                </p>
                <p className="text-[11px] leading-[16px] text-[#a4a4a4]">
                  Your insights are incomplete if you're tracking alone. Invite your team to see
                  the full picture.
                </p>
              </div>
              <div className="mt-auto space-y-2">
                <button
                  className="inline-flex h-7 items-center rounded-[6px] bg-[#e28dd6] px-4 text-[11px] font-medium text-[#1b1b1b]"
                  type="button"
                >
                  Add teammates
                </button>
                <p className="text-[11px] leading-[16px] text-[#a4a4a4]">
                  Bringing on a large team?{" "}
                  <span className="text-[#e4bddf] underline decoration-[#e4bddf]/40 underline-offset-2">
                    book a demo
                  </span>
                </p>
              </div>
            </div>
          </OverviewSurface>
        </div>

        <div className="grid gap-[10px] lg:grid-cols-[minmax(0,430px)_214px]">
          <OverviewSurface className="px-3 py-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-medium leading-[20px] text-white">
                  This week summary
                </h2>
                <span className="text-[10px] uppercase tracking-[0.04em] text-[#c88ec0]">
                  View reports
                </span>
              </div>
              <div className="grid h-[180px] grid-cols-7 gap-4 border-t border-[#2a2a2a] pt-3">
                {weekBars.map((bar) => (
                  <div className="flex h-full flex-col justify-between" key={bar.day}>
                    <div className="relative flex-1">
                      <div className="absolute inset-0 flex flex-col justify-between">
                        {["7h 30", "6h", "4h 30", "3h", "1h 30", "0h"].map((label) => (
                          <span className="border-b border-dashed border-[#242424] pb-1 text-[9px] text-[#666]" key={label}>
                            {label}
                          </span>
                        ))}
                      </div>
                      <div className="absolute inset-x-0 bottom-0 mx-auto h-full w-[26px] rounded-t-[2px] bg-transparent">
                        {bar.hours > 0 ? (
                          <div
                            className="absolute bottom-0 left-0 right-0 rounded-t-[2px] bg-[#cf58c4]"
                            style={{ height: `${(bar.hours / 7.5) * 100}%` }}
                          />
                        ) : null}
                      </div>
                      {bar.hours > 0 ? (
                        <span className="absolute left-1/2 top-[18px] -translate-x-1/2 text-[9px] text-[#cfcfcf]">
                          6:43:26
                        </span>
                      ) : null}
                    </div>
                    <span className="pt-2 text-center text-[9px] text-[#838383]">{bar.day}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 text-[9px] text-[#a4a4a4]">
                <span className="inline-block h-[3px] w-[14px] rounded-full bg-[#cf58c4]" />
                <span>Non-billable</span>
              </div>
            </div>
          </OverviewSurface>

          <OverviewSurface className="px-3 py-3">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-medium leading-[20px] text-white">
                  Top projects this week
                </h2>
                <span className="text-[10px] uppercase tracking-[0.04em] text-[#c88ec0]">
                  View reports
                </span>
              </div>
              <div className="space-y-2">
                {trackedProjects.map((project) => (
                  <div className="flex items-center gap-2 text-[11px]" key={project.name}>
                    <span
                      className="size-[5px] shrink-0 rounded-full"
                      style={{ backgroundColor: project.color }}
                    />
                    <span className="min-w-0 flex-1 truncate text-[#f0f0f0]">{project.name}</span>
                    <span className="text-[#d5d5d5]">{project.duration}</span>
                  </div>
                ))}
              </div>
            </div>
          </OverviewSurface>
        </div>

        <div className="grid gap-[10px] lg:grid-cols-[minmax(0,430px)_214px]">
          <OverviewSurface className="px-3 py-3">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-medium leading-[20px] text-white">Team activity</h2>
                <span className="text-[10px] uppercase tracking-[0.04em] text-[#c88ec0]">
                  View team activity
                </span>
              </div>
              <div className="grid gap-6 border-t border-[#2a2a2a] pt-4 md:grid-cols-[104px_minmax(0,1fr)]">
                <StatRing accent="#d67ad0" subtitle="1 out of 1 member tracking" title="100%" />
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-[9px] uppercase tracking-[0.04em] text-[#a4a4a4]">
                        Tracking
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex size-[18px] items-center justify-center rounded-full bg-[#d94182] text-[9px] font-semibold text-white">
                          {(session.user.fullName || session.user.email || "C").charAt(0).toUpperCase()}
                        </span>
                        <div className="text-[11px] leading-[16px]">
                          <p className="text-white">{session.user.fullName || session.user.email}</p>
                          <p className="text-[#a4a4a4]">6:43:26</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.04em] text-[#a4a4a4]">
                        Not tracking
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[11px] leading-[16px] text-[#a4a4a4]">
                      Bring your team to see the full picture
                    </p>
                    <button
                      className="inline-flex h-7 items-center rounded-[6px] bg-transparent px-0 text-[10px] font-semibold uppercase tracking-[0.04em] text-white"
                      type="button"
                    >
                      Invite teammates
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </OverviewSurface>

          <div className="space-y-[10px]">
            <OverviewSurface className="px-3 py-3">
              <div className="space-y-4">
                <h2 className="text-[14px] font-medium leading-[20px] text-white">
                  Time tracked to projects
                </h2>
                <div className="border-t border-[#2a2a2a] pt-4">
                  <StatRing accent="#f0c05d" subtitle="Keep it this way" title="100%" />
                </div>
                <button
                  className="inline-flex h-7 items-center px-0 text-[10px] font-semibold uppercase tracking-[0.04em] text-[#c88ec0]"
                  type="button"
                >
                  Add member to project
                </button>
              </div>
            </OverviewSurface>

            <OverviewSurface className="px-3 py-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-[14px] font-medium leading-[20px] text-white">FAQ</h2>
                  <span className="text-[10px] uppercase tracking-[0.04em] text-[#c88ec0]">
                    View more ↗
                  </span>
                </div>
                <p className="border-b border-[#2a2a2a] pb-2 text-[11px] leading-[16px] text-[#a4a4a4]">
                  The stuff most admins ask us
                </p>
                <div className="space-y-1 text-[11px] leading-[16px] text-[#d0d0d0]">
                  <p>How should I set up my workspace?</p>
                  <p>How do roles and permissions work?</p>
                  <p>How do I set billable rates?</p>
                  <p>How can I ensure accurate time tracking?</p>
                  <p>How do I create and use reports?</p>
                </div>
              </div>
            </OverviewSurface>
          </div>
        </div>

        <div className="pt-5 text-center text-[10px] text-[#a4a4a4]">
          <span>How could this be more useful for you? </span>
          <span className="text-[#d7a2d1] underline decoration-[#d7a2d1]/40 underline-offset-2">
            Let us know.
          </span>
        </div>
      </div>
    </div>
  );
}

function OverviewSurface({
  children,
  className = "",
}: {
  children: ReactElement | ReactElement[] | string;
  className?: string;
}): ReactElement {
  return (
    <section className={`rounded-[6px] border border-[#313131] bg-[#1d1d1d] ${className}`}>
      {children}
    </section>
  );
}

function StatRing({
  accent,
  subtitle,
  title,
}: {
  accent: string;
  subtitle: string;
  title: string;
}): ReactElement {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className="grid size-[72px] place-items-center rounded-full"
        style={{
          background: `conic-gradient(${accent} 0deg 360deg, transparent 360deg)`,
        }}
      >
        <div className="grid size-[52px] place-items-center rounded-full bg-[#1d1d1d] text-[18px] font-semibold text-white">
          {title}
        </div>
      </div>
      <p className="text-[10px] leading-[16px] text-[#a4a4a4]">{subtitle}</p>
    </div>
  );
}

function OverviewBackdrop(): ReactElement {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[-120px] top-[520px] size-[280px] rounded-full border-[38px] border-[#202020] opacity-90" />
      <div
        className="absolute bottom-[-110px] left-[-40px] h-[240px] w-[360px] rounded-[48px] bg-[#1b1b1b] opacity-70"
        style={{ clipPath: "polygon(0 20%, 78% 0, 100% 100%, 18% 100%)" }}
      />
      <div
        className="absolute right-[72px] top-[140px] h-[190px] w-[220px] bg-[#1b1b1b] opacity-75"
        style={{ clipPath: "polygon(34% 0, 100% 22%, 78% 100%, 0 72%)" }}
      />
      <div className="absolute right-[-70px] top-[255px] size-[130px] rounded-full border-[22px] border-[#222222] opacity-85" />
      <div
        className="absolute bottom-[46px] right-[185px] h-[280px] w-[220px] bg-[#1d1d1d] opacity-75"
        style={{ clipPath: "polygon(35% 0, 100% 16%, 88% 100%, 0 80%)" }}
      />
      <div
        className="absolute right-[235px] top-[32px] h-[74px] w-[70px] bg-[#1e1e1e] opacity-80"
        style={{ clipPath: "polygon(52% 0, 100% 52%, 38% 100%, 0 38%)" }}
      />
    </div>
  );
}
