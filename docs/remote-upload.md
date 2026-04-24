# 远程开发与上传流程

这套流程拆成两条线：

- 本地命令：上传小程序开发版，构建或推送 API 镜像
- GitHub Actions：保留给共享体验包上传

## 1. API 测试环境

后端继续作为独立 Node 服务部署，至少需要这些环境变量：

- `DATABASE_URL`
- `JWT_SECRET`
- `WECHAT_MINIAPP_APP_ID`
- `WECHAT_MINIAPP_APP_SECRET`
- `PORT` 可选

相关文件：

- 示例环境变量：`apps/api/.env.example`
- 容器镜像定义：`apps/api/Dockerfile`

部署完成后，把测试域名加入小程序后台的 `request` 合法域名。

## 2. 小程序运行环境

小程序现在支持两个命名环境：

- `local`：本地或局域网联调
- `production`：远端 HTTPS API，例如 `https://ball-assistant.cloud/api`

兼容说明：

- 旧的 `test` 环境名和 `MINIAPP_TEST_API_BASE_URL` 仍然可用，但会被视为 `production` 的别名

默认会优先使用 gitignore 的本地私有配置文件：

```bash
cp apps/miniapp/miniprogram/config/private.example.ts apps/miniapp/miniprogram/config/private.ts
```

或者直接生成：

```bash
MINIAPP_RUNTIME_ENV=production \
MINIAPP_PRODUCTION_API_BASE_URL=https://ball-assistant.cloud/api \
pnpm miniapp:env:production
```

常用变量：

- `MINIAPP_RUNTIME_ENV`
- `MINIAPP_LOCAL_API_BASE_URL`
- `MINIAPP_PRODUCTION_API_BASE_URL`
- `MINIAPP_TEST_API_BASE_URL`
- `MINIAPP_API_BASE_URL`

## 3. 本地上传小程序开发版

先准备：

1. 把上传密钥放到 `apps/miniapp/.private/miniapp-ci.key`
2. 确认本机 IP 已加入微信代码上传白名单
3. 确认 `private.ts` 或环境变量已经指向正确测试 API

最常用命令：

```bash
pnpm miniapp:upload:dev
```

它默认会：

- 上传到开发版通道
- 使用 `robot 1`
- 自动生成版本号，例如 `dev-202604221530`

可选变量：

- `MINIAPP_UPLOAD_VERSION`
- `MINIAPP_UPLOAD_DESC`
- `MINIAPP_ROBOT`
- `MINIAPP_CI_PRIVATE_KEY_PATH`

本地演练但不真实上传：

```bash
MINIAPP_DRY_RUN=1 pnpm miniapp:upload:dev
```

上传结果元数据会写到 `apps/miniapp/artifacts/miniapp-upload.json`。

## 4. GitHub Actions 上传共享体验包

工作流文件：`.github/workflows/miniapp-experience-upload.yml`

需要的仓库 secrets：

- `MINIAPP_CI_PRIVATE_KEY`
- `MINIAPP_TEST_API_BASE_URL`

工作流默认行为：

- `develop` 分支的小程序变更会自动触发
- 上传到共享槽位，默认 `robot 30`
- 不生成二维码，只执行上传
- 上传元数据会作为 artifact 保存

说明：

- `miniprogram-ci` 的上传对应开发者工具里的“上传”
- 共享体验通常建议用独立 `robot` 槽位管理，避免覆盖本地开发版
- 如果你要在助手里进一步设为体验版，可以基于这次上传结果继续操作

## 5. 本地构建或推送 API 镜像

从仓库根目录直接运行：

```bash
pnpm api:image:build
```

默认会生成：

- 镜像名：`ball-assistant-api`
- 标签：当前时间戳，例如 `dev-202604221530`

如果要推送到镜像仓库：

```bash
API_IMAGE_NAME=registry.example.com/ball-assistant/api \
API_IMAGE_TAG=dev-202604221530 \
pnpm api:image:push
```

常用变量：

- `API_IMAGE_NAME`
- `API_IMAGE_TAG`
- `API_IMAGE_EXTRA_TAGS`
- `API_IMAGE_PLATFORM`
- `API_PUSH_IMAGE`

只演练命令但不执行 Docker：

```bash
API_DRY_RUN=1 pnpm api:image:build
```

结果元数据会写到 `apps/api/artifacts/api-image.json`。
