[中文](README.zh-CN.md)

<p align="center">
  <img src="apps/website/public/favicon.svg" alt="OpenToggl icon" width="72" height="72">
</p>

# OpenToggl

[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://docs.docker.com/compose/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

OpenToggl is a free, private-first, AI-friendly alternative to Toggl.

Toggl is a great product, but it's expensive and your data doesn't really belong to you. On top of that, the 30 requests/hour API limit is painful — an AI agent can burn through an hour's quota in a single minute.

OpenToggl aims to stay aligned with Toggl, so you can move your data in and out between the two without any loss. Keep every workflow and habit you already have. Nothing changes — it just gets better, cheaper, and more private.

![Screenshot](apps/landing/public/hero/opentoggl-calendar-view.webp)

## Works with `toggl-cli`

OpenToggl works directly with [`toggl-cli`](https://github.com/CorrectRoadH/toggl-cli), so you can point the same CLI workflow at your own instance.

```shell
toggl auth <YOUR_API_TOKEN> --api-type opentoggl --api-url https://your-instance.com/api/v9
```

## Self-Hosting

[Read the self-hosting docs](https://opentoggl.com/docs/self-hosting)

## Mobile PWA Support

The web UI is an installable Progressive Web App (PWA). On mobile (iOS and Android) you can add it to your home screen and use it like a native app — with offline support, full-screen standalone mode, and fast startup. No app store needed.

## Roadmap

- [x] Full API compatibility with Track v9 and Reports v3
- [ ] Full parity with Toggl Track web
- [x] Mobile PWA with offline support
- [ ] opentoggl focus
- [ ] opentoggl plan

## Get Started

- Repository: `https://github.com/CorrectRoadH/opentoggl`
- Self-hosting docs: `./docs/self-hosting/docker-compose.md`
- CLI: `https://github.com/CorrectRoadH/toggl-cli`

## Acknowledgments

OpenToggl's design is inspired by [Toggl](https://toggl.com), and we aim to stay compatible with their product surface so you can keep your existing workflow.

We also thank [Linux Do](https://linux.do) for their support and feedback during the project's early development.
