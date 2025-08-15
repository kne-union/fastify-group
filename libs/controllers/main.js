const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { services } = fastify[options.name];
  fastify.get(
    `${options.prefix}/list`,
    {
      onRequest: options.getAuthenticate('read'),
      schema: {
        summary: '获取列表',
        query: {
          type: {
            type: 'object',
            properties: {
              type: { type: 'string', description: '标签类型' }
            }
          }
        }
      }
    },
    async request => {
      return services.list(request.query);
    }
  );

  fastify.get(
    `${options.prefix}/group-list`,
    {
      onRequest: options.getAuthenticate('read'),
      schema: {
        summary: '获取type的所有数据（树形或列表）',
        query: {
          type: {
            type: 'object',
            properties: {
              type: { type: 'string', description: '标签类型' },
              output: { type: 'string', description: '是否输出为树型结构', enum: ['tree', 'list'] }
            }
          }
        }
      }
    },
    async request => {
      return services.list(request.query);
    }
  );

  fastify.get(
    `${options.prefix}/detail`,
    {
      onRequest: options.getAuthenticate('read'),
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
            }
          }
        }
      }
    },
    async request => {
      return services.detail(request.query);
    }
  );

  fastify.post(
    `${options.prefix}/save`,
    {
      onRequest: options.getAuthenticate('write'),
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
            parentId: { type: 'string' }
          },
          required: ['type', 'code', 'name']
        }
      }
    },
    async request => {
      return services.save(request.body);
    }
  );

  fastify.post(
    `${options.prefix}/remove`,
    {
      onRequest: options.getAuthenticate('delete'),
      schema: {
        summary: '删除一条数据',
        body: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            code: { type: 'string' },
            type: { type: 'string' }
          }
        }
      }
    },
    async request => {
      return services.remove(request.body);
    }
  );
});
