# Toggl Invoices 用户流程拆解

这份笔记按真实界面流程拆解 Invoices：

- blank state 长什么样
- 从哪里开始创建
- 创建页每一步要填什么
- 保存后“有一张 invoice”时页面变成什么样
- invoice 列表页还能对这一张 invoice 做什么

同时我把每一步的截图和结构快照都保存到了：

- `docs/research/assets/toggl-invoices-flow/`

---

## 1. Blank state：还没有任何 invoice

页面：

- 路由：`/invoice`
- 截图：`assets/toggl-invoices-flow/01-invoices-blank-state.png`
- 结构快照：`assets/toggl-invoices-flow/01-invoices-blank-state.snapshot.txt`

### 页面结构

顶部主操作只有两个：

- `Connect QuickBooks`
- `Create invoice from reports`

主体不是空表格，而是一个 onboarding 空状态，明确把用户引到 3 步：

1. `Track time`
2. `Create invoice`
3. `View/edit invoice`

### PRD 角度

这个 blank state 的产品意图非常清楚：

- Invoices 不是 standalone 手工系统
- 它依赖先有 time data
- 创建入口被明确绑到 Reports summary

也就是说，Toggl 把 invoice 当成 report 的下游产物，而不是独立先录入的业务对象。

---

## 2. 创建入口：从 Reports Summary 进入

页面：

- 截图：`assets/toggl-invoices-flow/02-reports-summary-create-entry.png`
- 结构快照：`assets/toggl-invoices-flow/02-reports-summary-create-entry.snapshot.txt`

### 页面结构

在 Reports Summary 顶部工具栏里可以直接看到：

- `Create invoice`

也就是：

- Invoices 页 blank state 的 CTA
- Reports 页工具栏的快捷动作

最终都汇合到同一个创建流程。

### PRD 角度

这说明产品并不鼓励用户“脱离报表上下文”去开票。  
更自然的用户路径是：

1. 先在 Reports 里看 period / filters / summary
2. 确认这次要开票的数据范围
3. 直接点 `Create invoice`

---

## 3. 初始创建页：默认带入 summary 数据，但还不能保存

页面：

- 路由：`/invoice/summary`
- 截图：`assets/toggl-invoices-flow/03-invoice-editor-initial.png`
- 结构快照：`assets/toggl-invoices-flow/03-invoice-editor-initial.snapshot.txt`

### 我实际看到的字段

顶部：

- `Invoice ID`
- `Invoice Date`
- `Due date`
- `Purchase order`
- `Payment terms`
- `Add logo`

主体：

- `Billed to`
- `Pay to`
- `SET CURRENCY`
- line items 表格：
  - `DESCRIPTION`
  - `QUANTITY`
  - `AMOUNT`
- `Add custom charge`
- `Add tax`
- 自定义 message / payment details 文本区

### 初始状态细节

初始进入时：

- `Invoice ID` 为空
- 已经带入一条 report-derived line item：
  - description = `Without project`
  - quantity = `0.58`
  - amount = `0`
- `Save` 是 disabled

### PRD 角度

这一步不是空白表单，而是：

- 报表数据先自动变成 invoice draft
- 用户再补 business-facing 字段

所以它的模型更像：

- report-to-invoice transform

而不是：

- blank invoice composer

---

## 4. 保存前状态：补齐关键内容后才可保存

页面：

- 截图：`assets/toggl-invoices-flow/04-invoice-editor-ready-to-save.png`
- 结构快照：`assets/toggl-invoices-flow/04-invoice-editor-ready-to-save.snapshot.txt`

### 我实际填写/触发的内容

我做了这些操作：

- `Invoice ID` 填：`INV-RESEARCH-001`
- `Billed to` 填了演示地址
- `Pay to` 填了演示地址
- 点击 `Add custom charge`

点击 `Add custom charge` 后，界面新增一条 line item：

- description
- quantity = `1`
- amount = `10`

同时：

- `SUBTOTAL` 变成 `10.00 USD`
- `TOTAL` 变成 `10.00 USD`
- `Save` 从 disabled 变成 enabled

### 目前能确定的“保存门槛”

从这次真实操作看，至少有两个实用门槛：

1. 需要 `Invoice ID`
2. 需要 invoice total 不是 `0`

我没有把所有组合都穷举完，所以更保守的说法是：

- 实测下，只有 invoice ID 还不够
- 当总额变成正数后，`Save` 才可用

### 产品含义

这说明 Toggl 不会让用户保存一张“没有编号、也没有金额”的 invoice。  
它更偏向真正可交付给客户/财务系统的 draft。

