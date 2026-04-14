# 数据字典

## UserProfile

| 字段名      | 类型   | 必填 | 说明                         |
| ----------- | ------ | ---: | ---------------------------- |
| userId      | string |   是 | 用户ID                       |
| nickname    | string |   是 | 用户昵称                     |
| gender      | enum   |   是 | `MALE / FEMALE`              |
| avatarUrl   | string |   否 | 用户头像 URL                 |
| avatarColor | string |   否 | 占位头像色值，用于无头像场景 |
| status      | enum   |   否 | ACTIVE / INACTIVE            |
| createdAt   | string |   否 | 创建时间                     |
| updatedAt   | string |   否 | 更新时间                     |

说明：

- 当前版本 `gender` 为必填字段，不提供“未设置”状态
- 活动报名、发布身份、俱乐部成员等业务对象只引用 `userId`，展示资料以 `UserProfile` 为准

## PublishIdentity

| 字段名       | 类型    | 必填 | 说明              |
| ------------ | ------- | ---: | ----------------- |
| identityId   | string  |   是 | 身份ID            |
| identityType | enum    |   是 | PERSONAL / CLUB   |
| identityName | string  |   是 | 显示名称          |
| clubId       | string  |   否 | 俱乐部身份时有值  |
| isDefault    | boolean |   是 | 是否默认身份      |
| status       | enum    |   是 | ACTIVE / DISABLED |

说明：

- 每个用户默认应有一个 `PERSONAL` 发布身份
- `CLUB` 发布身份只返回当前用户有发布权限的俱乐部
- `MEMBER` 关系不单独出现在发布身份列表中

## Club

| 字段名        | 类型   | 必填 | 说明              |
| ------------- | ------ | ---: | ----------------- |
| clubId        | string |   是 | 俱乐部ID          |
| clubName      | string |   是 | 俱乐部名称        |
| logo          | string |   否 | 俱乐部头像/Logo   |
| description   | string |   否 | 简介              |
| city          | string |   否 | 城市              |
| creatorUserId | string |   是 | 创建人            |
| status        | enum   |   是 | ACTIVE / DISABLED |
| createdAt     | string |   是 | 创建时间          |
| updatedAt     | string |   是 | 更新时间          |

## Venue

| 字段名       | 类型   | 必填 | 说明              |
| ------------ | ------ | ---: | ----------------- |
| venueId      | string |   是 | 场馆ID            |
| clubId       | string |   是 | 所属俱乐部        |
| venueName    | string |   是 | 场馆名称          |
| address      | string |   是 | 场馆地址          |
| contactName  | string |   否 | 联系人            |
| contactPhone | string |   否 | 联系电话          |
| remark       | string |   否 | 备注              |
| status       | enum   |   是 | ACTIVE / DISABLED |

## Court

| 字段名          | 类型   | 必填 | 说明                            |
| --------------- | ------ | ---: | ------------------------------- |
| courtId         | string |   是 | 场地ID                          |
| venueId         | string |   是 | 所属场馆                        |
| courtName       | string |   是 | 场地名称，如1号场               |
| sportType       | enum   |   是 | BADMINTON / TENNIS / BASKETBALL |
| defaultCapacity | number |   否 | 默认人数                        |
| defaultFee      | number |   否 | 默认费用，仅作预填              |
| description     | string |   否 | 场地说明                        |
| status          | enum   |   是 | ACTIVE / DISABLED               |
| sort            | number |   否 | 排序                            |

## Activity

| 字段名              | 类型    | 必填 | 说明                                              |
| ------------------- | ------- | ---: | ------------------------------------------------- |
| activityId          | string  |   是 | 活动ID                                            |
| publishIdentityId   | string  |   是 | 发布身份ID                                        |
| publishIdentityType | enum    |   是 | PERSONAL / CLUB                                   |
| clubId              | string  |   否 | 俱乐部发布时有值                                  |
| title               | string  |   是 | 活动标题                                          |
| activityDate        | string  |   是 | 活动日期 YYYY-MM-DD                               |
| startTime           | string  |   是 | 开始时间 HH:mm                                    |
| endTime             | string  |   是 | 结束时间 HH:mm                                    |
| venueId             | string  |   是 | 场馆ID                                            |
| venueSnapshotName   | string  |   是 | 场馆名称快照                                      |
| signupMode          | enum    |   是 | GENERAL / USER_SELECT_COURT                       |
| chargeMode          | enum    |   是 | FREE / FIXED / AA / OTHER                         |
| chargeAmountCents   | number  |   否 | 收费金额，单位分                                  |
| chargeDesc          | string  |   否 | 收费说明                                          |
| capacity            | number  |   是 | 总人数上限                                        |
| allowWaitlist       | boolean |   是 | 是否允许候补                                      |
| description         | string  |   否 | 活动说明                                          |
| status              | enum    |   是 | DRAFT / PUBLISHED / CANCELLED                     |
| createdBy           | string  |   是 | 创建人ID                                          |
| createdAt           | string  |   是 | 创建时间                                          |
| updatedAt           | string  |   是 | 更新时间                                          |

