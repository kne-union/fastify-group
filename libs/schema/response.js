// 响应 schema 会参与 fast-json-stringify 序列化：对象一律 additionalProperties: true 以免裁掉未声明字段；
// 用 nullable 而非类型数组（类型数组遇到不匹配的值会直接 500），类型不确定的字段（如 id、日期、JSON 列）只写说明不声明类型
const str = description => ({ type: 'string', nullable: true, description });
const num = description => ({ type: 'number', nullable: true, description });
const any = description => ({ description });
const list = (description, items) => ({ type: 'array', nullable: true, description, items });
const obj = (description, properties = {}) => ({ type: 'object', nullable: true, description, additionalProperties: true, properties });

const success = (description, schema) => ({
  200: Object.assign({}, schema || { type: 'object' }, { description })
});

const empty = (description = '操作成功，返回空对象') => success(description);

const pageResult = (description, item) => ({
  type: 'object',
  additionalProperties: true,
  properties: {
    pageData: list(`当前页${description}列表`, item),
    totalCount: num('符合条件的总条数')
  }
});

const tag = obj('标签', {
  id: any('标签 ID'),
  tenantId: any('租户 ID，未开启租户隔离时为 null'),
  type: str('标签类型'),
  code: str('编码，同一租户、类型、语言下唯一'),
  name: str('名称'),
  language: str('语言，默认 zh-CN'),
  description: str('描述'),
  index: num('排序字段'),
  parentId: any('父级 ID，根节点为 null'),
  options: any('扩展字段，如 { color }'),
  createdAt: any('创建时间'),
  updatedAt: any('更新时间'),
  deletedAt: any('删除时间')
});

const treeTag = obj('标签（树形输出时带 children）', Object.assign({}, tag.properties, { children: any('子节点列表，结构同本节点；没有子节点时不返回') }));

module.exports = { str, num, any, list, obj, success, empty, pageResult, tag, treeTag };
