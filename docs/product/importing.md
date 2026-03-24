# 导入迁移

## Goal

这一册定义 `import` 作为 OpenToggl 首版新增业务产品能力的目标、默认行为和用户可见结果。

## 范围

`import` 是首版允许超出 Toggl 当前公开业务产品面的新增业务能力。

本文件的强约束输入：

- OpenToggl import 相关 OpenAPI
- 对应 Figma 导入页面原型

## 产品目标

- 支持导入 Toggl 导出数据
- 完成从 Toggl 到 OpenToggl 的迁移闭环
- 导入后通过公开 API 与 Web 界面正常访问
- 导入后尽可能保留原始对象 ID
- 导入后尽可能保留对象之间的引用关系
- 导入后尽可能保证已有脚本、链接、外部映射和报表引用继续有效

## Product Rules

- `import` 的目标不是通用 ETL，而是完成从 Toggl 到 OpenToggl 的迁移闭环。
- import 完成后，数据必须能通过公开 API、Web UI 和 reports 正常读取。
- import 不是一次性内部脚本，而是正式产品能力；ID 保留、remap、状态机、失败明细和联动规则必须在本 PRD 和实现中明确。

## Edge Cases

- 导入过程中出现部分成功、冲突、联动延迟时，结果必须对用户可解释。

## 必须具备的产品能力

- 任务状态
- 失败明细
- 冲突展示
- 可重试
- 诊断能力

## 导出数据结构

基于真实 Toggl Track 导出样本,导出目录结构为:

```
toggl_workspace_{workspace_id}_export_{export_id}/
├── clients.json              # 客户端定义
├── projects.json             # 项目定义
├── tags.json                 # 标签定义
├── workspace_users.json      # 工作区成员列表
├── workspace_settings.json   # 工作区配置
├── alerts.json               # 警报配置(通常为空)
├── user_groups.json          # 用户组定义(通常为空)
└── projects_users/           # 项目成员目录
    ├── {project_id}.json     # 每个项目的用户分配
    └── ...
```

### 数据实体

#### Clients (`clients.json`)

```json
{
  "id": 57870165,
  "name": "个人",
  "wid": 3550374,
  "archived": false,
  "creator_id": 4970670,
  "total_count": 3
}
```

#### Projects (`projects.json`)

```json
{
  "id": 218647578,
  "name": "toggl CLI",
  "wid": 3550374,
  "workspace_id": 3550374,
  "cid": null,
  "client_id": null,
  "client_name": null,
  "active": true,
  "status": "active",
  "is_private": false,
  "billable": false,
  "color": "#06aaf5",
  "pinned": false,
  "can_track_time": true,
  "start_date": "2026-03-06",
  "actual_hours": 4,
  "actual_seconds": 17893,
  "estimated_hours": null,
  "estimated_seconds": null
}
```

#### Tags (`tags.json`)

```json
{
  "id": 7215643,
  "name": "1 象限",
  "workspace_id": 3550374,
  "creator_id": 4970670
}
```

#### Workspace Users (`workspace_users.json`)

```json
{
  "id": 5155401,
  "uid": 4970670,
  "wid": 3550374,
  "name": "CtRdH",
  "email": "a778917369@gmail.com",
  "active": true,
  "admin": true,
  "role": "admin",
  "timezone": "Asia/Shanghai"
}
```

#### Project Users (`projects_users/{project_id}.json`)

```json
{
  "id": 76387654,
  "project_id": 153406950,
  "user_id": 4970670,
  "workspace_id": 3550374,
  "manager": true,
  "rate": null
}
```

### 缺失数据

Toggl Track 导出**不包含**:

- **Time Entries**: 必须通过单独的第二步导入
- **User Groups**: 导出中通常为空
- **Alerts**: 导出中通常为空

## 导入策略

导入对用户是两个独立步骤,分别创建两个独立的 import job。

### 阶段 1: 实体导入

- 用户输入 `organization name`
- 用户上传 Toggl export zip
- 后端创建一个**新的 organization**
- 后端同时为该 organization 创建默认 workspace
- 后端将 zip 内 JSON 实体导入到这个新 workspace

实体导入顺序:

1. **导入 Clients** → 建立 ID 映射
2. **导入 Tags** → 建立 ID 映射
3. **导入 Workspace Users** → 建立 ID 映射
4. **导入 Projects** → 解析 client 引用
5. **导入 Project Users** → 解析 project/user 引用

### 阶段 2: Time Entry 导入

- 用户在 import 页面单独上传 time entries CSV
- 该步骤导入到用户当前选择的 workspace
- 该步骤不创建新 organization,也不复用阶段 1 的 zip 内容

CSV 导入时需解析:

- Project 引用 (按名称匹配或创建)
- Client 引用 (按名称匹配或创建)
- Task 引用 (按名称匹配或创建)
- Tag 引用 (按名称匹配或创建)
- 用户归属 (按 workspace 成员 email 匹配)
- 运行中的 entry (stop = null)

## ID 映射

导入过程中维护双向 ID 映射:

```
toggl_client_id <-> opentoggl_client_id
toggl_project_id <-> opentoggl_project_id
toggl_tag_id <-> opentoggl_tag_id
toggl_user_id <-> opentoggl_user_id
toggl_time_entry_id <-> opentoggl_time_entry_id
```

映射用途:

- 增量导入 (跳过已导入实体)
- 冲突解决 (检测重复导入)
- 引用解析 (链接 time entries 到 projects)

## 导入验证

### 导入前检查

- 验证导出目录结构
- 验证 JSON 文件完整性
- 检查必需文件 (`clients.json`, `projects.json`, `tags.json`)

### 导入后检查

- 验证实体数量与导出一致
- 验证引用完整性 (projects → clients, project_users → projects/users)
- 检查孤立引用

## 错误处理

### 可恢复错误

- **缺失 client 引用**: 创建占位 client 或跳过 client 分配
- **缺失 user 引用**: 跳过项目成员分配
- **重复实体**: 跳过导入,使用现有实体

### 致命错误

- **JSON 损坏**: 中止导入,报告文件路径
- **缺失必需文件**: 中止导入,报告缺失文件
- **数据库约束违反**: 中止导入,回滚事务

## Open Questions

- import 进度的精确粒度与失败明细 shape，仍需在专题合同中继续写实。

## Web 要求

Web 端必须完整承接 `import` 产品面的正式能力，不允许把本册定义的正式能力降级为一次性内部脚本或后台-only 能力。

Web 端的正式页面与入口包括：

- import 页面
- 导入任务列表
- 冲突 / 失败诊断页
- 重试入口
