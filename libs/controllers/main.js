const fp = require('fastify-plugin');

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

  const registerRoutes = (routePrefix, getAuth) => {
    fastify.get(
      `${routePrefix}/list`,
      {
        onRequest: getAuth('read'),
        schema: {
          summary: '获取列表',
          query: {
            type: 'object',
            properties: {
              type: { type: 'string', description: '标签类型' },
              tenantId: { type: 'string', description: '租户 ID（admin 场景可显式传入）' },
              filter: {
                type: 'object',
                default: {}
              },
              perPage: {
                type: 'number',
                default: 20
              },
              currentPage: {
                type: 'number',
                default: 1
              }
            }
          }
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
          summary: '获取type的所有数据（树形或列表）',
          query: {
            type: 'object',
            properties: {
              type: { type: 'string', description: '标签类型' },
              tenantId: { type: 'string', description: '租户 ID（admin 场景可显式传入）' },
              output: { type: 'string', description: '是否输出为树型结构', enum: ['tree', 'list'] }
            }
          }
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
          summary: '获取单条数据',
          query: {
            type: 'object',
            properties: {
              id: {
                type: 'string'
              },
              code: {
                type: 'string'
              },
              type: {
                type: 'string'
              },
              language: {
                type: 'string'
              },
              tenantId: { type: 'string', description: '租户 ID（admin 场景可显式传入）' }
            }
          }
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
          summary: '保存一条数据',
          body: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              code: { type: 'string' },
              type: { type: 'string' },
              name: { type: 'string' },
              description: { type: 'string' },
              index: { type: 'number' },
              parentId: { type: 'string' },
              language: {
                type: 'string'
              },
              tenantId: { type: 'string', description: '租户 ID（admin 场景可显式传入）' }
            },
            required: ['type', 'name']
          }
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
          summary: '删除一条数据',
          body: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              code: { type: 'string' },
              type: { type: 'string' },
              language: {
                type: 'string'
              },
              tenantId: { type: 'string', description: '租户 ID（admin 场景可显式传入）' }
            }
          }
        }
      },
      async request => {
        await services.remove(withTenantPayload(request.body, request));
        return {};
      }
    );
  };

  registerRoutes(options.prefix, type => options.getAuthenticate(type));
  registerRoutes(`${options.prefix}/admin`, () => options.getAuthenticate('admin'));
});
