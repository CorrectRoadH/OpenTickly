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

- Given 用户直接进入 `timer` 页面
  When 页面首次完成加载
  Then 默认显示 `calendar` 视图

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

### 故事 3A：管理员管理 projects、clients、tasks 和 tags 目录对象

作为 workspace 管理员或具备相应权限的成员，我希望管理 projects、clients、tasks 和 tags，这样 tracking、reports 和成员授权都能基于同一套目录事实工作。

- Given 用户进入 `project page`
  When 用户按状态、归档或 pinned 维度浏览项目
  Then 系统按同一套目录事实返回一致的列表结果

- Given 用户创建或修改一个 project、client、task 或 tag
  When 保存成功
  Then 该对象在对应目录页、相关选择器和后续 tracking 入口中保持一致可见

- Given 用户归档、恢复、pin 或 unpin 一个项目
  When 状态变更生效
  Then 目录页、详情入口和后续可操作范围按同一规则更新

- Given 某个 task 或 tag 通过 project page 或其他正式入口进入
  When 用户在不同入口之间切换
  Then 系统保持相同的对象归属、过滤条件和详情入口语义

- Given 用户缺少对应目录对象的管理权限
  When 用户尝试创建、修改或批量操作
  Then 系统拒绝该操作
  And 不会只靠隐藏按钮代替正式权限结果

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

### 故事 4A：用户管理账户资料、个人偏好与 API token

作为已登录用户，我希望管理自己的账户资料、个人偏好与 API token，这样我可以控制账户级身份信息和个人工作方式，而不把这些设置混入 workspace 配置。

- Given 用户进入 `profile`
  When 页面加载完成
  Then 系统展示当前用户资料、个人偏好和账户级安全入口

- Given 用户修改自己的姓名、邮箱、时区或其他账户资料
  When 保存成功
  Then 后续读取到的 profile 与 session bootstrap 中显示一致结果

- Given 用户修改日期格式、每周起始日或其他个人偏好
  When 保存成功
  Then 这些偏好在后续正式入口中按账户级语义生效

- Given 用户重置 API token
  When 重置完成
  Then 旧 token 不再可继续使用
  And 新 token 能作为正式账户凭证使用

- Given 用户提交了不合法或受保护的账户字段
  When 用户尝试保存
  Then 系统返回明确拒绝结果
  And 不会静默忽略或改写这些字段

### 故事 4B：用户主动退出并结束当前会话

作为已登录用户，我希望主动退出当前会话，这样我可以安全结束访问，并确保后续受保护页面不再继续使用旧会话。

- Given 用户当前处于已登录状态
  When 用户主动执行 logout
  Then 当前会话被正式失效

- Given 用户已经执行 logout
  When 用户再次访问需要身份的页面
  Then 系统引导用户回到登录流程

- Given 用户在多个页面或入口中持有当前会话的前端状态
  When logout 成功
  Then 与当前会话相关的可见状态被统一清理
  And 不会继续展示旧用户上下文

### 故事 5A：管理员管理 organization、workspace 与当前工作上下文

作为 organization 或 workspace 管理员，我希望管理 organization、workspace 及其当前上下文，这样我可以在同一实例中维护多个业务容器，并让用户进入正确的工作范围。

- Given 管理员创建一个 organization 或 workspace
  When 创建成功
  Then 新对象出现在正式入口中
  And 其上下级关系保持正确

- Given 管理员修改 organization 或 workspace 的公开信息
  When 保存成功
  Then 后续读取到的名称、品牌和上下文显示一致更新

- Given 用户有权访问多个 workspace
  When 用户切换当前 workspace
  Then 系统把后续页面和入口都切换到相同的工作上下文

- Given 某个 workspace 或 organization 被停用或删除
  When 用户后续查看当前上下文或历史业务事实
  Then 系统按固定规则处理当前访问能力
  And 不会静默抹掉历史业务事实

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

### 故事 6A：管理员管理成员费率与成本设置

作为管理员，我希望管理成员费率与成本设置，这样 billable、cost 和 profitability 等结果都能基于同一套成员事实计算。

- Given 管理员为某个成员设置费率或成本
  When 保存成功
  Then 后续 tracking、reports 和 profitability 结果按该设置解释

- Given 成员费率或成本发生变化
  When 用户查看后续新产生的数据
  Then 新结果使用当前有效设置
  And 已固定的历史结果不被静默改写

- Given 非管理员尝试修改成员费率或成本
  When 提交修改
  Then 系统拒绝该操作

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

### 故事 7A：管理员管理 groups 与成员归属

作为 workspace 管理员，我希望管理 groups 及其成员归属，这样我可以用正式的组语义驱动项目授权、可见性和后续批量管理，而不是靠临时名单维护。

