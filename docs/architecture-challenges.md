# OpenToggl 架构挑战与待解决问题

本文档记录对当前架构设计的系统性挑战，聚焦于产品能力定义、模块边界、跨模块协调机制的不一致与缺失。

## 1. 模块边界与职责冲突

### 1.1 Billing 的归属权混乱

**问题描述：**

`technical-architecture.md` 说：

- `tenant` 负责 "与 billing plan、subscription、quota profile 的关联关系"
- `billing` 负责 "plan / subscription / invoice / customer / 商业配额"

`codebase-structure.md` 说：

- `billing` **拥有** subscription 的业务本体
- `tenant` **只能引用**，不得复制订阅领域规则

**核心矛盾：**

"关联关系"到底是什么？如果 `tenant` 只能引用，那它连 `organization.subscription_id` 这个外键都不能有业务逻辑吗？

**具体场景：**

"创建 organization 时必须关联一个 subscription"这个规则应该在哪个模块？

- 如果在 `tenant`，违反了"不得复制订阅领域规则"
- 如果在 `billing`，那 `billing` 就要依赖 `tenant` 的 `Organization` 实体，违反模块独立性

**待解决：**

- 明确定义"关联关系"的边界
- 定义跨模块的创建协调机制
- 明确哪些规则属于 `tenant`，哪些属于 `billing`

---

### 1.2 Platform 的定位自相矛盾

**问题描述：**

文档说 `platform` 是"技术底座，不承载业务规则"，但又说：

- `governance` 负责实例级配置**入口**
- `platform` 负责 SMTP、存储、支付、SSO 等 provider 的**技术实现**

**核心矛盾：**

如果 `platform` 提供 SMTP 实现，`governance` 的"发送注册邀请邮件"用例怎么调用它？

依赖规则：

- `platform -> any business module` 禁止
- `governance -> platform` 允许

**具体场景：**

邮件模板算不算业务规则？

- 如果算，应该在 `governance`，但模板渲染引擎在 `platform`，产生循环依赖
- 如果 `platform` 提供"发送注册邀请邮件"这种高级接口，就包含了业务语义，违反"不承载业务规则"

**待解决：**

- 明确 `platform` 的抽象层级（纯技术 vs 业务感知）
- 定义邮件、通知、文件存储等跨领域能力的归属
- 提供具体的接口设计示例

---

### 1.3 Calendar Integration 的归属冲突

**问题描述：**

`toggl-domain-model.md` 里：

- `Tracking` 包含 "calendar integrations"
- `Operational Integrations` 也包含 "calendar sync"

`codebase-structure.md` 里：

- `tracking` 模块负责 "calendar integrations"

**核心矛盾：**

在领域模型里定义了 `Operational Integrations` 这个限界上下文，但在代码结构里又把它塞进了 `tracking`。

**DDD 原则冲突：**

限界上下文应该映射到模块边界。如果它不是独立模块，就不应该在领域模型里画成独立的限界上下文。

**待解决：**

- 要么把 `calendar integrations` 从 `Operational Integrations` 移到 `Tracking`
- 要么承认 `Operational Integrations` 不是限界上下文，只是跨模块的技术能力集合
- 明确定义领域模型中的"限界上下文"与代码结构中的"模块"的映射规则

---

### 1.4 Instance Administration 的模块定位混乱

**问题描述：**

`toggl-domain-model.md` 定义了 `Instance Administration` 限界上下文，包含：

- `InstanceAdmin`
- `RegistrationPolicy`
- `InstanceSetting`
- `MaintenanceMode`
- `PlatformStat`

但又说：

> "当前代码归属优先落在 `governance`"
> "这里是领域概念上的实例级子域，不表示当前代码必须单独拆出顶层模块"

**核心矛盾：**

如果 `Instance Administration` 有自己的聚合根、业务规则，那它**就是**独立的限界上下文，不能一边说它是限界上下文，一边又说不需要独立模块。

**作用域冲突：**

`governance` 的职责是租户级/工作区级的治理能力（Approval、Timesheet、AuditLog、API quota），而 `Instance Administration` 是**实例级**的。

这是两个不同的作用域，不应该混在一个模块里。

**待解决：**

- 要么提升 `Instance Administration` 为独立顶层模块
- 要么明确它不是限界上下文，只是 `governance` 的一个子功能
- 定义实例级能力与租户级能力的模块划分原则

---

### 1.5 聚合根的边界和不变量未定义

**问题描述：**

`toggl-domain-model.md` 列出了核心聚合根：

- `User`
- `Organization`
- `Workspace`
- `Project`
- `TimeEntry`
- `WebhookSubscription`
- `SavedReport`
- `RegistrationPolicy`
- `InstanceSetting`

但文档没有定义：

- 每个聚合根的边界是什么？
- 聚合根保护哪些不变量？
- 聚合根之间的引用规则是什么？

**核心矛盾：**

DDD 的聚合根不只是"重要的实体"，而是**事务一致性边界**和**不变量保护者**。

**具体场景 1：TimeEntry 的聚合边界**

`TimeEntry` 是聚合根，但它引用了：

- `User`
- `Workspace`
- `Project`
- `Task`
- `Tag`（多对多）

**问题：**

- 创建 `TimeEntry` 时，需要检查 `Project` 是否存在吗？
- 如果需要，这个检查是在 `TimeEntry` 聚合内部做，还是在 `application` 层做？
- 如果 `Project` 被删除了，`TimeEntry` 的不变量是什么？允许 `project_id` 指向不存在的 project 吗？

**具体场景 2：Project 的聚合边界**

`Project` 是聚合根，但它有：

- `ProjectUser`（项目成员）
- `ProjectGroup`（项目组）
- `Task`（任务）

**问题：**

- `ProjectUser` 是 `Project` 聚合的一部分，还是独立的实体？
- 如果是聚合的一部分，那添加项目成员时，必须通过 `Project` 聚合根吗？
- 如果是独立实体，那 `Project` 的聚合边界在哪里？

**具体场景 3：跨聚合的不变量**

业务规则："用户不能在同一个 workspace 同时运行多个 timer"。

**问题：**

- 这个不变量由谁保护？
- `TimeEntry` 聚合根吗？但它需要查询其他 `TimeEntry` 才能检查。
- `Workspace` 聚合根吗？但 `Workspace` 不应该知道 `TimeEntry` 的细节。
- 还是在 `application` 层检查？但这违反了"不变量应该在 domain 层保护"的原则。

**待解决：**

- 明确定义每个聚合根的边界（包含哪些实体和值对象）
- 列出每个聚合根保护的不变量
- 定义跨聚合的不变量由谁检查、在哪一层检查
- 提供聚合根的代码结构示例

---

### 1.6 领域事件的定义和使用规则缺失

**问题描述：**

文档在多处提到"事件"，但没有明确定义领域事件的使用规则。

`codebase-structure.md` 说：

> "首版统一采用 `job record`,不引入通用 `event record` 机制。"

但 `technical-architecture.md` 又画了：

```
Core Mutation -> Internal Event / Job -> Webhook Matcher
```

