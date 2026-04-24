# 数据字典

本文以当前仓库已实现与本轮冻结口径为准，重点收敛活动创建、俱乐部、场馆和联系人展示字段。

## UserProfile

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| userId | string | 是 | 用户 ID |
| nickname | string | 是 | 用户昵称 |
| gender | enum | 是 | `MALE / FEMALE` |
| avatarUrl | string | 否 | 用户头像 URL |
| avatarColor | string | 否 | 占位头像色值 |
| phoneNumber | string | 否 | 已验证手机号 |
| phoneCountryCode | string | 否 | 手机区号，如 `86` |
| phoneVerifiedAt | string | 否 | 手机号验证时间 |
| baseProfileComplete | boolean | 否 | 基础资料是否已完善 |
| contactProfileComplete | boolean | 否 | 联系方式是否已完善 |
| isProfileComplete | boolean | 否 | 基础资料与联系方式是否都齐 |
| status | enum | 否 | `ACTIVE / INACTIVE` |
| createdAt | string | 否 | 创建时间 |
| updatedAt | string | 否 | 更新时间 |

说明：

- `baseProfileComplete` 当前按基础资料是否齐全判断
- `contactProfileComplete` 表示已完成手机号验证
- 创建活动和报名活动统一依赖手机号验证，不再要求填写微信号

## ActivityCreateContext

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| defaultOwnerType | enum | 是 | 默认高亮角色，`PERSONAL / CLUB` |
| lastSelectedClubId | string | 否 | 上次选中的俱乐部 ID |
| personalCard | object | 是 | 个人角色卡上下文 |
| clubCard | object | 是 | 俱乐部角色卡上下文 |

### ActivityCreateContext.personalCard

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| status | enum | 是 | `READY / NEEDS_PROFILE / NEEDS_PHONE` |
| label | string | 是 | 固定展示文案 |
| nickname | string | 否 | 当前用户昵称 |
| phoneMasked | string | 否 | 已验证手机号的脱敏展示 |

### ActivityCreateContext.clubCard

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| status | enum | 是 | `NO_CLUB / NEEDS_CLUB_PROFILE / NEEDS_CLUB_PHONE / READY` |
| selectedClubId | string | 否 | 当前默认选中的俱乐部 |
| selectedClubName | string | 否 | 当前默认选中的俱乐部名 |
| availableClubs | array | 是 | 当前用户拥有的俱乐部列表 |

## PublishIdentity

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| identityId | string | 是 | 身份 ID |
| identityType | enum | 是 | `PERSONAL / CLUB` |
| identityName | string | 是 | 显示名称 |
| clubId | string | 否 | 俱乐部身份时有值 |
| isDefault | boolean | 是 | 是否默认身份 |
| status | enum | 是 | `ACTIVE / DISABLED` |

说明：

- 每个用户默认有一个 `PERSONAL`
- 当前版本 `CLUB` 身份只返回当前用户为 `OWNER` 的俱乐部

## AssetImage

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| assetKey | string | 是 | 资源唯一键 |
| assetUrl | string | 是 | 可直接访问的资源 URL |
| mimeType | string | 是 | 图片 MIME 类型 |

说明：

- 当前实现使用本地磁盘存储
- 前端只依赖 `assetUrl` 展示，不感知底层存储介质

## Club

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| clubId | string | 是 | 俱乐部 ID |
| clubName | string | 是 | 俱乐部名称 |
| category | enum | 是 | 当前固定 `BADMINTON` |
| coverUrl | string | 否 | 俱乐部封面 |
| logoUrl | string | 否 | 俱乐部 Logo |
| description | string | 否 | 俱乐部简介 |
| province | string | 否 | 省份 |
| city | string | 否 | 城市 |
| district | string | 否 | 区县 |
| address | string | 否 | 详细地址 |
| latitude | number | 否 | 纬度，内部存储 |
| longitude | number | 否 | 经度，内部存储 |
| wechatId | string | 否 | 俱乐部微信号 |
| contactName | string | 否 | 联系人 |
| contactPhone | string | 否 | 联系电话 |
| status | enum | 是 | `ACTIVE / DISABLED` |
| createdAt | string | 是 | 创建时间 |
| updatedAt | string | 是 | 更新时间 |

说明：

- `contactPhone` 是俱乐部可发布的硬性前置字段
- 经纬度对用户不直接展示，但继续存储，供定位和后续能力使用

## ClubMember

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| id | string | 是 | 主键 |
| clubId | string | 是 | 俱乐部 ID |
| userId | string | 是 | 用户 ID |
| role | enum | 是 | `OWNER / ADMIN / MEMBER` |

说明：

- 本轮创建活动与发布身份链路只开放 `OWNER`
- `ADMIN / MEMBER` 数据结构保留，待后续扩展

