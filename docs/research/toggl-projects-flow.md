# Toggl Projects 用户流程拆解

这份笔记按真实界面流程拆解 Projects：

- 列表页默认长什么样
- 新建 project 时用户会看到哪些字段和校验
- 创建后项目如何出现在列表和 dashboard
- 单个 project 可以做哪些后续操作
- 删除流程会给出哪些风险提示

对应截图和结构快照都保存在：

- `docs/research/assets/toggl-projects-flow/`

---

## 1. 列表页：Projects 是一个带筛选的管理表

页面：

- 路由：`/projects/6296488/list`
- 截图：`assets/toggl-projects-flow/01-projects-list-state.png`
- 结构快照：`assets/toggl-projects-flow/01-projects-list-state.snapshot.txt`

### 页面结构

顶部主操作：

- `New project`
- `Show All, except Archived`

筛选器：

- `Client`
- `Member`
- `Billable`
- `Project name`
- `Template`

表格列：

- `PROJECT`
- `CLIENT`
- `TIMEFRAME`
- `TIME STATUS`
- `BILLABLE STATUS`
- `TEAM`
- `PINNED`

### PRD 角度

Projects 首页不是 onboarding 空状态，而是标准管理台：

- 上方是新建入口
- 中间是筛选器
- 下方是项目表格

说明 Toggl 把 Projects 视为长期维护的数据对象，而不是一次性创建后就离开的表单页。

---

## 2. 新建入口：modal 先收最小必要信息

页面：

- 截图：`assets/toggl-projects-flow/02-new-project-modal-initial.png`
- 结构快照：`assets/toggl-projects-flow/02-new-project-modal-initial.snapshot.txt`

### 初始 modal 字段

点击 `New project` 后，弹出 `Create new project` modal。

我实际看到的字段/控件：

- `Project name`
- `PRIVACY` 开关
- `Private, visible only to project members`
- `Manage project members`
- 邀请成员输入框
- 成员角色选择（如 `Regular member`）
- `ADVANCED OPTIONS`
- `Create project`

### PRD 角度

这里的策略很明显：

- 先收 project 名称
- 再允许顺手设 privacy 和成员
- 高级配置折叠到 `ADVANCED OPTIONS`

也就是新建第一步偏“轻量创建”，不是一次把所有 project 属性全展开。

---

## 3. 校验：Project name 是硬性必填

页面：

- 截图：`assets/toggl-projects-flow/03-new-project-validation.png`
- 结构快照：`assets/toggl-projects-flow/03-new-project-validation.snapshot.txt`

### 实测结果

在不填名称的情况下尝试创建，界面出现：

- `Please enter a Project name`

### 产品含义

说明 `Project name` 是创建 project 的最小硬门槛。  
至少在第一层创建流程里，其他字段都不是比它更优先的阻塞条件。

---

## 4. 可提交状态：填名称后即可创建

页面：

- 截图：`assets/toggl-projects-flow/04-new-project-ready-to-create.png`
- 结构快照：`assets/toggl-projects-flow/04-new-project-ready-to-create.snapshot.txt`

### 我实际创建的项目

我填入的项目名是：

- `droid-research-project-20260325-1232`

随后提交创建。

### 观察

从这次流程看，创建 project 的最低实用条件就是：

1. 有 `Project name`
2. 其余成员/高级项可以保持默认

---

## 5. 创建后：新项目立刻回到列表中

页面：

- 截图：`assets/toggl-projects-flow/05-project-list-after-create.png`
- 结构快照：`assets/toggl-projects-flow/05-project-list-after-create.snapshot.txt`

### 列表中出现的新行

创建成功后，列表里出现一条新 row：

- project：`droid-research-project-20260325-1232`
- timeframe：`Mar 25`
- tracked time：`0 h`
- team：`CorrectRoad H`

### PRD 角度

这说明 Projects 创建完成后的默认回落页就是管理列表，方便用户继续：

- 看是否创建成功
- 打开 row menu 做后续动作
- 进入 project 详情/dashboard

---

## 6. Row menu：单个 project 的常见后续操作

页面：

- 截图：`assets/toggl-projects-flow/06-project-row-menu.png`
- 结构快照：`assets/toggl-projects-flow/06-project-row-menu.snapshot.txt`

### 实际看到的动作

新项目行菜单里，我实际看到：

- `Edit project`
- `Add member`
- `View in reports`
- `Archive`
- `Use as a template`
- `Delete`

### 产品含义

这几个动作基本覆盖了 project 的主要生命周期：

- 修改配置
- 补人员
- 跳到报表
- 归档
- 模板化复用
- 删除

也就是说，Projects 列表本身就是一个强操作入口，不只是纯浏览页。

---

