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
  "avatarColor": "#4C7CF0",
  "phoneNumber": "13800138000",
  "phoneCountryCode": "86",
  "phoneVerifiedAt": "2026-04-19T12:00:00.000Z",
  "baseProfileComplete": true,
  "contactProfileComplete": true,
  "isProfileComplete": true
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

### 验证并保存当前用户手机号

POST /api/users/me/phone-number

请求：

```json
{
  "code": "1af3d52c9b7e2d4f90"
}
```

说明：

- `code` 来自微信小程序 `button open-type="getPhoneNumber"` 的回调
- 前端只上传 `code`
- 后端通过微信 `phonenumber.getPhoneNumber` 换取手机号并保存
- 该能力依赖 `WECHAT_MINIAPP_APP_ID / WECHAT_MINIAPP_APP_SECRET`

## 1.1 登录

### 微信登录

POST /api/auth/wechat/login

返回：

```json
{
  "accessToken": "jwt-token",
  "baseProfileComplete": true,
  "contactProfileComplete": false,
  "isProfileComplete": false,
  "user": {
    "userId": "user-current",
    "nickname": "小陈",
    "gender": "MALE",
    "avatarUrl": "",
    "avatarColor": "#4C7CF0",
    "phoneNumber": "",
    "phoneCountryCode": "",
    "phoneVerifiedAt": "",
    "baseProfileComplete": true,
    "contactProfileComplete": false,
    "isProfileComplete": false
  }
}
```

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

说明：

- 场馆定位默认由微信小程序原生 `wx.chooseLocation` 提供选点结果
- 当前版本要求至少回填地点名、详细地址、纬度、经度
- `province / city / district` 为可选结构化字段，可由选点结果补充或由用户手动修正
- 该能力可由创建活动页直接调用，不强制用户先进入独立管理页

### 更新场馆

PUT /api/venues/:venueId

说明：

- 创建活动页允许直接编辑当前选中场馆的定位与基础信息

## 5. 场地

### 获取场馆下场地列表

GET /api/venues/:venueId/courts

### 创建场地

POST /api/courts

### 更新场地

PUT /api/courts/:courtId

### 删除场地

产品动作说明：

- PRD 对外统一使用“删除场地”动作名
- 当前版本不强制要求真实硬删除接口
- 若需要兼容历史活动引用，可继续映射为停用或归档实现

当前兼容接口：

POST /api/courts/:courtId/disable

## 6. 活动

### 创建活动

POST /api/activities

请求示例：

```json
{
  "ownerType": "CLUB",
  "ownerId": "club_1",
  "title": "周一晚场双打局",
  "signupMode": "USER_SELECT_COURT",
  "venueId": "venue_1",
  "activityDate": "2026-04-20",
  "startTime": "19:30",
  "endTime": "21:30",
  "cancelCutoffMinutesBeforeStart": 120,
  "descriptionRichtext": "<p>新手友好，建议自带水和毛巾。</p><img src=\"https://cdn.example.com/activity/detail-1.jpg\" />",
  "courts": [
    {
      "venueCourtId": "court_1",
      "capacity": 8,
      "sortOrder": 1
    }
  ]
}
```

说明：

- `descriptionRichtext` 用于承载活动图文详情富文本内容
- 当前版本支持文字段落与图片混排
- 当前版本不支持视频、外链、表格和复杂排版
- `signupMode = GENERAL` 表示 `统一分配`：用户先报名，不选择场地，后续分场不在系统内处理
- `signupMode = USER_SELECT_COURT` 表示 `自主选场`：主办方在创建页维护本次活动场地列表，用户报名时选择具体场地
- `courts[]` 表示本次活动开放报名的场地列表，不要求用户先理解场地主数据的启用或停用状态

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
  "ownerDisplay": {
    "mode": "CLUB",
    "name": "企鹅羽球俱乐部",
    "contactName": "阿鹏",
    "contactPhoneMasked": "139****5678"
  },
  "signupMode": "USER_SELECT_COURT",
  "venueId": "venue_1",
  "venueSnapshotName": "浦东金桥羽毛球馆",
  "activityStartAt": "2026-04-20T19:30:00+08:00",
  "activityEndAt": "2026-04-20T21:30:00+08:00",
  "cancelDeadlineAt": "2026-04-20T17:30:00+08:00",
  "descriptionRichtext": "<p>新手友好，建议自带水和毛巾。</p><img src=\"https://cdn.example.com/activity/detail-1.jpg\" />",
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
    "canEditDetailContent": true,
    "canMoveRegistration": true,
    "canRepublish": true
  }
}
```

说明：

- `status` 只保留持久状态：`DRAFT / PUBLISHED / CANCELLED`
- `lifecycleStatusLabel`、`signupStatusLabel`、`isInProgress`、`isFinished` 都是派生展示态
- 活动详情页是活动发布后的主承接页面，报名、取消报名、取消活动、调场、调容量、再次发布都以该页为中心
- `descriptionRichtext` 为活动图文详情主字段，详情页负责展示，主办方可在详情页内继续编辑
- `GENERAL` 下只返回统一报名视图，不提供后续场地分配动作
- 动作是否可执行，以活动状态与动作矩阵定义的守卫条件为准
- `ownerDisplay` 为发布主体快照
- `PERSONAL` 活动联系方式来自用户已验证手机号
- `CLUB` 活动联系方式来自俱乐部资料中的 `contactName / contactPhone`

### 编辑活动图文详情

PUT /api/activities/:activityId/detail-content

请求：

```json
{
  "descriptionRichtext": "<p>今晚活动增加新手说明，请提前10分钟到场。</p><img src=\"https://cdn.example.com/activity/detail-2.jpg\" />"
}
```

说明：

- 仅更新 `descriptionRichtext`
- 不承担时间、场馆、容量、报名模式等其他活动字段编辑
- 守卫条件以活动状态与动作矩阵为准：主办方且活动未结束、未取消

### 取消活动

POST /api/activities/:activityId/cancel

### 获取活动列表

GET /api/activities

### 再次发布活动初始化

GET /api/activities/:activityId/republish-draft

说明：

- 返回结果需包含最新 `descriptionRichtext`
- 再次发布默认带回最新一次保存的图文详情内容

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
