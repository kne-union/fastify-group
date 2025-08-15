const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];
  const { Op } = fastify.sequelize.Sequelize;

  const save = async ({ id, ...data }) => {
    const tag = await detail({ id, code: data.code, type: data.type, parentId: data.parentId });
    if (tag) {
      await tag.update(data);
      return tag;
    }
    if (data.parentId && !(await detail({ id: data.parentId }))) {
      throw new Error('未找到父标签');
    }
    await models.tag.create(data);
  };

  const remove = async ({ id, type, code }) => {
    const tag = await detail({ id, type, code });
    if (!tag) {
      throw new Error('标签不存在');
    }
    await tag.destroy();
  };

  const groupList = async ({ type, output = 'tree' }) => {
    if (!type) {
      throw new Error('必须传入类型');
    }
    const tags = await models.tag.findAll({
      where: {
        type
      }
    });
    if (output !== 'tree') {
      return tags;
    }
    const buildTree = parentId => {
      const list = tags.filter(item => item.parentId === parentId);
      if (list && list.length > 0) {
        list.forEach(async (tag, index) => {
          tags.split(index, 1);
          tag.children = buildTree(tag.id);
        });
      }
      return list;
    };

    return buildTree(null);
  };

  const list = async ({ type, parentId, filter }) => {
    if (!type) {
      throw new Error('必须传入类型');
    }
    const whereQuery = {};
    ['code', 'name'].forEach(name => {
      if (filter[name]) {
        whereQuery[name] = {
          [Op.like]: `%${filter[name]}%`
        };
      }
    });

    if (parentId) {
      whereQuery.parentId = parentId;
    }
    if (parentId === null) {
      whereQuery.parentId = {
        [Op.is]: null
      };
    }

    return await models.tag.findAll({
      where: Object.assign({}, whereQuery, {
        type
      })
    });
  };

  const detail = async ({ id, code, type, parentId }) => {
    let tag;
    if (id) {
      tag = await models.tag.findByPk(id);
    }
    if (code && type) {
      tag = await models.tag.findOne({
        where: Object.assign(
          {},
          {
            code,
            type
          },
          parentId
            ? {
                parentId
              }
            : {
                [Op.is]: null
              }
        )
      });
    }
    if (!tag) {
      return null;
    }

    return tag;
  };

  Object.assign(fastify[options.name].services, {
    save,
    remove,
    groupList,
    list
  });
});