## 7. Project dashboard：新项目默认是空数据分析态

页面：

- 路由：`/6296488/projects/218965311/dashboard`
- 截图：`assets/toggl-projects-flow/03-project-dashboard-existing-project.png`
- 结构快照：`assets/toggl-projects-flow/03-project-dashboard-existing-project.snapshot.txt`

### 页面结构

顶部：

- 面包屑返回 `Projects`
- 项目名与日期
- `Alerts`
- `Edit Project`
- tabs：`Dashboard` / `Tasks` / `Team`

主体：

- `Project time tracking forecast`
- `Total hours`
- `TOTAL HOURS`
- `BILLABLE HOURS`
- `BILLABLE AMOUNT`

对于新项目，多个卡片都显示：

- `No data… yet`
- `Start tracking time to see the graph.`

### PRD 角度

Project dashboard 不是配置页，而是一个项目经营/分析页。  
新项目刚创建时没有数据，所以默认呈现空分析状态，等待后续开始记时、分配任务、产生日志。

---

## 8. Edit Project：编辑入口仍然保持轻量

页面：

- 截图：`assets/toggl-projects-flow/07-edit-project-modal.png`
- 结构快照：`assets/toggl-projects-flow/07-edit-project-modal.snapshot.txt`

### 编辑 modal 里看到的内容

- `Edit Project`
- `Project name`（已预填）
- `PRIVACY`
- `Private, visible only to project members`
- `ADVANCED OPTIONS`
- `Save`
- `More options`

### 观察

编辑态延续了创建态的产品哲学：

- 默认只露出高频字段
- 更危险或更低频的动作放到 `More options`

---

## 9. 删除确认：先提醒“删除不可逆”，再提醒时间记录处理

页面：

- 截图：`assets/toggl-projects-flow/08-delete-project-confirmation.png`
- 结构快照：`assets/toggl-projects-flow/08-delete-project-confirmation.snapshot.txt`

### 第一步确认

点击删除后，先出现 `Delete Project` 确认层，明确提示：

- `This action cannot be reversed`
- 删除 project 会把它从已关联的 time entries 上移除
- 更推荐使用 `Archive instead`

按钮：

- `Archive instead`
- `Delete`
- `Cancel`

### PRD 角度

这一步把删除和归档清楚地区分开：

- archive = 保留历史、停止继续使用
- delete = 真正 destructive action

---

## 10. 第二步确认：还要处理关联 time entries

页面：

- 截图：`assets/toggl-projects-flow/09-delete-associated-time-entries-choice.png`
- 结构快照：`assets/toggl-projects-flow/09-delete-associated-time-entries-choice.snapshot.txt`

### 我实际看到的选项

第二层弹窗标题：

- `Delete associated time entries?`

选项：

- `Retain without assigned Project`
- `Delete time entries`

确认按钮会随选项变化为：

- `Retain time entries without Project`
- 或 `Delete associated time entries`

### 一个重要观察

在这次真实操作里，无论默认保留选项还是切到删除选项，最终确认按钮都保持 disabled。  
所以我只完成了“看到删除流程的风险分叉”，没有安全地把这个测试 project 删除掉。

更保守的结论是：

- Toggl 的删除流程是两步式的
- 第二步会显式要求处理 project 关联时间记录
- 但在本次会话里，最终确认没有进入可点击状态

---

## 11. 回答几个关键问题

## 11.1 “Projects 页一开始是什么形态？”

答：

- 是一个标准管理表
- 顶部直接给 `New project`
- 支持多维筛选
- 行级菜单可直接操作单个项目

## 11.2 “创建 project 时需要填什么？”

按这次实测，真正最小必填项是：

- `Project name`

其余如：

- privacy
- members
- advanced options

都可以先保持默认。

## 11.3 “创建后会进入哪里？”

答：

- 首先能在 Projects 列表里马上看到新 row
- 之后可以进入 dashboard
- dashboard 默认是空分析态，而不是继续让你填配置表单

## 11.4 “一个 project 后续还能做什么？”

当前实测明确可见的动作有：

- 编辑
- 添加成员
- 在报表中查看
- 归档
- 作为模板使用
- 删除

---

## 12. 最终产品判断

Toggl 的 Projects 更像一个“项目管理主对象”：

1. 用最小信息快速创建
2. 回到列表进行管理
3. 再进入 dashboard / team / tasks 扩展使用
4. 通过 archive / template / delete 管理生命周期

它不是重配置型 wizard，而是轻创建、强列表、强后续运营的产品结构。

补充记录：

- 本次真实创建的测试项目名为 `droid-research-project-20260325-1232`
- project id 为 `218965311`
- 删除流程走到了二次确认，但最终确认按钮始终 disabled，所以该测试项目目前仍保留在工作区中
