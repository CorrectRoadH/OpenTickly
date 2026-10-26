---
id: local.sso-identity-and-flow-boundaries
title: "SSO 必须使用显式身份绑定、原子状态消费和受限元数据客户端"
language: go
level: error
tags: [local, go, security, sso]
---

# SSO 必须使用显式身份绑定、原子状态消费和受限元数据客户端

工作区 IdP 不能通过邮箱查找直接取得全局账号会话。SSO 应用服务通过已授权的
主体绑定选择账号；邮箱冲突检查属于原子建号事务，不能恢复旧的邮箱登录路径。
回调状态必须使用原子消费，不能读取后调用 Del；元数据适配器必须使用受限
客户端，禁止默认 HTTP 客户端。浏览器绑定、事务与网络地址策略仍由回归测试验收。
本规则拦截上述已发现的旧入口，不宣称能静态证明完整身份安全。

```grit
language go
or {
  `http.DefaultClient` where { $filename <: r".*internal/identity/saml/[^/]*\.go", !$filename <: r".*_test\.go" },
  `$cache.Del($ctx, $key)` where { $filename <: r".*internal/bootstrap/saml2_routes\.go" },
  `$users.ByEmail($ctx, $email)` where { $filename <: r".*internal/identity/application/sso\.go" }
}
```

## Bad

```go
// identity/saml/provider.go
client = http.DefaultClient
```

## Good

```go
client = newMetadataClient()
```