**核心矛盾：**

DDD 中的领域事件是**领域模型的一部分**，用于表达"发生了什么"，而不是技术层面的消息队列。

**具体问题：**

- 文档说的"不引入 event record"，是指不要领域事件，还是不要事件溯源（Event Sourcing）？
- 如果不要领域事件，那跨聚合的协调怎么做？直接调用 `application` 接口吗？
- 如果要领域事件，那事件由谁发布？聚合根？`application` 层？
- 领域事件和 webhook 事件是什么关系？

**具体场景：**

用户创建了一个 `TimeEntry`。

**问题：**

- `TimeEntry` 聚合根应该发布 `TimeEntryCreated` 领域事件吗？
- 如果发布，谁来消费这个事件？
  - `reports` 模块消费，更新投影？
  - `webhooks` 模块消费，发送 webhook？
- 如果不发布领域事件，那 `tracking` 模块怎么通知 `reports` 和 `webhooks`？
  - 直接调用它们的 `application` 接口？
  - 写 job record，让后台任务调用？

**待解决：**

- 明确是否使用领域事件
- 如果使用，定义领域事件的发布和订阅机制
- 定义领域事件和技术事件（job record / webhook event）的关系
- 提供领域事件的代码示例

---

### 1.7 仓储（Repository）的职责边界不清晰

**问题描述：**

`codebase-structure.md` 说：

- `infra` 负责 Postgres repository
- `application` 定义 port，`infra` 实现 port

但文档没有定义：

- Repository 只负责持久化，还是也负责查询？
- 复杂查询（比如 reports）应该用 Repository 还是单独的 Query Service？
- Repository 应该返回聚合根，还是可以返回部分数据？

**核心矛盾：**

DDD 的 Repository 是**聚合根的持久化抽象**，不是通用的数据访问层。

**具体场景 1：TimeEntry 的查询**

用户查询"过去 7 天的 time entries"。

**问题：**

- 这个查询应该用 `TimeEntryRepository.FindByDateRange()` 吗？
- 如果用，Repository 返回的是完整的 `TimeEntry` 聚合根（包含所有字段）吗？
- 如果是，但用户只需要 `id`、`description`、`duration`，返回完整聚合根是浪费。
- 如果不是，Repository 可以返回部分数据（DTO）吗？但这违反了"Repository 返回聚合根"的原则。

**具体场景 2：Reports 的查询**

用户查询 summary report，需要聚合多个 time entry 的 duration。

**问题：**

- 这个查询应该用 `TimeEntryRepository` 吗？
- 如果用，Repository 要提供 `SumDurationByProject()` 这样的方法吗？
- 如果提供，Repository 就变成了查询服务，不再是纯粹的聚合根持久化。
- 如果不提供，那 reports 查询应该用什么？单独的 `ReportQueryService`？

**具体场景 3：跨聚合的查询**

用户查询"workspace 下所有 project 的 time entry 总时长"。

**问题：**

- 这个查询涉及 `Workspace`、`Project`、`TimeEntry` 三个聚合根。
- 应该用哪个 Repository？
- 还是应该在 `application` 层组合多个 Repository？
- 还是应该用单独的 Query Service？

**待解决：**

- 明确 Repository 的职责边界（只持久化？还是也查询？）
- 定义复杂查询的实现方式（Repository？Query Service？）
- 定义 Repository 的返回类型（聚合根？DTO？）
- 提供 Repository 和 Query Service 的代码示例

---

### 1.8 值对象（Value Object）的使用规则未定义

**问题描述：**

文档在 `codebase-structure.md` 提到：

> "`domain` 只放业务本质规则：entity、value object、invariant、domain error"

但文档没有定义：

- 哪些概念应该建模为值对象？
- 值对象的不变性如何保证？
- 值对象之间的比较规则是什么？

**核心矛盾：**

DDD 的值对象不只是"没有 ID 的对象"，而是**通过值相等性定义的不可变对象**。

**具体场景 1：Duration 应该是值对象吗？**

`TimeEntry` 有 `duration_seconds` 字段。

**问题：**

- `duration_seconds` 应该是 `int` 还是 `Duration` 值对象？
- 如果是值对象，`Duration` 应该包含哪些行为？
  - 格式化（`1h 30m`）？
  - 舍入（`rounding_minutes`）？
  - 验证（不能为负数）？
- 如果是 `int`，这些行为在哪里？散落在各个 `application` 用例里？

**具体场景 2：Money 应该是值对象吗？**

Billing 涉及金额计算。

**问题：**

- 金额应该是 `int`（分）还是 `Money` 值对象？
- 如果是值对象，`Money` 应该包含货币单位吗？
- 不同货币的金额可以直接相加吗？还是需要汇率转换？
- 这些规则在哪里定义？

**具体场景 3：Email 应该是值对象吗？**

`User` 有 `email` 字段。

**问题：**

- `email` 应该是 `string` 还是 `Email` 值对象？
- 如果是值对象，`Email` 应该包含验证逻辑吗？
- 验证失败时，抛出异常还是返回错误？
- 这个验证在哪一层做？`domain` 层还是 `application` 层？

**待解决：**

- 列出所有应该建模为值对象的概念
- 定义值对象的创建和验证规则
- 提供值对象的代码示例
- 明确值对象和原始类型的选择标准

---

## 2. 跨模块协调机制缺失

### 2.1 Reports Projection 的事务边界不清晰

**问题描述：**

`codebase-structure.md` 说：

- 必须同事务完成：主业务数据写入、审计记录、**后续异步处理所需的 job record**
- 必须异步处理：**reports projection 刷新**

**核心矛盾：**

这意味着：

1. 用户创建 time entry
2. `tracking` 在同事务里写入 `time_entries` 和 `job_records`
3. 后台 job runner 消费 job，调用 `reports` 模块刷新投影

**具体问题：**

- `tracking` 怎么知道要写什么样的 job record？
- 如果写 `{"type": "refresh_report_projection", "time_entry_id": 123}`，就依赖了 `reports` 的内部实现
- 如果写通用的 `{"type": "time_entry_created", "payload": {...}}`，谁来决定这个事件要触发 report projection？

**待解决：**

- 定义 job record 的格式和语义
- 定义谁负责 job 到模块的路由
- 明确 `tracking` 和 `reports` 之间的协调机制

---

### 2.2 Webhook 的事件源模型自相矛盾

**问题描述：**

`technical-architecture.md` 画了：

```
Core Mutation -> Internal Event / Job -> Webhook Matcher
```

`codebase-structure.md` 说：

```
首版统一采用 `job record`,不引入通用 `event record` 机制。
```

**核心矛盾：**

架构图里画了 "Internal Event"，实现规则里又说"不引入 event record"。

**DDD 视角的问题：**

在 DDD 中，领域事件是聚合根状态变化的表达。如果不使用领域事件，那：

- 聚合根之间如何解耦？
- 跨限界上下文的协调如何实现？
- 最终一致性如何保证？

**具体问题：**

