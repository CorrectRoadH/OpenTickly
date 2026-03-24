# Landing

本文档定义 `OpenToggl` 介绍站点的目标内容与信息结构。

## 目标

Landing page 不是产品内工作台的一部分，而是面向首次访问者的公开介绍入口，用于回答以下问题：

- `OpenToggl` 是什么
- 为什么它存在
- 它和 `Toggl` 的关系是什么
- 它覆盖哪些能力面
- 代码仓库和自托管入口在哪里

## 页面定位

Landing page 必须清楚表达以下产品定位：

- `OpenToggl` 不是“灵感来自 Toggl”的另一个时间追踪产品，而是按 Toggl 当前公开产品面来实现的开源项目。
- 首版目标覆盖 `Track API v9`、`Reports API v3`、`Webhooks API v1`，并提供对应的 Web 界面。
- `OpenToggl` 同时支持云 SaaS 与自托管，两者共享同一公开契约与功能面。
- `OpenToggl` 额外提供导入 Toggl 导出数据的能力，方便从既有数据迁移进入。

## 页面内容

Landing page 至少必须包含以下内容区块：

### 1. Hero

Hero 必须在首屏直接说明：

- `OpenToggl` 是一个开源的 Toggl-style time tracking platform
- 它覆盖 Track、Reports、Webhooks 三个公开能力面
- 它支持自托管

Hero 必须至少提供两个 CTA：

- 指向 GitHub 仓库：`https://github.com/CorrectRoadH/opentoggl`
- 指向产品应用入口或文档入口

### 2. What Is OpenToggl

本区块必须用简洁语言解释：

- OpenToggl 直接按 Toggl 公开 API 与产品面实现
- 目标不是“部分兼容”，而是如实覆盖公开定义
- 除导入与实例管理外，不额外发明另一套偏离 Toggl 的业务面

### 3. Capability Surface

必须显式列出：

- `Track API v9`
- `Reports API v3`
- `Webhooks API v1`
- Web UI
- Toggl 导出导入
- Self-hosting

### 4. Why Self-Host

必须向用户说明自托管价值，包括但不限于：

- 你可以掌控部署、数据与升级节奏
- SaaS 与 self-hosted 共享同一功能面
- 仓库内已提供自托管相关文档与运行路径

### 5. Open Source Proof

必须展示：

- GitHub 仓库链接
- 仓库组织或所有者信息
- 可供访问代码、文档或部署说明的明确入口

## 文案约束

- 语气必须直接、清晰、技术可信，避免泛化营销话术。
- 不允许把 `OpenToggl` 描述成“完美兼容一切 Toggl 行为”的模糊承诺。
- 不允许暗示尚未实现但仓库未证明的商业能力。
- 文案应优先复用仓库内既有产品定义术语：`Track API v9`、`Reports API v3`、`Webhooks API v1`、`self-hosting`、`import`。

## 实现约束

- 介绍站点应作为 `apps/*` 下独立前端应用存在。
- 站点实现应接入仓库根工作区与根工具链，而不是游离的独立脚手架项目。
- 如果站点提供文档式导航或内容页，其默认内容必须与本文件及 `docs/core/product-definition.md` 保持一致。
