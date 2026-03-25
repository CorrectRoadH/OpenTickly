# Toggl Timer Time Entry Popup 联想选择与动作研究

本文件聚焦四类细节：

1. description / project / tag 联想选择
2. `Continue Time Entry`
3. `Duplicate Time Entry`
4. `More actions` 中各动作的分层与实现

## 1. Description / Project / Tag 联想选择

## 1.1 产品定义（PRD 视角）

### A. description 不是纯文本输入框

点击 `(no description)` 后，会切换成真正的输入框：

- placeholder: `Add a description`
- 输入时会弹出联想层
- 联想层顶部带当前 workspace 与 `Change`

这说明 description 实际上是：

```text
带 workspace 作用域的描述 + 快捷实体选择入口
```

而不是单纯 free text。

### B. 空输入时先给“最近可用项”

空输入状态下，实际观察到联想层会直接给出内容，而不要求先输入 2~3 个字符。

当前样本里出现过：

- `Change`
- `Projects`
- 若 workspace 有记录，还会出现 `Previously tracked time entries`

因此它的产品取向是：

- 优先让用户“挑现成的”
- 再决定要不要手打

### C. `@` / `#` 会切换联想模式

本次已直接验证：

- 输入 `@` 后，联想层切到 project 语义
- 输入 `#` 后，联想层切到 tag 语义

当当前 workspace 下没有匹配项时，会显示：

```text
No matching items for the selected workspace
Try searching in a different one by clicking “Change”.
```

所以 `@` / `#` 并不是普通字符，而是模式切换触发器。

### D. 进入编辑态后，高频动作会被锁住

当 description 进入脏状态后，本次直接观察到：

- `Duplicate Time Entry` 变成 disabled
- `Escape` 不再直接关闭 popup
- 会先弹出 `Discard unsaved changes?`

这说明 popup 里存在明确的“已修改 / 未保存”保护层。

### E. project 不是从 description 联想里唯一进入

点击 `Select project` 后，会打开一个独立的 project 选择面板，当前样本看到：

- workspace 区域
- `Change`
- 搜索框 `Search by project, task or client`
- `Create a new project`

这说明产品层有两条路：

- description 里用 `@` 快捷切入
- 直接点 project 字段进入专门选择器

### F. tag 在当前 popup 中更像快捷语法入口

当前样本里没有直接露出一个明显的 tags 字段，但 bundle 和 live 行为都说明：

- `#` 是 tags 快捷入口
- 联想层会按当前 workspace 做 tag 相关匹配

所以至少在这个 popup 里，tag 更偏“通过 description 快捷触发”。

## 1.2 技术实现（证据）

bundle 中直接存在：

- `TimeEntryAutocompletePopdownNext`
- 分组文案：
  - `Favorites`
  - `Previously tracked time entries`
  - `Tasks`
  - `Projects`
- `ProjectTaskBillableMultiSelect.prompt`
- `Select project`
- `Select tags`
- `Billable hours`

并且键盘触发器写死为：

- `@` -> project
- `#` -> tag
- `$` -> billable

description 字段本体：

- `DescriptionTrigger`
- `DescriptionField.placeholder = "Add Description"`
- `StyledAutocompletePopdown`

project 字段本体：

- `ProjectField.label`
- `EnhancedProjectsFormField`

## 2. Continue Time Entry

## 2.1 产品定义（PRD 视角）

`Continue Time Entry` 是主 popup 顶部直接露出的高频动作。

它不属于二级菜单，说明 Toggl 把它视为：

- 高频复用行为
- 比 duplicate 更接近“立即开始下一段工作”

从命名与日历卡片行为看，它的产品含义是：

```text
基于当前这条 time entry 继续开一条新的计时
```

而不是“打开编辑器复制一份再修改”。

## 2.2 技术实现（证据）

Calendar event 卡片上直接有：

- tooltip: `Calendar.Event.continueTitle`
- 文案: `Continue time entry`

点击事件：

```text
onClick -> dispatch(_t.B3(M))
```

列表/弹层侧进一步接成：

```text
TIME_ENTRIES_LIST_CONTINUE_TIME_ENTRY
  -> Sa.B3(id, { originFeature })
```

同时 timer 全局动作里存在：

```text
TIMER_CONTINUE_TIME_ENTRY
```

以及键盘快捷键说明：

```text
Continue previous time entry -> c
```

所以这不是“打开 popup 再二次确认”的弱动作，而是一条独立的 timer 启动路径。

## 3. Duplicate Time Entry

## 3.1 产品定义（PRD 视角）

`Duplicate Time Entry` 的实际行为不是进入一个新的编辑步骤，而是：

- 直接复制当前 entry
- 立即创建并落库
- 日历上立刻出现新 block