- Given 管理员进入 group 管理页面
  When 页面加载完成
  Then 系统展示当前 workspace 下的 groups 及其状态

- Given 管理员创建、修改、停用或恢复一个 group
  When 变更生效
  Then 该 group 在正式入口中以一致状态可见

- Given 管理员调整某个 group 的成员归属
  When 保存成功
  Then 后续项目授权、可见范围和组管理页面都基于同一份 group 事实

- Given 某个 group 已被停用或不再具备授权
  When 用户查看相关项目、成员或历史结果
  Then 系统按固定规则处理后续访问能力
  And 不会静默改写历史事实

- Given 非管理员尝试管理 groups 或 group membership
  When 提交变更
  Then 系统拒绝该操作

### 故事 7B：管理员配置工作区权限策略

作为 workspace 管理员，我希望配置工作区权限策略，这样项目创建、标签创建、团队可见性和公开数据范围都能按正式策略一致执行。

- Given 管理员进入权限配置页
  When 页面加载完成
  Then 系统展示当前工作区的权限策略和其当前值

- Given 管理员修改“仅管理员可创建项目/标签”或“仅管理员可见团队面板”等策略
  When 保存成功
  Then 后续相关入口按新的策略表现一致结果

- Given 管理员修改公开项目数据范围或类似可见性策略
  When 变更生效
  Then 成员在目录页、tracking、reports 等入口中看到一致的权限结果

- Given 非管理员尝试修改工作区权限策略
  When 提交修改
  Then 系统拒绝该操作

- Given 某项策略已经影响到正式产品行为
  When 用户后续使用受影响入口
  Then 系统不会出现“页面文案一套、实际权限另一套”的冲突状态

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

### 故事 8A：用户在不同 reports 读面之间保持同一查询语义

作为用户，我希望在 `detailed`、`summary`、`weekly`、`trends`、`profitability` 和 `insights` 之间切换时保持同一查询语义，这样不同报表视角不会变成彼此矛盾的统计系统。

- Given 用户已经配置了一组筛选条件
  When 用户在不同 reports 读面之间切换
  Then 各读面共享同一组参数语义

- Given 某些统计受时区、rounding、rate 或 currency 影响
  When 用户分别查看不同 reports 读面
  Then 系统对这些统计口径给出一致解释

- Given 用户从某个 reports 读面进入导出、保存或共享
  When 后续重新查看结果
  Then 这些入口仍表达同一组查询事实

### 故事 8B：用户导出报表并复用同一查询定义

作为用户，我希望把当前报表导出为 CSV、PDF 或 XLSX，这样我可以复用在线查询定义，而不是得到另一套语义不同的离线结果。

- Given 用户当前正在查看一份报表
  When 用户导出 CSV、PDF 或 XLSX
  Then 导出结果沿用当前查询定义和权限范围

- Given 同一份报表可以被在线查看、保存、共享和导出
  When 用户分别使用这些入口
  Then 系统不会在参数解释、权限或统计口径上切换成另一套语义

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

### 故事 10A：用户查看导入任务状态、诊断信息并重试

作为执行迁移的用户，我希望查看导入任务状态、失败明细和诊断信息，并在可恢复时重试，这样我可以把导入过程作为正式产品流程管理，而不是依赖后台脚本猜测结果。

- Given 用户已经发起一个导入任务
  When 用户查看导入任务列表或详情
  Then 系统展示该任务的当前状态、进度和结果摘要

- Given 导入任务发生部分失败或冲突
  When 用户查看诊断页
  Then 系统清楚展示失败对象、冲突类型和可理解的原因

- Given 某类失败属于可恢复问题
  When 用户选择重试
  Then 系统按正式流程重新处理
  And 用户能区分新的执行结果与之前的失败结果

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

### 故事 13A：管理员管理 customer、invoice 与 payment 相关状态

作为组织或工作区管理员，我希望查看 customer、invoice 和 payment 相关状态，这样我可以理解当前商业关系和账单状态，而不需要切换到另一套外部管理系统才能解释产品行为。

- Given 管理员进入 billing 或 subscription 正式页面
  When 页面加载完成
  Then 系统展示 customer、invoice 和 payment 的相关公开状态

- Given 某张 invoice 处于待支付、已支付、失败或其他正式状态
  When 管理员查看账单记录
  Then 系统明确展示该状态
  And 不会把它混同为一般 subscription 文案

- Given customer 或 payment 状态发生变化
  When 变更生效
  Then 后续 billing、quota 与 feature exposure 入口看到一致的商业事实

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

## Instance Admin And Platform Operations

### 故事 15：站长完成首个管理员 bootstrap

作为 self-hosted 站长，我希望实例首次启动时创建首个管理员账号，这样我可以正式接管整个站点，而不是依赖数据库或命令行后门。