- Webhook 到底是消费领域事件还是消费 job？
- 如果是 job，`tracking` 要为每个可能触发 webhook 的操作写 job record 吗？
- 如果是领域事件，那"不引入 event record"是什么意思？是不持久化事件，还是不用事件溯源？

**待解决：**

- 明确领域事件和 job record 的关系
- 定义跨限界上下文的协调机制（领域事件？直接调用？）
- 说明"不引入 event record"的具体含义

---

### 2.3 限界上下文之间的防腐层（ACL）缺失

**问题描述：**

文档定义了多个限界上下文（Identity、Tenant、Membership、Catalog、Tracking、Reports、Webhooks、Billing、Governance），但没有定义它们之间的防腐层。

**核心矛盾：**

DDD 的限界上下文应该是**自治的**，不应该直接依赖其他上下文的内部模型。

**具体场景 1：Tracking 依赖 Catalog**

`TimeEntry` 需要引用 `Project`。

**问题：**

- `tracking` 模块直接使用 `catalog` 模块的 `Project` 实体吗？
- 如果直接使用，`tracking` 就依赖了 `catalog` 的内部模型，两个上下文耦合了。
- 如果不直接使用，`tracking` 应该定义自己的 `Project` 概念吗？但这会导致重复。
- 还是应该有防腐层，把 `catalog` 的 `Project` 转换成 `tracking` 的 `ProjectReference`？

**具体场景 2：Reports 依赖 Tracking**

`reports` 需要读取 `time_entries` 数据。

**问题：**

- `reports` 直接查询 `tracking` 的数据库表吗？
- 如果直接查询，`reports` 就依赖了 `tracking` 的存储模型，两个上下文耦合了。
- 如果不直接查询，`reports` 应该通过 `tracking` 的 `application` 接口读取吗？
- 还是应该有独立的 analytics 数据库，通过投影同步数据？

**具体场景 3：Webhooks 依赖所有模块**

`webhooks` 需要监听所有模块的变化。

**问题：**

- `webhooks` 直接依赖所有模块的领域模型吗？
- 如果直接依赖，`webhooks` 就和所有模块耦合了。
- 如果不直接依赖，`webhooks` 应该定义自己的事件模型吗？
- 还是应该有统一的集成事件（Integration Event），各模块发布集成事件，`webhooks` 消费集成事件？

**待解决：**

- 定义限界上下文之间的依赖规则
- 明确是否需要防腐层，如果需要，在哪些边界上
- 定义跨上下文的数据共享机制（共享内核？发布语言？）
- 提供防腐层的代码示例

---

### 2.4 应用服务（Application Service）的职责不明确

**问题描述：**

`codebase-structure.md` 说：

> "`application` 负责用例编排：入口 use case、主事务边界、权限检查、调 repository / query port、调 domain rule、同事务登记后台 job、返回给 transport 的结果"

**核心矛盾：**

这个定义太宽泛了，没有明确 `application` 层和 `domain` 层的边界。

**具体问题：**

- "调 domain rule"是什么意思？
  - 调用 domain service？
  - 调用聚合根的方法？
  - 还是在 `application` 层写业务逻辑？
- "权限检查"算业务规则吗？
  - 如果算，应该在 `domain` 层
  - 如果不算，为什么在 `application` 层而不是 `transport` 层？
- "主事务边界"由谁决定？
  - `application` 层决定事务边界，还是聚合根决定？
  - 如果 `application` 决定，那聚合根的作用是什么？

**具体场景：创建 TimeEntry**

用户创建一个 time entry。

**问题：**

以下逻辑应该在哪一层？

1. **验证 project 存在**
   - `domain` 层？但需要查询数据库。
   - `application` 层？但这是业务规则。

2. **检查用户是否有权限在这个 project 下创建 time entry**
   - `domain` 层？但需要查询 membership 数据。
   - `application` 层？但这是业务规则。

3. **停止当前 running timer**
   - `domain` 层？但需要查询和修改其他 `TimeEntry`。
   - `application` 层？但这是业务规则。

4. **计算 duration**
   - `domain` 层？这是纯业务逻辑。
   - `application` 层？但这不是编排。

5. **写入数据库**
   - `infra` 层？通过 repository。
   - 但谁调用 repository？`application` 还是 `domain`？

**待解决：**

- 明确 `application` 层和 `domain` 层的职责边界
- 定义哪些逻辑属于"编排"，哪些属于"业务规则"
- 提供完整的用例实现示例，标注每行代码属于哪一层
- 定义 domain service 的使用场景

---

- 如果是事件，为什么又说"不引入 event record"？

**待解决：**

- 二选一：要么 job-based，要么 event-based
- 定义 webhook 的触发机制
- 明确事件去重、顺序保证的策略

---

### 2.3 Import 的系统联动规则缺失

**问题描述：**

`import-migration-contract.md` 说：

```
Reports: import 完成后应触发 reports / analytics 重建或补投影
Billing / Quota: import 后是否影响当前 seat / quota / subscription 计算,必须按当前实例的真实业务规则重新评估
```

**核心矛盾：**

说"应触发"，但没有定义：

- 谁来触发？`importing` 模块吗？
- 如果是，`importing` 就要依赖 `reports` 和 `billing`，这合理吗？
- 如果不是，谁来协调这个跨模块的联动？

**具体场景：**

如果导入了 1000 个用户，但当前 subscription 只允许 10 个 seat：

- 拒绝导入？
- 自动升级 subscription？
- 允许超额但标记为违规？

**待解决：**

- 定义 import 的系统联动协调者
- 明确 billing 重新评估的具体行为
- 定义冲突场景的处理策略

---

### 2.5 领域服务（Domain Service）的使用场景未定义

**问题描述：**

文档提到了 `domain` 层，但没有提到领域服务。

**核心矛盾：**

DDD 中，有些业务逻辑不属于任何单一聚合根，需要领域服务来承载。

**具体场景 1：停止 Running Timer**

业务规则："启动新 timer 时，必须先停止当前 running timer"。

**问题：**

- 这个逻辑在哪里？
- 在 `TimeEntry` 聚合根里？但它需要查询和修改其他 `TimeEntry`，违反了聚合边界。
- 在 `application` 层？但这是业务规则，不是编排。
- 还是应该有 `TimerService` 领域服务？

**具体场景 2：计算 Billable Amount**

业务规则："billable amount = duration \* hourly_rate，但要考虑 rounding 和 project billable 设置"。

**问题：**

- 这个逻辑在哪里？
- 在 `TimeEntry` 聚合根里？但它需要 `Project` 和 `WorkspaceUser` 的信息。
- 在 `application` 层？但这是业务规则。
- 还是应该有 `BillingCalculationService` 领域服务？

**具体场景 3：验证 Subscription Quota**

业务规则："创建 project 时，检查是否超过 subscription 的 project 数量限制"。

**问题：**

- 这个逻辑在哪里？
- 在 `Project` 聚合根里？但它需要查询 `Subscription` 和统计现有 project 数量。
- 在 `billing` 模块？但 `billing` 不应该知道 `Project` 的创建逻辑。
- 还是应该有 `QuotaValidationService` 领域服务？

