
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
- **编码**：新建时可省略 `code`，后端自动生成短随机串；更新时不允许修改编码；同租户/类型/语言下编码不可重复。
- **权限控制**：通过 `getAuthenticate` 方法实现接口的权限验证。
- **可选租户**：注册时传入 `tenant: fastify.tenant` 即可按租户隔离数据。

### 配置

| 选项 | 默认值 | 说明 |
|------|--------|------|
| `name` | `'group'` | 命名空间，挂载为 `fastify.group` |
| `dbTableNamePrefix` | `'t_'` | 表名前缀，默认表名为 `t_group_tag` |
| `prefix` | — | 路由前缀，如 `/group` |
| `getAuthenticate` | `() => []` | 按 `read` / `write` / `delete` / `admin` 返回 `onRequest` 钩子 |
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

业务路径使用 `getAuthenticate('read'|'write'|'delete')`；`/admin` 路径统一使用 `getAuthenticate('admin')`。开启租户时，admin 可通过 query/body 传入 `tenantId`。

| 接口路径                      | 方法   | 描述            | 参数                                                                                                                                                                      |
|---------------------------|------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `/group/list`             | GET  | 获取分组列表        | `type` (string): 标签类型                                                                                                                                                   |
| `/group/group-list`       | GET  | 获取分组列表（树形或列表） | `type` (string): 标签类型, `output` (string): 输出格式（`tree` 或 `list`）                                                                                                         |
| `/group/detail`           | GET  | 获取分组详情        | `id` (string): 分组ID, `code` (string): 分组编码, `type` (string): 标签类型                                                                                                       |
| `/group/save`             | POST | 保存分组数据        | `id` (string): 分组ID, `code` (string, 可选): 分组编码（新建未传时自动生成；更新时忽略）, `type` (string): 标签类型, `name` (string): 分组名称, `description` (string): 描述, `index` (number): 排序字段, `parentId` (string): 父级ID。必填：`type`、`name` |
| `/group/remove`           | POST | 删除分组数据        | `id` (string): 分组ID, `code` (string): 分组编码, `type` (string): 标签类型                                                                                                       |
| `/group/admin/list`       | GET  | 管理端获取分组列表     | 同 `/group/list`，可传 `tenantId`                                                                                                                                           |
| `/group/admin/group-list` | GET  | 管理端获取分组树/列表   | 同 `/group/group-list`，可传 `tenantId`                                                                                                                                     |
| `/group/admin/detail`     | GET  | 管理端获取分组详情     | 同 `/group/detail`，可传 `tenantId`                                                                                                                                         |
| `/group/admin/save`       | POST | 管理端保存分组数据     | 同 `/group/save`，可传 `tenantId`                                                                                                                                           |
| `/group/admin/remove`     | POST | 管理端删除分组数据     | 同 `/group/remove`，可传 `tenantId`                                                                                                                                         |
