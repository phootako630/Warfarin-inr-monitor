# 数据库结构文档

> 华法林 INR 监测应用 - 数据库 Schema 归档
>
> 最后更新: 2026-01-23

---

## 📋 目录

1. [表结构](#表结构)
2. [RLS 策略](#rls-策略)
3. [索引](#索引)
4. [触发器与函数](#触发器与函数)
5. [后续修改记录](#后续修改记录)

---

## 表结构

### 1. profiles - 用户资料表

```sql
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  name text,
  phone text,
  target_inr_min float DEFAULT 2.0,
  target_inr_max float DEFAULT 3.0,
  target_bp_systolic int DEFAULT 140,
  target_bp_diastolic int DEFAULT 90,
  surgery_date date,
  created_at timestamptz DEFAULT now()
);
```

**字段说明**:
- `id`: 用户ID (关联 auth.users)
- `name`: 用户姓名
- `phone`: 联系电话
- `target_inr_min/max`: INR 目标范围 (默认 2.0-3.0)
- `target_bp_systolic/diastolic`: 血压目标值 (默认 140/90)
- `surgery_date`: 手术日期 (可选)
- `created_at`: 创建时间

---

### 2. inr_records - INR 记录表

```sql
CREATE TABLE inr_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  value float NOT NULL,
  record_time timestamptz NOT NULL DEFAULT now(),
  warfarin_dose_mg float NOT NULL DEFAULT 3.0,
  is_in_range boolean,
  target_range_low float DEFAULT 2.0,
  target_range_high float DEFAULT 3.0,
  note text
);
```

**字段说明**:
- `id`: 记录唯一ID
- `user_id`: 用户ID
- `value`: INR 值
- `record_time`: 记录时间 (默认当前时间)
- `warfarin_dose_mg`: 华法林剂量 (mg)
- `is_in_range`: 是否在目标范围内 (自动计算)
- `target_range_low/high`: 目标范围 (默认 2.0-3.0, 由触发器设置)
- `note`: 备注

**自动计算逻辑**:
- `is_in_range`: 当 `value >= 2.0 AND value <= 3.0` 时为 true
- `target_range_low/high`: 固定为 2.0/3.0 (由触发器设置)

---

### 3. blood_pressure_records - 血压记录表

```sql
CREATE TABLE blood_pressure_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  systolic int NOT NULL,
  diastolic int NOT NULL,
  heart_rate int,
  position text,
  record_time timestamptz NOT NULL DEFAULT now()
);
```

**字段说明**:
- `id`: 记录唯一ID
- `user_id`: 用户ID
- `systolic`: 收缩压 (高压)
- `diastolic`: 舒张压 (低压)
- `heart_rate`: 心率 (可选)
- `position`: 测量体位 (坐位/卧位/站立/其它)
- `record_time`: 记录时间 (默认当前时间)

---

### 4. medications - 药物配置表

```sql
CREATE TABLE medications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  drug_name text NOT NULL,
  dosage text NOT NULL,
  schedule_time text NOT NULL, -- "HH:mm" 格式
  reminder_enabled boolean DEFAULT true
);
```

**字段说明**:
- `id`: 药物配置唯一ID
- `user_id`: 用户ID
- `drug_name`: 药物名称 (如 "华法林钠片")
- `dosage`: 剂量描述 (如 "3mg")
- `schedule_time`: 服药时间 (格式: "HH:mm", 如 "08:00")
- `reminder_enabled`: 是否启用提醒

---

### 5. medication_logs - 服药记录表

```sql
CREATE TABLE medication_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  medication_id text NOT NULL, -- 关联 medications.id
  scheduled_time timestamptz NOT NULL,
  actual_time timestamptz,
  taken boolean DEFAULT false
);
```

**字段说明**:
- `id`: 服药记录唯一ID
- `user_id`: 用户ID
- `medication_id`: 关联的药物配置ID
- `scheduled_time`: 计划服药时间
- `actual_time`: 实际服药时间 (标记后记录)
- `taken`: 是否已服药

---

## RLS 策略

所有表都启用了行级安全策略 (Row Level Security)，确保用户只能访问自己的数据。

### 通用策略模式

```sql
-- 启用 RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- SELECT: 用户只能查看自己的数据
CREATE POLICY "用户只能查看自己的{表名}"
  ON {table_name}
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- INSERT: 用户只能创建自己的数据
CREATE POLICY "用户可以创建自己的{表名}"
  ON {table_name}
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- UPDATE: 用户只能更新自己的数据
CREATE POLICY "用户可以更新自己的{表名}"
  ON {table_name}
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- DELETE: 用户只能删除自己的数据
CREATE POLICY "用户可以删除自己的{表名}"
  ON {table_name}
  FOR DELETE
  USING (auth.uid()::text = user_id);
```

### profiles 表特殊策略

```sql
-- profiles 表使用 id 字段而非 user_id
CREATE POLICY "用户只能查看自己的资料"
  ON profiles
  FOR SELECT
  USING (auth.uid()::text = id);

CREATE POLICY "用户可以创建自己的资料"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid()::text = id);

CREATE POLICY "用户可以更新自己的资料"
  ON profiles
  FOR UPDATE
  USING (auth.uid()::text = id);

CREATE POLICY "用户可以删除自己的资料"
  ON profiles
  FOR DELETE
  USING (auth.uid()::text = id);
```

**应用的表**:
- ✅ profiles
- ✅ inr_records
- ✅ blood_pressure_records
- ✅ medications
- ✅ medication_logs

---

## 索引

为提升查询性能创建的索引:

```sql
-- INR 记录索引 (按用户+时间降序)
CREATE INDEX IF NOT EXISTS idx_inr_records_user_time
  ON inr_records(user_id, record_time DESC);

-- 血压记录索引 (按用户+时间降序)
CREATE INDEX IF NOT EXISTS idx_bp_records_user_time
  ON blood_pressure_records(user_id, record_time DESC);

-- 药物配置索引 (按用户)
CREATE INDEX IF NOT EXISTS idx_medications_user
  ON medications(user_id);

-- 服药记录索引 (按用户+计划时间降序)
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_scheduled
  ON medication_logs(user_id, scheduled_time DESC);

-- 服药记录索引 (按药物ID)
CREATE INDEX IF NOT EXISTS idx_medication_logs_medication
  ON medication_logs(medication_id);
```

**索引用途**:
- `user_time` 索引: 优化按时间范围查询记录
- `user` 索引: 优化按用户筛选
- `medication_id` 索引: 优化服药记录关联查询

---

## 触发器与函数

### 1. 新用户自动创建 profile

当新用户注册时,自动创建对应的 profile 记录。

```sql
-- 触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at)
  VALUES (NEW.id, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

### 2. INR 记录自动计算派生字段

在插入或更新 INR 记录时,自动计算 `is_in_range` 和设置目标范围。

```sql
-- 触发器函数
CREATE OR REPLACE FUNCTION public.set_inr_derived_fields()
RETURNS trigger AS $$
BEGIN
  -- 固定目标范围 2-3
  NEW.target_range_low := 2.0;
  NEW.target_range_high := 3.0;

  -- 自动计算是否在范围内（包含边界）
  NEW.is_in_range := (NEW.value >= 2.0 AND NEW.value <= 3.0);

  -- 确保剂量有默认值
  IF NEW.warfarin_dose_mg IS NULL THEN
    NEW.warfarin_dose_mg := 3.0;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 触发器
DROP TRIGGER IF EXISTS trg_set_inr_derived_fields ON public.inr_records;
CREATE TRIGGER trg_set_inr_derived_fields
  BEFORE INSERT OR UPDATE OF value, warfarin_dose_mg
  ON public.inr_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_inr_derived_fields();
```

**触发时机**:
- INSERT: 插入新记录时
- UPDATE: 更新 `value` 或 `warfarin_dose_mg` 字段时

**自动设置的字段**:
- `target_range_low`: 固定为 2.0
- `target_range_high`: 固定为 3.0
- `is_in_range`: 根据 `value >= 2.0 AND value <= 3.0` 计算
- `warfarin_dose_mg`: 如果为 NULL 则设为 3.0

---

## 后续修改记录

### 2026-01-23 - 初始版本

**新增表**:
- profiles
- inr_records
- blood_pressure_records
- medications
- medication_logs

**新增功能**:
- RLS 策略
- 索引优化
- 自动创建 profile 触发器
- INR 自动计算触发器

---

### 字段修改历史

#### inr_records 表

**添加 warfarin_dose_mg 字段**:
```sql
ALTER TABLE public.inr_records
ADD COLUMN IF NOT EXISTS warfarin_dose_mg float NOT NULL DEFAULT 3.0;
```

**设置默认值**:
```sql
ALTER TABLE public.inr_records
  ALTER COLUMN target_range_low SET DEFAULT 2.0,
  ALTER COLUMN target_range_high SET DEFAULT 3.0,
  ALTER COLUMN record_time SET DEFAULT now();
```

#### blood_pressure_records 表

**设置默认值**:
```sql
ALTER TABLE public.blood_pressure_records
  ALTER COLUMN record_time SET DEFAULT now();
```

---

## 完整初始化脚本

```sql
-- ============================================
-- 心安记 (HeartCare) - 数据库初始化脚本
-- ============================================

-- 1. 创建 profiles 表
CREATE TABLE IF NOT EXISTS profiles (
  id text PRIMARY KEY,
  name text,
  phone text,
  target_inr_min float DEFAULT 2.0,
  target_inr_max float DEFAULT 3.0,
  target_bp_systolic int DEFAULT 140,
  target_bp_diastolic int DEFAULT 90,
  surgery_date date,
  created_at timestamptz DEFAULT now()
);

-- 2. 创建其他表
CREATE TABLE IF NOT EXISTS inr_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  value float NOT NULL,
  record_time timestamptz NOT NULL DEFAULT now(),
  warfarin_dose_mg float NOT NULL DEFAULT 3.0,
  is_in_range boolean,
  target_range_low float DEFAULT 2.0,
  target_range_high float DEFAULT 3.0,
  note text
);

CREATE TABLE IF NOT EXISTS blood_pressure_records (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  systolic int NOT NULL,
  diastolic int NOT NULL,
  heart_rate int,
  position text,
  record_time timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS medications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  drug_name text NOT NULL,
  dosage text NOT NULL,
  schedule_time text NOT NULL,
  reminder_enabled boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS medication_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id text NOT NULL,
  medication_id text NOT NULL,
  scheduled_time timestamptz NOT NULL,
  actual_time timestamptz,
  taken boolean DEFAULT false
);

-- 3. 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE inr_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE blood_pressure_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_logs ENABLE ROW LEVEL SECURITY;

-- 4. 创建 profiles 表策略
DROP POLICY IF EXISTS "用户只能查看自己的资料" ON profiles;
CREATE POLICY "用户只能查看自己的资料" ON profiles FOR SELECT USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "用户可以创建自己的资料" ON profiles;
CREATE POLICY "用户可以创建自己的资料" ON profiles FOR INSERT WITH CHECK (auth.uid()::text = id);

DROP POLICY IF EXISTS "用户可以更新自己的资料" ON profiles;
CREATE POLICY "用户可以更新自己的资料" ON profiles FOR UPDATE USING (auth.uid()::text = id);

DROP POLICY IF EXISTS "用户可以删除自己的资料" ON profiles;
CREATE POLICY "用户可以删除自己的资料" ON profiles FOR DELETE USING (auth.uid()::text = id);

-- 5. 创建 inr_records 表策略
DROP POLICY IF EXISTS "用户只能查看自己的INR记录" ON inr_records;
CREATE POLICY "用户只能查看自己的INR记录" ON inr_records FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以创建自己的INR记录" ON inr_records;
CREATE POLICY "用户可以创建自己的INR记录" ON inr_records FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以更新自己的INR记录" ON inr_records;
CREATE POLICY "用户可以更新自己的INR记录" ON inr_records FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以删除自己的INR记录" ON inr_records;
CREATE POLICY "用户可以删除自己的INR记录" ON inr_records FOR DELETE USING (auth.uid()::text = user_id);

-- 6. 创建 blood_pressure_records 表策略
DROP POLICY IF EXISTS "用户只能查看自己的血压记录" ON blood_pressure_records;
CREATE POLICY "用户只能查看自己的血压记录" ON blood_pressure_records FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以创建自己的血压记录" ON blood_pressure_records;
CREATE POLICY "用户可以创建自己的血压记录" ON blood_pressure_records FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以更新自己的血压记录" ON blood_pressure_records;
CREATE POLICY "用户可以更新自己的血压记录" ON blood_pressure_records FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以删除自己的血压记录" ON blood_pressure_records;
CREATE POLICY "用户可以删除自己的血压记录" ON blood_pressure_records FOR DELETE USING (auth.uid()::text = user_id);

-- 7. 创建 medications 表策略
DROP POLICY IF EXISTS "用户只能查看自己的药物" ON medications;
CREATE POLICY "用户只能查看自己的药物" ON medications FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以创建自己的药物" ON medications;
CREATE POLICY "用户可以创建自己的药物" ON medications FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以更新自己的药物" ON medications;
CREATE POLICY "用户可以更新自己的药物" ON medications FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以删除自己的药物" ON medications;
CREATE POLICY "用户可以删除自己的药物" ON medications FOR DELETE USING (auth.uid()::text = user_id);

-- 8. 创建 medication_logs 表策略
DROP POLICY IF EXISTS "用户只能查看自己的服药记录" ON medication_logs;
CREATE POLICY "用户只能查看自己的服药记录" ON medication_logs FOR SELECT USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以创建自己的服药记录" ON medication_logs;
CREATE POLICY "用户可以创建自己的服药记录" ON medication_logs FOR INSERT WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以更新自己的服药记录" ON medication_logs;
CREATE POLICY "用户可以更新自己的服药记录" ON medication_logs FOR UPDATE USING (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "用户可以删除自己的服药记录" ON medication_logs;
CREATE POLICY "用户可以删除自己的服药记录" ON medication_logs FOR DELETE USING (auth.uid()::text = user_id);

-- 9. 创建索引
CREATE INDEX IF NOT EXISTS idx_inr_records_user_time ON inr_records(user_id, record_time DESC);
CREATE INDEX IF NOT EXISTS idx_bp_records_user_time ON blood_pressure_records(user_id, record_time DESC);
CREATE INDEX IF NOT EXISTS idx_medications_user ON medications(user_id);
CREATE INDEX IF NOT EXISTS idx_medication_logs_user_scheduled ON medication_logs(user_id, scheduled_time DESC);
CREATE INDEX IF NOT EXISTS idx_medication_logs_medication ON medication_logs(medication_id);

-- 10. 创建触发器函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, created_at)
  VALUES (NEW.id, NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.set_inr_derived_fields()
RETURNS trigger AS $$
BEGIN
  NEW.target_range_low := 2.0;
  NEW.target_range_high := 3.0;
  NEW.is_in_range := (NEW.value >= 2.0 AND NEW.value <= 3.0);
  IF NEW.warfarin_dose_mg IS NULL THEN
    NEW.warfarin_dose_mg := 3.0;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. 创建触发器
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trg_set_inr_derived_fields ON public.inr_records;
CREATE TRIGGER trg_set_inr_derived_fields
  BEFORE INSERT OR UPDATE OF value, warfarin_dose_mg
  ON public.inr_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_inr_derived_fields();

-- 完成！
```

---

## 数据字典快速参考

| 表名 | 中文名 | 主要用途 | 关键字段 |
|------|--------|---------|---------|
| `profiles` | 用户资料 | 存储用户基本信息和健康目标 | `id`, `name`, `target_inr_min/max` |
| `inr_records` | INR记录 | 存储国际标准化比值和华法林剂量 | `value`, `warfarin_dose_mg`, `is_in_range` |
| `blood_pressure_records` | 血压记录 | 存储血压和心率数据 | `systolic`, `diastolic`, `heart_rate` |
| `medications` | 药物配置 | 配置用药提醒 | `drug_name`, `dosage`, `schedule_time` |
| `medication_logs` | 服药记录 | 记录实际服药情况 | `scheduled_time`, `actual_time`, `taken` |

---

## 维护建议

1. **备份策略**: 定期备份数据库,建议每天自动备份
2. **监控**: 关注表大小增长,特别是 `inr_records` 和 `blood_pressure_records`
3. **清理**: 考虑归档 1 年以上的旧记录
4. **安全**: 定期审查 RLS 策略,确保数据隔离正确
5. **性能**: 如数据量增大,考虑添加分区表

---

## 相关文档

- [Supabase 官方文档](https://supabase.com/docs)
- [PostgreSQL RLS 文档](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [应用 API 文档](../src/lib/api.ts)
- [类型定义](../src/types/index.ts)
