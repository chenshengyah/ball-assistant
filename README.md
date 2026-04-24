# ball-assistant

`ball-assistant` 现已调整为一个 `pnpm workspace + Turbo` 的 monorepo，用来同时承载微信小程序前端、独立 Node API、共享工程配置和本地基础设施。

## 目录结构

```text
.
├── apps
│   ├── api
│   │   ├── prisma
│   │   └── src
│   └── miniapp
│       ├── miniprogram
│       ├── project.config.json
│       └── typings
├── docs
├── infra
│   └── docker-compose.yml
└── packages
    └── config
```

## 应用说明

- `apps/miniapp`：微信小程序工程，继续使用 TypeScript 开发，通过微信开发者工具打开
- `apps/api`：NestJS + Fastify + Prisma + PostgreSQL 的独立 API 服务
- `packages/config`：共享 TypeScript / ESLint / Prettier 配置
- `infra`：本地开发依赖，如 PostgreSQL 的 `docker-compose`

## 开发方式

### 1. 安装依赖

```bash
pnpm install
```

### 2. 一键启动本地后端

```bash
pnpm dev
```

该命令会先启动 `infra/docker-compose.yml` 里的 PostgreSQL，执行 Prisma migration，再进入 `apps/api` 的本地开发模式。

### 3. 分步启动数据库

```bash
docker compose -f infra/docker-compose.yml up -d
```

### 4. 分步启动 API

```bash
pnpm db:migrate
pnpm --filter @ball-assistant/api dev
```

### 5. 生成小程序 API 类型

```bash
pnpm --filter @ball-assistant/miniapp codegen:api
```

### 6. 启动小程序

使用微信开发者工具打开 `apps/miniapp`。

### 7. 远程上传

仓库现在支持“小程序本地上传开发版 + GitHub Actions 上传共享包 + API 本地镜像构建”工作流。

- 说明文档：[`docs/remote-upload.md`](./docs/remote-upload.md)
- 小程序运行时配置示例：`apps/miniapp/miniprogram/config/private.example.ts`
- 共享上传工作流：`.github/workflows/miniapp-experience-upload.yml`

## 常用命令

```bash
pnpm dev
pnpm dev:all
pnpm db:up
pnpm db:migrate
pnpm db:down
pnpm build
pnpm lint
pnpm typecheck
pnpm test
```

## 当前阶段

本轮已完成 monorepo 底座搭建和 API 工程初始化。后续业务开发建议顺序：

1. 打通 `auth` 和 `users` 的真实联调
2. 用真实 API 替换小程序的用户资料 mock
3. 继续补齐 `activities / signups / my-activities` 业务模块