**待解决：**

- 定义领域服务的使用场景
- 明确领域服务和应用服务的区别
- 列出需要领域服务的业务逻辑
- 提供领域服务的代码示例

---

### 2.6 跨限界上下文的事务一致性策略未定义

**问题描述：**

`codebase-structure.md` 说：

> "一个 HTTP 请求只有一个主事务边界。"

但文档没有定义跨限界上下文的事务策略。

**核心矛盾：**

DDD 的限界上下文应该是事务边界，不应该跨上下文的分布式事务。

**具体场景 1：创建 Organization 时创建 Subscription**

用户创建 organization，系统自动创建 free subscription。

**问题：**

- 这是一个事务吗？
- 如果是，`tenant` 和 `billing` 在同一个事务里，违反了限界上下文的独立性。
- 如果不是，那如果创建 organization 成功但创建 subscription 失败，怎么办？
  - 回滚 organization？但已经提交了。
  - 重试创建 subscription？但可能一直失败。
  - 允许 organization 没有 subscription？但这违反了业务规则。

**具体场景 2：删除 Workspace 时删除所有 TimeEntry**

用户删除 workspace，系统需要删除所有相关数据。

**问题：**

- 这是一个事务吗？
- 如果是，`tenant` 和 `tracking` 在同一个事务里，违反了限界上下文的独立性。
- 如果不是，那如果删除 workspace 成功但删除 time entry 失败，怎么办？
  - workspace 已经删除了，但 time entry 还在，数据不一致。
  - 用户看不到 workspace 了，但 time entry 还占用存储空间。

**具体场景 3：Import 时的多模块协调**

用户导入数据，需要同时创建 organization、workspace、project、time entry。

**问题：**

- 这是一个事务吗？
- 如果是，所有模块在同一个事务里，违反了限界上下文的独立性。
- 如果不是，那如果导入到一半失败，怎么办？
  - 已经创建的对象怎么处理？回滚？保留？
  - 用户看到的是什么状态？部分成功？全部失败？

**待解决：**

- 定义跨限界上下文的事务策略（Saga？最终一致性？）
- 明确哪些操作必须在同一个事务，哪些可以最终一致
- 提供跨上下文协调的实现模式
- 定义失败补偿和回滚策略

---

## 3. 产品能力定义的矛盾

### 3.1 兼容合同的边界不清晰

**问题描述：**

文档反复强调"兼容合同优先于内部实现"。

**核心问题：**

这个原则会导致**内部架构被外部 API 绑架**。

**具体例子：**

Toggl API 有：

- `GET /organizations/{organization_id}/subscription`
- `GET /workspaces/{workspace_id}/subscription`

问题：

- 这两个端点返回的是同一个 subscription 对象吗？
- 如果是，为什么要有两个端点？
- 如果不是，workspace subscription 和 organization subscription 是什么关系？

**更严重的问题：**

`billing-contract.md` 列了 40+ 个 billing 端点，包括：

- `POST /organizations/{organization_id}/subscription/cancellation_feedback`
- `POST /organizations/{organization_id}/subscription/discount_request`
- `POST /organizations/{organization_id}/subscription/upgrade_request/{feature_id}`

如果全部实现，`billing` 模块会变成巨大的 CRUD 层，没有领域模型。

**待解决：**

- 定义"兼容"的边界：哪些必须兼容，哪些可以简化
- 明确内部模型与外部 API 的映射策略
- 提供"最小兼容集"，说明首版必须实现哪些端点

---

### 3.2 Subscription 的双视图语义不明确

**问题描述：**

Toggl API 同时暴露：

- `GET /organizations/{organization_id}/subscription`
- `GET /workspaces/{workspace_id}/subscription`

文档说：

> "工作区级 subscription 视图如果在公开 API 中存在，应被视为组织级合同在 workspace 视角下的投影，而不是另一套独立真相。"

**核心矛盾：**

如果 workspace subscription 只是 organization subscription 的投影，那：

- 为什么需要两个端点？
- 投影的规则是什么？是完全相同的数据，还是过滤了某些字段？
- 如果一个 organization 有多个 workspace，它们看到的 subscription 是同一个吗？

**具体场景：**

用户在 workspace A 查看 subscription，看到 plan 是 "Premium"。
用户在 workspace B 查看 subscription，看到的也是 "Premium" 吗？
如果 organization 降级到 "Free"，两个 workspace 会同时看到变化吗？

**待解决：**

- 明确 workspace subscription 视图的投影规则
- 定义两个端点返回数据的差异（如果有）
- 说明为什么 Toggl 要设计两个端点

---

### 3.3 Billing 的功能门控语义不完整

**问题描述：**

文档说：

- `402 Payment Required` 表示当前 workspace 需要升级才能访问某项能力
- billing 负责 "feature exposure"

**核心矛盾：**

文档没有定义：

- 哪些功能需要 feature gating？
- feature gating 的粒度是什么？（workspace 级？organization 级？user 级？）
- 如果用户在 Free plan 尝试创建第 11 个 project（假设 Free 只允许 10 个），返回 `402` 还是 `403`？

**具体场景：**

Toggl 的 feature gating 包括：

- billable rates（仅 Starter 及以上）
- pinned projects 数量（Free 3 个，Paid 无限）
- 某些 workspace 设置（仅 Premium）

**问题：**

- 这些限制是在 `billing` 模块检查，还是在各自的业务模块检查？
- 如果在 `billing` 检查，`billing` 就要知道所有业务规则
- 如果在业务模块检查，业务模块就要依赖 `billing` 的 plan 信息

**待解决：**

- 定义 feature gating 的检查点（哪个模块负责）
- 列出所有需要 feature gating 的功能
- 明确 `402` 的返回时机和错误信息格式

---

### 3.4 Reports 的统计口径定义不完整

**问题描述：**

`reports-semantics.md` 说：

> "兼容目标包括结果口径，而不只是接口存在。"

但文档只列了端点和参数，没有定义统计口径。

**具体缺失：**

- **时间舍入规则**：`rounding` 和 `rounding_minutes` 如何影响统计结果？
- **Billable 计算规则**：如果 time entry 的 project 是 billable，但 user 的 billable rate 是 0，这条记录算 billable 吗？
- **跨时区处理**：如果 time entry 的 start 和 stop 跨越了两个日期（UTC），在 daily summary 里算哪一天？
- **删除对象的处理**：如果 project 被删除，历史 time entry 在 summary 里还显示吗？显示为 "(deleted)" 还是直接过滤掉？

**具体场景：**

用户创建了一个 time entry：

- start: 2024-01-01 23:30:00 UTC
- stop: 2024-01-02 00:30:00 UTC
- duration: 1 hour

在 detailed report 里，这条记录显示在哪一天？

- 2024-01-01？
- 2024-01-02？
- 两天都显示（拆分成 30 分钟 + 30 分钟）？

**待解决：**

- 定义所有统计口径的计算规则
- 提供边界情况的处理示例
- 明确与 Toggl 官方的口径一致性要求

---

