# 远程开发与上传流程

这套流程拆成两条线：

- 本地命令：上传小程序开发版，构建或推送 API 镜像
- GitHub Actions：保留给共享体验包上传

## 0. 完整测试发布流程

从本地改动到可验收体验包，推荐按以下顺序执行：

1. 确认 API 测试环境已部署，且 `DATABASE_URL / JWT_SECRET / WECHAT_MINIAPP_APP_ID / WECHAT_MINIAPP_APP_SECRET` 已配置。
2. 确认测试 API 域名已加入微信小程序后台 `request` 合法域名。
3. 在仓库根目录生成小程序运行环境配置：

   ```bash
   MINIAPP_RUNTIME_ENV=production \
   MINIAPP_PRODUCTION_API_BASE_URL=https://ball-assistant.cloud/api \
   pnpm miniapp:env:production
   ```

4. 本地打开小程序，确认首页、活动列表、活动详情、创建活动入口能访问测试 API。
5. 准备本地上传密钥 `apps/miniapp/.private/miniapp-ci.key`，并确认本机 IP 已加入微信代码上传白名单。
6. 本地演练上传命令：

   ```bash
   MINIAPP_DRY_RUN=1 pnpm miniapp:upload:dev
   ```

7. 演练通过后上传开发版：

   ```bash
   pnpm miniapp:upload:dev
   ```

8. 在微信开发者工具或小程序后台确认开发版版本号、描述和 `robot` 槽位正确。
9. 合并到触发分支后，由 GitHub Actions 上传共享体验包。
10. 在 GitHub Actions artifact 中确认上传元数据存在。
11. 用共享体验包完成冒烟验收：
    - 首页和活动列表可浏览
    - 活动详情可打开
    - 登录和完善资料可进入
    - 创建活动页可进入并展示角色卡
    - API 异常时有可读提示
12. 若体验包不可用，优先回滚小程序运行环境配置或重新上传上一个稳定版本。
13. 若 API 不可用，优先回滚 API 服务或切回上一个稳定测试 API 域名。
14. 回滚完成后，在上传记录或 PR 中记录原因、影响版本和恢复方式。

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

统一通过生成脚本写入 `apps/miniapp/miniprogram/config/private.ts`：

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

`private.example.ts` 仅作为手动配置示例保留，不再作为推荐流程的一部分。

## 3. 本地上传小程序开发版

先准备：

1. 把上传密钥放到 `apps/miniapp/.private/miniapp-ci.key`
2. 确认本机 IP 已加入微信代码上传白名单
3. 先执行一次环境生成命令，确认 `apps/miniapp/miniprogram/config/private.ts` 已指向正确测试 API

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
