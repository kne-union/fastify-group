-- 为 t_group_tag 增加可选租户字段，并替换唯一索引（PostgreSQL，可幂等重复执行）
--
-- 默认表名规则：{dbTableNamePrefix}{snake_case(name + Tag)}
--   dbTableNamePrefix = 't_'，name = 'group' → t_group_tag
-- 若宿主修改了 dbTableNamePrefix / name，请全局替换本文件中的表名与索引名。

BEGIN;

-- 1) 加列
ALTER TABLE t_group_tag
  ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255) NULL;

COMMENT ON COLUMN t_group_tag.tenant_id IS '租户 ID';

-- 2) 删除旧唯一索引（覆盖 Sequelize sync 常见命名）
DROP INDEX IF EXISTS "t_group_tag_type_code_language";
DROP INDEX IF EXISTS "t_group_tag_type_code_language_uk";
DROP INDEX IF EXISTS "t_group_tags_type_code_language";
DROP INDEX IF EXISTS "t_group_tag_tenant_id_type_code_language";

-- 3) 新建含 tenant 的部分唯一索引
--    COALESCE 保证 tenant_id 为 NULL 时全局仍唯一（PostgreSQL 普通 UNIQUE 对多个 NULL 不互斥）
CREATE UNIQUE INDEX IF NOT EXISTS "t_group_tag_tenant_type_code_language_uk"
  ON t_group_tag (COALESCE(tenant_id, ''), type, code, language)
  WHERE deleted_at IS NULL;

COMMIT;
