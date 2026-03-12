const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];
  const { Op } = fastify.sequelize.Sequelize;

  const save = async ({ id, ...data }) => {
    const tag = await detail({
      id, code: data.code, type: data.type, language: data.language, parentId: data.parentId
    });
    if (tag) {
      await tag.update(data);
      return tag;
    }
    if (data.parentId && !(await detail({ id: data.parentId }))) {
      throw new Error('未找到父标签');
    }
    return models.tag.create(data);
  };

  const remove = async ({ id, type, code, language }) => {
    const tag = await detail({ id, type, code, language });
    if (!tag) {
      throw new Error('标签不存在');
    }
    await tag.destroy();
  };

  const groupList = async ({ type, language, output = 'tree' }) => {
    if (!type) {
      throw new Error('必须传入类型');
    }
    const tags = await models.tag.findAll({
      where: {
        type, language
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

  const list = async ({ type, parentId, filter = {}, perPage, currentPage }) => {
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

    if (filter['language']) {
      whereQuery.language = filter['language'];
    }

    if (filter['keyword']) {
      whereQuery[Op.or] = ['name', 'description'].map(name => {
        return {
          [name]: {
            [Op.like]: `%${filter['keyword']}%`
          }
        };
      });
    }

    if (parentId) {
      whereQuery.parentId = parentId;
    }
    if (parentId === null) {
      whereQuery.parentId = {
        [Op.is]: null
      };
    }

    if (filter['codes']) {
      whereQuery.code = {
        [Op.in]: filter['codes']
      };

      const rows = await models.tag.findAll({
        where: Object.assign({}, whereQuery, {
          type
        }), order: [['createdAt', 'DESC']]
      });

      return {
        pageData: rows, totalCount: rows.length
      };
    }

    const { count, rows } = await models.tag.findAndCountAll({
      where: Object.assign({}, whereQuery, {
        type
      }), offset: perPage * (currentPage - 1), limit: perPage, order: [['createdAt', 'DESC']]
    });

    return {
      pageData: rows, totalCount: count
    };
  };

  const detail = async ({ id, code, type, language, parentId }) => {
    let tag;
    if (id) {
      tag = await models.tag.findByPk(id);
    }
    if (code && type && language) {
      tag = await models.tag.findOne({
        where: Object.assign({}, {
          code, type, language
        }, parentId ? {
          parentId
        } : {
          parentId: {
            [Op.is]: null
          }
        })
      });
    }
    if (!tag) {
      return null;
    }

    return tag;
  };

  Object.assign(fastify[options.name].services, {
    save, remove, groupList, list
  });
});
