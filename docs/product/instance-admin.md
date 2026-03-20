# Instance Admin / Platform Operations

## Goal

`OpenToggl` 不只是一组业务功能，还需要作为一个可运行、可治理、可维护的实例被部署和运营。

这意味着除了 Toggl 公开产品面与 `import` 之外，还存在一类独立的产品能力：

- self-hosted 场景下的站长 / 实例管理员能力
- SaaS 场景下的平台管理员 / 运营后台能力

这些能力不属于 Toggl 公开产品面本身，但它们决定：

- 一个实例能否被安全地初始化
- 是否允许开放注册
- 如何管理实例级用户与权限
- 如何配置 SMTP、支付、存储、SSO 等实例级依赖
- 如何观察实例健康、任务积压、错误率和资源使用

如果这类能力不被定义为正式产品面，OpenToggl 就会只剩业务功能，却缺少“把一个 OpenToggl 站点真正运行起来”的宿主能力。

## Scope

本 PRD 覆盖：

- 首个管理员 bootstrap
- 注册策略与邀请策略
- 实例级用户治理
- 实例级配置
- 实例级统计、健康状态与诊断
- 实例级安全、审计与维护入口
- self-hosted 与 SaaS 两种部署模型下的平台管理共性

本文件不覆盖：

- Toggl 公开 API 本身
- 组织 / 工作区 / 项目 /时间记录等业务对象的普通使用流程
- 支付网关、存储、邮件等技术实现细节
- 具体部署脚本与运维手册

## Product Rules

- `Instance Admin / Platform Operations` 是 `OpenToggl` 的原生产品面。
- 它不属于 Toggl 公开产品面本身。
- 它同时覆盖 self-hosted 的站长能力和 SaaS 的平台管理能力。
- 两者共享同一套概念模型，只在权限来源、默认策略和执行环境上有所区别。

## Authority Boundary

实例管理员 / 平台管理员的权限边界定义如下：

- 允许：
  - 管理实例级注册策略
  - 管理实例级配置
  - 管理实例级健康、统计、维护与审计入口
  - 禁用或恢复实例级用户
  - 处理跨租户的安全、abuse 与运营事件
- 不默认允许：
  - 直接修改租户内业务对象的普通业务字段
  - 绕过业务权限模型直接操作 time entry / project / report 业务内容
  - 把实例级管理入口当作通用超级管理员后门

如果后续需要引入更强的跨租户业务干预能力，应单独定义为受审计的高权限操作，而不是隐含包含在实例管理员默认权限中。

## Edge Cases

- 实例管理员默认不能把实例级入口当作业务对象的超级后门；若确实需要跨租户强制干预，必须作为单独的受审计操作暴露。
- self-hosted 与 SaaS 可以在 provider 默认值和运维方式上不同，但对外产品面不得变成两套不同产品。
- 配置错误、provider 失效、后台任务积压、维护模式开启等状态，必须通过正式状态页或诊断入口可见，而不是只存在日志里。
- bootstrap 一旦完成，后续重复 bootstrap 必须被显式阻止，而不是默默覆盖首个管理员。

## User Roles

### 1. Instance Owner

适用于：

- self-hosted 站长
- 单租户实例拥有者

关心：

- 能否初始化实例
- 能否控制注册与邀请
- 能否配置站点依赖
- 能否看见健康状态和错误

### 2. Platform Operator

适用于：

- SaaS 平台管理员
- 运营与支持团队

关心：

- 全局用户治理
- 平台级统计与诊断
- 平台级安全与维护
- 跨租户异常处理

## User Stories

