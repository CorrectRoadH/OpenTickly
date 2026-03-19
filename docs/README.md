# OpenToggl 文档

本目录用于沉淀 `OpenToggl` 的产品定义、兼容基线、官方资料镜像和设计约束。

## 目录结构

- `openapi/`
  - `toggl-track-api-v9.swagger.json`
  - `toggl-reports-v3.swagger.json`
  - `toggl-webhooks-v1.swagger.json`
- `toggl-official/`
  - 本地镜像的 Toggl 官方公开文档
- `prd.md`
  - 主 PRD
- `compat-baseline.md`
  - 兼容基线
- `reports-semantics.md`
  - Reports 统计与行为合同
- `reports-endpoint-matrix.md`
  - Reports 逐端点矩阵
- `billing-contract.md`
  - Billing 公开合同
- `billing-endpoint-matrix.md`
  - Billing 逐端点矩阵
- `webhooks-delivery-contract.md`
  - Webhooks 投递合同
- `import-migration-contract.md`
  - Import 迁移合同
- `toggl-api-analysis.md`
  - Toggl 公开 API 面分析
- `technical-architecture.md`
  - 系统级技术架构蓝图
- `codebase-structure.md`
  - 前后端目录结构与依赖规则
- `toggl-domain-model.md`
  - OpenToggl 领域模型
- `ddd-glossary.md`
  - DDD / 架构术语表
- `instance-admin-prd.md`
  - 实例管理员 / 平台运营产品定义
- `toggl-local-vs-cloud-architecture.md`
  - 本地部署与云 SaaS 架构建议

## 资料来源

`openapi/` 下的三个 Swagger 文件来自 Toggl Engineering 公开资料：

- https://engineering.toggl.com/docs/openapi/
- Track API v9
- Reports API v3
- Webhooks API v1

## 文档约定

- `中文主文档` 为当前维护中的中文主文档。
- `toggl-official/` 保留官方原文镜像，不做中文化改写。
- 本目录内由我们维护的设计和分析文档应默认使用中文。

## 阅读顺序

建议按以下顺序阅读：

1. `prd.md`
2. `compat-baseline.md`
3. `reports-semantics.md`
4. `billing-contract.md`
5. 逐端点矩阵文档
6. `technical-architecture.md`
7. `codebase-structure.md`
8. `ddd-glossary.md`
9. 领域模型与架构专题文档
