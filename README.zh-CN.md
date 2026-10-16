[English](README.md)

<p align="center">
  <img src="apps/website/public/favicon.svg" alt="OpenTickly 图标" width="72" height="72">
</p>

# OpenTickly

[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://docs.docker.com/compose/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

OpenTickly 是一个免费、隐私优先、对 AI 友好的 Toggl 替代品。

Toggl 是个很棒的产品，但太贵，数据也不真正属于你。它的 API 每小时只能调 30 次，AI Agent 一分钟就能用完。

OpenTickly 的用法和 Toggl 保持一致：数据可以完整地从 Toggl 搬过来，也可以随时再搬回去，一条都不丢。原来的工作流和习惯都不用改，只是更便宜、更隐私、对 AI 更友好。

![Screenshot](apps/landing/public/hero/opentickly-calendar-view.webp)

## 与 AI 集成

配合 [`toggl-cli`](https://github.com/CorrectRoadH/toggl-cli) 使用，AI Agent 就能帮你记录、整理和复盘时间。再结合柳比歇夫时间统计法，就能看清时间都花到哪儿去了。

详细文档见[这里](https://opentoggl.com/zh/docs/ai-integration)。

## 自己部署

用 Docker Compose 部署到你自己的服务器或 NAS 上，支持 CasaOS/ZimaOS、群晖、飞牛、TrueNAS、Unraid 等。

[阅读自部署文档](https://opentoggl.com/zh/docs/self-hosting)

[![在 Zeabur 部署](https://zeabur.com/button.svg)](https://zeabur.com/templates/0272TO)

### Unraid

仓库里有 Unraid 模板 `templates/opentickly.xml`。模板不自带数据库，需要先建好 PostgreSQL 和 Redis 容器，再在模板里填 `DATABASE_URL` 和 `REDIS_URL`。

## 手机上使用

目前还没有手机 App，不过在 iOS 和 Android 上都可以把网页添加到主屏幕，当 App 用（PWA）。

## 路线图

- [x] API 与 Toggl Track v9、Reports v3 一致
- [ ] Toggl Track 网页版的所有功能
- [x] 可安装到手机、支持离线的网页应用

## 开始使用

- 在线体验：[track.opentoggl.com](https://track.opentoggl.com)
- [快速上手](https://opentoggl.com/zh/docs/getting-started)
- [从 Toggl 迁移](https://opentoggl.com/zh/docs/migrate-from-toggl)
- [toggl-cli](https://github.com/CorrectRoadH/toggl-cli)

## 致谢

OpenTickly 的设计参考了 [Toggl](https://toggl.com)。我们会一直和 Toggl 保持兼容，让你按原来的习惯继续用。

同时感谢 [Linux Do](https://linux.do) 在项目早期开发阶段提供的支持与反馈。

## Star History

<a href="https://www.star-history.com/?repos=CorrectRoadH%2FOpenTickly&type=date&legend=top-left">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/chart?repos=CorrectRoadH/OpenTickly&type=date&theme=dark&legend=top-left" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/chart?repos=CorrectRoadH/OpenTickly&type=date&legend=top-left" />
   <img alt="Star History Chart" src="https://api.star-history.com/chart?repos=CorrectRoadH/OpenTickly&type=date&legend=top-left" />
 </picture>
</a>
