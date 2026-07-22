const crypto = require('crypto');
const fp = require('fastify-plugin');

module.exports = fp(async (fastify, options) => {
  const { models, services } = fastify[options.name];
  const { Op } = fastify.sequelize.Sequelize;

  const withTenant = (where, { tenantId }) => (tenantId != null ? Object.assign({}, where, { tenantId }) : where);

  const generateCode = () => crypto.randomBytes(8).toString('hex');

  const findByCodeUnique = async ({ code, type, language, tenantId, excludeId }) => {
    if (!code || !type) {
      return null;
    }
    const whereQuery = withTenant(
      Object.assign({}, { code, type }, language ? { language } : {}),
      { tenantId }
    );
    if (excludeId) {
      whereQuery.id = { [Op.ne]: excludeId };
    }
    return models.tag.findOne({ where: whereQuery });
  };

  const assertCodeUnique = async ({ code, type, language, tenantId, excludeId }) => {
    const existing = await findByCodeUnique({ code, type, language, tenantId, excludeId });
    if (existing) {
      throw new Error('编码已存在');
    }
  };

  const assertParentValid = async ({ id, parentId, type, language, tenantId }) => {
    if (!parentId) {
      return;
    }
    if (id && String(parentId) === String(id)) {
      throw new Error('父级不能是自身');
    }
    const parent = await detail({ id: parentId, tenantId });
    if (!parent) {
      throw new Error('未找到父标签');
    }
    if (id) {
      const descendantIds = await getDescendantIds({ id, type: type || parent.type, language, tenantId });
      if (descendantIds.some(item => String(item) === String(parentId))) {
        throw new Error('父级不能是自身的子孙节点');
      }
    }
  };

  const allocateCode = async ({ code, type, language, tenantId }) => {
    const normalizedCode = code && String(code).trim() ? String(code).trim() : null;
    if (normalizedCode) {
      await assertCodeUnique({ code: normalizedCode, type, language, tenantId });
      return normalizedCode;
    }
    const maxAttempts = 8;
    for (let i = 0; i < maxAttempts; i++) {
      const nextCode = generateCode();
      const existing = await findByCodeUnique({ code: nextCode, type, language, tenantId });
      if (!existing) {
        return nextCode;
      }
    }
    throw new Error('生成编码失败，请重试');
  };

  const save = async ({ id, tenantId, ...data }) => {
    const language = data.language || 'zh-CN';
    data.language = language;
    const tag = await detail({
      id,
      code: data.code,
      type: data.type,
      language,
      parentId: data.parentId,
      tenantId
    });
    if (tag) {
      const { code: _ignoredCode, ...updateData } = data;
      await assertParentValid({
        id: tag.id,
        parentId: updateData.parentId,
        type: updateData.type || tag.type,
        language: updateData.language || tag.language,
        tenantId
      });
      await tag.update(updateData);
      return tag;
    }
    await assertParentValid({
      parentId: data.parentId,
      type: data.type,
      language,
      tenantId
    });
    const code = await allocateCode({
      code: data.code,
      type: data.type,
      language,
      tenantId
    });
    return models.tag.create(
      Object.assign({}, data, { code, language }, tenantId != null ? { tenantId } : {})
    );
  };

  const remove = async ({ id, type, code, language, tenantId }) => {
    const tag = await detail({ id, type, code, language, tenantId });
    if (!tag) {
      throw new Error('标签不存在');
    }
    await tag.destroy();
  };

  const groupList = async ({ type, language, output = 'tree', tenantId }) => {
    if (!type) {
      throw new Error('必须传入类型');
    }
    const whereQuery = withTenant({}, { tenantId });

    if (language) {
      whereQuery.language = language;
    }

    const tags = await models.tag.findAll({
      where: Object.assign({}, whereQuery, { type })
    });
    if (output !== 'tree') {
      return tags;
    }
    // 转为普通对象数组，确保属性访问正确
    const tagsData = tags.map(tag => tag.get({ plain: true }));
    const buildTree = parentId => {
      const list = tagsData.filter(item => item.parentId === parentId);
      list.forEach(item => {
        const children = buildTree(item.id);
        if (children.length > 0) {
          item.children = children;
        }
      });
      return list;
    };

    return buildTree(null);
  };

  const { fn, col, where: sequelizeWhere } = fastify.sequelize.Sequelize;

  const list = async ({ type, parentId, filter = {}, perPage, currentPage, tenantId }) => {
    if (!type) {
      throw new Error('必须传入类型');
    }
    const whereQuery = withTenant({}, { tenantId });
    ['code', 'name'].forEach(name => {
      if (filter[name]) {
        whereQuery[name] = sequelizeWhere(fn('LOWER', col(name)), {
          [Op.like]: `%${filter[name].toLowerCase()}%`
        });
      }
    });

    if (filter['language']) {
      whereQuery.language = filter['language'];
    }

    if (filter['keyword']) {
      const keyword = filter['keyword'].toLowerCase();
      whereQuery[Op.or] = ['code', 'name', 'description'].map(name => {
        return sequelizeWhere(fn('LOWER', col(name)), {
          [Op.like]: `%${keyword}%`
        });
      });
    }
    if (Array.isArray(filter['codes']) && filter['codes'].length > 0) {
      whereQuery.code = {
        [Op.in]: filter['codes']
      };
    }

    if (parentId) {
      whereQuery.parentId = parentId;
    }
    if (parentId === null) {
      whereQuery.parentId = {
        [Op.is]: null
      };
    }

    const { count, rows } = await models.tag.findAndCountAll({
      where: Object.assign({}, whereQuery, {
        type
      }),
      offset: perPage * (currentPage - 1),
      limit: perPage,
      order: [['createdAt', 'DESC']]
    });

    return {
      pageData: rows,
      totalCount: count
    };
  };

  // 获取某个节点及其所有后代节点的 id 列表
  const getDescendantIds = async ({ id, type, language, tenantId }) => {
    if (!type) {
      throw new Error('必须传入类型');
    }
    const whereQuery = withTenant({ type }, { tenantId });
    if (language) {
      whereQuery.language = language;
    }
    const tags = await models.tag.findAll({ where: whereQuery });
    const tagsData = tags.map(tag => tag.get({ plain: true }));

    const findDescendants = parentId => {
      const children = tagsData.filter(item => item.parentId === parentId);
      let ids = [];
      children.forEach(child => {
        ids.push(child.id);
        ids = ids.concat(findDescendants(child.id));
      });
      return ids;
    };

    if (id) {
      return [id, ...findDescendants(id)];
    }
    // 如果没有传入 id，返回所有节点的 id
    return tagsData.map(item => item.id);
  };

  // 获取某个节点及其所有后代节点的 code 列表
  const getDescendantCodes = async ({ code, type, language, tenantId }) => {
    if (!type) {
      throw new Error('必须传入类型');
    }
    const whereQuery = withTenant({ type }, { tenantId });
    if (language) {
      whereQuery.language = language;
    }
    const tags = await models.tag.findAll({ where: whereQuery });
    const tagsData = tags.map(tag => tag.get({ plain: true }));

    const findDescendants = parentId => {
      const children = tagsData.filter(item => item.parentId === parentId);
      let codes = [];
      children.forEach(child => {
        codes.push(child.code);
        codes = codes.concat(findDescendants(child.id));
      });
      return codes;
    };

    if (code) {
      const tag = tagsData.find(item => item.code === code);
      if (!tag) {
        return [code];
      }
      return [code, ...findDescendants(tag.id)];
    }
    // 如果没有传入 code，返回所有节点的 code
    return tagsData.map(item => item.code);
  };

  const detail = async ({ id, code, type, language, parentId, tenantId }) => {
    let tag;
    if (id) {
      tag = await models.tag.findByPk(id);
      if (tag && tenantId != null && tag.tenantId !== tenantId) {
        return null;
      }
    }
    if (!tag && code && type && language) {
      tag = await models.tag.findOne({
        where: withTenant(
          Object.assign(
            {},
            {
              code,
              type,
              language
            },
            parentId
              ? {
                  parentId
                }
              : {
                  parentId: {
                    [Op.is]: null
                  }
                }
          ),
          { tenantId }
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
    list,
    getDescendantIds,
    getDescendantCodes,
    detail
  });
});
