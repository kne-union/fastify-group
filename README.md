
# fastify-group


### 描述

用来管理内容的分组标签信息


### 安装

```shell
npm i --save @kne/fastify-group
```


### 概述

本项目是一个基于 Fastify 的插件，用于管理分组和标签数据。主要功能包括：

- **分组管理**：支持创建、查询、更新和删除分组数据。
- **标签管理**：支持对标签进行增删改查操作，并支持树形结构展示。
- **权限控制**：通过 `getAuthenticate` 方法实现接口的权限验证。
- **可选租户**：注册时传入 `tenant: fastify.tenant` 即可按租户隔离数据。

### 配置

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `name` | `'group'` | 命名空间，挂载为 `fastify.group` |
| `dbTableNamePrefix` | `'t_'` | 表名前缀，默认表名为 `t_group_tag` |
| `prefix` | — | 路由前缀，如 `/group` |
| `getAuthenticate` | `() => []` | 按 `read` / `write` / `delete` 返回 `onRequest` 钩子 |
| `tenant` | `null` | 传入 `fastify.tenant` 开启租户隔离；不传则全局数据 |

### 示例

#### 无租户

```js
await fastify.register(require('@kne/fastify-group'), {
  prefix: '/group',
  getAuthenticate: action => [/* ... */]
});
```

#### 开启租户（需先注册 `@kne/fastify-tenant`）

```js
await fastify.register(require('@kne/fastify-tenant'), { /* ... */ });
await fastify.register(require('@kne/fastify-group'), {
  prefix: '/group',
  tenant: fastify.tenant,
  getAuthenticate: () => [
    fastify.account.authenticate.user,
    fastify.tenant.authenticate.tenantUser
  ]
});
```

开启后，Controller 会从 `request.tenantUserInfo.tenantId` 写入业务入参；鉴权需由宿主通过 `getAuthenticate` 挂上 `tenantUser`。

### 数据迁移

已有 PostgreSQL 库请执行幂等脚本：

[`migrations/001_add_tenant_id_to_tag.postgres.sql`](migrations/001_add_tenant_id_to_tag.postgres.sql)

若修改了 `dbTableNamePrefix` / `name`，请替换脚本中的表名 `t_group_tag` 及对应索引名。新库可用 Sequelize sync，或同样执行该 SQL。

### API

| 接口路径                | 方法   | 描述            | 参数                                                                                                                                                                      |
|---------------------|------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `/group/list`       | GET  | 获取分组列表        | `type` (string): 标签类型                                                                                                                                                   |
| `/group/group-list` | GET  | 获取分组列表（树形或列表） | `type` (string): 标签类型, `output` (string): 输出格式（`tree` 或 `list`）                                                                                                         |
| `/group/detail`     | GET  | 获取分组详情        | `id` (string): 分组ID, `code` (string): 分组编码, `type` (string): 标签类型                                                                                                       |
| `/group/save`       | POST | 保存分组数据        | `id` (string): 分组ID, `code` (string): 分组编码, `type` (string): 标签类型, `name` (string): 分组名称, `description` (string): 描述, `index` (number): 排序字段, `parentId` (string): 父级ID |
| `/group/remove`     | POST | 删除分组数据        | `id` (string): 分组ID, `code` (string): 分组编码, `type` (string): 标签类型                                                                                                       |
