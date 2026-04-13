## PublishIdentity

| 字段名       | 类型    | 必填 | 说明              |
| ------------ | ------- | ---: | ----------------- |
| identityId   | string  |   是 | 身份ID            |
| identityType | enum    |   是 | USER / CLUB       |
| identityName | string  |   是 | 显示名称          |
| clubId       | string  |   否 | 俱乐部身份时有值  |
| isDefault    | boolean |   是 | 是否默认身份      |
| status       | enum    |   是 | ACTIVE / DISABLED |

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
| publishIdentityType | enum    |   是 | USER / CLUB                                       |
| clubId              | string  |   否 | 俱乐部发布时有值                                  |
| title               | string  |   是 | 活动标题                                          |
| activityDate        | string  |   是 | 活动日期 YYYY-MM-DD                               |
| startTime           | string  |   是 | 开始时间 HH:mm                                    |
| endTime             | string  |   是 | 结束时间 HH:mm                                    |
| venueId             | string  |   是 | 场馆ID                                            |
| venueNameSnapshot   | string  |   是 | 场馆名称快照                                      |
| signupMode          | enum    |   是 | GENERAL / COURT_BASED                             |
| feeType             | enum    |   是 | FREE / FIXED                                      |
| feeAmount           | number  |   否 | 固定收费金额                                      |
| capacity            | number  |   是 | 总人数上限                                        |
| allowWaitlist       | boolean |   是 | 是否允许候补                                      |
| description         | string  |   否 | 活动说明                                          |
| status              | enum    |   是 | DRAFT / PUBLISHED / CLOSED / FINISHED / CANCELLED |
| createdBy           | string  |   是 | 创建人ID                                          |
| createdAt           | string  |   是 | 创建时间                                          |
| updatedAt           | string  |   是 | 更新时间                                          |

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
