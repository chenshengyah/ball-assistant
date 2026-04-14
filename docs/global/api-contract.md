# API Contract

## 1. 用户

### 获取当前用户资料

GET /api/users/me

返回：

```json
{
  "userId": "user-current",
  "nickname": "小陈",
  "gender": "MALE",
  "avatarUrl": "",
  "avatarColor": "#4C7CF0"
}
```

### 提交或更新当前用户资料

PUT /api/users/me/profile

请求：

```json
{
  "nickname": "小陈",
  "gender": "MALE",
  "avatarUrl": ""
}
```

说明：

- `nickname` 必填
- `gender` 必填，枚举仅允许 `MALE / FEMALE`
- 当前版本不提供“未设置”状态

## 2. 身份

### 获取当前用户可用发布身份

GET /api/publish-identities

返回：

```json
[
  {
    "identityId": "identity_personal_user-current",
    "identityType": "PERSONAL",
    "identityName": "个人",
    "isDefault": true,
    "status": "ACTIVE"
  },
  {
    "identityId": "identity_club_club_1",
    "identityType": "CLUB",
    "identityName": "羽毛球俱乐部A",
    "clubId": "club_1",
    "isDefault": false,
    "status": "ACTIVE"
  }
]
```

说明：

- `identityType` 统一枚举为 `PERSONAL / CLUB`
- 所有用户默认至少返回一个 `PERSONAL` 发布身份
- `CLUB` 身份仅在当前用户为该俱乐部 `OWNER / ADMIN` 时返回
- 俱乐部 `MEMBER` 不作为可发布身份返回

## 3. 俱乐部

### 创建俱乐部

POST /api/clubs

### 获取我的俱乐部列表

GET /api/clubs/my

## 4. 场馆

### 获取俱乐部下场馆列表

GET /api/clubs/:clubId/venues

### 创建场馆

POST /api/venues

### 更新场馆

PUT /api/venues/:venueId

## 5. 场地

### 获取场馆下场地列表

GET /api/venues/:venueId/courts

### 创建场地

POST /api/courts

### 更新场地

PUT /api/courts/:courtId

### 停用场地

POST /api/courts/:courtId/disable

## 6. 活动

### 创建活动

POST /api/activities

### 获取活动详情

GET /api/activities/:activityId

返回最小能力要求：

```json
{
  "activityId": "activity_1",
  "status": "PUBLISHED",
  "lifecycleStatusLabel": "报名中",
  "signupStatusLabel": "报名中",
  "ownerType": "CLUB",
  "ownerId": "club_1",
  "ownerLabel": "企鹅羽球俱乐部",
  "signupMode": "USER_SELECT_COURT",
  "venueId": "venue_1",
  "venueSnapshotName": "浦东金桥羽毛球馆",
  "activityStartAt": "2026-04-20T19:30:00+08:00",
  "activityEndAt": "2026-04-20T21:30:00+08:00",
  "cancelDeadlineAt": "2026-04-20T17:30:00+08:00",
  "isSignupOpen": true,
  "isInProgress": false,
  "isFinished": false,
  "isManageable": true,
  "currentUserRegistrationId": "signup_1",
  "currentUserSignupLabel": "1号场 · 已确认",
  "canCancelCurrentUserRegistration": true,
  "permissions": {
    "canCancelActivity": true,
    "canAdjustCapacity": true,
    "canMoveRegistration": true,
    "canRepublish": true
  }
}
```

说明：

- `status` 只保留持久状态：`DRAFT / PUBLISHED / CANCELLED`
- `lifecycleStatusLabel`、`signupStatusLabel`、`isInProgress`、`isFinished` 都是派生展示态
- 活动详情页是活动发布后的主承接页面，报名、取消报名、取消活动、调场、调容量、再次发布都以该页为中心
- 动作是否可执行，以活动状态与动作矩阵定义的守卫条件为准

### 取消活动

POST /api/activities/:activityId/cancel

### 获取活动列表

GET /api/activities

### 再次发布活动初始化

GET /api/activities/:activityId/republish-draft

### 获取我的活动

GET /api/my/activities?view=published|joined

说明：

- `published` 表示“我发布的”活动集合
- `joined` 表示“我报名的”活动集合
- 返回项沿用活动详情页一致的生命周期展示口径，便于进入详情页前先显示当前状态

## 7. 报名

### 报名活动

POST /api/activities/:activityId/signups

### 取消报名

POST /api/activities/:activityId/signups/cancel

### 获取报名列表

GET /api/activities/:activityId/signups

说明：

- 报名、候补、取消报名全部以个人身份处理
- 当前版本不存在“以俱乐部身份报名”活动的接口
- 用户取消自己的报名与主办方取消整个活动属于两类不同资源动作
