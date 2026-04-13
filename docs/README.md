# 文档导航

`docs/` 目录按“全局文档 / 页面文档 / 进度记录 / 归档文档”组织，后续新增页面文档时统一落到 `pages/<page-slug>/` 下，避免继续平铺。

推荐阅读顺序：

1. 先看全局文档，理解产品范围、流程和统一数据口径
2. 再看进度记录，了解当前开发准备做到哪一步
3. 再看页面文档，进入具体页面 PRD 和页面级规则
4. 最后看归档文档，仅用于兼容旧链接或追溯历史说明

## 全局文档

- [MVP 总览](./global/mvp-overview.md)：产品目标、阶段范围、核心页面
- [用户流程](./global/user-flow.md)：跨页面主流程与关键承接关系
- [API Contract](./global/api-contract.md)：接口契约与资源边界
- [数据字典](./global/data-dictionary.md)：领域对象、字段定义、枚举口径

## 页面文档

- [创建活动](./pages/activity-create/README.md)：活动创建页 PRD
- [创建活动字段规则](./pages/activity-create/form-rules.md)：创建活动页的补充校验规则
- [俱乐部注册](./pages/club-register/README.md)：俱乐部主体创建与回跳承接
- [场馆与场地管理](./pages/venue-court-management/README.md)：场馆主数据和场地主数据维护
- [用户建档/注册](./pages/user-registration/README.md)：用户首次建档规则，包含昵称与性别必填口径

## 进度记录

- [MVP 前期开发准备进度](./progress/mvp-progress.md)：记录产品目标、文档收敛、流程拆解和原型准备等前期工作进度
- [MVP 前期规划顺序](./progress/planning-order.md)：说明当前应先规划什么、后规划什么，以及每一步要产出什么

## 归档文档

- [俱乐部身份与注册产品文档（已合并）](./archive/club-identity-prd.md)：仅保留兼容说明，不再作为主入口维护

## 命名规则

- 全局文档统一放在 `docs/global/`，按主题命名
- 页面主 PRD 统一使用 `docs/pages/<page-slug>/README.md`
- 进度记录统一放在 `docs/progress/`，按阶段或主题命名
- 页面配套规则、补充说明放在同级目录下
- 已废弃或已合并文档统一迁移到 `docs/archive/`