- Given 实例尚未完成 bootstrap
  When 站长进入首个管理员创建流程并提交有效信息
  Then 系统创建首个管理员并把实例标记为已完成 bootstrap

- Given 实例已经完成 bootstrap
  When 用户再次尝试执行首个管理员创建流程
  Then 系统明确阻止重复 bootstrap
  And 不会默默覆盖现有管理员

### 故事 16：站长管理注册策略与实例级用户治理

作为站长或平台管理员，我希望管理注册策略和实例级用户状态，这样我可以控制谁能进入实例，以及如何处理 abuse、合规或安全事件。

- Given 管理员修改开放注册、关闭注册或仅邀请注册策略
  When 变更生效
  Then 后续注册入口按新的实例策略表现一致结果

- Given 管理员查看实例级用户列表
  When 页面加载完成
  Then 系统展示用户状态、搜索过滤和高权限标记等实例级治理信息

- Given 管理员禁用或恢复某个实例级用户
  When 变更生效
  Then 用户后续访问能力按正式实例级规则变化

### 故事 17：站长管理实例级配置与 provider 状态

作为站长，我希望管理 SMTP、存储、支付、SSO 等实例级配置，这样整个站点能通过正式产品入口完成运作，而不是依赖环境变量和人工排障。

- Given 管理员进入实例级配置页
  When 页面加载完成
  Then 系统展示实例级 provider 与关键配置状态

- Given 管理员修改 SMTP、存储、支付或 SSO 等实例级配置
  When 保存成功
  Then 后续相关产品能力基于新的实例级配置运行

- Given 某个 provider 配置缺失、失效或处于异常状态
  When 管理员查看配置或诊断入口
  Then 系统给出正式可见的状态和诊断信息

### 故事 18：站长查看实例健康、维护状态与审计记录

作为站长或平台管理员，我希望查看实例健康、后台任务状态、维护模式和审计记录，这样我可以在不直接操作底层基础设施的情况下维护服务。

- Given 管理员进入实例健康或诊断入口
  When 页面加载完成
  Then 系统展示实例健康、后台 job 状态、关键统计和异步系统状态

- Given 管理员启用维护模式、只读模式或暂停后台任务
  When 状态切换成功
  Then 系统在正式入口中明确表达当前维护状态

- Given 管理员执行了高权限操作或配置变更
  When 用户查看审计入口
  Then 系统能查询到对应审计记录
  And 不把这些变化只留在底层日志中

## 覆盖对照

以下对照用于执行 `docs/core/testing-strategy.md` 中要求的两类映射：

- `BDD Story -> Test Coverage`
- `PRD -> Figma 节点或 fallback -> 页面实现 -> page flow/e2e`

状态定义：

- `已覆盖`：当前已能找到与故事或页面直接对应的主要测试证据链。
- `部分覆盖`：已有局部证据，但还没有形成 testing-strategy 要求的完整验收链。
- `缺失`：当前仓库内尚未找到能直接承接该故事或页面的正式测试证据。
- `已批准延期`：当前阶段不在本计划直接闭环，由已明确 owner 的下游计划承接，缺口需保持可见直到关闭。

### BDD Story -> Test Coverage