说明：

- `status` 只表示活动持久状态，不直接等同于页面展示生命周期
- `进行中` 和 `已结束` 由 `activityStartAt / activityEndAt / cancelDeadlineAt` 派生，不单独写回 `status`
- 当前前端实现中，活动域还会使用 `ownerType / ownerId / activityStartAt / activityEndAt / cancelCutoffMinutesBeforeStart / cancelDeadlineAt / descriptionRichtext / totalCapacity` 等更贴近页面和类型的字段命名，后续正式接口定稿时应收敛为统一一套口径

## ActivityView / ActivityDetailView

| 字段名                       | 类型    | 必填 | 说明                                 |
| ---------------------------- | ------- | ---: | ------------------------------------ |
| activityId                   | string  |   是 | 活动ID                               |
| status                       | enum    |   是 | 持久状态：DRAFT / PUBLISHED / CANCELLED |
| lifecycleStatusLabel         | string  |   是 | 展示态：草稿 / 进行中 / 已结束 / 已取消 |
| signupStatusLabel            | string  |   是 | 展示态：报名中 / 报名截止 / 进行中 / 已结束 / 已取消 |
| isSignupOpen                 | boolean |   是 | 当前是否仍可报名                     |
| isInProgress                 | boolean |   是 | 当前是否进行中                       |
| isFinished                   | boolean |   是 | 当前是否已结束                       |
| currentUserRegistrationId    | string  |   否 | 当前用户报名ID                       |
| currentUserSignupLabel       | string  |   是 | 当前用户报名展示文案                 |
| canCancelCurrentUserRegistration | boolean | 是 | 当前用户是否仍可取消报名             |
| isManageable                 | boolean |   是 | 当前用户是否可管理该活动             |

说明：

- `ActivityView / ActivityDetailView` 是页面展示层对象，不替代活动主数据
- 展示态字段由活动持久状态、时间字段和当前用户关系共同推导
- 动作可用性字段应由统一状态机规则推导，不应由页面各自硬编码

## ActivityCourtSnapshot

| 字段名              | 类型   | 必填 | 说明         |
| ------------------- | ------ | ---: | ------------ |
| id                  | string |   是 | 主键         |
| activityId          | string |   是 | 活动ID       |
| courtId             | string |   是 | 原始场地ID   |
| courtNameSnapshot   | string |   是 | 场地名称快照 |
| capacitySnapshot    | number |   否 | 场地人数快照 |
| feeSnapshot         | number |   否 | 场地费用快照 |
| descriptionSnapshot | string |   否 | 场地描述快照 |
| sort                | number |   否 | 排序         |

## ActivitySignup

| 字段名       | 类型   | 必填 | 说明                                        |
| ------------ | ------ | ---: | ------------------------------------------- |
| signupId     | string |   是 | 报名ID                                      |
| activityId   | string |   是 | 活动ID                                      |
| userId       | string |   是 | 用户ID                                      |
| signupStatus | enum   |   是 | CONFIRMED / WAITLIST / CANCELLED / REJECTED |
| signupTime   | string |   是 | 报名时间                                    |
| cancelTime   | string |   否 | 取消时间                                    |
| queueNo      | number |   否 | 候补序号                                    |
| remark       | string |   否 | 备注                                        |

说明：

- 报名、候补、取消报名全部按 `userId` 维度记录
- 当前 MVP 不支持“以俱乐部身份报名”

## MyActivitiesCollection

| 字段名      | 类型  | 必填 | 说明               |
| ----------- | ----- | ---: | ------------------ |
| published   | array |   是 | 我发布的活动列表   |
| joined      | array |   是 | 我报名的活动列表   |

说明：

- “我的活动”至少区分“我发布的”和“我报名的”两类集合
- 两类集合中的活动项都使用统一生命周期展示口径
