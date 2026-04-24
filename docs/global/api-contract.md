# API Contract

本文只保留当前仓库已实现或已冻结的 MVP 口径，重点覆盖“创建活动角色分流、手机号联系口径、封面上传、owner 维度场馆管理”。

## 1. 用户

### 获取当前用户资料

GET `/api/users/me`

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

### 更新当前用户基础资料

PUT `/api/users/me/profile`

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
- `gender` 必填，枚举为 `MALE / FEMALE`
- 创建活动链路中的个人补齐半屏与“我的”里的独立资料页共用这套资料能力

### 验证并保存当前用户手机号

POST `/api/users/me/phone-number`

请求：

```json
{
  "code": "1af3d52c9b7e2d4f90"
}
```

说明：

- `code` 来自微信小程序 `button open-type="getPhoneNumber"`
- 创建活动和报名活动统一依赖该手机号验证能力
- 创建活动不再额外采集主办方微信号

## 2. 登录

### 微信登录

POST `/api/auth/wechat/login`

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

## 3. 创建活动上下文与发布身份

### 获取创建页角色卡上下文

GET `/api/activity-create/context`

返回：

```json
{
  "defaultOwnerType": "PERSONAL",
  "lastSelectedClubId": "club_1",
  "personalCard": {
    "status": "READY",
    "label": "个人",
    "nickname": "小陈",
    "phoneMasked": "138****8000"
  },
  "clubCard": {
    "status": "READY",
    "selectedClubId": "club_1",
    "selectedClubName": "企鹅羽球俱乐部",
    "availableClubs": [
      {
        "clubId": "club_1",
        "clubName": "企鹅羽球俱乐部",
        "status": "READY",
        "contactName": "阿鹏",
        "contactPhone": "13900005678"
      }
    ]
  }
}
```

说明：

- 该接口服务于创建页顶部两张角色卡，不等同于“真实可发布身份列表”
- `personalCard.status` 枚举：`READY / NEEDS_PROFILE / NEEDS_PHONE`
- `clubCard.status` 枚举：`NO_CLUB / NEEDS_CLUB_PROFILE / NEEDS_CLUB_PHONE / READY`
- 创建活动页进入时只要求已登录，不因资料不完整而整页跳转

### 获取真实可发布身份