| 故事                                                          | 产品来源                                   | Domain / Unit                                                                                                                                                                                                                                            | Application Integration                                                                                                                            | Contract / Golden                                                                                                         | Frontend Feature / Page Flow                                                                                                                                                                                                                                                       | E2E / Real Runtime                                                                      | 当前状态 | 主要缺口                                                                                                                        |
| ------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 故事 1：用户管理运行中的计时                                  | `docs/product/tracking.md`                 | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | `apps/website/e2e/timer-page.real-runtime.spec.ts`                                      | 部分覆盖 | 已补 timer 开始/停止 real-runtime 链，但 timer page flow、running timer contract 与停止后生成 time entry 的更完整验收链仍未建立 |
| 故事 2：用户创建和修改时间记录                                | `docs/product/tracking.md`                 | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | time entry create/edit/filter/billable/rate 一致性尚无可回归证据                                                                |
| 故事 3：管理员处理审批状态                                    | `docs/product/tracking.md`                 | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | approvals 状态机、权限拒绝、reopened 语义尚未入测试基线                                                                         |
| 故事 3A：管理员管理 projects、clients、tasks 和 tags 目录对象 | `docs/product/tracking.md`                 | `apps/backend/internal/catalog/domain/project_test.go`、`apps/backend/internal/catalog/domain/project_access_test.go`                                                                                                                                    | `apps/backend/internal/catalog/application/catalog_objects_test.go`                                                                                | 缺失                                                                                                                      | `apps/website/src/pages/projects/__tests__/projects-page-flow.test.tsx`、`apps/website/src/pages/clients/__tests__/clients-page-flow.test.tsx`、`apps/website/src/pages/tasks/__tests__/tasks-page-flow.test.tsx`、`apps/website/src/pages/tags/__tests__/tags-page-flow.test.tsx` | 缺失                                                                                    | 部分覆盖 | 已有 page flow 和局部 catalog backend 规则，但缺少 contract、e2e 以及更完整的目录对象生命周期覆盖                               |
| 故事 4：用户登录并进入正确的工作区                            | `docs/product/identity-and-tenant.md`      | `apps/backend/internal/identity/domain/user_test.go`                                                                                                                                                                                                     | `apps/backend/internal/identity/application/identity_sessions_test.go`                                                                             | `apps/backend/internal/http/web_routes_test.go`、`apps/backend/internal/identity/transport/http/web/handler_test.go`      | `apps/website/src/pages/auth/__tests__/auth-page-flow.test.tsx`、`apps/website/src/pages/shell/__tests__/workspace-shell-page-flow.test.tsx`                                                                                                                                       | `apps/website/e2e/app-shell.spec.ts`、`apps/website/e2e/app-shell.real-runtime.spec.ts` | 已覆盖   | logout 正式链路仍未单独纳入本故事的 page flow / real-runtime 证据                                                               |
| 故事 4A：用户管理账户资料、个人偏好与 API token               | `docs/product/identity-and-tenant.md`      | `apps/backend/internal/identity/domain/user_test.go`                                                                                                                                                                                                     | `apps/backend/internal/identity/application/identity_sessions_test.go`                                                                             | `apps/backend/internal/http/web_routes_test.go`、`apps/backend/internal/identity/transport/http/web/handler_test.go`      | `apps/website/src/pages/profile/__tests__/profile-page-flow.test.tsx`                                                                                                                                                                                                              | 当前仅被 `apps/website/e2e/app-shell.real-runtime.spec.ts` 间接覆盖                     | 部分覆盖 | profile 已有主要故事承接，但缺少独立 e2e 与更明确的账户级验证链                                                                 |
| 故事 4B：用户主动退出并结束当前会话                           | `docs/product/identity-and-tenant.md`      | 缺失                                                                                                                                                                                                                                                     | `apps/backend/internal/identity/application/identity_sessions_test.go`                                                                             | `apps/backend/internal/identity/transport/http/web/handler_test.go`                                                       | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 部分覆盖 | backend 已覆盖 logout 语义，但正式 page flow / e2e 仍缺                                                                         |
| 故事 5A：管理员管理 organization、workspace 与当前工作上下文  | `docs/product/identity-and-tenant.md`      | `apps/backend/internal/tenant/domain/workspace_settings_test.go`                                                                                                                                                                                         | `apps/backend/internal/tenant/application/organizations_and_workspaces_test.go`                                                                    | `apps/backend/internal/http/web_routes_test.go`、`apps/backend/internal/http/web_organization_settings_generated_test.go` | `apps/website/src/pages/shell/__tests__/workspace-shell-page-flow.test.tsx`                                                                                                                                                                                                        | `apps/website/e2e/app-shell.spec.ts`、`apps/website/e2e/app-shell.real-runtime.spec.ts` | 部分覆盖 | shell 已证明 workspace 切换，但 organization/workspace 完整生命周期和页面链仍不完整                                             |
| 故事 5：管理员管理工作区设置                                  | `docs/product/identity-and-tenant.md`      | `apps/backend/internal/tenant/domain/workspace_settings_test.go`                                                                                                                                                                                         | `apps/backend/internal/tenant/application/organizations_and_workspaces_test.go`、`apps/backend/internal/billing/application/billing_facts_test.go` | `apps/backend/internal/http/web_routes_test.go`、`apps/backend/internal/http/web_organization_settings_generated_test.go` | `apps/website/src/pages/settings/__tests__/settings-page-flow.test.tsx`                                                                                                                                                                                                            | 当前仅被 `apps/website/e2e/app-shell.real-runtime.spec.ts` 间接覆盖                     | 部分覆盖 | 缺少独立 settings e2e；brand asset、组织/工作区停用后的历史事实链路仍未覆盖                                                     |
| 故事 6：管理员管理成员生命周期                                | `docs/product/membership-and-access.md`    | `apps/backend/internal/membership/domain/workspace_member_test.go`                                                                                                                                                                                       | `apps/backend/internal/membership/application/workspace_members_test.go`                                                                           | 缺失                                                                                                                      | `apps/website/src/pages/members/__tests__/workspace-members-page-flow.test.tsx`                                                                                                                                                                                                    | 缺失                                                                                    | 部分覆盖 | 邀请/加入/禁用/恢复/移除缺少 contract 与 e2e；当前 page flow 只覆盖列表与邀请入口                                               |
| 故事 6A：管理员管理成员费率与成本设置                         | `docs/product/membership-and-access.md`    | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | story 已补，但当前仓库还没有 rate/cost 对应测试落点                                                                             |
| 故事 7：成员权限影响私有项目、报表和事件可见性                | `docs/product/membership-and-access.md`    | `apps/backend/internal/catalog/domain/project_access_test.go`                                                                                                                                                                                            | `apps/backend/internal/catalog/application/catalog_objects_test.go`                                                                                | 缺失                                                                                                                      | `apps/website/src/pages/projects/__tests__/projects-page-flow.test.tsx`、`apps/website/src/pages/permission-config/__tests__/permission-config-page-flow.test.tsx`                                                                                                                 | 缺失                                                                                    | 部分覆盖 | 现有测试只覆盖项目访问与权限配置局部；reports / webhooks 可见性联动尚无证据                                                     |
| 故事 7A：管理员管理 groups 与成员归属                         | `docs/product/membership-and-access.md`    | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | `apps/website/src/pages/groups/__tests__/groups-page-flow.test.tsx`                                                                                                                                                                                                                | 缺失                                                                                    | 部分覆盖 | 已补故事，但当前实现与 page flow 仍明确是过渡态，backend/contract/e2e 均缺                                                      |
| 故事 7B：管理员配置工作区权限策略                             | `docs/product/membership-and-access.md`    | 缺失                                                                                                                                                                                                                                                     | `apps/backend/internal/http/web_workspace_permissions_flow_test.go`                                                                                | 缺失                                                                                                                      | `apps/website/src/pages/permission-config/__tests__/permission-config-page-flow.test.tsx`                                                                                                                                                                                          | `apps/website/e2e/permission-config.real-runtime.spec.ts`                               | 部分覆盖 | 已补后端路由集成与 real-runtime 保存/重载链，但 transport contract 与更细权限规则仍未闭环                                       |
| 故事 8：用户查看、保存和共享报表                              | `docs/product/reports-and-sharing.md`      | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | 报表页面、保存报表、共享报表、导出一致性均未落到测试                                                                            |
| 故事 8A：用户在不同 reports 读面之间保持同一查询语义          | `docs/product/reports-and-sharing.md`      | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | detailed / summary / weekly / trends / profitability / insights 的统一查询语义尚无测试                                          |
| 故事 8B：用户导出报表并复用同一查询定义                       | `docs/product/reports-and-sharing.md`      | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | exports 与在线查询同语义的验收链尚未建立                                                                                        |
| 故事 9：历史对象变化后，报表仍保留历史事实                    | `docs/product/reports-and-sharing.md`      | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | 历史对象失活后的 reports 事实保留尚无测试                                                                                       |
| 故事 10：用户导入 Toggl 数据                                  | `docs/product/importing.md`                | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | import 成功、部分失败、冲突与重试链路尚无测试                                                                                   |
| 故事 10A：用户查看导入任务状态、诊断信息并重试                | `docs/product/importing.md`                | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | import 任务列表、诊断页和重试正式流仍无测试                                                                                     |
| 故事 11：管理员管理 Webhook 订阅                              | `docs/product/Webhooks.md`                 | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | subscription create / validate / ping / permission drift 均未覆盖                                                               |
| 故事 12：管理员查看和控制订阅健康状态                         | `docs/product/Webhooks.md`                 | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | 状态页、失败历史、重新启用语义尚未进入测试                                                                                      |
| 故事 13：管理员管理套餐、订阅和配额                           | `docs/product/billing-and-subscription.md` | `apps/backend/internal/billing/domain/subscription_test.go`、`apps/backend/internal/billing/domain/quota_window_test.go`、`apps/backend/internal/billing/domain/feature_gate_test.go`、`apps/backend/internal/billing/domain/commercial_account_test.go` | `apps/backend/internal/billing/application/billing_facts_test.go`                                                                                  | `apps/backend/internal/bootstrap/web_runtime_capabilities_quota_test.go`                                                  | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 部分覆盖 | billing 页面和 capability/quota 的 Web 验收链缺失；当前以 backend 规则为主                                                      |
| 故事 13A：管理员管理 customer、invoice 与 payment 相关状态    | `docs/product/billing-and-subscription.md` | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | customer / invoice / payment 的正式故事已补，但当前测试落点为空                                                                 |
| 故事 14：管理员在降级后处理超限状态                           | `docs/product/billing-and-subscription.md` | `apps/backend/internal/billing/domain/subscription_test.go`、`apps/backend/internal/billing/domain/feature_gate_test.go`                                                                                                                                 | `apps/backend/internal/billing/application/billing_facts_test.go`                                                                                  | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 部分覆盖 | 降级后超限对象处理与管理页面反馈尚无正式页面或 e2e 证据                                                                         |
| 故事 15：站长完成首个管理员 bootstrap                         | `docs/product/instance-admin.md`           | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | instance-admin 产品面当前在测试层仍是整块空白                                                                                   |
| 故事 16：站长管理注册策略与实例级用户治理                     | `docs/product/instance-admin.md`           | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | 注册策略、实例级用户治理尚无测试入口                                                                                            |
| 故事 17：站长管理实例级配置与 provider 状态                   | `docs/product/instance-admin.md`           | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | 实例级配置和 provider 状态尚无测试入口                                                                                          |
| 故事 18：站长查看实例健康、维护状态与审计记录                 | `docs/product/instance-admin.md`           | 缺失                                                                                                                                                                                                                                                     | 缺失                                                                                                                                               | 缺失                                                                                                                      | 缺失                                                                                                                                                                                                                                                                               | 缺失                                                                                    | 缺失     | 健康、维护模式、审计和后台任务状态尚无测试入口                                                                                  |

