# 活动状态与动作矩阵

## 1. 目的

本文用于定义 MVP 阶段活动域的状态、派生展示态、可执行动作、守卫条件和结果约束，作为活动详情页、我的活动、活动列表和后续接口实现的统一依据。

本文是 [活动全链路说明](./activity-lifecycle.md) 的执行规则补充，重点回答“谁在什么状态下可以做什么，做完会怎样”。

## 2. 状态模型

### 2.1 持久状态

`Activity.status` 只保留：

- `DRAFT`
- `PUBLISHED`
- `CANCELLED`

### 2.2 派生展示态

页面根据持久状态和时间字段派生：

- `草稿`
- `报名中`
- `报名截止`
- `进行中`
- `已结束`
- `已取消`

### 2.3 派生判断

给定当前时间 `now`：

- `status = DRAFT` -> `lifecycleStatusLabel = 草稿`
- `status = CANCELLED` -> `lifecycleStatusLabel = 已取消`
- `status = PUBLISHED` 且 `now < cancelDeadlineAt` -> `signupStatusLabel = 报名中`
- `status = PUBLISHED` 且 `cancelDeadlineAt <= now < activityStartAt` -> `signupStatusLabel = 报名截止`
- `status = PUBLISHED` 且 `activityStartAt <= now < activityEndAt` -> `lifecycleStatusLabel = 进行中`
- `status = PUBLISHED` 且 `now >= activityEndAt` -> `lifecycleStatusLabel = 已结束`

说明：

- `报名状态` 和 `生命周期状态` 是页面展示态，不反向写回 `Activity.status`
- `isSignupOpen`、`isInProgress`、`isFinished` 都属于派生布尔值

## 3. 参与角色

状态机中的动作按以下角色判断：

- `访客用户`：当前用户未报名，且无管理权限
- `已报名用户`：当前用户已有有效报名记录
- `主办方`：个人活动创建者，或俱乐部活动的 `OWNER / ADMIN`

补充说明：

- 俱乐部 `MEMBER` 在活动状态机中等同普通报名用户，不具备活动管理动作权限
- 所有报名相关动作都按个人身份处理

## 4. 核心守卫条件

### 4.1 报名开放

`isSignupOpen = true` 需同时满足：

- `Activity.status = PUBLISHED`
- `now < activityStartAt`
- `now < activityEndAt`
- `now < cancelDeadlineAt`

### 4.2 当前用户可取消报名

`canCancelCurrentUserRegistration = true` 需同时满足：

- 当前用户已有有效报名记录
- `Activity.status != CANCELLED`
- `now < cancelDeadlineAt`
- `now < activityStartAt`
- 活动未进行中
- 活动未结束

### 4.3 当前用户可管理活动

`isManageable = true` 需满足：

- 个人活动：`createdBy = currentUserId`
- 俱乐部活动：当前用户在该俱乐部的角色为 `OWNER / ADMIN`

### 4.4 当前用户可执行最小管理动作

- `取消活动`：`isManageable = true` 且活动未结束
- `调场`：`isManageable = true`、`signupMode = USER_SELECT_COURT`、`status = PUBLISHED`、活动未结束
- `调容量`：`isManageable = true`、`status = PUBLISHED`、活动未结束
- `再次发布`：`isManageable = true`

## 5. 动作矩阵

| 动作 | 允许角色 | 守卫条件 | 状态变化 | 结果页 |
| ---- | -------- | -------- | -------- | ------ |
| 报名活动 | 访客用户 | `isSignupOpen = true` 且当前用户未报名 | `Activity.status` 不变 | 活动详情页 |
| 取消报名 | 已报名用户 | `canCancelCurrentUserRegistration = true` | `Activity.status` 不变 | 活动详情页 |
| 取消活动 | 主办方 | 活动未结束 | `PUBLISHED -> CANCELLED` | 活动详情页 |
| 调场 | 主办方 | `signupMode = USER_SELECT_COURT` 且活动未结束 | `Activity.status` 不变 | 活动详情页 |
| 调容量 | 主办方 | 活动未结束 | `Activity.status` 不变 | 活动详情页 |
| 再次发布 | 主办方 | 活动存在且当前用户可管理 | 原活动状态不变 | 创建活动页 |

说明：

- `DRAFT` 在 MVP 中不进入用户报名链路，不开放报名和管理动作讨论
- `再次发布` 是基于原活动生成新的创建表单，不修改原活动状态

## 6. 各动作详细规则

### 6.1 报名活动

适用模式：

- `GENERAL`
- `USER_SELECT_COURT`

输入差异：

- `GENERAL`：直接对活动报名
- `USER_SELECT_COURT`：必须选择目标活动场地

守卫条件：

- 活动存在
- 活动处于 `PUBLISHED`
- 当前仍处于报名开放窗口
- 当前用户尚未报名该活动

执行结果：

- 若容量未满，创建 `CONFIRMED` 报名
- 若容量已满，创建 `WAITLIST` 报名并计算 `queueNo`
- `Activity.status` 不变
- 详情页刷新当前用户报名状态、已确认人数、候补人数

失败提示原则：

