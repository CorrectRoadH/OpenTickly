# Onboarding

## Goal

引导新用户和新管理员完成从注册/登录到正常使用 OpenToggl 的关键设置步骤。

Onboarding 不是一次性弹窗或固定教程，而是基于用户角色的 checklist，嵌入在 `/overview` 页面顶部，完成后可关闭。

## Scope

本文件覆盖：

- Admin onboarding（workspace admin / instance owner）
- User onboarding（普通成员）
- Onboarding 状态持久化（后端，per user + workspace）
- UI 放置位置与交互

本文件不覆盖：

- Instance bootstrap（见 `instance-admin.md`）
- Import 产品能力细节（见 `importing.md`）

## Product Rules

- Onboarding 是正式产品能力，不是临时 banner。
- Onboarding 状态必须后端持久化，跨设备可见。
- Admin 和 User 看到不同的 onboarding checklist。
- 角色判定基于当前 workspace 的 `role` 字段（`admin` vs 其他）。
- 每个 step 可以被用户手动标记完成，也可以被系统自动检测完成。
- 所有 step 完成后，onboarding checklist 自动隐藏。
- 用户可以随时 dismiss（关闭）onboarding，dismiss 状态持久化。

## Onboarding Steps

### Admin Steps

| Step ID | Label | Description | Auto-detect |
|---------|-------|-------------|-------------|
| `import_data` | Import data from Toggl | 上传 Toggl 导出数据完成迁移 | 当前 workspace 有成功的 import job |
| `configure_workspace` | Configure your workspace | 设置工作区名称、货币、权限等 | workspace settings 被修改过（非默认值） |
| `invite_team` | Invite team members | 邀请团队成员加入工作区 | workspace member count > 1 |
| `connect_cli` | Connect AI/CLI | 配置 API token，安装 toggl-cli | 手动标记 |

### User Steps

| Step ID | Label | Description | Auto-detect |
|---------|-------|-------------|-------------|
| `import_data` | Import your data | 导入个人 Toggl 数据 | 用户有成功的 import job |
| `connect_cli` | Connect AI/CLI | 配置 API token，安装 toggl-cli | 手动标记 |
| `start_tracking` | Start tracking time | 创建第一个 time entry | 用户有至少一条 time entry |

## State Model

Onboarding 状态按 `(user_id, workspace_id)` 维度存储。

```
OnboardingState {
  steps: [
    { step_id: string, completed: boolean }
  ]
  dismissed: boolean
}
```

- `steps` 中每个 step 的 `completed` 可以被用户手动设为 true，也可以被后端自动检测。
- `dismissed` 表示用户关闭了 onboarding，不再显示。
- dismissed 后用户仍可重新打开（通过 overview 页面某个入口）。

## API

Onboarding 状态通过 Web API 暴露，归属 `opentoggl-web.openapi.json`。

### GET `/web/v1/workspaces/{workspace_id}/onboarding`

返回当前用户在该 workspace 的 onboarding 状态。

Response:
```json
{
  "steps": [
    { "step_id": "import_data", "label": "Import data from Toggl", "completed": false, "href": "/workspaces/123/import" },
    { "step_id": "configure_workspace", "label": "Configure your workspace", "completed": true, "href": "/workspaces/123/settings" },
    { "step_id": "invite_team", "label": "Invite team members", "completed": false, "href": null },
    { "step_id": "connect_cli", "label": "Connect AI/CLI", "completed": false, "href": null }
  ],
  "dismissed": false
}
```

- `steps` 的内容根据用户角色（admin vs user）不同。
- `href` 是可选的导航目标，null 表示 in-place action。

### PUT `/web/v1/workspaces/{workspace_id}/onboarding`

更新 onboarding 状态。

Request:
```json
{
  "steps": [
    { "step_id": "connect_cli", "completed": true }
  ],
  "dismissed": false
}
```

- `steps` 是 partial update，只需要传要修改的 step。
- `dismissed` 是全量字段。

Response: 与 GET 相同的完整状态。

## UI

### Placement

Onboarding checklist 放在 `/overview` 页面的 grid 上方，位于 `PageHeader` 之后、dashboard grid 之前。

### Layout

- 顶部：进度指示（"2 of 4 completed"）+ dismiss 按钮
- 中间：checklist items，每个 item 有 checkbox、label、可选 action button
- action button 根据 step 类型不同：
  - `import_data` → "Go to import" link
  - `configure_workspace` → "Go to settings" link
  - `invite_team` → 打开 invite dialog
  - `connect_cli` → 展开 CLI 配置说明（API token + install command）
  - `start_tracking` → "Start timer" button

### States

- **Active**: checklist 可见，有未完成 step
- **Completed**: 所有 step 完成，显示简短 congratulations 后自动隐藏
- **Dismissed**: 用户手动关闭，不显示

## Web 要求

Web 端必须完整承接 onboarding 产品能力。Onboarding checklist 是 `/overview` 页面的正式组成部分，不是临时 banner 或 toast。

## Edge Cases

- 用户从 admin 降级为 member 后，onboarding 应重新计算 steps（按新角色）。
- 新建 workspace 后，该 workspace 的 onboarding 状态从零开始。
- Import 完成后，`import_data` step 应自动标记为 completed（下次 GET 时检测）。
