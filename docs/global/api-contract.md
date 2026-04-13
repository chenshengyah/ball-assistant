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
[
{
"identityId": "xxx",
"identityType": "CLUB",
"identityName": "羽毛球俱乐部A",
"clubId": "club_1",
"isDefault": true,
"status": "ACTIVE"
}
]

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

### 获取活动列表

GET /api/activities

### 再次发布活动初始化

GET /api/activities/:activityId/republish-draft

## 7. 报名

### 报名活动

POST /api/activities/:activityId/signups

### 取消报名

POST /api/activities/:activityId/signups/cancel

### 获取报名列表

GET /api/activities/:activityId/signups
