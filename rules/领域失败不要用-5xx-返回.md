---
id: local.no-5xx-for-domain-failure
title: 领域失败不要用 5xx 状态码返回
language: go
level: warn
tags: [local, go, http, error-reporting]
---

# 领域失败不要用 5xx 状态码返回

业务/领域层的失败（SMTP 投递被拒、外部服务鉴权失败、配置错误等）是**结果**，不是网关故障。用
`502/503/504` 返回这类结果时，反向代理（Cloudflare、Traefik）会把响应体替换成自己的 HTML 错误页，
前端拿到的是 `<!DOCTYPE html> ... 502: Bad gateway`，真正的原因被吞掉，用户看到一坨 HTML。

规则：处理器把领域失败写进 `200` 响应体里，用结构化的 `success` + `code` + `message` 字段表达结果；
`code` 走 OpenAPI 枚举，客户端据此做本地化文案。5xx 只留给"服务端真的坏了"。

```grit
language go
`$ctx.JSON($status, $body)` where {
  $status <: or {
    `http.StatusBadGateway`,
    `http.StatusServiceUnavailable`,
    `http.StatusGatewayTimeout`
  },
  $filename <: r".*apps/backend/internal/.*/transport/.*\.go",
  !$filename <: r".*_test\.go"
}
```

## 反例

```go
if err := h.service.SendTestEmail(reqCtx, req.To); err != nil {
	return ctx.JSON(http.StatusBadGateway, sendTestEmailResponse{
		Success: false,
		Message: err.Error(),
	})
}
```

## 正例

```go
code, err := h.service.SendTestEmail(reqCtx, req.To)
if err != nil {
	return ctx.JSON(http.StatusOK, adminapi.TestEmailResult{
		Success: false,
		Code:    adminapi.TestEmailResultCode(code),
		Message: err.Error(),
	})
}
```
