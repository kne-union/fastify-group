module.exports = ({ DataTypes, definePrimaryType, options }) => {
  return {
    model: {
      type: {
        type: DataTypes.STRING,
        comment: '类型'
      },
      code: {
        type: DataTypes.STRING,
        comment: '唯一标识'
      },
      name: {
        type: DataTypes.STRING,
        comment: '名称'
      },
      language: {
        type: DataTypes.STRING,
        comment: '语言',
        defaultValue: 'zh-CN'
      },
      description: {
        type: DataTypes.TEXT,
        comment: '描述'
      },
      index: {
        type: DataTypes.INTEGER,
        comment: '排序字段',
        defaultValue: 0
      },
      parentId: definePrimaryType('parentId', {
        comment: '父级ID，为空则为根节点'
      }),
      options: {
        type: DataTypes.JSONB,
        comment: '扩展字段'
      }
    },
    options: {
      comment: '标签',
      indexes: [
        {
          unique: true,
          fields: ['type', 'code', 'language'],
          where: {
            deleted_at: null
          }
        }
      ]
    }
  };
};