### 3.5 Webhook 的事件定义不完整

**问题描述：**

文档说 webhook 支持事件过滤，但没有定义：

- 有哪些事件类型？
- 每个事件的 payload 结构是什么？
- 事件的触发时机是什么？

**具体缺失：**

- `time_entry.created` 和 `time_entry.updated` 的区别是什么？
- 如果用户创建了一个 running timer（stop = null），触发 `created` 还是 `started`？
- 如果用户停止了 timer，触发 `updated` 还是 `stopped`？
- 如果用户删除了 time entry，触发 `deleted` 还是 `updated`（soft delete）？

**具体场景：**

用户执行以下操作：

1. 创建 time entry（start = now, stop = null）
2. 停止 timer（stop = now + 1 hour）
3. 修改 description
4. 删除 time entry

应该触发哪些 webhook 事件？

- 4 个 `time_entry.updated`？
- `created` + `stopped` + `updated` + `deleted`？
- 还是其他组合？

**待解决：**

- 列出所有支持的事件类型
- 定义每个事件的触发条件
- 提供 payload 结构示例
- 明确与 Toggl 官方的事件定义一致性

---

### 3.6 Import 的冲突处理策略不明确

**问题描述：**

`import-migration-contract.md` 说：

> "能保留原始 ID 的对象，应优先保留。"
> "当 ID 保留与系统一致性、租户隔离或多源导入冲突时，应允许 remap。"

**核心矛盾：**

文档没有定义什么情况下"应该"保留，什么情况下"允许"remap。

**具体场景 1：空实例导入**

用户在全新的 OpenToggl 实例导入 Toggl 数据：

- organization ID: 12345
- workspace ID: 67890
- 1000 个 time entries

**问题：**

- 这些 ID 应该原样保留吗？
- 如果保留，OpenToggl 的 ID 生成器要跳过这些 ID 吗？
- 如果不保留，为什么？明明没有冲突。

**具体场景 2：已有数据的实例导入**

用户在已有数据的 OpenToggl 实例导入 Toggl 数据：

- 现有 organization ID: 1
- 导入的 organization ID: 1

**问题：**

- 覆盖现有 organization？
- Remap 导入的 organization 为 ID 2？
- 报错拒绝导入？

**具体场景 3：引用关系的 remap**

如果 project A（ID 100）被 remap 为 ID 200，那：

- 引用 project 100 的 time entry 的 `project_id` 要更新为 200 吗？
- 如果要更新，是在导入时更新，还是导入后异步更新？
- 如果异步更新失败了，数据一致性怎么保证？

**待解决：**

- 定义 ID 保留的优先级规则
- 明确冲突检测的策略
- 提供 remap 的具体算法
- 定义引用关系的更新机制

---

## 4. 运行时行为的不确定性

### 4.1 Reports 的 Freshness 保证不明确

**问题描述：**

文档说：

- "Reports 是独立读模型，不应退化为临时联表"
- "import 完成后应触发 reports / analytics 重建或补投影"

**核心矛盾：**

文档没有定义 reports 的 freshness 保证。

**具体场景：**

用户创建了一个 time entry，然后立刻查询 detailed report。

**问题：**

- 这个 time entry 会出现在 report 里吗？
- 如果会，是因为 report 实时查询了 OLTP 数据库？
- 如果不会，用户要等多久才能看到？1 秒？10 秒？1 分钟？

**更复杂的场景：**

用户导入了 10 万条 time entry，然后立刻查询 summary report。

**问题：**

- Report 会显示这 10 万条数据吗？
- 如果会，是因为 import 是同步的？
- 如果不会，用户会看到什么？空报表？旧数据？还是"正在处理"的提示？

**待解决：**

- 定义 reports 的 freshness 保证（最终一致？实时？）
- 明确 projection 的触发时机和完成时间
- 定义用户在 projection 未完成时看到的行为

---

### 4.2 Webhook 的投递保证不明确

**问题描述：**

文档说：

- "失败时退避重试"
- "超过阈值进入失败终态"

**核心矛盾：**

文档没有定义：

- 重试的最大次数
- 退避策略（指数退避？固定间隔？）
- "超过阈值"的具体定义

**具体场景：**

用户的 webhook endpoint 返回 500 错误。

**问题：**

- OpenToggl 会重试几次？
- 每次重试的间隔是多少？
- 如果 10 次都失败了，webhook subscription 会被自动禁用吗？
- 用户会收到通知吗？

**更复杂的场景：**

用户的 webhook endpoint 响应很慢（10 秒才返回 200）。

**问题：**

- OpenToggl 的超时时间是多少？
- 如果超时，算成功还是失败？
- 如果算失败，会重试吗？但 endpoint 其实已经处理了请求。

**待解决：**

- 定义重试策略的具体参数
- 明确超时时间和超时处理
- 定义"noisy subscription"的阈值和处理方式
- 说明与 Toggl 官方的投递保证一致性

---

### 4.3 Import 的进度可见性不明确

**问题描述：**

文档说：

- import 有状态（created / validating / running / partially_succeeded / failed / succeeded / canceled）
- import 必须能看到冲突与失败明细

**核心矛盾：**

文档没有定义：

- 用户如何查看 import 进度？
- 进度的粒度是什么？（百分比？已处理对象数？）
- 失败明细的格式是什么？

**具体场景：**

用户导入了一个包含 10 万条 time entry 的文件。

**问题：**

- 用户能看到"已导入 5 万条"这样的进度吗？
- 如果能，进度多久更新一次？
- 如果不能，用户只能看到"running"状态，等待完成？

**部分失败的场景：**

导入了 10 万条 time entry，其中 100 条失败了（比如引用了不存在的 project）。

**问题：**

- 用户能看到哪 100 条失败了吗？
- 失败明细包含什么信息？（行号？原始数据？错误原因？）
- 用户能重新导入这 100 条吗？还是要重新导入整个文件？

**待解决：**

- 定义 import 进度的查询接口
- 明确进度的粒度和更新频率
- 提供失败明细的格式示例
- 定义部分失败的恢复机制

---

## 5. 数据一致性的边界情况

### 5.1 多租户 ID 策略的约束不明确

**问题描述：**

文档说：

- 核心表携带 `organization_id`
- 必要表同时携带 `workspace_id`

`time_entries` 表同时有两个 ID：

```sql
organization_id bigint not null,
workspace_id bigint not null,
```

**核心矛盾：**

文档没有定义这两个 ID 之间的约束关系。

**具体问题：**

- 这两个 ID 之间有外键约束吗？
- 如果有，`workspace_id` 就足够了，`organization_id` 是冗余的
- 如果没有，可能出现 `organization_id=1, workspace_id=999` 但 workspace 999 不属于 organization 1 的情况

**具体场景：**

用户在 workspace A（属于 organization 1）创建了一个 time entry。
然后 workspace A 被转移到 organization 2。

**问题：**

- 这个 time entry 的 `organization_id` 要更新吗？
- 如果要更新，谁来触发更新？`tenant` 模块还是 `tracking` 模块？
- 如果不更新，这个 time entry 的 `organization_id` 就永远指向 organization 1，数据不一致。

