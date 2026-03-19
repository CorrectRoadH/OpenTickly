# Cloud / Self-Hosted Parity Policy

## 目的

定义 `OpenToggl` 云 SaaS 与自托管版之间“功能面一致”到底是什么意思，避免它停留在口号层。

本文档不讨论内部部署是否完全相同，而是写死对外产品面、运行时语义和管理能力哪些必须一致，哪些实现差异允许存在。

## 当前结论

- 云版与自托管版对外公开的产品定义、API 契约、对象模型和 Web 功能面必须一致。
- 不允许把自托管版定义为裁剪版社区版。
- 允许两种部署模型使用不同的执行模型、外部依赖和运维设施，但不应形成对外功能差异。

## 1. 一致性的定义

这里的“一致”至少覆盖以下层面：

- API 形状一致
  - 路径
  - HTTP 方法
  - 请求参数
  - 响应结构
  - 关键响应头
- 行为语义一致
  - 错误码
  - 鉴权方式
  - 分页、过滤、排序
  - 报表统计口径
  - webhook 运行时语义
  - import 联动语义
- 对象模型一致
  - subscription
  - invoice
  - quota
  - webhook delivery
  - import job
  - report export
- Web 功能面一致
  - 管理页
  - 诊断页
  - 导出入口
  - 低频后台功能
- 可观察性入口一致
  - job 状态
  - delivery 状态
  - status / meta
  - 配额与订阅诊断入口

不要求：

- 内部数据库表结构完全相同
- 外部 provider 完全相同
- 运维组件完全相同
- 云版与自托管版使用同一家支付、通知或存储服务

## 2. 允许存在的实现差异

以下差异允许存在，只要不改变对外产品面：

- 部署拓扑不同
  - 云版可运行在 Railway 等托管平台
  - 自托管版可运行在 Docker Compose 或其他自部署环境
- 外部 provider 不同
  - 支付提供商
  - 邮件提供商
  - 对象存储或文件存储实现
  - 日历集成配置方式
- 运维设施不同
  - 监控
  - 告警
  - 日志采集
  - 备份
- BYO 依赖不同
  - 自托管可以由管理员提供 SMTP、支付、存储、SSO 或其他外部依赖

这些差异只允许存在于实现层，不允许改变公开 API、公开对象、Web 页面能力和关键行为语义。

## 3. 不允许存在的产品差异

以下差异不被允许：

- 因为是自托管版，就删除 `billing` / `subscription` / `invoice` surface
- 因为是自托管版，就删除 `reports`
- 因为是自托管版，就删除 `webhooks`
- 因为是自托管版，就删除 `import`
- 因为是自托管版，就删除 `quota` / `status` / `meta`
- 因为是自托管版，就删除导出、文件、avatar、logo、expense attachment 等公开能力
- 因为外部 provider 不同，就改变对象字段、错误码或状态机
- 因为部署方式不同，就把低频能力退化为 API-only 或直接隐藏

结论：

- 云版和自托管版可以实现不同。
- 但不可以成为两个功能面不同的产品。

## 4. Billing / Payment / Quota 边界

这是最容易被错误裁剪的区域，必须单独写死。

### 4.1 必须一致的部分

两种部署模型都必须保留：

- subscription 对象与状态
- plans / features 暴露
- customer 对象
- invoice / receipt / purchase order 等公开文件或记录能力
- `me/quota` 与 quota headers
- `402 Payment Required` 与 feature gating 相关错误语义

### 4.2 允许不同的部分

两种部署模型可以不同：

- 实际支付网关
- setup intent 的内部实现
- 是否由官方 SaaS 统一开票
- invoice 文件的内部生成链路
- payment record 的内部来源

### 4.3 不允许的借口

以下说法都不成立：

- “自托管没有官方支付后台，所以 billing API 可以删”
- “自托管不收费，所以 invoice / quota / subscription 不需要返回”
- “自托管用户不会用 receipt / purchase order，所以文件能力可以省略”

正确规则是：

- 自托管可以采用不同执行模型。
- 但兼容合同里的公开对象、公开状态和公开错误语义仍必须存在。

## 5. Reports / Webhooks / Import 的一致性边界

这三个面允许最终一致，但不允许语义漂移。

### 5.1 Reports

- cloud 与 self-hosted 都可以采用异步 projection
- 但必须共享同一套过滤、权限、导出和 freshness 语义
- 不能因为自托管部署更简单，就退化成弱化报表或删减导出

### 5.2 Webhooks

- cloud 与 self-hosted 都必须保留 subscriptions、filters、validate、ping、limits、delivery history、retry、disable 等完整能力
- timeout / retry / failure 终态语义必须一致
- 不能因为自托管缺少云调度设施，就弱化为“只做 CRUD，不保证运行时”

### 5.3 Import

- import 是正式产品能力，不是云版独占功能
- cloud 与 self-hosted 都必须保留 import job、状态、失败明细、冲突展示、重试和审计能力
- import 后的联动规则必须一致：
  - reports 重建或补投影
  - 默认不回放历史 webhook
  - 写 audit log
  - 重新评估当前实例下的 billing / quota 状态

## 6. BYO 依赖规则

自托管允许管理员提供自己的外部依赖，但必须满足以下前提：

- 不改变公开 API 契约
- 不改变公开对象模型
- 不改变关键错误语义
- 不改变 Web 功能面

典型允许的 BYO 依赖：

- SMTP
- payment provider
- blob/object storage
- SSO / identity provider
- calendar provider credentials

BYO 的本质是“实现替换”，不是“产品功能裁剪”。

## 7. 最低验收标准

若某一能力满足以下任一情况，应视为违反 parity：

- 云版可通过公开 API 使用，自托管版不可用
- 云版有正式 Web 页面，自托管版只有隐藏接口或没有入口
- 两边对象字段、状态机、错误码出现公开差异
- 两边 quota / billing / webhook / report / import 的关键运行时语义不同

## 与其他文档的关系

- `docs/core/product-definition.md`：定义首版产品承诺与范围
- `docs/core/architecture-overview.md`：定义运行时与系统架构蓝图
- `docs/core/codebase-structure.md`：定义模块边界与目录结构
- `docs/contracts/billing.md`：定义 billing / subscription / invoice / quota 合同
- `docs/contracts/reports.md`：定义报表口径与导出语义
- `docs/contracts/Webhooks.md`：定义 webhook 运行时合同
- `docs/contracts/importing.md`：定义 import 合同与联动规则

本文档的职责是把这些合同收束为一句可执行的话：

`OpenToggl` 可以有两种部署模型，但不能有两套对外产品定义。