GET `/api/publish-identities`

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
    "identityName": "企鹅羽球俱乐部",
    "clubId": "club_1",
    "isDefault": false,
    "status": "ACTIVE"
  }
]
```

说明：

- 所有用户默认至少返回一个 `PERSONAL`
- 当前版本 `CLUB` 只返回当前用户为 `OWNER` 的俱乐部
- `ADMIN / MEMBER` 数据结构仍保留，但不进入本轮创建活动发布链路

## 4. 图片上传

### 上传图片资源

POST `/api/assets/images`

请求：

- `multipart/form-data`
- 文件字段：上传图片文件
- 表单字段：`scene`

`scene` 可选值：

- `activity-cover`
- `activity-detail`
- `club-cover`
- `club-logo`

返回：

```json
{
  "assetKey": "activity-cover/1713785023000-uuid.jpg",
  "assetUrl": "/api/uploads/activity-cover/1713785023000-uuid.jpg",
  "mimeType": "image/jpeg"
}
```

说明：

- 当前实现采用“本地磁盘存储 + 静态资源访问”
- 对前端协议固定为 `assetKey / assetUrl / mimeType`
- 后续切换对象存储时，不改前端调用结构

## 5. 俱乐部

### 创建俱乐部

POST `/api/clubs`

请求示例：

```json
{
  "name": "企鹅羽球俱乐部",
  "category": "BADMINTON",
  "coverUrl": "/api/uploads/club-cover/cover.jpg",
  "logoUrl": "/api/uploads/club-logo/logo.jpg",
  "description": "每周固定双打局",
  "province": "上海市",
  "city": "上海市",
  "district": "浦东新区",
  "address": "金桥路 88 号",
  "latitude": 31.2501,
  "longitude": 121.6123,
  "wechatId": "penguin-club",
  "contactName": "阿鹏",
  "contactPhone": "13900005678"
}
```

说明：

- 创建成功后，后端同步创建一条 `ClubMember(role=OWNER)`
- `contactPhone` 是俱乐部可发布的必填前提字段

### 更新俱乐部

PUT `/api/clubs/:clubId`

说明：

- 仅俱乐部 `OWNER` 可操作
- 用于俱乐部管理页保存基础资料、地点、联系人和联系方式
- 保存后创建活动页的俱乐部角色卡应刷新可发布状态

### 获取我的俱乐部

GET `/api/clubs/my`

说明：

- 当前返回口径为“我拥有的俱乐部”
- 与发布身份口径一致，仅覆盖 `OWNER`
- 用于“我的”俱乐部入口判断：无俱乐部进入注册，有俱乐部进入俱乐部管理

## 6. 场馆与场地

### 获取场馆列表

GET `/api/venues?ownerType=PERSONAL&ownerId=user-current`

说明：

- 场馆按 owner 归属统一查询，不再只按 club 查询
- `ownerType = PERSONAL | CLUB`
- 个人发布使用自己的场馆，俱乐部发布使用俱乐部场馆

### 创建场馆

POST `/api/venues`

请求示例：

```json
{
  "ownerType": "CLUB",
  "ownerId": "club_1",
  "name": "浦东金桥羽毛球馆",
  "shortName": "金桥馆",
  "province": "上海市",
  "city": "上海市",
  "district": "浦东新区",
  "address": "金桥路 88 号",
  "latitude": 31.2501,
  "longitude": 121.6123,
  "navigationName": "浦东金桥羽毛球馆"
}
```

说明：

- 经纬度继续存储和入库
- 前端创建链路只向用户展示地点名和地址，不展示经纬度数值

### 更新场馆

PUT `/api/venues/:venueId`

### 创建场地

POST `/api/courts`

### 更新场地

PUT `/api/courts/:courtId`

### 停用场地

POST `/api/courts/:courtId/disable`

说明：

- 产品对外动作仍统一表达为“删除场地”
- 当前实现用停用兼容历史活动引用

## 7. 活动

### 创建活动

POST `/api/activities`

请求示例：

```json
{
  "ownerType": "CLUB",
  "ownerId": "club_1",
  "coverUrl": "/api/uploads/activity-cover/activity-cover.jpg",
  "title": "周一晚场双打局",
  "chargeMode": "AA",
  "chargeAmountCents": 3500,
  "chargeDesc": "含场地和球",
  "activityDate": "2026-04-20",
  "startTime": "19:30",
  "endTime": "21:30",
  "cancelCutoffMinutesBeforeStart": 120,
  "venueId": "venue_1",
  "signupMode": "USER_SELECT_COURT",
  "totalCapacity": null,
  "courts": [
    {
      "venueCourtId": "court_1",
      "capacity": 8,
      "sortOrder": 1
    }
  ],
  "descriptionRichtext": "<p>新手友好，建议自带水和毛巾。</p>"
}
```

服务端校验：

- `PERSONAL` 发布时，`ownerId` 必须等于当前 `userId`
- `PERSONAL` 发布必须已完成手机号验证
- `CLUB` 发布必须是目标俱乐部 `OWNER`
- `CLUB` 发布必须具备俱乐部联系人手机号
- `venue.ownerType / ownerId` 必须与活动发布主体一致
- `organizerWechat` 不再存在于请求体

### 获取活动详情

GET `/api/activities/:activityId`

返回示例：

```json
{
  "activityId": "activity_1",
  "status": "PUBLISHED",
  "ownerType": "CLUB",
  "ownerId": "club_1",
  "ownerLabel": "企鹅羽球俱乐部",
  "ownerDisplay": {
    "mode": "CLUB",
    "name": "企鹅羽球俱乐部",
    "contactName": "阿鹏",
    "contactPhoneMasked": "139****5678"
  },
  "title": "周一晚场双打局",
  "coverUrl": "/api/uploads/activity-cover/activity-cover.jpg",
  "chargeMode": "AA",
  "chargeAmountCents": 3500,
  "chargeDesc": "含场地和球",
  "venueId": "venue_1",
  "venueSnapshotName": "浦东金桥羽毛球馆",
  "activityStartAt": "2026-04-20T11:30:00.000Z",
  "activityEndAt": "2026-04-20T13:30:00.000Z",
  "cancelDeadlineAt": "2026-04-20T09:30:00.000Z",
  "cancelCutoffMinutesBeforeStart": 120,
  "descriptionRichtext": "<p>新手友好，建议自带水和毛巾。</p>",
  "signupMode": "USER_SELECT_COURT",
  "totalCapacity": null,
  "isSignupOpen": true,
  "courts": [
    {
      "id": "activity_court_1",
      "venueCourtId": "court_1",
      "label": "1号场",
      "code": "A1",
      "capacity": 8,
      "confirmedCount": 4,
      "waitlistCount": 0
    }
  ]
}
```

说明：

- `coverUrl` 为活动封面，选填
- 联系方式来自发布主体快照：
  - `PERSONAL` 使用当前用户已验证手机号
  - `CLUB` 使用俱乐部联系人手机号
- 对外默认只返回脱敏手机号展示字段

## 8. 接口落地分段

本节用于对齐页面 PRD、状态机和当前后端实现状态。页面文档可以继续描述完整 MVP 行为，但开发排期需要按以下分段推进。

### 8.1 当前已实现或已冻结口径

- 用户与登录：
  - `GET /api/users/me`
  - `PATCH /api/users/me`
  - `POST /api/users/me/phone-number`
  - `POST /api/auth/wechat-login`
- 创建活动前置：
  - `GET /api/activity-create/context`
  - `GET /api/publish-identities`
- 图片资源：
  - `POST /api/assets/images`
- 俱乐部：
  - `POST /api/clubs`
  - `PATCH /api/clubs/:clubId`
  - `GET /api/clubs/mine`
- 场馆与场地：
  - `GET /api/venues?ownerType=&ownerId=`
  - `POST /api/venues`
  - `PUT /api/venues/:venueId`
  - `POST /api/courts`
  - `PUT /api/courts/:courtId`
  - `POST /api/courts/:courtId/disable`
- 活动：
  - `POST /api/activities`
  - `GET /api/activities/:activityId`

### 8.2 P0 待补接口

这些接口直接支撑当前 P0 页面流程，补齐前可以继续用小程序本地 mock 验证交互，但真实联调需要按本组优先实现。

- 活动列表：
  - `GET /api/activities`
  - 用于首页和活动列表公共浏览
  - 需支持游客态公开浏览和已登录用户态摘要
- 我的活动：
  - `GET /api/my/activities?view=published|joined`
  - 用于“我发布的 / 我报名的”集合回收
  - 需返回可进入详情页的条目摘要
- 再次发布：
  - `GET /api/activities/:activityId/republish-draft`
  - 用于创建活动页带出原活动配置
  - 不修改原活动状态
- 报名：
  - `POST /api/activities/:activityId/signups`
  - 用于 `GENERAL` 直接报名和 `USER_SELECT_COURT` 指定场地报名
  - 需返回确认或候补结果
- 取消报名：
  - `POST /api/activities/:activityId/signups/cancel`
  - 用于当前用户取消自己的有效报名记录
  - 守卫条件以 [活动状态与动作矩阵](./activity-state-machine.md) 为准
- 报名名单：
  - `GET /api/activities/:activityId/signups`
  - 用于活动详情页展示统一报名名单或场地报名名单

### 8.3 P0 管理动作待补接口

这些接口支撑活动详情页的主办方最小管理动作。若开发排期需要拆分，可优先补取消活动和图文详情编辑，再补调场与调容量。

- 编辑图文详情：
  - `PUT /api/activities/:activityId/detail-content`
  - 保存后活动状态不变
- 取消活动：
  - `POST /api/activities/:activityId/cancel`
  - 成功后 `PUBLISHED -> CANCELLED`
- 调场：
  - `POST /api/activities/:activityId/signups/:registrationId/move`
  - 仅 `USER_SELECT_COURT` 模式使用
  - 移动后按目标场地容量重新计算确认或候补状态
- 调容量：
  - `PUT /api/activities/:activityId/courts/:activityCourtId/capacity`
  - `USER_SELECT_COURT` 模式调整场地容量
  - 后续若 `GENERAL` 也开放活动总容量调整，可另补活动级容量接口

### 8.4 P1 暂缓接口

以下能力不阻塞当前 MVP 主链路，保持产品口径但不进入 P0 接口补齐。

- 在线支付、退款、结算
- 聊天、评论、通知中心
- 俱乐部成员邀请、审批和多层级权限
- 活动复杂统计和经营分析
- 活动结束后的评价、复盘和图片沉淀

说明：

- 页面 PRD 中的报名、取消报名和主办方管理动作仍按 MVP 目标描述。
- 当前代码若仍使用本地 mock，应在实现真实接口时对照本节逐项替换。
- 所有动作守卫以 [活动状态与动作矩阵](./activity-state-machine.md) 为准，字段命名以 [数据字典](./data-dictionary.md) 为准。