- 已截止报名：`当前活动已截止报名`
- 已报过名：`你已经报过这个活动了`
- 模式或场地不匹配：提示活动或场地不存在/不可报名

### 6.2 取消报名

守卫条件：

- 报名记录存在
- 只能取消自己的报名
- 活动未取消
- 活动未进行中
- 活动未结束
- 未超过取消截止时间

执行结果：

- 当前报名记录置为 `CANCELLED`
- 写入取消时间和取消原因
- 若存在候补，按当前规则自动晋升最早候补
- `Activity.status` 不变
- 详情页刷新当前用户报名状态与候补队列

### 6.3 取消活动

守卫条件：

- 当前用户为主办方
- 活动处于 `PUBLISHED`
- 活动未结束

执行结果：

- `Activity.status` 变为 `CANCELLED`
- 生命周期展示为 `已取消`
- 后续不允许新的报名和取消报名
- 已报名用户在详情页中看到活动已取消结果

说明：

- 当前仓库尚未实现该动作，但产品口径先按此冻结

### 6.4 调场

守卫条件：

- 当前用户为主办方
- 活动为 `USER_SELECT_COURT`
- 活动处于 `PUBLISHED`
- 活动未结束
- 目标活动场地存在

执行结果：

- 报名记录改挂到新的活动场地
- 若目标场地已满，则该用户可转为 `WAITLIST`
- 原场地释放后，按当前规则自动晋升原场地候补
- `Activity.status` 不变
- 详情页刷新各场地人数与候补信息

### 6.5 调容量

守卫条件：

- 当前用户为主办方
- 活动处于 `PUBLISHED`
- 活动未结束
- 新容量不能小于当前已确认人数
- 新容量必须大于等于 `1`

执行结果：

- 更新活动总容量或活动场地容量
- 若容量增大，按当前规则自动晋升候补
- `Activity.status` 不变
- 详情页刷新人数摘要和候补状态

说明：

- 当前代码已实现按场地调容量
- 统一报名总容量调整属于同一产品规则层，后续实现时沿用相同守卫条件

### 6.6 再次发布

守卫条件：

- 原活动存在
- 当前用户对原活动有管理权限

执行结果：

- 生成新的创建活动表单草稿
- 原活动状态保持不变
- 新建页带回原活动的基础配置、报名模式和对应报名配置
- 若原活动引用场地已停用，仍允许进入再次发布，但必须提示并重新确认

## 7. 展示态与可见动作矩阵

| 页面展示态 | 普通用户可见动作 | 已报名用户可见动作 | 主办方可见动作 |
| ---------- | ---------------- | ------------------ | -------------- |
| 草稿 | 无 | 无 | 继续编辑 |
| 报名中 | 报名 | 取消报名 | 取消活动 / 调场 / 调容量 / 再次发布 |
| 报名截止 | 无 | 无 | 取消活动 / 调场 / 调容量 / 再次发布 |
| 进行中 | 无 | 无 | 调场 / 调容量 / 再次发布 |
| 已结束 | 再次查看 | 再次查看 | 再次发布 |
| 已取消 | 再次查看 | 再次查看 | 再次发布 |

说明：

- `再次查看` 不是业务动作，只表示可继续进入详情页查看结果
- `继续编辑` 仅适用于 `DRAFT` 进入 MVP 时仍保留草稿能力的场景；若 MVP 最终不开放草稿入口，可不在 UI 暴露

## 8. 典型状态迁移

### 8.1 活动主状态迁移

- `DRAFT --发布--> PUBLISHED`
- `PUBLISHED --主办方取消活动--> CANCELLED`
- `PUBLISHED --时间推进--> PUBLISHED`

说明：

- 时间推进不会改变持久状态，只改变展示态

### 8.2 报名状态迁移

- `未报名 --报名且有容量--> CONFIRMED`
- `未报名 --报名且已满--> WAITLIST`
- `CONFIRMED --用户取消--> CANCELLED`
- `WAITLIST --用户取消--> CANCELLED`
- `WAITLIST --容量释放/调容量晋升--> CONFIRMED`
- `CONFIRMED/WAITLIST --主办方调场--> CONFIRMED 或 WAITLIST`

## 9. 对接口与前端的约束

- 活动详情接口需要返回动作可用性，而不是仅返回原始状态字段
- 推荐至少暴露以下布尔字段：
  - `isSignupOpen`
  - `canCancelCurrentUserRegistration`
  - `isManageable`
  - `permissions.canCancelActivity`
  - `permissions.canMoveRegistration`
  - `permissions.canAdjustCapacity`
  - `permissions.canRepublish`
- 活动列表和我的活动列表应复用同一套派生展示态判断，避免不同页面出现不同状态文案
- 若后续实现取消活动接口，应与用户取消报名接口明确分开，不复用同一资源动作

## 10. 与后续文档的关系

- `活动详情 PRD` 需要逐项消费本文的动作矩阵和展示态约束
- `我的活动 PRD` 需要复用本文的状态文案和动作可见性，不重新定义状态机
- 若后续扩展结算、复盘、手动收尾等能力，应作为新的状态后处理层，不直接污染当前 MVP 状态机