它更像：

```text
one-click clone
```

而不是“进入 duplicate draft”。

另外，当 popup 有未保存修改时：

- duplicate 会被禁用

所以产品规则是：

- 干净态才能一键复制
- 脏态先要求用户处理当前编辑

## 3.2 技术实现（证据）

本次 live 直接验证：

- 点击 `Duplicate Time Entry`
- 周总时长立刻增加约 `0:35:00`
- 日历里立刻新增一条同长度 block

对应网络请求：

```text
POST /api/v9/time_entries?meta=true
```

请求体关键字段：

- `start: "2026-03-24T11:15:00.000Z"`
- `stop: "2026-03-24T11:50:00.000Z"`
- `duration: 2100`
- `description: ""`
- `tags: []`
- `duronly: true`
- `event_metadata.origin_feature: "calendar_duplicate_time_entry"`

bundle 中对应动作链路：

```text
TIME_ENTRIES_LIST_DUPLICATE_TIME_ENTRY
  -> omit(guid, expense_ids)
  -> 补临时 id（离线时）
  -> 规范化 tags
  -> pa.timeEntryAdd(t)
```

结论：

- duplicate 走的是直接 create API
- 不是先开 create-mode popup 再保存

## 4. More actions

## 4.1 菜单分层

当前 clean 状态下，`More actions` 菜单实际看到：

- `Split`
- `Pin as favorite`
- `Copy start link`
- `Delete`

而在 description 已输入内容的脏态样本里，菜单曾出现：

- `Copy description`

所以菜单是条件化渲染的：

- 空描述时不出现 `Copy description`
- 有描述时会追加这一项

## 4.2 Split

### PRD 视角

`Split` 代表把当前一条 time entry 拆成两段。

它被放进 `More actions`，说明：

- 不是最高频动作
- 但仍然属于 entry 结构级操作

### 技术视角

bundle 中存在专门动作：

```text
TIME_ENTRY_SPLIT(timeEntryId, splitDurationInSeconds, originFeature)
```

这说明 split 不是“普通编辑 + Save”拼出来的，而是有独立命令模型。

## 4.3 Pin as favorite

### PRD 视角

这是把当前 entry 模板化，方便后续快速复用。

它进入二级菜单，说明 Toggl 把 favorite 视作：

- 高频复用体系的一部分
- 但不是每次编辑 entry 都会立刻用到的动作

### 技术视角

bundle 里能确认存在 favorites 基础设施：

- `POST /api/v9/me/favorites`
- `DELETE /api/v9/me/favorites/:id`
- `POST /api/v9/me/favorites/suggestions`

虽然本轮没有直接点击执行，但可以确定它不是前端本地收藏，而是服务端 favorite 系统。

## 4.4 Copy start link

### PRD 视角

这是一个即时副作用动作：

- 不修改当前 entry
- 不打开确认框
- 复制后给出 toast 反馈

### 技术视角

本次 live 直接验证：

- 点击后没有新增业务 API 请求
- 页面直接出现 toast：`Start URL copied`

bundle 里对应动作链路：

```text
TIME_ENTRIES_COPY_QUICKSTART_LINK
```

可以判断它主要是：

- 前端生成 quickstart/start URL
- 调用 clipboard
- 触发成功提示

## 4.5 Delete

### PRD 视角

当前样本里，Delete 是：

- 放在 `More actions` 里
- 点击后直接执行
- 没有额外确认弹窗

这是一个相当激进的产品选择：

- 用菜单分层替代确认弹窗
- 依赖用户不会误点进最末尾 destructive item

### 技术视角

本次 live 直接验证：

- 点击 `Delete`
- 刚刚 duplicate 出来的那条 entry 被移除
- 周总时长从约 `1:51` 回落到约 `1:16`

对应网络请求：

```text
DELETE /api/v9/time_entries/4341528753
```

bundle 中对应动作链路：

```text
TIME_ENTRIES_LIST_DELETE_TIME_ENTRY
  -> pa.timeEntryDelete(e.timeEntry)
```

所以它是直接 delete API，不是软确认流。

## 5. 当前最重要的复刻要点

如果要复刻 Toggl 这一套 popup 交互，最该复制的是下面这些决策：

- description 是带联想与快捷语法的复合输入，不是纯文本框
- `@` / `#` / `$` 是模式切换器，不是普通字符
- dirty state 会禁用 duplicate，并拦截关闭动作为 discard confirm
- duplicate 是一键持久化创建，不是先开新草稿
- copy start link 是纯前端 clipboard 动作 + toast
- delete 是二级菜单里的直接 destructive command
- split / favorite / continue 都有各自独立 action，而不是统一走“编辑后保存”