## Venue

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| venueId | string | 是 | 场馆 ID |
| ownerType | enum | 是 | `PERSONAL / CLUB` |
| ownerId | string | 是 | `userId` 或 `clubId` |
| venueName | string | 是 | 场馆名称 |
| shortName | string | 否 | 简称 |
| province | string | 否 | 省份 |
| city | string | 否 | 城市 |
| district | string | 否 | 区县 |
| address | string | 是 | 详细地址 |
| latitude | number | 否 | 纬度，内部存储 |
| longitude | number | 否 | 经度，内部存储 |
| navigationName | string | 否 | 导航名称 |
| status | enum | 是 | `ACTIVE / DISABLED` |

说明：

- 场馆归属统一收敛为 owner 口径，不再只按俱乐部挂载
- 创建活动页和场馆管理半屏只向用户展示地点名、地址和省市区

## Court

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| courtId | string | 是 | 场地 ID |
| venueId | string | 是 | 所属场馆 |
| courtCode | string | 是 | 场地号 |
| courtName | string | 是 | 场地名称 |
| defaultCapacity | number | 否 | 默认人数 |
| sortOrder | number | 否 | 排序 |
| status | enum | 是 | `ACTIVE / INACTIVE` |

说明：

- 对外动作仍表达为“删除场地”
- 当前实现通过 `INACTIVE` 兼容历史活动引用

## Activity

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| activityId | string | 是 | 活动 ID |
| ownerType | enum | 是 | `PERSONAL / CLUB` |
| ownerId | string | 是 | `userId` 或 `clubId` |
| clubId | string | 否 | 俱乐部发布时有值 |
| personalOwnerId | string | 否 | 个人发布时有值 |
| title | string | 是 | 活动标题 |
| coverUrl | string | 否 | 活动封面 |
| activityDate | string | 否 | 页面层使用的日期字段 |
| startTime | string | 否 | 页面层使用的开始时间 |
| endTime | string | 否 | 页面层使用的结束时间 |
| activityStartAt | string | 是 | 活动开始时间 |
| activityEndAt | string | 是 | 活动结束时间 |
| cancelCutoffMinutesBeforeStart | number | 是 | 开始前停止取消分钟数 |
| cancelDeadlineAt | string | 是 | 停止取消时间 |
| venueId | string | 是 | 场馆 ID |
| venueSnapshotName | string | 是 | 场馆名称快照 |
| signupMode | enum | 是 | `GENERAL / USER_SELECT_COURT` |
| chargeMode | enum | 是 | `FREE / FIXED / AA / OTHER` |
| chargeAmountCents | number | 否 | 收费金额，单位分 |
| chargeDesc | string | 否 | 收费说明 |
| totalCapacity | number | 否 | `GENERAL` 模式下总人数 |
| descriptionRichtext | string | 否 | 活动图文详情 |
| ownerDisplayContactName | string | 否 | 发布主体联系人快照 |
| ownerDisplayContactPhone | string | 否 | 发布主体联系电话快照 |
| status | enum | 是 | `DRAFT / PUBLISHED / CANCELLED` |
| createdBy | string | 是 | 创建人 ID |
| createdAt | string | 是 | 创建时间 |
| updatedAt | string | 是 | 更新时间 |

说明：

- `organizerWechat` 已移除，不再属于活动模型
- 联系方式来自发布主体快照：
  - 个人发布取当前用户已验证手机号
  - 俱乐部发布取俱乐部联系人手机号

## OwnerDisplay

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| mode | enum | 是 | `PERSONAL / CLUB` |
| name | string | 是 | 发布主体名称 |
| avatarUrl | string | 否 | 个人头像 |
| avatarColor | string | 否 | 个人占位头像色 |
| logoUrl | string | 否 | 俱乐部 Logo |
| contactName | string | 否 | 对外联系人 |
| contactPhoneMasked | string | 否 | 脱敏手机号 |

说明：

- `OwnerDisplay` 是活动发布时写入的展示快照
- 默认只对外展示脱敏手机号，不直接返回完整号码给详情页

## ActivityCourt

| 字段名 | 类型 | 必填 | 说明 |
| --- | --- | ---: | --- |
| id | string | 是 | 主键 |
| activityId | string | 是 | 活动 ID |
| venueCourtId | string | 是 | 原始场地 ID |
| courtCodeSnapshot | string | 是 | 场地号快照 |
| courtNameSnapshot | string | 是 | 场地名快照 |
| capacity | number | 否 | 本次活动人数上限 |
| feeSnapshotCents | number | 否 | 费用快照 |
| descriptionSnapshot | string | 否 | 说明快照 |
| sortOrder | number | 否 | 排序 |

说明：

- `USER_SELECT_COURT` 模式下，报名记录落到具体活动场地
- 场地主数据后续停用，不影响历史活动快照展示
