[English](README.md)

<p align="center">
  <img src="apps/website/public/favicon.svg" alt="OpenToggl 图标" width="72" height="72">
</p>

# OpenToggl

[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-blue)](https://docs.docker.com/compose/)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

OpenToggl 是一个免费、隐私优先、AI友好 的 Toggl 替代方案。

Toggl 是一个很棒的产品，但是太贵并且数据真正不属于你。而且 30 次/小时的 API 调用限制又令人头疼，AI Agent 能在一分钟内就把一个小时的用量给消耗掉。

OpenToggl 的目标是与 Toggl 保持一致，你可以 0 损失的迁入与迁出用户数据在两者之间。保持一切工作流与使用习惯。什么都没有变，只是更好用、更便宜、更隐私了。

![Screenshot](apps/landing/public/hero/3.png)

## 可与 `toggl-cli` 配合使用

OpenToggl 可以直接与 [`toggl-cli`](https://github.com/CorrectRoadH/toggl-cli) 配合使用，所以你可以把同一套 CLI 工作流指向自己的实例。

```shell
toggl auth <YOUR_API_TOKEN> --api-type opentoggl --api-url https://your-instance.com/api/v9
```

## Self-Hosting

[阅读自部署文档](https://opentoggl.com/zh/docs/self-hosting)

## 手机端 PWA 支持

Web UI 是一个可安装的 Progressive Web App (PWA)。在手机上（iOS 和 Android）可以添加到主屏幕，像原生 App 一样使用——支持离线、全屏独立模式、快速启动，无需应用商店。

## Roadmap

- [x] API 完全兼容 track v9 和 report v3
- [ ] track web 完全一致实现
- [x] 手机端 PWA，支持离线使用
- [ ] opentoggl focus
- [ ] opentoggl plan

## 开始使用

- 仓库：`https://github.com/CorrectRoadH/opentoggl`
- Self-hosting 文档：`./docs/self-hosting/docker-compose.md`
- CLI：`https://github.com/CorrectRoadH/toggl-cli`

## 致谢

OpenToggl 的设计灵感来源于 [Toggl](https://toggl.com)，我们致力于与其产品面保持兼容，让您可以保留原有的工作流程。

同时感谢 [Linux Do](https://linux.do) 在项目早期开发阶段提供的支持与反馈。