### Stage 2 Active Plan Coverage Snapshot

此处只列 Stage 2 active foundation 计划直接关联的故事，并把 `docs/core/testing-strategy.md` 要求的主要层级显式对齐。

`Y` = 已有主要证据，`P` = 部分覆盖，`N` = 缺失，`D` = 已批准延期且有 owner。

| 故事                                   | Stage 2 主责任计划                                                                  | Domain Unit | Application Integration | Transport Contract | Async Runtime | Frontend Feature | Frontend Page Flow | E2E / Real Runtime | Public Contract Golden | 当前状态   | 说明                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------- | ----------- | ----------------------- | ------------------ | ------------- | ---------------- | ------------------ | ------------------ | ---------------------- | ---------- | ------------------------------------------------------------------------------------------------- |
| `4` 登录并进入工作区                   | `foundation/identity-session-tenant-and-billing-foundation`                         | Y           | Y                       | Y                  | N             | P                | Y                  | Y                  | N                      | 已覆盖     | 已有 auth/shell page flow 和 app-shell e2e 链                                                     |
| `4A` 账户资料/偏好/API token           | `foundation/identity-session-tenant-and-billing-foundation`                         | Y           | Y                       | Y                  | N             | P                | Y                  | P                  | N                      | 部分覆盖   | 缺独立 profile e2e                                                                                |
| `4B` logout 与会话结束                 | `foundation/one-way-structure-governance`                                           | N           | Y                       | Y                  | N             | N                | N                  | N                  | N                      | 部分覆盖   | 仅 backend/contract 局部覆盖；页面链路缺失                                                        |
| `5A` organization/workspace 上下文管理 | `foundation/identity-session-tenant-and-billing-foundation`                         | P           | Y                       | Y                  | N             | P                | Y                  | P                  | N                      | 部分覆盖   | 生命周期与独立 e2e 仍不完整                                                                       |
| `5` 工作区设置                         | `foundation/identity-session-tenant-and-billing-foundation`                         | P           | Y                       | Y                  | N             | P                | Y                  | P                  | N                      | 部分覆盖   | settings 独立 e2e、品牌与历史事实链仍缺                                                           |
| `13` 套餐/订阅/配额                    | `foundation/identity-session-tenant-and-billing-foundation`                         | Y           | Y                       | P                  | N             | N                | N                  | N                  | N                      | 部分覆盖   | backend 规则较完整，但 Web page-flow/e2e 缺失                                                     |
| `14` 降级与超限处理                    | `foundation/identity-session-tenant-and-billing-foundation`                         | Y           | Y                       | N                  | N             | N                | N                  | N                  | N                      | 部分覆盖   | 降级后 UI 与 e2e 证据缺失                                                                         |
| `3A` catalog 对象管理                  | `foundation/one-way-structure-governance` + `product/membership-access-and-catalog` | P           | P                       | N                  | N             | P                | Y                  | N                  | N                      | 部分覆盖   | 已有 projects/clients/tasks/tags page flow，缺 e2e/contract                                       |
| `7` 权限影响可见性                     | `foundation/one-way-structure-governance` + `product/membership-access-and-catalog` | P           | P                       | N                  | N             | P                | P                  | N                  | N                      | 部分覆盖   | reports/webhooks 可见性联动证据缺                                                                 |
| `7A` groups 与成员归属                 | `foundation/one-way-structure-governance` + `product/membership-access-and-catalog` | N           | N                       | N                  | N             | P                | Y                  | N                  | N                      | 部分覆盖   | page flow 仍是过渡态，backend/contract/e2e 缺失                                                   |
| `7B` 权限策略配置                      | `foundation/one-way-structure-governance` + `product/membership-access-and-catalog` | N           | Y                       | N                  | N             | P                | Y                  | Y                  | N                      | 部分覆盖   | 已有 backend 路由集成与 direct real-runtime 保存/重载链，但 transport contract 与更细权限规则仍缺 |
| `15-18` instance-admin                 | `product/instance-admin-and-platform-operations`                                    | N           | N                       | N                  | N             | N                | N                  | N                  | N                      | 已批准延期 | Stage 2 foundation 只交付运行时 gate，不闭环平台产品故事                                          |