**待解决：**

- 明确双 ID 之间的约束关系
- 定义 workspace 转移时的数据更新策略
- 说明为什么需要冗余 `organization_id`

---

### 5.2 软删除的级联规则不明确

**问题描述：**

文档在多处提到 `deleted_at` 字段，暗示使用软删除。

**核心矛盾：**

文档没有定义软删除的级联规则。

**具体场景 1：删除 Project**

用户删除了 project A。

**问题：**

- 引用 project A 的 time entry 会被级联删除吗？
- 如果会，是软删除还是硬删除？
- 如果不会，这些 time entry 的 `project_id` 还指向 project A 吗？

**具体场景 2：删除 Workspace**

用户删除了 workspace A。

**问题：**

- workspace A 下的所有 project、time entry、tag 会被级联删除吗？
- 如果会，是软删除还是硬删除？
- 如果是软删除，用户还能恢复吗？

**具体场景 3：Reports 中的删除对象**

用户删除了 project A，然后查询 summary report。

**问题：**

- 引用 project A 的 time entry 还会出现在 report 里吗？
- 如果会，project 名称显示为 "(deleted)" 还是原名称？
- 如果不会，这些 time entry 的时间会计入 "No Project" 吗？

**待解决：**

- 定义所有对象的软删除级联规则
- 明确软删除对象在 reports 中的显示方式
- 说明与 Toggl 官方的删除行为一致性

---

### 5.3 并发冲突的处理策略不明确

**问题描述：**

文档没有提到并发控制。

**具体场景 1：Running Timer 冲突**

用户 A 在 workspace X 启动了一个 timer。
用户 A 在另一个设备也在 workspace X 启动了一个 timer。

**问题：**

- 第二个 timer 会自动停止第一个吗？
- 还是允许同时运行多个 timer？
- Toggl 官方的行为是什么？

**具体场景 2：Subscription 并发修改**

管理员 A 正在升级 organization 的 subscription。
管理员 B 同时在取消 subscription。

**问题：**

- 哪个操作会成功？
- 失败的操作返回什么错误？
- 有乐观锁吗？

**具体场景 3：Import 并发**

用户提交了一个 import 任务，状态是 "running"。
用户又提交了另一个 import 任务。

**问题：**

- 第二个任务会被拒绝吗？
- 还是排队等待第一个完成？
- 还是允许并发导入？

**待解决：**

- 定义所有关键操作的并发控制策略
- 明确冲突时的错误返回
- 说明与 Toggl 官方的并发行为一致性

---

## 总结

当前架构文档的核心问题：

### 1. DDD 战术设计规则缺失

- **聚合根边界未定义**：不知道每个聚合根包含哪些实体，保护哪些不变量
- **领域事件规则缺失**：不知道是否使用领域事件，如何发布和订阅
- **仓储职责不清晰**：不知道 Repository 只负责持久化还是也负责查询
- **值对象使用规则未定义**：不知道哪些概念应该建模为值对象
- **领域服务使用场景未定义**：不知道哪些业务逻辑应该放在领域服务
- **应用服务职责不明确**：不知道 `application` 层和 `domain` 层的边界

### 2. DDD 战略设计规则缺失

- **限界上下文边界不清晰**：`Operational Integrations` 和 `Instance Administration` 的定位混乱
- **防腐层缺失**：不知道限界上下文之间如何隔离，是否需要防腐层
- **跨上下文协调机制未定义**：不知道用领域事件、直接调用还是其他方式
- **跨上下文事务策略未定义**：不知道用 Saga、最终一致性还是分布式事务

### 3. 模块边界与职责冲突

- **billing / tenant 归属权混乱**：不知道"关联关系"的边界
- **platform 定位自相矛盾**：不知道是纯技术底座还是业务感知
- **governance 作用域混乱**：租户级治理和实例级管理混在一起

### 4. 产品能力定义不完整

- **subscription 双视图语义不明确**：不知道两个端点的关系
- **feature gating 规则缺失**：不知道哪些功能需要门控，在哪里检查
- **reports 统计口径未定义**：不知道舍入、跨时区、删除对象的处理规则
- **webhook 事件定义不完整**：不知道有哪些事件类型，触发时机是什么
- **import 冲突处理策略不明确**：不知道 ID 冲突时的处理规则

### 5. 运行时行为不确定

- **reports freshness 保证不明确**：不知道是实时还是最终一致
- **webhook 投递保证不明确**：不知道重试策略和超时处理
- **import 进度可见性不明确**：不知道用户如何查看进度和失败明细

### 6. 数据一致性边界情况未覆盖

- **多租户 ID 约束不明确**：不知道双 ID 之间的约束关系
- **软删除级联规则不明确**：不知道删除对象时的级联行为
- **并发冲突处理策略不明确**：不知道 running timer、subscription 修改的并发规则

---

## 补充挑战：更多产品细节缺失

### 6.1 TimeEntry 的时间修正规则未定义

**问题描述：**

用户可以手动修改 time entry 的 start 和 stop 时间。

**具体场景 1：修改导致时间重叠**

用户有两个 time entry：

- Entry A: 09:00 - 10:00
- Entry B: 10:00 - 11:00

用户把 Entry A 的 stop 改为 10:30。

**问题：**

- 允许吗？Entry A 和 Entry B 现在重叠了。
- 如果不允许，返回什么错误？
- 如果允许，reports 怎么统计？重叠的 30 分钟算一次还是两次？

**具体场景 2：修改导致跨天**

用户有一个 time entry：

- start: 2024-01-01 23:00
- stop: 2024-01-02 01:00

用户把 stop 改为 2024-01-02 02:00。

**问题：**

- 这个 entry 在 daily report 里算哪一天？
- 如果算两天，怎么拆分？
- 如果只算一天，算哪一天？

**具体场景 3：修改导致 duration 为负**

用户把 stop 改为比 start 更早的时间。

**问题：**

- 允许吗？
- 如果不允许，在哪一层检查？`domain` 层还是 `application` 层？
- 错误信息是什么？

**待解决：**

- 定义 time entry 修改的验证规则
- 明确时间重叠的处理策略
- 定义跨天 entry 的统计规则

---

### 6.2 Tag 的多对多关系未定义清楚

**问题描述：**

`TimeEntry` 和 `Tag` 是多对多关系，通过 `time_entry_tags` 表关联。

**具体场景 1：删除 Tag**

用户删除了 tag "meeting"。

**问题：**

- 引用这个 tag 的 time entry 怎么办？
- `time_entry_tags` 表的记录要删除吗？
- 如果是软删除，time entry 还能看到这个 tag 吗？显示为 "(deleted)" 还是直接隐藏？

**具体场景 2：重命名 Tag**

用户把 tag "meeting" 改名为 "meetings"。

**问题：**

- 历史 time entry 会自动看到新名字吗？
- 还是 tag 是不可变的，改名等于创建新 tag？

**具体场景 3：Tag 的作用域**

Tag 是 workspace 级的还是 user 级的？

