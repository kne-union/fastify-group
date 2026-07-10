const fp = require('fastify-plugin');
const path = require('node:path');

module.exports = fp(async (fastify, options) => {
  options = Object.assign(
    {},
    {
      dbTableNamePrefix: 't_',
      name: 'group',
      tenant: null, // 传入 fastify.tenant 即开启租户隔离
      getAuthenticate: () => {
        return [];
      }
    },
    options
  );

  if (options.tenant && !options.tenant.authenticate?.tenantUser) {
    throw new Error('options.tenant 需为 @kne/fastify-tenant 命名空间（需包含 authenticate.tenantUser）');
  }

  fastify.register(require('@kne/fastify-namespace'), {
    options,
    name: options.name,
    modules: [
      ['controllers', path.resolve(__dirname, './libs/controllers')],
      [
        'models',
        await fastify.sequelize.addModels(path.resolve(__dirname, './libs/models'), {
          prefix: options.dbTableNamePrefix,
          modelPrefix: options.name
        })
      ],
      ['services', path.resolve(__dirname, './libs/services')]
    ]
  });
});
