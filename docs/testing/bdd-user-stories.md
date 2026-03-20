# BDD User Stories For Testing

本文档把产品文档中的高价值用户故事整理成 BDD 风格验收场景，用作 page flow、e2e、integration、contract 与 regression 测试设计入口。

约束：

- 只写用户可观察行为，不写 API 路径、HTTP 方法或实现细节。
- 一个大故事表达用户目标。
- 每个 `Given / When / Then` 场景表达一个正常流、失败分支或 edge case。
- 具体由哪一层测试承接，由实现时再映射。

## Tracking

### 故事 1：用户管理运行中的计时

作为 workspace 用户，我希望启动、查看和停止计时，这样我可以持续记录工作时间，并在不同正式视图中看到一致结果。

- Given 用户当前没有运行中的计时
  When 用户启动一个新的计时
  Then 系统显示该计时处于运行中状态

- Given 用户已经有一个运行中的计时
  When 用户再次启动新的计时
  Then 系统按固定冲突规则处理
  And 不同入口对同一冲突给出一致结果

- Given 用户已经启动了一个计时
  When 用户在 `calendar`、`list`、`timesheet` 之间切换
  Then 每个视图都显示同一个运行中的计时

- Given 用户有一个运行中的计时
  When 用户停止该计时
  Then 系统生成一条正式的时间记录

- Given 用户提交的时间数据彼此不自洽
  When 用户尝试保存
  Then 系统拒绝该操作
  And 不会静默修正数据

- Given 某条历史时间记录关联了已归档项目或已停用成员
  When 用户查看历史记录
  Then 该历史记录仍然可见

### 故事 2：用户创建和修改时间记录

作为 workspace 用户，我希望创建和修改时间记录，这样我可以准确记录项目、任务、标签和计费信息，并在不同读面中得到一致结果。

- Given 用户填写了时间记录的主要信息
  When 用户保存该记录
  Then 系统保存该记录并在主要视图中显示一致结果

- Given 用户修改了一条已有时间记录
  When 修改保存成功
  Then 后续读取到的记录与最新修改一致

- Given 一条时间记录包含 `billable`、`rate` 或 `currency` 等会影响结果解释的字段
  When 用户在 tracking 或 reports 中查看该记录
  Then 系统对这些字段给出一致解释

- Given 用户提交了不合法的时间范围
  When 用户尝试保存
  Then 系统拒绝该操作

- Given 某些关联对象后续发生状态变化
  When 用户查看历史时间记录
  Then 系统不会静默改写该历史事实

### 故事 3：管理员处理审批状态

作为 workspace 管理员，我希望处理待审批记录，这样我可以控制审批状态并保持审批历史完整。

- Given 一条审批记录处于 `pending`
  When 管理员批准该记录
  Then 状态变为 `approved`

- Given 一条审批记录处于 `pending`
  When 管理员拒绝该记录
  Then 状态变为 `rejected`

- Given 一条审批记录已经 `approved` 或 `rejected`
  When 管理员按规则重新打开它
  Then 状态变为 `reopened`

- Given 普通成员尝试修改已批准的数据
  When 提交修改
  Then 系统拒绝该操作

- Given 管理员强制修改了已批准的数据
  When 修改生效
  Then 审批状态回到 `reopened`

- Given 某位审批者已经被停用
  When 用户查看审批历史
  Then 历史审批记录仍然可见
  And 该审批者不能继续产生新的审批动作

## Identity And Workspace

### 故事 4：用户登录并进入正确的工作区

作为已登录用户，我希望进入系统后看到正确的工作区与账户上下文，这样我可以继续工作而不需要重新建立状态。

- Given 用户已成功登录
  When 用户进入应用
  Then 系统显示当前用户信息和当前工作区上下文

- Given 用户已登录并处于某个工作区
  When 用户刷新页面
  Then 系统恢复同一会话和同一工作区上下文

- Given 用户未登录或会话已失效
  When 用户访问需要身份的页面
  Then 系统引导用户进入登录流程

- Given 用户被停用
  When 停用生效
  Then 用户不能继续登录或修改业务对象
  And 其历史业务事实仍然保留

- Given 用户被停用时存在运行中的计时
  When 停用生效
  Then 系统自动停止该计时
  And 用户恢复后该计时不会自动继续

### 故事 5：管理员管理工作区设置

作为 workspace 管理员，我希望修改工作区设置，这样我可以控制默认币种、默认费率、显示和品牌配置，并让这些设置影响正式产品行为。

- Given 管理员进入工作区设置页
  When 修改默认币种、默认费率、rounding 或显示策略
  Then 系统保存这些设置并在相关产品行为中生效

