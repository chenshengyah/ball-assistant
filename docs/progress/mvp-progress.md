# MVP 前期开发准备进度

## 项目目标摘要

当前 MVP 的目标是先跑通“创建活动 -> 报名活动”主链路，并在正式开发前把产品目标、核心流程、页面文档和页面原型准备到可执行状态。

## 当前阶段

页面 PRD 已覆盖当前小程序核心路由，原型与真实接口联调补齐中。

## 状态说明

- `[x]` 已完成
- `[~]` 进行中
- `[ ]` 未开始
- `[!]` 待确认

## 前期模块清单

### 1. 产品目标与 MVP 范围确认

- 目标：明确当前 MVP 要解决的问题、目标用户和本期边界，避免开发范围持续漂移。
- 当前状态：`[x] 已完成`
- 依据：`docs/global/mvp-overview.md` 已定义产品目标、目标用户、MVP 范围、核心页面和业务原则。
- 完成标准：全局目标、做什么和不做什么都有统一口径，后续页面文档不再偏离该范围。
- 下一步：后续新增页面或需求时，同步回看 `docs/global/mvp-overview.md`，确认是否仍属于 MVP 范围。

### 2. 目标用户与角色边界梳理

- 目标：明确普通用户、个人发布者、俱乐部管理员在各流程中的权限和责任边界。
- 当前状态：`[x] 已完成`
- 依据：`docs/global/mvp-overview.md` 已定义目标用户，`docs/global/role-boundaries.md` 已统一沉淀登录主体、发布身份、俱乐部成员权限和最小权限矩阵，页面文档改为统一引用该全局口径。
- 完成标准：用户角色、发布身份、俱乐部身份之间的关系能在一处统一说明，页面文档中的权限表达保持一致。
- 下一步：后续若需要拆分 `OWNER` 与 `ADMIN` 的细粒度差异，再补独立的俱乐部权限细则文档。

### 3. 核心流程拆解

- 目标：把完善信息、俱乐部注册、场馆与场地补充维护、创建活动、报名活动这些主链路串起来。
- 当前状态：`[x] 已完成`
- 依据：`docs/global/user-flow.md` 已定义完善信息、活动主办方、活动报名者、俱乐部注册、场馆与场地管理、最小管理动作等关键流程，`docs/global/activity-lifecycle.md` 已统一沉淀活动从创建到结束的全链路。
- 完成标准：主链路和关键回跳关系在全局流程文档中清晰可读，页面 PRD 与流程描述一致。
- 下一步：进入首批开发清单拆分阶段，把流程节点继续落到具体任务。

### 4. 全局文档收敛

- 目标：把产品目标、流程、接口口径和数据口径收敛到统一入口，降低查找成本。
- 当前状态：`[x] 已完成`
- 依据：`docs/README.md` 已整理为全局文档、进度记录、主链路页面文档和归档文档导航，`docs/global/` 下已有总览、流程、接口契约和数据字典。
- 完成标准：全局资料不再散落在旧文件中，团队能通过 `docs/README.md` 快速找到主文档。
- 下一步：后续新增页面或全局文档时，继续统一收口到现有结构中。

### 5. 页面级 PRD 收敛

- 目标：把核心页面的字段、交互、边界和异常情况明确到可开发程度。
- 当前状态：`[x] 已完成`
- 依据：现已按主链路收口 `docs/pages/home/README.md`、`docs/pages/activity/README.md`、`docs/pages/activity-detail/README.md`、`docs/pages/user-registration/README.md`、`docs/pages/activity-create/README.md`、`docs/pages/club-register/README.md`、`docs/pages/club-management/README.md`、`docs/pages/venue-court-management/README.md`、`docs/pages/my-activities/README.md` 与 `docs/pages/profile/README.md`。
- 完成标准：MVP 范围内的核心页面都有对应 PRD，且页面职责已按主链路统一，不再把活动详情职责混进创建页或列表卡片。
- 下一步：实现过程中只回填字段级补充，不再打散页面职责。

### 6. 数据字典与接口口径对齐

- 目标：确保文档中的领域对象、字段定义和接口契约能够支持后续开发，不在实现阶段频繁返工。
- 当前状态：`[~] 进行中`
- 依据：`docs/global/api-contract.md` 与 `docs/global/data-dictionary.md` 已存在，且已按“已实现 / P0 待补 / P1 暂缓”拆分接口状态；但报名、取消报名、我的活动、活动列表和主办方管理动作的真实接口仍待补齐，当前小程序部分能力仍依赖 `miniprogram/services/activity-store.ts` 的本地 mock 数据。
- 完成标准：文档中的核心字段、枚举和资源边界能映射到后续真实接口与前端类型，不再出现明显冲突。
- 下一步：优先按 `docs/global/api-contract.md` 的 P0 待补接口替换本地 mock，并对照 `miniprogram/types/activity.ts` 做字段命名、动作权限和枚举值清单核对。

### 7. 页面信息架构与跳转关系整理

- 目标：明确页面入口、路由关系、页面回跳和信息承接，避免开发时边做边补。
- 当前状态：`[x] 已完成`
- 依据：`docs/README.md` 已补主链路页面地图摘要，各页面 PRD 已统一补齐“入口与回跳”章节，并明确 `home / activity-detail / user-registration / activity-create / club-register / club-management / venue-court-management / my-activities / profile` 的页面关系；`activity` 已并入首页承接浏览。
- 完成标准：MVP 页面清单、入口位置、跳转关系和来源页回跳规则都已明确，且路由设计能覆盖主链路。
- 下一步：把当前文档中的页面地图落成实际小程序页面与路由实现。

