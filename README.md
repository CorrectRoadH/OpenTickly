[中文](README.zh-CN.md)

<p align="center">
  <img src="apps/website/public/favicon.svg" alt="OpenToggl icon" width="72" height="72">
</p>

# OpenToggl

OpenToggl is a free, private-first, AI-friendly alternative to Toggl.

> Project status: OpenToggl is still in a very early stage. It is not recommended for use yet; keep using Toggl + toggl-cli for now and migrate your data once it matures.

It exists for a simple reason: for many individuals and teams, Toggl is too expensive; for people who care about data control, it is not private-first enough; and for AI and automation use cases, its rate limit is so low that it becomes almost unusable in practice.

OpenToggl aims to stay aligned with Toggl's product surface, so you can keep the workflow you already know while taking back control of deployment, data, and API throughput.

## Why OpenToggl

Toggl works, but once cost, control, or automation stop being negotiable, it stops being a fit.

OpenToggl is built for that gap.

- Free, not an ever-growing subscription cost
- Private-first, not keeping your time data on someone else's infrastructure
- Self-hostable, not locked into a single vendor
- AI-friendly, not blocked by low rate limits
- Designed to preserve a Toggl-shaped workflow, not force you to learn a different product
- Better suited for high-frequency API usage, where `30/hour` is nowhere near enough for real agents and automation

If you want to keep a Toggl-compatible workflow without accepting the pressure of pricing, vendor lock-in, and API ceilings, that is what OpenToggl is for.

## Built for AI

Most time-tracking tools are designed around humans clicking buttons in a browser. But OpenToggl was built for agents. You can use OpenToggl with AI through [`toggl-cli`](https://github.com/CorrectRoadH/toggl-cli).

AI workflows need to read projects, tasks, tags, users, reports, and running timers at high frequency, and they also need to continuously create and update time entries. They need enough HTTP throughput to become real software infrastructure rather than a demo trapped behind tiny hourly limits.

OpenToggl is a better Toggl for AI.

## Private-First

Your time data is operational data.

It reflects what you worked on, when you worked on it, who you did it for, and how your team spends time. That data should be deployable on infrastructure you control.

OpenToggl treats self-hosting as a first-class product direction, not an afterthought.

## Keep the Workflow, Lose the Constraints

OpenToggl does not try to invent a new time-tracking philosophy.

The goal is to match Toggl's product surface as closely as possible, so switching does not mean retraining your team, rebuilding your scripts, or abandoning existing habits.

You keep the workflow.
You lose the pricing pressure, vendor dependence, and API ceiling.

## Works with `toggl-cli`

OpenToggl works directly with [`toggl-cli`](https://github.com/CorrectRoadH/toggl-cli), so you can point the same CLI workflow at your own instance.

```shell
toggl auth <YOUR_API_TOKEN> --type opentoggl --api-url https://your-instance.com/api/v9
```

## Mobile-Friendly PWA

The web UI is a fully installable Progressive Web App (PWA). On mobile devices (iOS and Android), you can add it to your home screen and use it like a native app — with offline support, full-screen standalone mode, and fast startup. No app store needed.

## Roadmap

- [x] Full API compatibility with Track v9 and Reports v3
- [ ] Full parity with Toggl Track web
- [x] Mobile PWA with offline support
- [ ] opentoggl focus
- [ ] opentoggl plan

## Get Started

```bash
mkdir -p opentoggl && cd opentoggl
wget -O docker-compose.yml \
  https://raw.githubusercontent.com/CorrectRoadH/opentoggl/main/docker-compose.yml
docker compose up -d
```

Open `http://localhost:8080` and you're good to go.

- [Self-hosting guide](https://opentoggl.com/docs/self-hosting) — Docker Compose, CasaOS, Synology, fnOS, and more
- [CLI](https://github.com/CorrectRoadH/toggl-cli) — `toggl-cli` works directly with OpenToggl

## Acknowledgments

OpenToggl is inspired by [Toggl](https://toggl.com) — we aim to be compatible with their product surface so you can keep your workflow.

We also thank [Linux Do](https://linux.do) for their support and feedback during the project's early development.
