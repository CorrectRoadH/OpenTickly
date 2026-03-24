[中文](README.zh-CN.md)

<p align="center">
  <img src="apps/website/public/favicon.svg" alt="OpenToggl icon" width="72" height="72">
</p>

# OpenToggl

OpenToggl is a free, private-first, AI-friendly alternative to Toggl.

Current self-hosted release status: `v0.0.1` is an extremely early version intended for initial adopters and setup validation, not a polished or feature-complete stable release.

It exists for a simple reason: Toggl is too expensive for many individuals and teams, too closed for private-first workflows, and too rate-limited for serious AI and automation use.

OpenToggl aims to match Toggl's product surface, so you can keep the workflow you already know while taking back control of hosting, data, and API throughput.

## Why OpenToggl

Toggl works. But for a lot of people, it stops working the moment you care about cost, control, or automation.

OpenToggl is built for that gap.

- Free instead of expensive recurring pricing
- Private-first instead of SaaS-first
- Self-hostable instead of locked to one vendor
- AI-friendly instead of rate-limited into uselessness
- Built to preserve the Toggl-shaped workflow instead of inventing a different product you have to relearn

## Why Not Just Use Toggl

Because the constraints are real.

- Pricing adds up fast
- Your time data lives on someone else's infrastructure
- Self-hosting is not the default model
- Heavy API usage gets punished
- AI agents need high-rate read and write access, and `30/hour` is nowhere close to enough

If you want a Toggl-compatible workflow without Toggl's pricing, control, and rate-limit constraints, that is exactly what OpenToggl is for.

## Built for AI

Most time-tracking tools were built for humans clicking buttons in a browser.

OpenToggl is also built for agents.

AI workflows need to read projects, tasks, tags, users, reports, and running timers. They need to create and update entries continuously. They need enough HTTP headroom to operate as real software, not as a demo trapped behind tiny hourly limits.

OpenToggl is a better backend for:

- AI agents
- Automation pipelines
- CLI-heavy workflows
- Personal scripts
- Internal tools

## Private-First

Your time data is operational data.

It reflects what you worked on, when you worked on it, which clients you billed, and how your team spends time. That should be deployable on infrastructure you control.

OpenToggl treats self-hosting as a first-class product direction, not an afterthought.

## Keep the Workflow, Lose the Constraints

OpenToggl does not try to invent a new time-tracking philosophy.

The goal is to match Toggl's product surface as closely as possible, so switching does not mean retraining your team, rebuilding your scripts, or abandoning existing habits.

You keep the workflow.
You lose the pricing pressure, vendor dependence, and API ceiling.

## Works with `toggl-cli`

OpenToggl works with [`toggl-cli`](https://github.com/CorrectRoadH/toggl-cli), so you can use the same CLI workflow against your own instance.

```shell
toggl auth <YOUR_API_TOKEN> --type opentoggl --api-url https://your-instance.com/api/v9
```

## Get Started

- Repository: `https://github.com/CorrectRoadH/opentoggl`
- Self-hosting docs: `./docs/self-hosting/docker-compose.md`
- Product docs: `./docs/product/landing.md`
- CLI: `https://github.com/CorrectRoadH/toggl-cli`

## Self-Hosting Environment

The default self-hosted Docker Compose baseline uses these runtime values:

- `OPENTOGGL_IMAGE=ghcr.io/correctroadh/opentoggl:latest`
- `OPENTOGGL_PORT=8080`
- `OPENTOGGL_POSTGRES_DB=opentoggl`
- `OPENTOGGL_POSTGRES_USER=postgres`
- `OPENTOGGL_POSTGRES_PASSWORD=postgres`
- `OPENTOGGL_POSTGRES_PORT=5432`
- `OPENTOGGL_REDIS_PORT=6379`
- `OPENTOGGL_DATABASE_URL=postgres://postgres:postgres@postgres:5432/opentoggl?sslmode=disable`
- `OPENTOGGL_REDIS_URL=redis://redis:6379/0`

Override them with host env vars or your own env file if your deployment needs different ports, credentials, or a pinned image tag.