**问题：**

- 如果是 workspace 级，用户 A 创建的 tag，用户 B 能看到吗？
- 如果是 user 级，同一个 workspace 下，两个用户可以有同名 tag 吗？
- Reports 里按 tag 统计时，是统计 workspace 所有 tag 还是只统计当前用户的 tag？

**待解决：**

- 明确 tag 的作用域（workspace 级？user 级？）
- 定义 tag 删除的级联规则
- 定义 tag 重命名的语义

---

### 6.3 Workspace 转移的数据迁移规则未定义

**问题描述：**

文档提到 workspace 可以被转移到另一个 organization。

**具体场景 1：Subscription 的变化**

Workspace A 从 organization 1（Premium plan）转移到 organization 2（Free plan）。

**问题：**

- Workspace A 的功能会立刻受限吗？
- 如果 workspace A 有 100 个 project，但 Free plan 只允许 10 个，怎么办？
- 已有的 billable rates 会被清空吗？

**具体场景 2：成员的变化**

Workspace A 转移后，原来的 organization 1 成员还能访问吗？

**问题：**

- 如果不能访问，他们的 time entry 怎么办？
- 如果能访问，他们算 organization 2 的成员吗？
- 如果不算，billing 怎么计费？

**具体场景 3：历史数据的归属**

Workspace A 转移前，用户在 organization 1 下创建了 1000 个 time entry。

**问题：**

- 这些 time entry 的 `organization_id` 要更新吗？
- 如果要更新，是同步更新还是异步更新？
- 如果异步更新失败了，数据一致性怎么保证？
- Reports 里，这些历史数据算 organization 1 还是 organization 2？

**待解决：**

- 定义 workspace 转移的完整流程
- 明确 subscription 变化的处理策略
- 定义历史数据的归属和迁移规则

---

### 6.4 Project 的归档和激活规则未定义

**问题描述：**

Project 可以被归档（archived）和激活（active）。

**具体场景 1：归档 Project 的 TimeEntry**

Project A 被归档了。

**问题：**

- 用户还能在 project A 下创建 time entry 吗？
- 如果不能，返回什么错误？`403` 还是 `400`？
- 如果能，为什么要归档？

**具体场景 2：归档 Project 的成员**

Project A 被归档了，但还有 10 个成员。

**问题：**

- 这些成员还能看到 project A 吗？
- 如果能看到，他们能做什么？只读？还是可以修改历史 time entry？
- 如果不能看到，他们的历史 time entry 怎么办？

**具体场景 3：归档 Project 的 Reports**

Project A 被归档了。

**问题：**

- Reports 里还显示 project A 吗？
- 如果显示，怎么标记？"(archived)" 还是正常显示？
- 如果不显示，project A 的历史 time entry 算在哪里？"No Project"？

**待解决：**

- 定义归档 project 的行为约束
- 明确归档 project 的成员权限
- 定义归档 project 在 reports 中的显示规则

---

### 6.5 User 的停用和删除规则未定义

**问题描述：**

User 可以被停用（deactivated）或删除。

**具体场景 1：停用 User 的 TimeEntry**

User A 被停用了。

**问题：**

- User A 的历史 time entry 还显示吗？
- 如果显示，user 名称显示为 "(deactivated)" 还是原名称？
- 如果不显示，这些 time entry 的时间算在哪里？

**具体场景 2：停用 User 的 Running Timer**

User A 有一个 running timer，然后被停用了。

**问题：**

- Running timer 会自动停止吗？
- 如果不停止，user A 重新激活后，timer 还在运行吗？
- 如果停止，stop 时间是什么？停用时间？

**具体场景 3：删除 User 的数据归属**

User A 被删除了（不是停用，是真删除）。

**问题：**

- User A 的 time entry 怎么办？级联删除？还是保留但标记为 "(deleted user)"？
- 如果保留，reports 里怎么统计？
- 如果删除，workspace 的总时长会减少吗？

**待解决：**

- 定义 user 停用和删除的区别
- 明确停用 user 的数据可见性
- 定义删除 user 的级联规则

---

### 6.6 Billable Rate 的优先级规则未定义

**问题描述：**

Billable rate 可以在多个层级设置：

- Workspace 级默认 rate
- User 级 rate（`workspace_users.hourly_rate`）
- Project 级 rate（`projects.rate`）

**具体场景：多层级 rate 冲突**

- Workspace 默认 rate: $50/hour
- User A 的 rate: $80/hour
- Project X 的 rate: $100/hour

User A 在 project X 下创建 time entry。

**问题：**

- 这个 time entry 的 billable rate 是多少？
- 优先级是什么？Project > User > Workspace？
- 如果 project rate 是 null，回落到 user rate 还是 workspace rate？

**具体场景：Rate 的历史变更**

User A 的 rate 从 $80 改为 $100。

**问题：**

- 历史 time entry 的 billable amount 要重新计算吗？
- 如果要，是同步更新还是异步更新？
- 如果不要，reports 里的 billable amount 是用旧 rate 还是新 rate？

**待解决：**

- 定义 billable rate 的优先级规则
- 明确 rate 变更对历史数据的影响
- 定义 rate 为 null 时的回落规则

---

### 6.7 Approval 的状态机未定义

**问题描述：**

文档提到 `Approval` 和 `Timesheet`，但没有定义状态机。

**具体场景 1：Approval 的状态流转**

Approval 有哪些状态？

- pending？
- approved？
- rejected？
- 还有其他状态吗？

**问题：**

- 状态之间的流转规则是什么？
- pending 可以直接变成 rejected 吗？
- approved 可以撤销吗？

**具体场景 2：Approval 的权限**

谁可以 approve？

- Workspace admin？
- Project manager？
- Organization owner？

**问题：**

- 如果有多个 approver，需要所有人都 approve 吗？
- 还是只要一个人 approve 就行？
- 如果 approver 被停用了，approval 怎么办？

**具体场景 3：Approval 后的 TimeEntry 修改**

Time entry 被 approve 后，用户还能修改吗？

**问题：**

- 如果能修改，approval 状态会变回 pending 吗？
- 如果不能修改，返回什么错误？
- 如果 admin 强制修改，approval 状态怎么办？

**待解决：**

- 定义 approval 的完整状态机
- 明确 approval 的权限规则
- 定义 approval 后的数据修改策略

---

### 6.8 Calendar Integration 的同步规则未定义

**问题描述：**

文档提到 calendar integration，但没有定义同步规则。

**具体场景 1：Calendar Event 到 TimeEntry 的映射**

用户连接了 Google Calendar，有一个 event：

- title: "Team Meeting"
- start: 10:00
- end: 11:00

**问题：**

- 自动创建 time entry 吗？
- 如果创建，description 是 "Team Meeting" 吗？
- project 是什么？null？还是有默认 project？
- billable 是 true 还是 false？

**具体场景 2：双向同步的冲突**

用户在 OpenToggl 创建了 time entry，然后在 Google Calendar 修改了对应的 event。

**问题：**