---

## 5. 保存后：Invoices 列表从 blank state 变成数据表

页面：

- 截图：`assets/toggl-invoices-flow/05-invoices-list-with-one-invoice.png`
- 结构快照：`assets/toggl-invoices-flow/05-invoices-list-with-one-invoice.snapshot.txt`

### 保存后页面结构

回到 `/invoice` 后，blank state 消失，变成列表页。

表头：

- `ID`
- `INVOICE DATE`
- `DUE DATE`
- `BILLED TO`
- `TOTAL`

刚创建出的那张 invoice 展示为一行：

- `INV-RESEARCH-001`
- `03/25/2026`
- `03/25/2026`
- `Acme Corp, Attn: Finance, 123 Demo Street`
- `10.00 USD`

### PRD 角度

Invoices 首页有两种非常明确的模式：

- 没有数据：onboarding empty state
- 有数据：管理列表

这两个状态切换得很干净，没有中间态杂质。

---

## 6. “有一张 invoice”时，列表页能做什么

页面：

- 截图：`assets/toggl-invoices-flow/06-invoice-row-menu.png`
- 结构快照：`assets/toggl-invoices-flow/06-invoice-row-menu.snapshot.txt`

### 行菜单动作

这一张 invoice 的 overflow 菜单里，我实际看到：

- `Download`
- `Duplicate`
- `Send to QuickBooks`（disabled）
- `Delete`

### 对用户意味着什么

在 Invoices 列表页，至少可以把一张 invoice 当成一个“已生成文档对象”来做这些处理：

- 下载
- 复制成新草稿
- 发到 QuickBooks（前提是已连接）
- 删除

### 一个额外观察

我没有在列表里观察到特别明确的“点击整行进入详情页”行为。  
当前更清楚、可见的操作入口就是右侧 menu。

---

## 7. Duplicate 行为：会回到预填好的 editor

页面：

- 截图：`assets/toggl-invoices-flow/07-invoice-duplicate-editor.png`
- 结构快照：`assets/toggl-invoices-flow/07-invoice-duplicate-editor.snapshot.txt`

### Duplicate 后发生什么

点击 `Duplicate` 后，会回到 `/invoice/summary` 编辑页，而且原 invoice 内容会被预填进来：

- `Invoice ID`
- 日期
- 地址
- currency
- line items
- subtotal / total

这说明 `Duplicate` 不是后台静默直接复制出一张新单子，而是：

- 先把旧 invoice 内容铺回 editor
- 让用户再改
- 再决定是否保存

### 我还观察到一个保护机制

当 duplicate editor 里有改动、又想离开时，页面会弹：

- `Unsaved changes`
- `Discard changes`
- `Save changes`

也就是说，invoice editor 有标准的 unsaved-changes 防呆。

---

## 8. 回答你最关心的几个问题

## 8.1 “开始时候 blank 页面是什么样？”

答：

- 不是只有一句空文案
- 是一个 onboarding 式空状态
- 明确告诉你：
  - 先 track time
  - 再去 reports create invoice
  - 最后回到这里 view/edit

## 8.2 “创建时每一步需要填什么？”

按这次真实流程，用户会接触到这些字段：

- `Invoice ID`
- `Invoice Date`
- `Due date`
- `Purchase order`
- `Payment terms`
- `Billed to`
- `Pay to`
- `Currency`
- line items
- custom charge
- tax
- custom message / payment details

其中按这次实测，真正影响能不能保存的关键项至少是：

- 要有 `Invoice ID`
- 要有非零 total

## 8.3 “有了一张 invoice 之后是什么样？”

答：

- `/invoice` 会从空状态切到列表表格
- 新 invoice 成为一行数据
- 能继续：
  - Download
  - Duplicate
  - Delete
  - Send to QuickBooks（连接后）

## 8.4 “invoice 页面可以对这一面怎么处理？”

当前实测能做的页面级动作主要是：

- `Connect QuickBooks`
- `Create invoice from reports`

对单张 invoice 的行级动作是：

- `Download`
- `Duplicate`
- `Delete`
- `Send to QuickBooks`（有集成时）

---

## 9. 最终产品判断

Toggl 的 Invoices 不是“纯手工开票页”，而是一个从 Reports 派生出来的 invoice workflow：

1. 先用 time/report 数据形成 draft
2. 再补 invoice-facing business fields
3. 保存后进入 invoice list 管理
4. 后续围绕下载、复制、删除、会计集成继续处理

它更像一个轻量 invoice fulfillment surface，而不是重型 ERP 式发票系统。
