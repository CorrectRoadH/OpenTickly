# OpenToggl 文档入口

本文档定义 `docs/` 的结构、每个目录负责的工作、以及各类文档之间的依赖关系。

先读主线，不要从历史分析资料或争议记录开始。

## 1. 文档主线

OpenToggl 文档主线按下面顺序理解：

1. [core/product-definition](./core/product-definition.md)
2. `openapi/*.json`
3. Figma 原型
4. `docs/product/*.md`
5. [core/ddd-glossary](./core/ddd-glossary.md)
6. [core/domain-model](./core/domain-model.md)
7. [core/architecture-overview](./core/architecture-overview.md)
8. [core/backend-architecture](./core/backend-architecture.md)
9. [core/frontend-architecture](./core/frontend-architecture.md)
10. [core/testing-strategy](./core/testing-strategy.md)

阅读顺序体现依赖方向：

- 先确定 API 与 UI 的强约束输入
- 再由 PRD 补充这些输入未覆盖的功能细节
- 再定义领域边界、对象归属与事务边界
- 再定义系统与实现结构
- 最后定义前后端与测试如何落地

## 2. 文档分层

### `core/`

职责：

- 记录当前权威主线
- 定义项目级规则、边界、架构和实现约束

包含内容：

- `product-definition`：产品总定义，回答“我们要做什么，以及如何使用 OpenAPI/Figma/PRD”
- `ddd-glossary`：DDD 术语、判定规则和对实现施加的约束
- `domain-model`：OpenToggl 已确定的领域模型、上下文划分、聚合与关键不变量
- `architecture-overview`：系统级架构蓝图，回答“整体系统怎么落”
- `backend-architecture`：后端模块和代码组织，回答“后端怎么实现这些边界”
- `frontend-architecture`：前端模块和交互实现结构，回答“前端怎么承接 OpenAPI、Figma 与 PRD”
- `testing-strategy`：验证方式与测试分层，回答“如何证明实现没有破坏前述定义”
- `codebase-structure`：代码结构总规约与专题文档入口

规则：

- `core/` 写结论，不写脑暴过程
- `core/` 写当前已定规则，不写候选方案
- `core/` 中的文档可以细化上游文档，但不能反向改写上游定义

### `product/`

职责：

- 按功能拆分产品定义
- 记录用户可见行为、页面语义、交互规则和业务规则

规则：

- `product/` 是 [core/product-definition](./core/product-definition.md) 的后续和细化
- `product/` 直接引用 OpenAPI 与 Figma，作为本域 API/UI 兼容的强约束来源
- `product/` 只补充 OpenAPI 与 Figma 无法完整表达的功能细节
- `product/` 不定义实现结构、目录边界或数据库设计

### `challenges/`

职责：

- 记录未决问题、争议、风险和挑战点

规则：

- `challenges/` 不代表当前已定结论
- 若争议已解决，结论必须写回主线文档，而不是停留在 `challenges/`

### `upstream/`

职责：

- 记录上游镜像资料和外部来源

规则：

- `upstream/` 是证据来源，不是本项目定义来源
- 本项目定义必须落回 `core/` 或 `product/`

## 3. 依赖关系

文档依赖关系必须保持单向，不允许循环定义。

总依赖顺序：

`openapi + figma -> product-definition -> product/*.md -> ddd-glossary -> domain-model -> architecture-overview -> backend/frontend/testing`

展开后：

- `openapi/*.json`
  - 定义 API 兼容强约束输入
- Figma
  - 定义 UI 兼容强约束输入
- `core/product-definition`
  - 定义产品目标与文档体系的输入分工
- `product/*.md`
  - 细化各产品域，只补充 OpenAPI 与 Figma 未覆盖的功能细节
- `core/ddd-glossary`
  - 定义判定规则、术语边界和架构约束
- `core/domain-model`
  - 把 DDD 规则应用到 OpenToggl，形成已定模型
- `core/architecture-overview`
  - 把产品、领域模型和约束转成系统蓝图
- `core/backend-architecture`
  - 细化后端模块、分层、事务、协作和代码结构
- `core/frontend-architecture`
  - 细化前端页面、模块、状态和接口承接方式
- `core/testing-strategy`
  - 细化测试分层、合同验证、集成测试和端到端验证方式

依赖规则：

