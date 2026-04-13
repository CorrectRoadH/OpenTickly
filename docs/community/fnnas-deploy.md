# 飞牛 NAS 部署 OpenToggl（论坛版教程）

> 这篇是写给飞牛（fnOS）论坛用户看的，风格参考飞牛论坛 Docker 应用分享版（`club.fnnas.com/forum-12`）的写法：一句话介绍 + 完整 compose + 参数表 + 使用步骤 + 星级收尾。
>
> 需要在飞牛论坛发帖时，可以把"标题建议"选一个当帖子标题，正文直接抄下面的内容，把 `[图：xxx]` 换成自己的截图即可。

---

## 标题建议

- `NAS 部署 OpenToggl：一个自己的 Toggl Track，免费、没有 API 限速`
- `把 Toggl 装回自己 NAS：飞牛部署 OpenToggl 全流程`
- `不想再交 Toggl 订阅费？飞牛一键部署 OpenToggl`

---

## 正文

OpenToggl 是一个开源、自托管的时间追踪应用，API 完全兼容 Toggl Track v9 和 Reports v3。手机网页、浏览器、以及 `toggl-cli` 都能直连，数据存在自己的 NAS 上，也没有 Toggl 官方 `30 次/小时` 的 API 限速，适合想自建时间追踪、或者想让 AI / 脚本跑自动化打卡的人。

`[图：Timer 页总览]`

### 为什么想自己部署

- 免费，不再按月订阅
- 数据在自己 NAS 上，不经过第三方
- API 无限速，适合 AI / 脚本 / 自动化
- 手机浏览器可以装成 PWA，用起来像原生 App
- 保留 Toggl 的操作习惯，迁移不用重新学

---

### 一、准备 docker-compose.yml

下面这份是我针对飞牛 NAS 的习惯调整过的版本：

- Postgres、Redis 只走内部网络，不暴露到宿主机
- 数据持久化用 Docker 命名卷，重装容器不丢
- 只对外开一个 `8080` 端口

```yaml
name: opentoggl

services:
  postgres:
    image: postgres:17-alpine
    container_name: opentoggl-postgres
    environment:
      POSTGRES_DB: opentoggl
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: change-me-please
    networks: [internal]
    volumes:
      - opentoggl-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 5s
      timeout: 3s
      retries: 20
    restart: unless-stopped

  redis:
    image: redis:8-alpine
    container_name: opentoggl-redis
    command: ["redis-server", "--save", "", "--appendonly", "no"]
    networks: [internal]
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 20
    restart: unless-stopped

  opentoggl:
    image: ghcr.io/correctroadh/opentoggl:latest
    container_name: opentoggl
    environment:
      PORT: "8080"
      DATABASE_URL: postgres://postgres:change-me-please@postgres:5432/opentoggl?sslmode=disable
      REDIS_URL: redis://redis:6379/0
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks: [internal]
    ports:
      - "8080:8080"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8080/readyz"]
      interval: 5s
      timeout: 3s
      retries: 20
    restart: unless-stopped

networks:
  internal:
    driver: bridge

volumes:
  opentoggl-postgres-data:
```

⚠️ 两处 `change-me-please` 记得改成自己的强密码，**两个地方要一致**（一个是 Postgres 的 `POSTGRES_PASSWORD`，另一个是 `opentoggl` 的 `DATABASE_URL` 里的密码）。

---

### 二、在飞牛里创建 Compose 项目

1. 打开飞牛桌面的 **Docker** 应用（应用中心里搜得到，没装的先装一下）
2. 左侧选 **Compose** > **新建项目**
3. **项目名称** 填 `opentoggl`
4. **存储路径** 保持默认（一般是 `/vol1/1000/docker/opentoggl`，飞牛自动建好）
5. **Compose 内容** 粘贴上面那份 YAML
6. 点 **部署**，等待三个容器都变成绿色（healthy）

`[图：Docker > Compose 新建项目界面]`
`[图：三个容器 healthy 的状态]`

### 三、开放端口（如果有防火墙）

飞牛默认的 Docker 网络桥接已经帮你把 `8080` 端口绑到宿主机了，但如果你开了飞牛的 **安全中心 > 防火墙**，需要放行 `8080`：

1. 打开 **安全中心** > **防火墙**
2. 添加入站规则，TCP 协议，端口 `8080`，动作 **允许**

`[图：防火墙放行截图]`

### 四、访问和首次使用

浏览器打开：

```
http://<飞牛局域网 IP>:8080
```

（比如 `http://192.168.1.100:8080`）

第一次进去会进注册界面，注册完就能直接用了。

`[图：注册页]`
`[图：Timer 开始计时]`
`[图：Reports 报表页]`

---

### 五、配合 `toggl-cli`（选配）

官方 `toggl-cli` 直接支持切到自己的实例：

```bash
toggl auth <你的 API_TOKEN> --type opentoggl \
  --api-url http://<飞牛 IP>:8080/api/v9
```

之后 `toggl start` / `toggl stop` / `toggl list` 全打到自己飞牛上，没有 API 限速，脚本和 AI Agent 用起来特别爽。

`[图：toggl-cli 终端演示]`

### 六、手机装成 PWA

Safari / Chrome 打开之后选「添加到主屏幕」，图标就出现在桌面了，点开是全屏 App，离线也能用。

`[图：手机 PWA 图标 + 全屏界面]`

---

### 备份

数据库数据在 Docker 命名卷 `opentoggl-postgres-data` 里，飞牛里路径一般是：

```
/vol1/@docker/volumes/opentoggl_opentoggl-postgres-data/_data
```

也可以用 `pg_dump` 导 SQL：

```bash
docker exec opentoggl-postgres pg_dump -U postgres opentoggl > opentoggl-backup.sql
```

### 升级

```bash
cd /vol1/1000/docker/opentoggl     # 你的 compose 项目目录
docker compose pull
docker compose up -d
```

数据库 schema 迁移启动时自动跑，不用手动处理。

---

- 推荐度：⭐⭐⭐⭐
- 体验度：⭐⭐⭐⭐
- 部署难度：⭐⭐

项目地址：<https://github.com/CorrectRoadH/opentoggl>
官网：<https://opentoggl.com>