- Given 工作区设置会影响 tracking 和 reports
  When 用户后续查看时间记录或报表
  Then 系统按新的公开设置解释这些结果

- Given 管理员修改了 logo、avatar 或品牌资源
  When 保存成功
  Then 工作区在正式入口中展示更新后的品牌信息

- Given 非管理员尝试修改工作区设置
  When 提交修改
  Then 系统拒绝该操作

- Given 工作区或组织被停用或删除
  When 用户查看历史业务事实
  Then 历史业务事实不会因为容器状态变化而从报表中静默消失

## Membership And Access

### 故事 6：管理员管理成员生命周期

作为管理员，我希望邀请、移除、禁用和恢复成员，这样我可以控制谁能继续访问工作区及其资源。

- Given 管理员邀请一个新成员
  When 邀请发出后
  Then 该成员进入已邀请状态

- Given 一个已邀请成员完成加入
  When 加入成功
  Then 该成员进入已加入状态并获得对应角色能力

- Given 管理员禁用一个成员
  When 禁用生效
  Then 该成员不能继续产生新的业务变更
  And 其历史业务事实仍然保留

- Given 管理员恢复一个已禁用成员
  When 恢复生效
  Then 该成员重新获得当前应有的访问能力
  And 不会自动恢复禁用前被系统终止的运行中状态

- Given 管理员移除一个成员
  When 移除生效
  Then 该成员失去后续访问权限
  And 历史 time entries 与审计结果仍然保留

### 故事 7：成员权限影响私有项目、报表和事件可见性

作为系统中的成员或管理员，我希望权限变化能一致地影响项目、时间记录、报表和事件暴露，这样不同入口不会出现相互矛盾的可见性。

- Given 某个成员拥有某个私有项目的访问权
  When 该成员查看项目、创建时间记录或查看相关结果
  Then 系统允许其在授权范围内操作和查看

- Given 某个成员失去某个私有项目的访问权
  When 该成员再次读取相关内容
  Then 系统按当前权限裁剪其可见范围

- Given 某个成员曾经在该私有项目上产生历史 time entry
  When 其后续失去访问权
  Then 历史归属事实保持不变
  And 后续可见范围按当前权限重新裁剪

- Given 组织成员、工作区成员、项目成员三层关系发生冲突
  When 系统判断最终权限
  Then 以更窄的业务作用域规则优先生效

- Given 成员费率与成本设置已经生效
  When 用户查看 `billable`、`cost` 或 `profitability` 结果
  Then 系统基于同一套成员事实给出一致解释

## Reports And Sharing

### 故事 8：用户查看、保存和共享报表

作为用户，我希望在线查看、保存和共享报表，这样我可以复用查询定义，并把同一份结果以不同方式提供给其他人。

- Given 用户配置了一组报表筛选条件
  When 用户在线查看结果
  Then 系统按这组条件返回正式报表结果

- Given 用户保存了一个报表
  When 以后再次打开
  Then 系统按保存时的定义恢复该报表

- Given 用户共享了一个报表
  When 其他人通过共享入口查看
  Then 系统按该共享对象的权限和参数语义提供结果

- Given 用户导出一份报表
  When 导出完成
  Then 导出结果与在线查询表达的是同一组统计事实
  And 不会因为导出而切换成另一套语义

- Given `shared report`、`saved report` 和在线查询引用的是同一组参数
  When 用户分别查看这些结果
  Then 它们在权限和参数解释上保持一致

### 故事 9：历史对象变化后，报表仍保留历史事实

作为用户，我希望报表能稳定表达历史业务事实，这样对象被停用、删除或归档后，不会让历史结果被静默抹除。

- Given 某些项目、成员或其他业务对象后来被停用、删除或归档
  When 用户查看历史报表
  Then 报表继续统计这些历史事实

- Given 用户查看一段包含历史对象的数据范围
  When 报表生成结果
  Then 系统不会因为对象当前已失活而直接删除对应历史数据

- Given 某个共享报表的 owner 失活
  When 其他用户继续访问该共享对象
  Then 系统按固定规则处理该共享对象的可用性
  And 不会出现含糊不清的中间状态

## Importing

### 故事 10：用户导入 Toggl 数据

作为迁移到 OpenToggl 的用户，我希望导入 Toggl 导出数据，这样我可以继续使用原有数据、引用关系和主要视图。

- Given 用户上传了有效的导出样本
  When 导入完成
  Then 系统给出明确的成功反馈

- Given 导入过程中部分数据成功、部分数据失败
  When 导入结束
  Then 系统清楚区分成功与失败结果
  And 用户能理解失败原因

- Given 导入过程中发现冲突或重复数据
  When 导入继续执行
  Then 系统以固定规则处理冲突
  And 向用户展示冲突结果

