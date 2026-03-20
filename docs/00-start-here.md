# OpenToggl 文档入口

先读主线，不要从 `challenges/` 或 `upstream/` 开始。

## 主线

```text
core/product-definition
          |
          v
    product/*.md
          |
          +----------------------+
          |                      |
          v                      v
  refs: openapi/*.json       refs: figma
          |
          v
  core/ddd-glossary
          |
          v
  core/domain-model
          |
          v
core/architecture-overview
      /        |        \
     v         v         v
backend-arch frontend-arch testing-strategy
```

读法：

1. 默认先读 `core/product-definition` 和对应 `product/*.md`
2. PRD 里会标明相关 OpenAPI 和 Figma 引用
3. 只有在需要精确实现 API 或 UI 细节时，才回看 OpenAPI / Figma
4. `ddd-glossary` 定义判定规则和架构约束
5. `domain-model` 定义 OpenToggl 已定领域模型
6. 只有当需求影响实现结构时，再读前后端架构和测试文档

## 目录职责

- `core/`
  当前权威主线。写结论、规则、边界、架构和实现约束。
- `product/`
  按功能拆分的 PRD。负责引用 OpenAPI 与 Figma，并补充它们没覆盖的功能细节。
- `challenges/`
  未决问题、争议和风险。不代表当前结论。
- `upstream/`
  上游资料和证据来源。不直接充当本项目定义。

## 关键文档

- [product-definition](./core/product-definition.md)
  定义产品目标，以及 PRD / OpenAPI / Figma 的分工。
- [ddd-glossary](./core/ddd-glossary.md)
  定义限界上下文、聚合、实体、值对象的判定规则，以及对实现施加的约束。
- [domain-model](./core/domain-model.md)
  定义已确认的上下文划分、对象归属、聚合根和关键不变量。
- [architecture-overview](./core/architecture-overview.md)
  系统级架构蓝图。
- [backend-architecture](./core/backend-architecture.md)
  后端模块、分层、事务、协作和代码结构。
- [frontend-architecture](./core/frontend-architecture.md)
  前端页面、模块、状态和接口承接方式。
- [testing-strategy](./core/testing-strategy.md)
  测试分层、验证方式和发布门槛。

## 按任务读什么

- 做产品范围、页面语义、用户可见行为：
  [product-definition](./core/product-definition.md) -> 对应 `product/*.md`
- 做领域边界、模块所有权、对象分类、事务边界：
  [ddd-glossary](./core/ddd-glossary.md) -> [domain-model](./core/domain-model.md) -> [architecture-overview](./core/architecture-overview.md) -> [backend-architecture](./core/backend-architecture.md)
- 做架构、模块边界、实现结构：
  [architecture-overview](./core/architecture-overview.md) -> [codebase-structure](./core/codebase-structure.md) -> [backend-architecture](./core/backend-architecture.md) -> [frontend-architecture](./core/frontend-architecture.md) -> [testing-strategy](./core/testing-strategy.md)

## 规则

- `core/` 写权威结论，不写脑暴过程。
- `product/` 写产品细节，不写实现结构。
- `challenges/` 和 `upstream/` 不能反向覆盖主线定义。
- 如果一个结论已经在主线文档写死，其他文档应链接到它，而不是重复改写。