1. 作为 self-hosted 站长，我希望实例首次启动时能够创建首个管理员账号，这样我可以接管整个站点。
2. 作为 self-hosted 站长，我希望控制开放注册、关闭注册、仅邀请注册等策略，这样我可以按站点需求管理入口。
3. 作为平台管理员，我希望在实例级别查看用户数量、活跃度、任务积压和错误率，这样我可以运营整个平台。
4. 作为平台管理员，我希望禁用或恢复某个实例级用户，这样我可以处理 abuse、合规或安全事件。
5. 作为站长，我希望配置 SMTP、对象存储、支付、SSO、OAuth 等实例级 provider，这样业务功能能正常运行。
6. 作为站长，我希望在不改数据库的情况下查看实例健康状态、后台 job 状态和关键诊断信息，这样我可以维护服务。
7. 作为平台管理员，我希望看到 webhook、reports、import 等异步系统的全局健康状态，这样我可以快速定位问题。
8. 作为站长，我希望在维护窗口中启用只读或维护模式，这样我可以安全升级系统。
9. 作为平台管理员，我希望实例级审计日志可查，这样我可以追踪注册策略变更、配置变更和高权限操作。
10. 作为站长，我希望 self-hosted 版能通过 BYO provider 运行完整产品能力，而不被迫依赖官方 SaaS 基础设施。

## Capability Matrix

### 1. Bootstrap

必须覆盖：

- 首次启动检测
- 首个管理员创建
- bootstrap 完成状态
- 阻止重复 bootstrap 的语义

### 2. Access & Registration Policy

必须覆盖：

- 开放注册
- 关闭注册
- 仅邀请注册
- 首次用户是否自动创建个人 workspace / organization 的策略
- 注册页与相关错误语义

### 3. Instance User Governance

必须覆盖：

- 实例级用户列表
- 搜索与过滤
- 禁用 / 恢复
- 高权限用户标记
- 用户状态诊断

### 4. Instance Configuration

必须覆盖：

- SMTP 配置
- 存储配置
- 支付 / billing provider 配置
- OAuth / SSO provider 配置
- 安全相关基础策略配置

说明：

- 这些能力是产品入口，不定义底层 provider SDK 或 secret 存储细节。
- 这些入口属于实例级产品能力，而不是 `platform` 自身拥有的业务能力。

### 5. Ops & Health

必须覆盖：

- 实例健康状态
- status / meta
- 后台 job 积压
- reports / webhooks / import 的系统级状态
- 错误与告警入口
- 关键统计概览

### 6. Security & Audit

必须覆盖：

- 高权限操作审计
- 配置变更审计
- 注册策略变更审计
- 实例级安全事件入口

### 7. Maintenance Controls

必须覆盖：

- 维护模式或等价入口
- 只读模式或等价入口
- 后台任务暂停 / 恢复入口
- 关键维护状态的用户可见表达

## Self-Hosted vs SaaS

### 共性

两种部署模型都必须具备：

- bootstrap / admin 能力
- 注册与邀请策略
- 实例级配置入口
- 健康状态与诊断入口
- 实例级审计能力

### 差异

允许不同的部分：

- 权限来源
  - self-hosted 由站长拥有实例控制权
  - SaaS 由平台管理员或内部运营角色拥有平台控制权
- provider 默认值
  - self-hosted 允许 BYO
  - SaaS 可以预配官方 provider
- 运维实现
  - self-hosted 可通过单机或 Compose 维护
  - SaaS 可依赖托管平台与集中式运维

## Open Questions

- 某些平台级统计指标和健康诊断项的最小集合，仍需继续收敛。
- 是否需要把更强的跨租户业务干预能力单独建成另一组高权限操作，后续再决定。

## Relationship To Existing Docs

- `docs/core/product-definition.md`
  - 定义 OpenAPI / Figma / PRD 的依赖关系，以及 `import`
- `docs/core/codebase-structure.md`
  - 定义这些能力在代码结构中的归属
- `docs/core/ddd-glossary.md`
  - 定义“实例级能力”“平台管理能力”等术语

## Initial Structure Decision

当前阶段，这类能力先归入 `governance`，而不是立即新增独立顶层模块。

原因：

- 它们本质上属于实例级治理、运营、诊断与控制能力。
- 当前复杂度还不足以证明必须拆出独立 `instance-admin` 模块。
- 若后续实例级运营面显著膨胀，再单独拆分模块。
