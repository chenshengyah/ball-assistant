# 活动状态与动作矩阵

## 1. 目的

本文定义 MVP 阶段活动域的状态、派生展示态、可执行动作和守卫条件，并与本轮发布身份口径保持一致。

## 2. 状态模型

### 2.1 持久状态

`Activity.status` 只保留：

- `DRAFT`
- `PUBLISHED`
- `CANCELLED`

### 2.2 派生展示态

页面根据时间和持久状态派生：

- `报名中`
- `报名截止`
- `进行中`
- `已结束`
- `已取消`

## 3. 参与角色

- `访客用户`：当前用户未报名，且无管理权限
- `已报名用户`：当前用户已有有效报名记录
- `主办方`：
  - 个人活动创建者
  - 当前版本创建活动链路中，以俱乐部 `OWNER` 身份发布该活动的用户

补充说明：

- `ADMIN / MEMBER` 结构保留，但当前发布链路不对其开放俱乐部发布能力
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

### 4.3 当前用户可管理活动

`isManageable = true` 需满足：

- 个人活动：`createdBy = currentUserId`
- 俱乐部活动：当前用户是该活动发布俱乐部的 `OWNER`

## 5. 动作矩阵

| 动作 | 允许角色 | 守卫条件 | 状态变化 | 结果页 |
| --- | --- | --- | --- | --- |
| 报名活动 | 访客用户 | `isSignupOpen = true` 且当前用户未报名 | `Activity.status` 不变 | 活动详情页 |
| 取消报名 | 已报名用户 | `canCancelCurrentUserRegistration = true` | `Activity.status` 不变 | 活动详情页 |
| 取消活动 | 主办方 | 活动未结束 | `PUBLISHED -> CANCELLED` | 活动详情页 |
| 调场 | 主办方 | `signupMode = USER_SELECT_COURT` 且活动未结束 | `Activity.status` 不变 | 活动详情页 |
| 调容量 | 主办方 | 活动未结束 | `Activity.status` 不变 | 活动详情页 |
| 编辑图文详情 | 主办方 | `status != CANCELLED` 且活动未结束 | `Activity.status` 不变 | 活动详情页 |
| 再次发布 | 主办方 | 活动存在且当前用户可管理 | 原活动状态不变 | 创建活动页 |

说明：

- `再次发布` 是基于原活动生成新的创建表单，不修改原活动状态
- 当前已实现接口重点在创建和详情；其他动作仍按该状态机冻结产品口径
