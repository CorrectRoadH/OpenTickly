# OpenToggl：本地开源部署与云 SaaS 架构

本文档讨论如何用一套共享领域模型，同时支持：

1. 自托管开源部署
2. 官方云 SaaS

重点是产品和架构形态，不是具体技术栈实现细节。

## 1. 核心原则

- 一套产品
- 一套领域模型
- 一套公开契约
- 两种部署形态

不要把 OpenToggl 分裂成两套代码库或两套能力模型。

## 2. 共享服务图

建议以以下服务边界思考：

- `auth-service`
- `core-api`
- `reports-api`
- `webhooks-service`
- `worker`
- `files-service`
- `web-app`

云版可额外拥有：

- `billing-service`
- `notification-service`
- `search-service`
- `analytics-pipeline`

这些额外服务不应改变对外产品能力定义。

## 3. 本地开源版本

### 3.1 目标

- 一台机器即可运行
- 运维复杂度低
- 适合个人和小团队
- 仍然具备 Toggl 兼容实现所需的完整产品面

### 3.2 建议技术构成

- PostgreSQL：事务真相源
- Redis：缓存、短时状态、限流辅助
- 对象存储：本地文件系统或 S3 兼容实现
- Worker：异步任务处理

### 3.3 本地部署形态

典型 Docker Compose 服务：

- `postgres`
- `redis`
- `minio` 或等价对象存储
- `core-api`
- `reports-api`
- `webhooks-service`
- `worker`
- `web`

### 3.4 本地版关键要求

虽然部署更简单，但不应在产品面上裁剪：

- users / organizations / workspaces
- memberships / groups
- projects / tasks / tags / clients
- time tracking
- reports
- exports
- webhooks
- billing surface
- import

如果内部执行方式更简化，可以接受；但外部契约不应缩水。

### 3.5 推荐数据流

1. 用户写入 `core-api`
2. 事务写入 PostgreSQL
3. 同事务写入 outbox
4. worker 消费 outbox
5. 更新：
   - analytics projections
   - webhook delivery
   - audit trail
   - caches

这使本地版不必从第一天就引入重量级消息系统。

## 4. 云 SaaS 版本

### 4.1 目标

- 多租户
- 横向扩展
- 可观测
- 高吞吐 webhook 与 reports
- 订阅与运营能力完整

### 4.2 请求路径

- CDN / WAF
- API Gateway / ingress
- auth-service
- core-api / reports-api / webhooks-service

### 4.3 状态路径

- OLTP PostgreSQL 集群
- Redis 集群
- 对象存储
- analytics 数据库

### 4.4 异步路径

- outbox relay
- queue / stream
- report projector
- webhook dispatcher
- export worker

## 5. 多租户策略

推荐默认采用逻辑多租户：

- 核心表携带 `organization_id`
- 必要表同时携带 `workspace_id`

这样做的优点：

- 部署更简单
- 跨租户代码更统一
- analytics 更容易启动

对极大客户可以保留后续迁移到独立集群的空间，但不应影响默认模型。

## 6. 存储拆分

### 6.1 OLTP 数据库

适合存放：

- users
- organizations
- workspaces
- memberships
- clients / projects / tasks / tags
- time entries
- approvals
- subscription 基础事实
- webhook subscriptions
- export jobs metadata

### 6.2 Analytics 数据库

适合存放：

- detailed report facts
- summary aggregates
- weekly buckets
- profitability projections
- trends / insights projections

### 6.3 对象存储

适合存放：

- avatars
- logos
- expense attachments
- exported files
- invoice / receipt / purchase order 文件

### 6.4 Redis

适合存放：

- session cache
- idempotency token
- quota / short-lived counters
- 限流 token
- 短时读缓存

## 7. Webhook 架构

Webhook 在云版中应被视为一等异步流水线：

1. core mutation 发出 outbox event
2. relay 推送 integration event
3. webhook fanout 选择匹配 subscriptions
4. 写入 delivery records
5. worker 发起回调
6. 失败时退避重试
7. 超过阈值进入失败终态

推荐控制项：

- HMAC 签名
- replay-safe event id
- delivery attempt 审计
- backoff policy
- noisy subscription 自动停用
- workspace / plan 级限制

## 8. Reports 架构

报告面不应依赖“每次现查 OLTP 大联表”。

推荐思路：

1. OLTP 写入产生事件
2. analytics projector 更新事实与聚合
3. reports-api 只读 analytics 模型
4. 大导出走异步路径

查询类型可分为：

- detailed：行级事实查询
- summary：聚合查询
- weekly：时间桶视图
- insights：趋势与盈利视图
- saved/shared：查询定义与共享访问控制

## 9. Billing 架构

billing 对外是正式兼容合同，对内可以是独立模块。

典型职责：

- customer records
- subscription plans
- invoices / receipts / purchase orders
- payment setup
- quota enforcement
- feature gating

无论部署是本地还是云版，对外都应保留 billing surface。

## 10. 功能开关策略

需要区分三类开关：

### Build-time

决定模块是否编译进来。

### Deploy-time

决定当前部署环境连接哪些外部依赖。

### Runtime

决定某租户、某组织、某 workspace 当前是否可用某项能力。

对外兼容合同主要受 runtime feature gating 影响，而不是 build-time 裁剪。

## 11. 建议代码布局

可以按边界组织：

- `identity`
- `tenant`
- `membership`
- `catalog`
- `tracking`
- `governance`
- `reports`
- `webhooks`
- `billing`
- `import`
- `shared` / `platform`

这样更容易把 reports、webhooks、billing 维持为深模块，而不是 scattered handlers。

## 12. 建议实施阶段

### 阶段 1

完成 Toggl 兼容主干：

- auth
- tenant
- catalog
- tracking
- reports
- webhooks
- billing surface

### 阶段 2

补强高风险行为：

- shared/saved reports
- import migration
- full billing behavior
- admin diagnostics

### 阶段 3

提升规模化能力：

- 云端可观测性
- 高吞吐 webhook
- 高容量 exports
- analytics 优化

## 13. 最终建议

最重要的不是“本地版轻量、云版复杂”这句话本身，而是：

- 对外产品面一致
- 对内执行路径可以不同

换句话说，OpenToggl 应该是一套版本化持续兼容实现，而不是两套不同产品。
