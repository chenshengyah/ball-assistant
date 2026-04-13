# API Contract

## 1. 身份

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

## 2. 俱乐部

### 创建俱乐部

POST /api/clubs

### 获取我的俱乐部列表

GET /api/clubs/my

## 3. 场馆

### 获取俱乐部下场馆列表

GET /api/clubs/:clubId/venues

### 创建场馆

POST /api/venues

### 更新场馆

PUT /api/venues/:venueId

## 4. 场地

### 获取场馆下场地列表

GET /api/venues/:venueId/courts

### 创建场地

POST /api/courts

### 更新场地

PUT /api/courts/:courtId

### 停用场地

POST /api/courts/:courtId/disable

## 5. 活动

### 创建活动

POST /api/activities

### 获取活动详情

GET /api/activities/:activityId

### 获取活动列表

GET /api/activities

### 再次发布活动初始化

GET /api/activities/:activityId/republish-draft

## 6. 报名

### 报名活动

POST /api/activities/:activityId/signups

### 取消报名

POST /api/activities/:activityId/signups/cancel

### 获取报名列表

GET /api/activities/:activityId/signups
