# Claude AI 开发助手规则

> 本文档定义了 Claude AI 在此项目中的工作规范和最佳实践

---

## 📋 核心规则

### 规则 1: 数据库审查强制要求 🔍

**每次添加/修改功能点时,必须执行以下流程:**

1. **Review 当前代码** - 理解功能实现方式
2. **Review 当前数据库** - 检查 `docs/database-schema.md` 中的表结构
3. **判断是否需要修改数据库** - 评估新功能对数据存储的影响

**如果需要修改数据库,必须提供:**

- ✅ 需要修改的表名称
- ✅ 具体修改内容 (新增表/新增字段/修改字段/新增索引等)
- ✅ 完整的 SQL 脚本
- ✅ 对应的 TypeScript 类型定义
- ✅ RLS 策略 (如果是新表)
- ✅ 更新 `docs/database-schema.md` 文档

**判断标准:**

| 功能类型 | 是否需要修改数据库 | 示例 |
|---------|------------------|------|
| 新增数据类型 | ✅ 是 | 添加饮食记录 → 需要新增 `diet_records` 表 |
| 扩展现有记录 | ✅ 是 | INR 记录添加"症状"字段 → 需要 ALTER TABLE |
| 纯计算/展示逻辑 | ❌ 否 | 异常值警告 → 前端判断即可 |
| UI/UX 改进 | ❌ 否 | 修改按钮样式 → 无需数据库变更 |
| 数据聚合/统计 | ❌ 否 | 计算达标率 → 基于现有数据计算 |

**示例工作流:**

```markdown
## 功能: 添加饮食记录

### 1. 代码审查
- 当前有 INR、血压记录功能
- 使用 Supabase 存储数据
- API 层在 src/lib/api.ts

### 2. 数据库审查
- 当前表: profiles, inr_records, blood_pressure_records, medications, medication_logs
- 无饮食相关表

### 3. 判断结果
❌ **需要修改数据库**

### 4. 修改方案
- **新增表**: diet_records
- **字段设计**:
  - id (uuid)
  - user_id (text)
  - food_name (text)
  - is_high_vitamin_k (boolean)
  - record_time (timestamptz)
  - note (text)
- **RLS 策略**: 用户只能访问自己的记录
- **索引**: user_id + record_time

### 5. 执行步骤
1. 编写 SQL 脚本
2. 更新 TypeScript 类型
3. 添加 API 函数
4. 实现 UI 组件
5. 更新 database-schema.md
```

---

## 🛠️ 开发规范

### 规则 2: 文档同步更新

**每次数据库变更后,必须更新:**
- `docs/database-schema.md` - 表结构文档
- 在"后续修改记录"章节添加变更日志
- 更新"数据字典快速参考"表格

### 规则 3: 类型安全

**所有数据库表必须有对应的 TypeScript 接口:**
- 定义在 `src/types/index.ts`
- 字段名称与数据库列名一致
- 使用正确的类型映射 (text→string, int→number, timestamptz→string)

### 规则 4: API 层完整性

**每个表必须实现 CRUD 操作:**
- ✅ `get{TableName}` - 查询 (支持筛选、排序、分页)
- ✅ `create{TableName}` - 创建
- ✅ `update{TableName}` - 更新
- ✅ `delete{TableName}` - 删除

### 规则 5: RLS 策略必须配置

**新增表时必须:**
- ✅ 启用 RLS: `ALTER TABLE {table} ENABLE ROW LEVEL SECURITY`
- ✅ 配置 SELECT/INSERT/UPDATE/DELETE 四个策略
- ✅ 确保用户只能访问自己的数据: `auth.uid()::text = user_id`

### 规则 6: 索引优化

**为高频查询字段创建索引:**
- 按用户筛选: `CREATE INDEX idx_{table}_user ON {table}(user_id)`
- 按时间排序: `CREATE INDEX idx_{table}_user_time ON {table}(user_id, record_time DESC)`
- 关联查询: 为外键字段创建索引

---

## 📂 项目结构规范

### 目录组织

```
warfarin-inr-monitor/
├── docs/
│   └── database-schema.md       # 数据库结构文档 (必须保持最新)
├── src/
│   ├── types/
│   │   └── index.ts            # 所有 TypeScript 类型定义
│   ├── lib/
│   │   ├── api.ts              # 数据库 API 层
│   │   ├── supabaseClient.ts   # Supabase 客户端
│   │   └── aggregate.ts        # 数据聚合工具函数
│   ├── components/             # UI 组件
│   └── pages/                  # 页面组件
└── CLAUDE.MD                   # 本文档
```

### 命名约定