- Time entry 会自动更新吗？
- 如果会，是实时更新还是定时同步？
- 如果用户在 OpenToggl 也修改了 time entry，哪个优先？

**具体场景 3：Calendar 断开后的数据**

用户断开了 Google Calendar 连接。

**问题：**

- 之前同步的 time entry 还保留吗？
- 如果保留，它们还和 calendar event 关联吗？
- 如果不保留，用户会丢失数据吗？

**待解决：**

- 定义 calendar event 到 time entry 的映射规则
- 明确双向同步的冲突处理策略
- 定义 calendar 断开后的数据保留规则

---

### 6.9 Expense 的审批和报销流程未定义

**问题描述：**

文档提到 `Expense`，但没有定义审批和报销流程。

**具体场景 1：Expense 的状态**

Expense 有哪些状态？

- draft？
- submitted？
- approved？
- rejected？
- reimbursed？

**问题：**

- 状态之间的流转规则是什么？
- 谁可以 submit？谁可以 approve？
- approved 后可以撤销吗？

**具体场景 2：Expense 的附件**

Expense 可以上传附件（发票、收据）。

**问题：**

- 附件是必须的吗？
- 附件的大小限制是多少？
- 附件的格式限制是什么？PDF？图片？
- 附件存储在哪里？PostgreSQL Blob？

**具体场景 3：Expense 的币种**

Expense 可以是不同币种。

**问题：**

- 如果 expense 是 USD，但 workspace 默认币种是 EUR，怎么办？
- 需要汇率转换吗？
- 汇率从哪里来？手动输入？还是自动获取？
- 汇率变化后，历史 expense 要重新计算吗？

**待解决：**

- 定义 expense 的完整状态机
- 明确 expense 的审批流程
- 定义 expense 的币种和汇率处理规则

---

### 6.10 Saved Report 的共享权限未定义清楚

**问题描述：**

文档提到 saved/shared report，但权限规则不清楚。

**具体场景 1：Public Report 的访问范围**

Report 设置为 public。

**问题：**

- 任何人都能访问吗？包括未登录用户？
- 还是只有 workspace 成员能访问？
- 还是只有 organization 成员能访问？

**具体场景 2：Private Report 的权限**

Report 设置为 private。

**问题：**

- 只有 owner 能访问吗？
- Workspace admin 能访问吗？
- 如果 owner 被停用了，report 还能访问吗？

**具体场景 3：Shared Report 的参数覆盖**

Saved report 有默认参数（比如 date range: last 7 days）。

**问题：**

- 访问者可以覆盖参数吗？
- 如果可以，覆盖后的结果会保存吗？
- 如果不可以，为什么要允许传参数？

**待解决：**

- 定义 saved report 的权限模型
- 明确 public/private 的访问范围
- 定义 shared report 的参数覆盖规则

---

**这些产品细节问题必须在实现前解决，否则不同开发者会做出不一致的产品决策。**

- 端到端测试的覆盖率要求
- 如何测试跨模块协调
- 如何测试异步任务

### 7.2 可观测性设计

文档完全没有提到：

- 日志规范（结构化？级别？）
- 指标收集（Prometheus？自定义？）
- 链路追踪（OpenTelemetry？）
- 如何追踪跨模块调用
- 如何追踪异步任务

### 7.3 错误处理策略

文档完全没有提到：

- 错误分类（业务错误？系统错误？）
- 错误传播（跨模块如何传递错误？）
- 错误恢复（哪些错误可重试？）
- 错误上报（如何通知运维？）

### 7.4 部署与运维

文档只说了"Railway / Docker Compose"，但没有提到：

- 数据库迁移策略
- 配置管理（环境变量？配置文件？）
- 密钥管理（API token？数据库密码？）
- 备份与恢复
- 滚动更新策略

---

## 总结

当前架构文档的三个系统性问题：

1. **模块边界定义不清晰**：领域模型与代码结构不一致，限界上下文与模块的映射规则不明确。

2. **跨模块协调机制缺失**：定义了很多"必须异步"的规则，但没有定义协调机制（event？job？直接调用？）。

3. **约束条件不完整**：定义了很多"应该"的规则，但没有定义违反规则时的行为（报错？降级？忽略？）。

**这些问题必须在实现前解决，否则架构文档无法指导实现。**

---

## 响应 / 处置结果

### 已吸收并修改的点

- `billing / tenant` 关联机制
  - 已在 `docs/codebase-structure.md` 明确：
    - `tenant` 持有关联引用
    - `billing` 持有业务本体
    - 创建协调通过 `tenant/application -> billing/application` 接口完成
- `platform` 抽象层级
  - 已在 `docs/codebase-structure.md` 增加接口级规则：
    - `platform` 提供 SMTP sender、blob store、payment client、SSO adapter 这类技术接口
    - 业务模块负责模板、通知类型、文件业务归属和入口
- 聚合根边界与核心不变量
  - 已在 `docs/toggl-domain-model.md` 为 `Workspace`、`Project`、`TimeEntry`、`WebhookSubscription`、`SavedReport`、`RegistrationPolicy`、`InstanceSetting` 补充边界与核心不变量
- Repository / Query Service / Value Object
  - 已在 `docs/codebase-structure.md` 与 `docs/ddd-glossary.md` 明确：
    - Repository 面向聚合根持久化
    - Query Port / Query Service 面向读模型、列表和聚合读取
    - Value Object 的选择方向
- feature gating 检查点与返回语义
  - 已在 `docs/codebase-structure.md` 与 `docs/billing-contract.md` 明确：
    - feature gating 由业务模块 `application` 层检查
    - `billing` 只提供 plan / feature / commercial quota 的判定事实
    - `402 / 403 / 429` 的边界已写死
- `Workspace` / `Project` / `TimeEntry` 的更细不变量
  - 已在 `docs/toggl-domain-model.md` 补充：
    - workspace 设置、rounding、自定义属性的自洽规则
    - project 的 billable / private / fixed_fee / rate / currency 自洽规则
    - time entry 的 running / stopped / duration / 引用一致性规则
- 首批 Value Object 示例 shape
  - 已在 `docs/ddd-glossary.md` 补充：
    - `Email`
    - `Duration`
    - `Money`
    - `TimeRange`
    - `BillingPeriod`
    - `ReportFilter`

### 不接受的挑战及原因

- “`Operational Integrations` 必须映射为独立顶层模块”
  - 不接受。它在当前文档体系中是领域概念聚类，不是代码顶层模块。
- “`Instance Administration` 只要有自己的对象，就必须立刻拆独立模块”
  - 不接受。当前阶段它作为实例级子域，代码先归 `governance`，这是明确的工程决策。
- “`job record` 与 `domain event` / `outbox` 必须二选一”
  - 不接受。首版持久化异步机制已明确采用 `job record`；`domain event` 作为概念术语不自动等于采用 `event record` 或 `outbox`。
- “跨聚合约束只能由聚合根内部保护，不能由应用层协调”
  - 不接受。对于 running timer 这类跨聚合约束，当前采用 `application` 协调 + domain policy / query port 的方案，这是刻意选择的务实边界。
