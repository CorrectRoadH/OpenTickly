import {
  AppLinkButton,
  MarketingCard,
  MarketingEyebrow,
  MarketingSection,
} from "@opentickly/web-ui";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  Boxes,
  ChartNoAxesColumnIncreasing,
  Clock3,
  Database,
  KeyRound,
  ListChecks,
  TerminalSquare,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

import Footer from "@/components/footer";
import { GithubIcon } from "@/components/github-icon";
import Seo from "@/components/seo";
import { buildFaqSchema, resolveSiteUrl } from "@/lib/seo";
import {
  buildTogglCliSchema,
  togglCliFaq,
  togglCliFeatures,
  togglCliInstallCommands,
  togglCliRepoUrl,
  togglCliWorkflowExamples,
} from "@/lib/toggl-cli-content";
import { appendSlot } from "@/lib/utm";

const description =
  "A full-featured, agent-friendly CLI for Toggl Track and OpenToggl. Track time, manage projects, tasks and tags, and run reports from one fast Rust command line.";

const featureIcons = [Clock3, ListChecks, Boxes, ChartNoAxesColumnIncreasing, Database, KeyRound];

type Icon = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>;

export default function TogglCliPage() {
  const siteUrl = resolveSiteUrl();
  const githubUrl = appendSlot(togglCliRepoUrl, "toggl_cli_landing");

  return (
    <div className="flex min-h-screen flex-col bg-[var(--track-canvas)]">
      <Seo
        alternates={false}
        pathname="/toggl-cli"
        title="Full-Featured Toggl CLI for Humans and AI Agents"
        description={description}
        imageAlt="toggl-cli for Toggl Track, OpenToggl, and AI agents"
        schema={[buildTogglCliSchema(siteUrl), buildFaqSchema([...togglCliFaq])]}
      />

      <header className="border-b border-[var(--track-border)] bg-[color-mix(in_srgb,var(--track-canvas)_92%,transparent)]">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 md:px-6">
          <a href="/toggl-cli" className="flex items-center gap-2.5" aria-label="toggl-cli home">
            <span className="flex size-8 items-center justify-center rounded-[8px] bg-[var(--track-accent)] text-[var(--track-button-text)] shadow-[var(--track-depth-accent-shadow)]">
              <TerminalSquare className="size-4" aria-hidden="true" />
            </span>
            <span className="font-mono text-[14px] font-semibold text-[var(--track-text)]">
              toggl-cli
            </span>
          </a>
          <nav className="flex items-center gap-1" aria-label="Primary navigation">
            <a
              className="hidden px-3 py-2 text-[12px] text-[var(--track-text-muted)] hover:text-[var(--track-text)] sm:block"
              href="#features"
            >
              Features
            </a>
            <a
              className="hidden px-3 py-2 text-[12px] text-[var(--track-text-muted)] hover:text-[var(--track-text)] sm:block"
              href="#commands"
            >
              Commands
            </a>
            <AppLinkButton href={githubUrl} size="sm" target="_blank" variant="secondary">
              <GithubIcon className="size-3.5" aria-hidden="true" />
              GitHub
            </AppLinkButton>
          </nav>
        </div>
      </header>

      <main id="main-content" className="overflow-hidden">
        <section className="relative border-b border-[var(--track-border)]">
          <div className="toggl-cli-glow" aria-hidden="true" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 md:grid-cols-[1.05fr_0.95fr] md:items-center md:px-6 md:py-24">
            <div>
              <MarketingEyebrow>Agent skill + CLI for Toggl Track</MarketingEyebrow>
              <h1 className="mt-4 max-w-3xl text-[38px] font-semibold leading-[1.08] tracking-[-0.035em] text-[var(--track-text)] md:text-[56px]">
                Time tracking that speaks terminal.
              </h1>
              <p className="mt-5 max-w-xl text-[16px] leading-7 text-[var(--track-text-muted)]">
                The full-featured Toggl CLI for people and agents. Track time, manage work, and run
                reports against Toggl Track or self-hosted OpenToggl.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <AppLinkButton href="#install">
                  Install toggl-cli
                  <ArrowRight className="size-4" aria-hidden="true" />
                </AppLinkButton>
                <AppLinkButton href={githubUrl} target="_blank" variant="secondary">
                  View source
                  <ArrowUpRight className="size-4" aria-hidden="true" />
                </AppLinkButton>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--track-text-muted)]">
                <span>Rust native</span>
                <span>MIT licensed</span>
                <span>Toggl + OpenToggl</span>
              </div>
            </div>

            <TerminalDemo />
          </div>
        </section>

        <div className="mx-auto w-full max-w-6xl space-y-20 px-4 py-16 md:px-6 md:py-24">
          <MarketingSection
            title="One command for you. One skill for your agent."
            description="Install the native CLI globally, or teach a compatible coding agent the complete workflow in one step."
          >
            <div id="install" className="grid gap-4 md:grid-cols-2 scroll-mt-8">
              <InstallCard
                eyebrow="CLI"
                title="Install for your terminal"
                command={togglCliInstallCommands.cli}
              />
              <InstallCard
                eyebrow="Agent skill"
                title="Install for Claude Code or OpenClaw"
                command={togglCliInstallCommands.agent}
              />
            </div>
          </MarketingSection>

          <MarketingSection
            title="The daily Toggl workflow, end to end."
            description="Not a timer wrapper. The command surface covers entries, workspace resources, reports, authentication, and both supported backends."
          >
            <div id="features" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 scroll-mt-8">
              {togglCliFeatures.map((feature, index) => (
                <FeatureCard
                  key={feature.title}
                  icon={featureIcons[index]!}
                  title={feature.title}
                  body={feature.body}
                />
              ))}
            </div>
          </MarketingSection>

          <section className="grid gap-8 rounded-[20px] border-2 border-[var(--track-accent)] bg-[var(--track-accent-soft)] p-6 md:grid-cols-[0.85fr_1.15fr] md:p-9">
            <div>
              <div className="flex size-10 items-center justify-center rounded-[10px] bg-[var(--track-accent)] text-[var(--track-button-text)]">
                <Bot className="size-5" aria-hidden="true" />
              </div>
              <h2 className="mt-5 text-[24px] font-semibold text-[var(--track-text)]">
                Built to be operated, not scraped.
              </h2>
              <p className="mt-3 text-[14px] leading-6 text-[var(--track-text-muted)]">
                Agents get an installable skill and a stable command grammar. You get visible,
                repeatable actions that work in local shells, CI, and coding sessions.
              </p>
            </div>
            <div className="grid gap-3">
              {[
                "Installable skill with task-specific instructions",
                "Interactive flows for humans; explicit flags for automation",
                "The same commands across Toggl Track and OpenToggl",
                "Local caching for read-heavy agent workflows",
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-[10px] border border-[var(--track-border)] bg-[var(--track-surface)] px-4 py-3 text-[13px] text-[var(--track-text)]"
                >
                  <span className="size-1.5 shrink-0 rounded-full bg-[var(--track-accent)]" />
                  {item}
                </div>
              ))}
            </div>
          </section>

          <MarketingSection
            title="A command surface you can remember."
            description="Start simple, then reach for projects, tasks, tags, and reports without switching tools."
          >
            <div id="commands" className="grid gap-4 scroll-mt-8">
              {togglCliWorkflowExamples.map((group) => (
                <CommandCard key={group.label} label={group.label} lines={group.lines} />
              ))}
            </div>
          </MarketingSection>

          <MarketingSection
            title="Questions, answered."
            description="The practical details before you put toggl-cli into your own workflow."
          >
            <div className="divide-y divide-[var(--track-border)] border-y border-[var(--track-border)]">
              {togglCliFaq.map((item) => (
                <details key={item.question} className="group py-1">
                  <summary className="cursor-pointer list-none py-4 text-[14px] font-semibold text-[var(--track-text)]">
                    {item.question}
                  </summary>
                  <p className="max-w-3xl pb-4 text-[13px] leading-6 text-[var(--track-text-muted)]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </MarketingSection>
        </div>
      </main>

      <Footer locale="en" />
    </div>
  );
}

function TerminalDemo() {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--track-control-border)] bg-[#0b0c0e] shadow-2xl shadow-black/30">
      <div className="flex h-10 items-center gap-1.5 border-b border-white/10 px-4">
        <span className="size-2.5 rounded-full bg-[#ff5f57]" />
        <span className="size-2.5 rounded-full bg-[#febc2e]" />
        <span className="size-2.5 rounded-full bg-[#28c840]" />
        <span className="ml-3 font-mono text-[10px] text-white/35">toggl — zsh</span>
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-[12px] leading-7 text-white/75 md:p-6">
        <code>
          <span className="text-[var(--track-accent-text)]">$</span>{" "}
          {`toggl entry start -d "Build the future" -p OpenToggl\n`}
          <span className="text-emerald-400">✓ Timer started</span>
          {"\n\n"}
          <span className="text-[var(--track-accent-text)]">$</span> {"toggl entry current\n"}
          <span className="text-white">00:42:17</span>
          {"  Build the future  "}
          <span className="text-white/45">#agent</span>
          {"\n\n"}
          <span className="text-[var(--track-accent-text)]">$</span>{" "}
          {"toggl report weekly --since 2026-03-17\n"}
          <span className="text-white/45">Mon 7h 32m ███████████████</span>
          {"\n"}
          <span className="text-white/45">Tue 6h 48m █████████████</span>
        </code>
      </pre>
    </div>
  );
}

function InstallCard(props: { command: string; eyebrow: string; title: string }) {
  return (
    <MarketingCard
      title={props.title}
      description="Paste, run, and verify with toggl --help."
      eyebrow={props.eyebrow}
    >
      <code className="mt-5 block overflow-x-auto rounded-[8px] border border-[var(--track-border)] bg-[#0b0c0e] px-4 py-3 font-mono text-[12px] text-[var(--track-accent-text)]">
        $ {props.command}
      </code>
    </MarketingCard>
  );
}

function FeatureCard(props: { body: string; icon: Icon; title: string }) {
  const FeatureIcon = props.icon;
  return (
    <MarketingCard title={props.title} description={props.body}>
      <FeatureIcon className="mt-5 size-5 text-[var(--track-accent)]" aria-hidden="true" />
    </MarketingCard>
  );
}

function CommandCard({ label, lines }: { label: string; lines: readonly string[] }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-[var(--track-border)] bg-[#0b0c0e]">
      <div className="border-b border-white/10 px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-white/45">
        {label}
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-6 text-white/75">
        <code>
          {lines.map((line) => (
            <span key={line} className="block">
              <span className="text-[var(--track-accent-text)]">$</span> {line}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}