| 类型 | 约定 | 示例 |
|------|------|------|
| 表名 | snake_case 复数 | `inr_records`, `diet_records` |
| 字段名 | snake_case | `user_id`, `record_time` |
| TypeScript 接口 | PascalCase 单数 | `InrRecord`, `DietRecord` |
| API 函数 | camelCase | `getInrRecords`, `createDietRecord` |
| 组件 | PascalCase | `TrendsPage`, `RecordCard` |

---

## 🔄 Git 提交规范

### Commit Message 格式

```
<type>(<scope>): <subject>

<body>
```

**Type 类型:**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具配置

**Scope 范围:**
- `db`: 数据库相关
- `api`: API 层
- `ui`: 用户界面
- `types`: 类型定义

**示例:**
```bash
feat(db): 添加饮食记录表

- 新增 diet_records 表
- 添加 RLS 策略和索引
- 更新类型定义和 API 函数
- 同步更新数据库文档
```

---

## ✅ 功能实现 Checklist

**每次添加新功能,确保完成以下步骤:**

### 数据库层 (如需要)
- [ ] 编写 SQL 创建/修改脚本
- [ ] 配置 RLS 策略
- [ ] 创建必要索引
- [ ] 添加触发器/函数 (如需要)
- [ ] 更新 `docs/database-schema.md`

### 类型定义层
- [ ] 在 `src/types/index.ts` 添加接口定义
- [ ] 确保字段类型正确映射

### API 层
- [ ] 实现 CRUD 操作函数
- [ ] 添加错误处理
- [ ] 支持筛选、排序、分页参数

### UI 层
- [ ] 实现数据录入表单
- [ ] 实现数据列表/展示
- [ ] 添加加载状态和错误提示
- [ ] 适配长辈友好的大字体设计

### 测试验证
- [ ] 手动测试 CRUD 操作
- [ ] 验证 RLS 策略生效
- [ ] 检查移动端响应式布局
- [ ] 确认数据正确保存和显示

### 文档更新
- [ ] 更新数据库文档
- [ ] 添加代码注释
- [ ] 更新 README (如需要)

---

## 🎯 长辈友好设计原则

### UI/UX 规范

1. **大字体**: 最小 16px,标题 24px+
2. **高对比度**: 文字颜色 #111827,背景 #ffffff
3. **大按钮**: 最小点击区域 48x48px
4. **简洁导航**: 最多 4 个主菜单项
5. **清晰提示**: 操作反馈必须明显 (成功/失败提示)
6. **容错设计**: 防止误操作,重要操作需二次确认

### 文案规范

- ✅ 使用通俗易懂的中文
- ✅ 避免专业术语 (或提供解释)
- ❌ 不使用英文 (除非必要)
- ✅ 提供操作示例和帮助提示

---

## 📊 数据安全规范

### RLS 策略检查清单

- [ ] 所有表已启用 RLS
- [ ] 策略确保用户只能访问自己的数据
- [ ] 使用 `auth.uid()::text = user_id` 进行权限控制
- [ ] 测试跨用户数据隔离

### 敏感数据处理

- [ ] 不在客户端存储敏感信息
- [ ] 不在 URL 中暴露用户 ID
- [ ] API 调用通过 Supabase Auth 认证
- [ ] 不在日志中记录用户数据

---

## 🔧 故障排查指南

### 常见问题

**问题 1: 数据保存失败**
- 检查 RLS 策略是否正确
- 确认 `user_id` 与 `auth.uid()` 一致
- 查看 Supabase Dashboard 的日志

**问题 2: 查询返回空数组**
- 检查 RLS 策略
- 确认用户已登录 (`auth.uid()` 不为 null)
- 验证数据是否确实存在

**问题 3: 类型错误**
- 检查 TypeScript 接口与数据库列名是否一致
- 确认类型映射正确 (timestamptz → string)

---

## 📚 参考资源

- [Supabase 文档](https://supabase.com/docs)
- [PostgreSQL RLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [React 最佳实践](https://react.dev/learn)
- [TailwindCSS](https://tailwindcss.com/docs)
- [数据库结构文档](./docs/database-schema.md)

---

## 🚀 快速开始新功能

**模板工作流:**

1. **需求分析** → 明确功能目标和用户价值
2. **数据库审查** → 按规则 1 检查是否需要修改
3. **设计方案** → 表结构 + API + UI
4. **实现代码** → 按 Checklist 逐步完成
5. **测试验证** → 手动测试所有场景
6. **文档更新** → 同步更新相关文档
7. **提交推送** → 遵循 Git 提交规范

---

_最后更新: 2026-01-23_