- Given 导入失败但属于可恢复问题
  When 用户重新发起导入
  Then 系统允许重试
  And 用户能看到诊断信息

- Given 导入成功
  When 用户进入主要 tracking 或 reports 视图
  Then 导入的数据可以被正常读取

## Webhooks

### 故事 11：管理员管理 Webhook 订阅

作为 workspace 管理员，我希望创建、验证和维护 Webhook 订阅，这样我可以稳定接收工作区事件，并知道订阅当前是否健康。

- Given 管理员正在创建一个新的订阅
  When 管理员完成创建
  Then 系统保存该订阅并将其纳入工作区可管理对象

- Given 一个订阅已经存在
  When 管理员执行验证或 ping
  Then 系统返回与真实投递可区分的结果
  And 管理员能看出这次结果属于手动验证还是实际事件投递

- Given 某个订阅的目标端点暂时不可用
  When 系统尝试投递事件
  Then 系统按固定规则记录失败
  And 管理员能看到失败历史

- Given 一个订阅持续失败
  When 失败达到系统定义的阈值
  Then 系统按固定规则停用或标记该订阅异常

- Given 某个订阅原本有权限看到某类事件
  When 订阅 owner、workspace 权限或私有项目可见性发生变化
  Then 该订阅后续能看到的事件范围随之变化
  And 不会继续按旧权限暴露事件

- Given 工作区达到相关限制
  When 管理员继续创建或使用订阅
  Then 系统给出明确限制结果
  And 不会以静默失败代替正式反馈

### 故事 12：管理员查看和控制订阅健康状态

作为 workspace 管理员，我希望查看订阅的状态、失败尝试和健康诊断，这样我可以判断一个订阅是否还能安全使用。

- Given 工作区内存在多个订阅
  When 管理员进入订阅列表或状态页
  Then 每个订阅都展示其当前状态与可见的健康信息

- Given 某个订阅最近发生过多次失败
  When 管理员查看其历史
  Then 系统展示最近失败尝试和结果趋势

- Given 某个订阅已经被停用
  When 管理员查看该订阅
  Then 系统明确显示它已停用
  And 不把它显示成正常运行

- Given 管理员修复了订阅配置或目标端点
  When 管理员重新启用或重新验证该订阅
  Then 系统按正式流程重新纳入健康状态判断

## Billing And Subscription

### 故事 13：管理员管理套餐、订阅和配额

作为组织或工作区管理员，我希望查看当前套餐、订阅状态和配额使用情况，这样我可以知道当前能用什么能力，以及是否接近限制。

- Given 管理员进入 billing 或 subscription 页面
  When 页面加载完成
  Then 系统展示当前套餐、订阅状态和相关配额信息

- Given 某项能力受套餐限制
  When 用户尝试使用该能力
  Then 系统按统一规则拒绝或限制该行为
  And 不会在不同产品面给出彼此冲突的结果

- Given 组织与工作区都展示 subscription 相关信息
  When 管理员分别查看两个视角
  Then 两者表达的是同一份商业事实
  And 不会形成两套相互冲突的真相

- Given 套餐发生升级或降级
  When 变更生效
  Then 系统更新能力暴露与配额状态
  And 已有历史业务事实不会被静默删除

- Given 用户已经接近或达到配额上限
  When 用户继续创建受限对象或执行受限动作
  Then 系统给出明确限制反馈
  And 用户仍能查看已有历史对象

### 故事 14：管理员在降级后处理超限状态

作为管理员，我希望在套餐降级后知道超限对象如何处理，这样我可以继续管理已有数据，而不是让系统静默丢失历史事实。

- Given 工作区或组织发生套餐降级
  When 降级生效后存在超限对象
  Then 系统按固定规则处理这些对象

- Given 某些对象在降级前已经存在
  When 降级完成
  Then 这些历史对象不会被系统静默删除

- Given 某项新操作在降级后已不再允许
  When 用户继续尝试该操作
  Then 系统明确拒绝该操作
  And 拒绝结果与当前套餐状态一致

- Given 管理员查看限制或计划页面
  When 页面展示当前状态
  Then 管理员能够理解哪些能力仍可用、哪些能力受限、哪些对象属于历史超限对象

## Source Documents

- `docs/core/testing-strategy.md`
- `docs/core/product-definition.md`
- `docs/product/tracking.md`
- `docs/product/identity-and-tenant.md`
- `docs/product/membership-and-access.md`
- `docs/product/reports-and-sharing.md`
- `docs/product/Webhooks.md`
- `docs/product/billing-and-subscription.md`
- `docs/product/importing.md`
- `docs/product/instance-admin.md`
