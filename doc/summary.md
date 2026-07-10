本项目是一个基于 Fastify 的插件，用于管理分组和标签数据。主要功能包括：

- **分组管理**：支持创建、查询、更新和删除分组数据。
- **标签管理**：支持对标签进行增删改查操作，并支持树形结构展示。
- **权限控制**：通过 `getAuthenticate` 方法实现接口的权限验证。
- **可选租户**：注册时传入 `tenant: fastify.tenant` 开启按租户隔离；不传则保持全局数据。已有库需执行 `migrations/001_add_tenant_id_to_tag.postgres.sql`（幂等）。
