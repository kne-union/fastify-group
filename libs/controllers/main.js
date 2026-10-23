const fp = require('fastify-plugin');
const { success, empty, pageResult, tag, treeTag } = require('../schema/response');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  const tenantContextName = options.tenant?.options?.tenantUserContextName || 'tenantUserInfo';

  const withTenantPayload = (data, request) => {
    if (!options.tenant) {
      return data;
    }
    const tenantId =
      request[tenantContextName]?.tenantId ?? request.query?.tenantId ?? request.body?.tenantId;
    if (tenantId == null) {
      throw new Error('开启租户支持时需要 tenantUser 鉴权，请求上缺少 tenantId');
    }
    return Object.assign({}, data, { tenantId });
  };

  const registerRoutes = (routePrefix, getAuth, tags) => {
    const TENANT_HINT = '开启租户隔离时只操作当前租户（tenantUser 上下文中的租户，没有时取参数 tenantId）的数据';
    fastify.get(
      `${routePrefix}/list`,
      {
        onRequest: getAuth('read'),
        schema: {
          tags,
          summary: '获取列表',
          description: `按类型分页查询标签（不分层级），按创建时间倒序；未传 type 时报错。${TENANT_HINT}`,
          query: {
            type: 'object',
            properties: {
              type: { type: 'string', description: '标签类型，必传' },
              tenantId: { type: 'string', description: '租户 ID（admin 场景可显式传入）' },
              parentId: { description: '父级 ID，只查该节点的直接子节点' },
              filter: {
                type: 'object',
                default: {},
                description: '筛选条件',
                properties: {
                  code: { description: '编码，不区分大小写模糊匹配' },
                  name: { description: '名称，不区分大小写模糊匹配' },
                  language: { description: '语言，精确匹配' },
                  keyword: { description: '关键字，不区分大小写模糊匹配编码 / 名称 / 描述' },
                  codes: { description: '编码列表，精确匹配其中任一' }
                }
              },
              perPage: {
                type: 'number',
                default: 20,
                description: '每页条数'
              },
              currentPage: {
                type: 'number',
                default: 1,
                description: '页码，从 1 开始'
              }
            }
          },
          response: success('标签分页列表', pageResult('标签', tag))
        }
      },
      async request => {
        return services.list(withTenantPayload(request.query, request));
      }
    );

    fastify.get(
      `${routePrefix}/group-list`,
      {
        onRequest: getAuth('read'),
        schema: {
          tags,
          summary: '获取type的所有数据（树形或列表）',
          description: `返回该类型下的全部标签，默认组装成树（根节点为 parentId 为空的节点）；未传 type 时报错。${TENANT_HINT}`,
          query: {
            type: 'object',
            properties: {
              type: { type: 'string', description: '标签类型，必传' },
              tenantId: { type: 'string', description: '租户 ID（admin 场景可显式传入）' },
              language: { description: '语言，不传返回全部语言' },
              output: { type: 'string', description: '输出格式：tree 树形（默认，子节点放在 children），list 平铺列表', enum: ['tree', 'list'] }
            }
          },
          response: success('标签列表：tree 时为根节点数组（子节点在 children 中），list 时为平铺数组', { type: 'array', items: treeTag })
        }
      },
      async request => {
        return services.groupList(withTenantPayload(request.query, request));
      }
    );

    fastify.get(
      `${routePrefix}/detail`,
      {
        onRequest: getAuth('read'),
        schema: {
          tags,
          summary: '获取单条数据',
          description: `优先按 id 查询；没有 id 或未找到时，按 code + type + language（三者都传）查询。找不到返回 null。${TENANT_HINT}`,
          query: {
            type: 'object',
            properties: {
              id: {
                type: 'string',
                description: '标签 ID'
              },
              code: {
                type: 'string',
                description: '编码，与 type、language 一起使用'
              },
              type: {
                type: 'string',
                description: '标签类型，按编码查询时必传'
              },
              language: {
                type: 'string',
                description: '语言，按编码查询时必传'
              },
              parentId: { description: '父级 ID，按编码查询时可额外限定父级' },
              tenantId: { type: 'string', description: '租户 ID（admin 场景可显式传入）' }
            }
          },
          response: success('标签详情，找不到时为 null', tag)
        }
      },
      async request => {
        return services.detail(withTenantPayload(request.query, request));
      }
    );

    fastify.post(
      `${routePrefix}/save`,
      {
        onRequest: getAuth('write'),
        schema: {
          tags,
          summary: '保存一条数据',
          description: `传 id 时修改该标签（编码不可修改）；不传 id 时按 code + type + language 查找已有标签，找到则修改，否则新建（code 不传自动生成）。父级不能是自身或子孙节点。${TENANT_HINT}`,
          body: {
            type: 'object',
            properties: {
              id: { type: 'string', description: '标签 ID，修改时传入' },
              code: { type: 'string', description: '编码，新建时不传自动生成；同一租户、类型、语言下不能重复；修改时忽略' },
              type: { type: 'string', description: '标签类型' },
              name: { type: 'string', description: '名称' },
              description: { type: 'string', description: '描述' },
              index: { type: 'number', description: '排序字段' },
              parentId: { type: ['string', 'null'], description: '父级 ID，空字符串或 null 表示根节点' },
              language: {
                type: 'string',
                description: '语言，默认 zh-CN'
              },
              options: {
                type: 'object',
                additionalProperties: true,
                description: '扩展字段，如 { color }'
              },
              tenantId: { type: 'string', description: '租户 ID（admin 场景可显式传入）' }
            },
            required: ['type', 'name']
          },
          response: success('保存后的标签', tag)
        }
      },
      async request => {
        return services.save(withTenantPayload(request.body, request));
      }
    );

    fastify.post(
      `${routePrefix}/remove`,
      {
        onRequest: getAuth('delete'),
        schema: {
          tags,
          summary: '删除一条数据',
          description: `按 id，或 code + type + language 定位标签后删除（软删除，子节点不会一起删除）；标签不存在时报错。${TENANT_HINT}`,
          body: {
            type: 'object',
            properties: {
              id: { type: 'string', description: '标签 ID' },
              code: { type: 'string', description: '编码，与 type、language 一起使用' },
              type: { type: 'string', description: '标签类型，按编码删除时必传' },
              language: {
                type: 'string',
                description: '语言，按编码删除时必传'
              },
              tenantId: { type: 'string', description: '租户 ID（admin 场景可显式传入）' }
            }
          },
          response: empty('删除成功')
        }
      },
      async request => {
        await services.remove(withTenantPayload(request.body, request));
        return {};
      }
    );
  };

  registerRoutes(options.prefix, type => options.getAuthenticate(type), ['分组-标签']);
  registerRoutes(`${options.prefix}/admin`, () => options.getAuthenticate('admin'), ['分组管理后台-标签']);
});
