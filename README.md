
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

### 示例

#### 示例代码



### API

| 接口路径                | 方法   | 描述            | 参数                                                                                                                                                                      |
|---------------------|------|---------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `/group/list`       | GET  | 获取分组列表        | `type` (string): 标签类型                                                                                                                                                   |
| `/group/group-list` | GET  | 获取分组列表（树形或列表） | `type` (string): 标签类型, `output` (string): 输出格式（`tree` 或 `list`）                                                                                                         |
| `/group/detail`     | GET  | 获取分组详情        | `id` (string): 分组ID, `code` (string): 分组编码, `type` (string): 标签类型                                                                                                       |
| `/group/save`       | POST | 保存分组数据        | `id` (string): 分组ID, `code` (string): 分组编码, `type` (string): 标签类型, `name` (string): 分组名称, `description` (string): 描述, `index` (number): 排序字段, `parentId` (string): 父级ID |
| `/group/remove`     | POST | 删除分组数据        | `id` (string): 分组ID, `code` (string): 分组编码, `type` (string): 标签类型                                                                                                       |
