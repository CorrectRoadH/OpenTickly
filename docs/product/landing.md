# Landing

本文档定义 `OpenToggl` 介绍站点的目标内容与信息结构。

## 目标

Landing page 不是产品内工作台的一部分，而是面向首次访问者的公开介绍入口，用于回答以下问题：

- `OpenToggl` 是什么
- 为什么它存在
- 它和 `Toggl` 的关系是什么
- 为什么它比官方托管方案更值得切换
- 代码仓库和自托管入口在哪里
- 在线 demo 在哪里

## 页面定位

Landing page 必须清楚表达以下产品定位：

- `OpenToggl` 不是“灵感来自 Toggl”的另一个时间追踪产品，而是按 Toggl 当前公开产品面来实现的开源项目。
- `OpenToggl` 的目标不是列出一组功能清单，而是直接承诺与 Toggl 的产品面保持一致。
- `OpenToggl` 同时支持云 SaaS 与自托管，两者共享同一公开契约与功能面。
- `OpenToggl` 额外提供导入 Toggl 导出数据的能力，方便从既有数据迁移进入。
- Landing page 需要明确说明其差异化理由：免费、private-first、AI-friendly、可 self-host。

## 页面内容

Landing page 至少必须包含以下内容区块：

### 1. Hero

Hero 必须在首屏直接说明：

- `OpenToggl` 是一个免费、private-first、AI-friendly 的 Toggl 替代方案
- 它的目标是保留 Toggl 工作流，同时去掉价格、厂商锁定和 rate limit 约束
- 它支持 self-hosting 与公开在线 demo

Hero 必须至少提供两个 CTA：

- 指向 demo：`https://track.opentoggl.com`
- 指向 GitHub 仓库：`https://github.com/CorrectRoadH/opentoggl`
- 指向产品应用入口或文档入口

### 2. What Is OpenToggl

本区块必须用简洁语言解释：

- OpenToggl 直接按 Toggl 公开 API 与产品面实现
- 目标不是“部分兼容”，而是如实覆盖公开定义
- 除导入与实例管理外，不额外发明另一套偏离 Toggl 的业务面

### 3. Capability Surface

本区块不需要写 API 版本清单。

必须强调的是：

- 目标是与 Toggl 的产品面保持一致，而不是列举局部能力点
- 用户迁移过来不应该需要重新学习另一套工作流
- 文案应把“兼容目标”表达为产品定位，而不是 feature checklist

### 4. Why Self-Host

必须向用户说明自托管价值，包括但不限于：

- 你可以掌控部署、数据与升级节奏
- SaaS 与 self-hosted 共享同一功能面
- 仓库内已提供自托管相关文档与运行路径

### 5. Why OpenToggl

必须明确说明切换理由，包括但不限于：

- 官方 Toggl 对很多个人和团队来说太贵
- private-first 用户希望时间数据留在自己控制的基础设施上
- AI agent 与自动化需要更高的 HTTP 读写吞吐
- 低 hourly rate limit 不适合作为 agent backend

### 6. Open Source Proof

必须展示：

- GitHub 仓库链接
- 仓库组织或所有者信息
- 可供访问代码、文档或部署说明的明确入口

## 文案约束

- 语气必须直接、清晰、技术可信，避免泛化营销话术。
- 不允许把 `OpenToggl` 描述成“完美兼容一切 Toggl 行为”的模糊承诺。
- 不允许暗示尚未实现但仓库未证明的商业能力。
- 不要把首页写成功能枚举页或 API 版本公告页。
- 文案应优先围绕 `free`、`private-first`、`AI-friendly`、`self-hosting`、`import`、`Toggl alternative` 展开。

## 实现约束

- 介绍站点应作为 `apps/*` 下独立前端应用存在。
- 站点实现应接入仓库根工作区与根工具链，而不是游离的独立脚手架项目。
- 如果站点提供文档式导航或内容页，其默认内容必须与本文件及 `docs/core/product-definition.md` 保持一致。