### 8. 原型 / 交互稿准备

- 目标：在进入正式开发前，用页面原型或交互稿验证主要页面结构和核心操作路径。
- 当前状态：`[~] 进行中`
- 依据：`miniprogram/pages/home/index.ts`、`miniprogram/pages/activity-detail/index.ts`、`miniprogram/pages/activity-create/index.ts`、`miniprogram/pages/user-registration/index.ts`、`miniprogram/pages/my-activities/index.ts`、`miniprogram/pages/profile/index.ts`、`miniprogram/pages/club-register/index.ts`、`miniprogram/pages/club-management/index.ts` 与 `miniprogram/pages/venue-court-management/index.ts` 已具备基础页面能力；首页已承接原活动页浏览结构，俱乐部注册/管理与场馆管理均已落地为真实页面。
- 完成标准：MVP 关键页面都有可演示的原型或交互说明，能支撑评审和开发排期。
- 下一步：俱乐部注册/完善、俱乐部管理详情编辑、场馆与场地管理页面已落地；继续把报名、取消报名和主办方管理动作从 mock 逐步切到真实接口。

### 9. 开发范围冻结与首批开发清单

- 目标：把“先做什么、后做什么”明确下来，形成真正可以执行的首批开发任务。
- 当前状态：`[~] 进行中`
- 依据：`docs/progress/planning-order.md` 已定义阶段顺序，本轮已完成页面文档与信息架构收口，并在 `docs/global/api-contract.md` 标记 P0 待补接口；但尚未形成一份可直接执行的 P0 任务板。
- 完成标准：形成第一批开发清单，至少明确先做哪些页面、依赖哪些文档、哪些项必须先补齐再进入开发。
- 下一步：基于当前 PRD、原型现状和 P0 接口缺口，整理 P0 开发顺序，优先考虑首页活动浏览真实接口、报名/取消报名、我的活动和主办方管理动作；俱乐部成员管理、审核后台和主页装修归入 P1。

## 最近更新记录

- 2026-04-24：新增 `docs/pages/club-management/README.md`，补齐“我的 -> 俱乐部入口 -> 注册 / 管理 -> 编辑资料 / 管理场馆”的维护闭环。
- 2026-04-24：小程序导航调整为仅保留 `home / profile` 两个 tab，`activity` 页退出实际路由，活动浏览并入首页。
- 2026-04-24：落地 `club-register / club-management / venue-court-management` 真实小程序页面，并接入俱乐部与场馆接口。
- 2026-04-24：新增 `home / activity / profile` 轻量页面 PRD；随后实际导航收敛为 `home / profile`，`activity` 保留为历史结构参考。
- 2026-04-24：将 `docs/global/user-flow.md` 的主流程改为编号步骤，并补充游客浏览、报名、取消报名、主办方管理动作和我的活动回收流程。
- 2026-04-24：将 `docs/global/api-contract.md` 的未落地接口拆分为“已实现 / P0 待补 / P1 暂缓”，明确活动列表、报名、我的活动和管理动作的接口优先级。
- 2026-04-24：补充 `docs/remote-upload.md` 的完整测试发布流程，串起 API 环境、小程序环境生成、开发版上传、共享体验包、验收和回滚。
- 2026-04-13：按主链路重排页面 PRD，统一 `user-registration -> club-register -> venue-court-management -> activity-create -> activity-detail -> my-activities` 的页面顺序与职责边界。
- 2026-04-13：新增 `docs/pages/activity-detail/README.md`，统一活动发布后的详情承接、报名、取消报名、调场、调容量、取消活动和再次发布。
- 2026-04-13：新增 `docs/pages/my-activities/README.md`，统一“我发布的 / 我报名的”活动集合回收口径。
- 2026-04-13：更新 `docs/README.md`，补充页面地图摘要与主链路阅读顺序。
- 2026-04-13：将“页面级 PRD 收敛”和“页面信息架构与跳转关系整理”更新为已完成，将“开发范围冻结与首批开发清单”更新为进行中。
- 2026-04-13：新增 `docs/global/activity-state-machine.md`，统一活动状态、动作矩阵、守卫条件和状态迁移规则。
- 2026-04-13：新增 `docs/global/activity-lifecycle.md`，统一活动从创建到结束的全链路、两层状态模型、页面职责和最小管理动作。
- 2026-04-13：扩展 `docs/global/user-flow.md` 的活动主链路，补充主办方、报名者和最小管理动作流程。
- 2026-04-13：补充活动详情与“我的活动”的最小接口能力，并将活动持久状态收敛为 `DRAFT / PUBLISHED / CANCELLED`。
- 2026-04-13：新增 `docs/global/role-boundaries.md`，统一 MVP 的登录主体、发布身份、俱乐部成员权限和最小权限矩阵。
- 2026-04-13：对齐 `docs/global/data-dictionary.md` 与 `docs/global/api-contract.md` 的发布身份枚举，统一使用 `PERSONAL / CLUB`。
- 2026-04-13：新增前期开发准备进度文件，按当前 docs 和仓库现状预填模块状态。
- 2026-04-13：补充 `planning-order.md`，用于指导前期规划的先后顺序和阶段产出。
