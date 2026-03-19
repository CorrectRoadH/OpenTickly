# 报表与共享

## Goal

这一册定义报表作为独立产品面的可见行为，包括查询、导出、shared report、saved report 和权限模型。

## 范围

本文件定义：

- `Reports API v3`
- detailed / summary / weekly / trends / profitability / insights
- saved reports
- shared reports
- exports

具体统计口径与导出行为见：

- [reports](../contracts/reports.md)
- [reports-endpoint-matrix](../contracts/reports-endpoint-matrix.md)

## 必须完整覆盖

- `Reports API v3` 全部公开端点
- detailed reports
- summary reports
- weekly reports
- comparative / trends / profitability / insights
- saved reports
- shared reports
- filters 和 search 系列能力
- clients / projects / users / time_entries 等过滤和搜索接口
- CSV / PDF / XLSX 导出
- 分享 token 与共享访问控制
- 报表分页、排序、聚合
- 时区切日、舍入、利润、汇率等统计口径
- 与 Track 数据的可回读一致性

## Product Rules

- Reports 是独立产品面，不是 Track API 的附属查询页。
- 用户在 Web 与 API 中看到的 reports 结果，必须基于同一套公开统计规则解释。
- exports 不是“另一个实现”，而是同一查询定义的另一种结果表达。
- shared report、saved report、在线查询、导出结果必须共享同一组权限和参数语义；具体规则以 `contracts/reports.md` 为准。

## Shared / Saved Reports

- saved reports 和 shared reports 必须作为公开产品对象存在。
- public/private 权限、参数覆盖、owner 失活、共享导出等公开行为以 `contracts/reports.md` 为准。

## Edge Cases

- 历史对象被停用、删除或归档后，reports 默认继续统计相关历史事实，而不是静默抹除。

## Open Questions

- shared report 在极端大报表、极端长时间范围下的公开失败阈值，仍需继续收集。
- 某些 profitability / insights 边界计算细则，仍以专题合同为后续细化目标。

## Web 要求

Web 端至少提供：

- 详细报表
- 汇总报表
- 周报
- 趋势 / 盈利 / 洞察页
- 保存报表
- 共享设置
- 筛选器与导出入口