### 正式页面族对照

| 页面族                                            | PRD 来源                                | Figma / fallback 来源                                                                                                                                                                                                                              | 当前实现页面                                                                                                                | Page Flow 证据                                                                            | E2E / Real Runtime 证据                                                                 | 当前状态 | 备注                                                                                                                                                                                                                                        |
| ------------------------------------------------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Timer 页面族（`calendar` / `list` / `timesheet`） | `docs/product/tracking.md`              | Figma `timer calendar mode` node `8:3029`、`timer listview` node `12:2948`、`timer timesheet mode` node `10:13202`；Screenshots `toggl-timer-calendar-view-week.png`、`toggl-timer-list-view-all-dates.png`、`toggl-timer-timesheet-view-week.png` | `apps/website/src/pages/shell/WorkspaceTimerPage.tsx`                                                                       | 缺失                                                                                      | `apps/website/e2e/timer-page.real-runtime.spec.ts`                                      | 部分覆盖 | 已建立正式 timer 页面入口、页内 view 切换和开始/停止 real-runtime 链，但 page flow / 截图证据链仍未闭环，继续保持红灯直到 [tracking-core-transactions.md](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/tracking-core-transactions.md) 关闭 |
| Auth                                              | `docs/product/identity-and-tenant.md`   | 当前未在 PRD 中记录独立 Figma 节点                                                                                                                                                                                                                 | `apps/website/src/pages/auth/AuthPage.tsx`                                                                                  | `apps/website/src/pages/auth/__tests__/auth-page-flow.test.tsx`                           | `apps/website/e2e/app-shell.spec.ts`、`apps/website/e2e/app-shell.real-runtime.spec.ts` | 部分覆盖 | register/login 可回归；logout 尚未形成正式证据链                                                                                                                                                                                            |
| Shared App Shell                                  | `docs/product/tracking.md`              | Figma `left nav`，node `8:2829`                                                                                                                                                                                                                    | `apps/website/src/pages/shell/WorkspaceOverviewPage.tsx`                                                                    | `apps/website/src/pages/shell/__tests__/workspace-shell-page-flow.test.tsx`               | `apps/website/e2e/app-shell.spec.ts`、`apps/website/e2e/app-shell.real-runtime.spec.ts` | 已覆盖   | 截图证据仍缺，见计划中的 Wave 1.5 备注                                                                                                                                                                                                      |
| Profile                                           | `docs/product/identity-and-tenant.md`   | Figma `profile`，node `10:14814`                                                                                                                                                                                                                   | `apps/website/src/pages/profile/ProfilePage.tsx`                                                                            | `apps/website/src/pages/profile/__tests__/profile-page-flow.test.tsx`                     | 当前仅被 `apps/website/e2e/app-shell.real-runtime.spec.ts` 间接覆盖                     | 部分覆盖 | 缺少独立 profile e2e 与截图证据                                                                                                                                                                                                             |
| Settings                                          | `docs/product/identity-and-tenant.md`   | Figma `settings`，node `11:3680`                                                                                                                                                                                                                   | `apps/website/src/pages/settings/WorkspaceSettingsPage.tsx`、`apps/website/src/pages/settings/OrganizationSettingsPage.tsx` | `apps/website/src/pages/settings/__tests__/settings-page-flow.test.tsx`                   | 当前仅被 `apps/website/e2e/app-shell.real-runtime.spec.ts` 间接覆盖                     | 部分覆盖 | 缺少独立 settings e2e 与截图证据                                                                                                                                                                                                            |
| Projects                                          | `docs/product/tracking.md`              | Figma `project list`，node `10:20028`；Screenshot `toggl-projects-list.png`                                                                                                                                                                        | `apps/website/src/pages/projects/ProjectsPage.tsx`、`apps/website/src/pages/projects/ProjectDetailPage.tsx`                 | `apps/website/src/pages/projects/__tests__/projects-page-flow.test.tsx`                   | 缺失                                                                                    | 部分覆盖 | 已有 page flow，但计划已明确缺 filters、archive/pin 之外的正式产品面对齐与 e2e                                                                                                                                                              |
| Clients                                           | `docs/product/tracking.md`              | Figma `client`，node `12:3281`                                                                                                                                                                                                                     | `apps/website/src/pages/clients/ClientsPage.tsx`、`apps/website/src/pages/clients/ClientDetailPage.tsx`                     | `apps/website/src/pages/clients/__tests__/clients-page-flow.test.tsx`                     | 缺失                                                                                    | 部分覆盖 | 当前无独立截图；缺少 e2e 与更完整的正式能力覆盖                                                                                                                                                                                             |
| Tasks                                             | `docs/product/tracking.md`              | 以 `project page` 作为 fallback 骨架；`docs/product/tracking.md` 已明确不得另起 placeholder 页面族                                                                                                                                                 | `apps/website/src/pages/tasks/TasksPage.tsx`                                                                                | `apps/website/src/pages/tasks/__tests__/tasks-page-flow.test.tsx`                         | 缺失                                                                                    | 部分覆盖 | 已覆盖 URL state 与 workspace switch，但无独立 Figma 节点与 e2e                                                                                                                                                                             |
| Tags                                              | `docs/product/tracking.md`              | 以 `project page` 作为 fallback 骨架；当前无独立 Figma node / screenshot                                                                                                                                                                           | `apps/website/src/pages/tags/TagsPage.tsx`、`apps/website/src/pages/tags/TagDetailPage.tsx`                                 | `apps/website/src/pages/tags/__tests__/tags-page-flow.test.tsx`                           | 缺失                                                                                    | 部分覆盖 | 缺少 e2e；当前仍需后续补独立视觉对齐来源时再细化                                                                                                                                                                                            |
| Workspace Members                                 | `docs/product/membership-and-access.md` | 计划当前只允许复用 left nav 共享壳层；专属 Figma 或明确 fallback 尚未补齐                                                                                                                                                                          | `apps/website/src/pages/members/WorkspaceMembersPage.tsx`                                                                   | `apps/website/src/pages/members/__tests__/workspace-members-page-flow.test.tsx`           | 缺失                                                                                    | 部分覆盖 | 当前 page flow 只证明列表与邀请入口；页面来源文档仍需补齐                                                                                                                                                                                   |
| Groups                                            | `docs/product/membership-and-access.md` | 计划当前只允许复用 left nav 共享壳层；专属 Figma 或明确 fallback 尚未补齐                                                                                                                                                                          | `apps/website/src/pages/groups/GroupsPage.tsx`                                                                              | `apps/website/src/pages/groups/__tests__/groups-page-flow.test.tsx`                       | 缺失                                                                                    | 部分覆盖 | 当前实现与测试都明确标注仍是过渡态，不能当作正式完成证据                                                                                                                                                                                    |
| Permission Config                                 | `docs/product/membership-and-access.md` | 计划当前只允许复用 left nav 共享壳层；专属 Figma 或明确 fallback 尚未补齐                                                                                                                                                                          | `apps/website/src/pages/permission-config/PermissionConfigPage.tsx`                                                         | `apps/website/src/pages/permission-config/__tests__/permission-config-page-flow.test.tsx` | `apps/website/e2e/permission-config.real-runtime.spec.ts`                               | 部分覆盖 | 已补直接 real-runtime 保存/重载验证，但页面来源与 transport contract 证据仍不完整                                                                                                                                                           |
| Integrations Webhooks                             | `docs/product/Webhooks.md`              | 当前产品文档未沉淀独立 Figma 节点，暂以 PRD + openapi/toggl-webhooks-v1.swagger.json 作为 fallback 设计来源                                                                                                                                        | 当前未建立正式 `integrations webhooks` 页面族映射                                                                           | 缺失                                                                                      | 缺失                                                                                    | 缺失     | testing-strategy 要求的正式页面族之一，需在 [webhooks-runtime.md](/Users/opentoggl-ci/Code/opentoggl/docs/plan/product/webhooks-runtime.md) 建立 page-flow/E2E 证据                                                                                |

### 当前优先缺口

- Tracking 故事 1-3 仍是整块缺失；这直接对应 testing-strategy 中要求的 `timer` 页面族 page flow 与核心 e2e 缺口。
- Reports、Importing、Webhooks 的故事 8-12 当前没有正式测试映射，后续进入对应 Wave 前必须先补故事到测试层级的落点。
- Billing 故事 13-14 当前只有 backend 规则与局部 contract 证据，仍缺正式页面与 e2e。
- Wave 2 页面族里，`projects/clients/tasks/tags/members/groups` 仍基本停在“有 page flow，但没有完整 page flow + e2e + Figma/fallback 证据链”的状态；`permission-config` 已补 direct real-runtime E2E，但 transport contract 与页面来源链仍未闭环。

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
