# 数据字典

## UserProfile

| 字段名      | 类型   | 必填 | 说明                         |
| ----------- | ------ | ---: | ---------------------------- |
| userId      | string |   是 | 用户ID                       |
| nickname    | string |   是 | 用户昵称                     |
| gender      | enum   |   是 | `MALE / FEMALE`              |
| avatarUrl   | string |   否 | 用户头像 URL                 |
| avatarColor | string |   否 | 占位头像色值，用于无头像场景 |
| phoneNumber | string |   否 | 已验证手机号                 |
| phoneCountryCode | string | 否 | 手机区号，如 `86`          |
| phoneVerifiedAt | string | 否 | 手机号验证时间             |
| baseProfileComplete | boolean | 否 | 基础资料是否已完善        |
| contactProfileComplete | boolean | 否 | 联系方式是否已完善       |
| isProfileComplete | boolean | 否 | 基础资料与联系方式是否都齐 |
| status      | enum   |   否 | ACTIVE / INACTIVE            |
| createdAt   | string |   否 | 创建时间                     |
| updatedAt   | string |   否 | 更新时间                     |

说明：

- `baseProfileComplete` 当前按 `nickname + gender` 判定，头像属于推荐采集项
- `contactProfileComplete` 表示当前用户已完成手机号验证
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
| contactName   | string |   否 | 联系人            |
| contactPhone  | string |   否 | 联系电话          |
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
| poiName      | string |   否 | 地图选点返回的地点名 |
| province     | string |   否 | 省份，可由选点补充或手填 |
| city         | string |   否 | 城市，可由选点补充或手填 |
| district     | string |   否 | 区县，可由选点补充或手填 |
| address      | string |   是 | 场馆地址          |
| latitude     | number |   否 | 纬度              |
| longitude    | number |   否 | 经度              |
| navigationName | string | 否 | 导航名称，默认同场馆名称 |
| contactName  | string |   否 | 联系人            |
| contactPhone | string |   否 | 联系电话          |
| remark       | string |   否 | 备注              |
| status       | enum   |   是 | ACTIVE / DISABLED |

说明：

- MVP 推荐使用微信小程序原生 `wx.chooseLocation` 做地图选点
- `poiName / address / latitude / longitude` 是定位结果的基础回填字段
- `province / city / district` 作为可选结构化字段保留，可由选点结果补充或手动修正
- `Venue` 是低频复用的场馆主数据，创建活动时允许直接选择、新增或编辑

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

说明：

- `Court` 保留为可复用场地主数据
- MVP 对外主操作统一表达为“新增 / 编辑 / 删除”
- `status = ACTIVE / DISABLED` 保留为实现兼容字段，不作为用户主要心智

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
| descriptionRichtext | string  |   否 | 活动图文详情富文本内容                            |
| status              | enum    |   是 | DRAFT / PUBLISHED / CANCELLED                     |
| createdBy           | string  |   是 | 创建人ID                                          |
| createdAt           | string  |   是 | 创建时间                                          |
| updatedAt           | string  |   是 | 更新时间                                          |

说明：

- `status` 只表示活动持久状态，不直接等同于页面展示生命周期
- `进行中` 和 `已结束` 由 `activityStartAt / activityEndAt / cancelDeadlineAt` 派生，不单独写回 `status`
- `descriptionRichtext` 用于承载活动图文混排详情，支持文字段落与图片顺序展示，不等同于纯文本说明
- `signupMode = GENERAL` 对外显示为 `统一分配`，只统计报名与候补，不落具体场地
- `signupMode = USER_SELECT_COURT` 对外显示为 `自主选场`，报名记录需要落到具体活动场地
- 创建活动时允许在当前流程内直接维护本次活动开放报名的场地列表
- 当前前端实现中，活动域还会使用 `ownerType / ownerId / activityStartAt / activityEndAt / cancelCutoffMinutesBeforeStart / cancelDeadlineAt / totalCapacity` 等更贴近页面和类型的字段命名，后续正式接口定稿时应收敛为统一一套口径

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
| descriptionRichtext          | string  |   否 | 活动图文详情富文本内容               |
| ownerDisplay                 | object  |   是 | 发布主体展示快照                     |
| permissions.canEditDetailContent | boolean | 否 | 当前用户是否可编辑图文详情          |

说明：

- `ActivityView / ActivityDetailView` 是页面展示层对象，不替代活动主数据
- 展示态字段由活动持久状态、时间字段和当前用户关系共同推导
- 动作可用性字段应由统一状态机规则推导，不应由页面各自硬编码
- `ActivityDetailView` 需要返回 `descriptionRichtext`，用于详情页展示和主办方编辑后的即时回显

## OwnerDisplay

| 字段名             | 类型   | 必填 | 说明                         |
| ------------------ | ------ | ---: | ---------------------------- |
| mode               | enum   |   是 | PERSONAL / CLUB              |
| name               | string |   是 | 发布主体显示名               |
| avatarUrl          | string |   否 | 个人头像                     |
| avatarColor        | string |   否 | 个人默认头像色               |
| logoUrl            | string |   否 | 俱乐部 Logo                  |
| contactName        | string |   否 | 对外联系人                   |
| contactPhoneMasked | string |   否 | 脱敏联系电话                 |

说明：

- `OwnerDisplay` 在活动发布时写入快照，避免活动历史展示随资料修改漂移
- 联系电话默认以脱敏形式展示，不直接公开明文手机号

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

说明：

- `ActivityCourtSnapshot` 来源于创建活动时确认的本次活动场地列表
- 场地主数据后续被删除或停用，不影响历史活动快照展示

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
- `GENERAL / 统一分配` 下 `activityCourtId` 允许为空，表示当前版本不在系统内落具体场地

## MyActivitiesCollection

| 字段名      | 类型  | 必填 | 说明               |
| ----------- | ----- | ---: | ------------------ |
| published   | array |   是 | 我发布的活动列表   |
| joined      | array |   是 | 我报名的活动列表   |

说明：

- “我的活动”至少区分“我发布的”和“我报名的”两类集合
- 两类集合中的活动项都使用统一生命周期展示口径