- `product-definition` 不依赖代码结构
- `openapi/*.json` 与 Figma 不依赖当前实现结构
- `product/*.md` 依赖 OpenAPI 与 Figma，但不重写它们
- `ddd-glossary` 不依赖当前目录布局或实现偶然性
- `domain-model` 依赖 PRD 与 DDD 判定规则
- `architecture-overview` 依赖产品定义、产品分册、DDD 和领域模型
- `backend-architecture` 与 `frontend-architecture` 依赖架构蓝图、DDD 和领域模型
- `testing-strategy` 依赖产品、DDD、领域模型和架构，但不反向定义它们
- `challenges/` 与 `upstream/` 不能作为主线文档的反向权威来源

## 4. 谁是谁的后续、细化

### 产品主线

- [core/product-definition](./core/product-definition.md) 是产品总定义
- `openapi/*.json` 与 Figma 是 API/UI 兼容实现的强约束输入
- `product/*.md` 是它的后续和细化

这条主线回答：

- 我们提供哪些产品能力
- 必须兼容哪些 API 和 UI
- 上游输入没覆盖时，产品细节是什么

### DDD 主线

- [core/ddd-glossary](./core/ddd-glossary.md) 定义 DDD 术语、判定规则和实现约束
- [core/domain-model](./core/domain-model.md) 定义 OpenToggl 已定领域模型

这条主线回答：

- 什么是限界上下文、聚合、实体和值对象
- OpenToggl 最终如何划分上下文和对象归属
- 哪些对象是聚合根，关键不变量是什么
- 跨模块协作允许什么，不允许什么

### 架构主线

- [core/architecture-overview](./core/architecture-overview.md) 是系统级架构蓝图
- [core/backend-architecture](./core/backend-architecture.md) 是后端实现细化
- [core/frontend-architecture](./core/frontend-architecture.md) 是前端实现细化
- [core/testing-strategy](./core/testing-strategy.md) 是验证策略细化

这条主线回答：

- 进程、模块、分层、运行时、投影、任务和测试如何组织

## 5. 按任务读什么

### 做产品范围、页面语义、用户可见行为

先读：

- [core/product-definition](./core/product-definition.md)
- 对应 `openapi/*.json`
- 对应 Figma

再读对应产品分册：

- [identity-and-tenant](./product/identity-and-tenant.md)
- [membership-and-access](./product/membership-and-access.md)
- [tracking](./product/tracking.md)
- [reports-and-sharing](./product/reports-and-sharing.md)
- [Webhooks](./product/Webhooks.md)
- [billing-and-subscription](./product/billing-and-subscription.md)
- [importing](./product/importing.md)
- [instance-admin](./product/instance-admin.md)

### 做领域边界、模块所有权、对象分类、事务边界

读：

- [core/ddd-glossary](./core/ddd-glossary.md)
- [core/domain-model](./core/domain-model.md)
- [core/architecture-overview](./core/architecture-overview.md)
- [core/backend-architecture](./core/backend-architecture.md)

### 做架构、模块边界、实现结构

读：

- [core/architecture-overview](./core/architecture-overview.md)
- [core/codebase-structure](./core/codebase-structure.md)
- [core/backend-architecture](./core/backend-architecture.md)
- [core/frontend-architecture](./core/frontend-architecture.md)
- [core/testing-strategy](./core/testing-strategy.md)
- [core/domain-model](./core/domain-model.md)

### 做 Figma / Screenshot 对齐

- 已确认页面直接回写到对应 PRD 分册，不单独维护一份平行页面说明
- 当前 Figma 文件：`https://www.figma.com/design/IiuYyZAD0bWx9C8BxetnFc/OpenToggl`
- 当前截图参考目录：仓库根目录 `toggl_screenshots/`
- `tracking` 负责记录 `timer` 三种视图、`project page`、`client page`、`tag page` 的页面语义与实现约束
- `identity-and-tenant` 负责记录 `profile`、`settings` 的页面语义与实现约束
- `Webhooks` 负责记录 `integrations webhooks` 页面的页面语义与实现约束

## 6. 文档规范

- `core/` 只写当前权威定义，不写分析过程、脑暴记录和待办清单
- `product/` 只写用户可见行为、页面语义和产品规则，不写实现结构
- `challenges/` 只记录未决问题、争议和风险，不代表当前已定结论
- `upstream/` 只提供上游资料，不直接充当本项目定义
- 如果一个结论已经在主线文档写死，其他文档应链接到它，而不是重复改写一遍
