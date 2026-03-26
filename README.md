# 健康记录应用 (华法林 INR 与血压监测)

面向中国大陆长辈的健康记录 Web 应用，用于记录与查看 INR、血压、心率及**每日华法林服药**数据，并提供趋势分析与 PDF 报告导出。

## 特性

- ✅ **完全本地化**: 无外部 CDN、无外链脚本、无 Google Fonts
- ✅ **长辈友好**: 大字号、大按钮、简体中文、移动端优先
- ✅ **数据安全**: 使用 Supabase，数据加密存储，RLS 行级安全
- ✅ **趋势分析**: INR、血压、心率、**剂量**按天聚合折线图
- ✅ **剂量 vs INR 对比**: 在趋势图中同时展示服药剂量与 INR 变化
- ✅ **每日服药记录**: 一键确认今日用药，支持 0.5/1/1.125/1.25/1.5 片选择
- ✅ **医嘱处方管理**: 记录每次复诊医生调整的处方剂量，日常仅需一键确认
- ✅ **PDF 导出**: 一键打印健康报告（含剂量数据），方便就医
- ✅ **防白屏**: ErrorBoundary + 调试页面

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **路由**: React Router v6 (`HashRouter`)
- **样式**: Tailwind CSS
- **图表**: Recharts
- **后端**: Supabase (PostgreSQL + RLS)
- **日期处理**: date-fns

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，填入你的 Supabase 配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

从 Supabase 项目设置 → API 获取这两个值。

### 3. 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:5173 启动。

### 4. 构建生产版本

```bash
npm run build
npm run preview
```

## Supabase 数据库配置

### 必需的表结构

确保你的 Supabase 数据库包含以下表：

#### 1. `inr_records` 表

```sql
create table inr_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  value float not null,
  record_time timestamptz not null,
  warfarin_dose_mg float not null default 3.0,
  is_in_range boolean,
  target_range_low float default 2.0,
  target_range_high float default 3.0,
  note text,
  created_at timestamptz default now()
);

-- 自动计算 is_in_range 的触发器
create or replace function calculate_inr_in_range()
returns trigger as $$
begin
  new.is_in_range := (new.value >= 2.0 and new.value <= 3.0);
  new.target_range_low := 2.0;
  new.target_range_high := 3.0;
  return new;
end;
$$ language plpgsql;

create trigger inr_calculate_range
before insert or update on inr_records
for each row execute function calculate_inr_in_range();

-- RLS 策略
alter table inr_records enable row level security;

create policy "用户只能查看自己的 INR 记录"
on inr_records for select
using (auth.uid()::text = user_id);

create policy "用户只能创建自己的 INR 记录"
on inr_records for insert
with check (auth.uid()::text = user_id);

create policy "用户只能更新自己的 INR 记录"
on inr_records for update
using (auth.uid()::text = user_id);

create policy "用户只能删除自己的 INR 记录"
on inr_records for delete
using (auth.uid()::text = user_id);
```

#### 2. `blood_pressure_records` 表

```sql
create table blood_pressure_records (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  systolic int not null,
  diastolic int not null,
  heart_rate int,
  position text,
  record_time timestamptz not null,
  created_at timestamptz default now()
);

-- RLS 策略
alter table blood_pressure_records enable row level security;

create policy "用户只能查看自己的血压记录"
on blood_pressure_records for select
using (auth.uid()::text = user_id);

create policy "用户只能创建自己的血压记录"
on blood_pressure_records for insert
with check (auth.uid()::text = user_id);

create policy "用户只能更新自己的血压记录"
on blood_pressure_records for update
using (auth.uid()::text = user_id);

create policy "用户只能删除自己的血压记录"
on blood_pressure_records for delete
using (auth.uid()::text = user_id);
```

#### 3. `dose_regimes` 表（医嘱处方）

```sql
create table dose_regimes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  prescribed_dose numeric not null,
  start_date date not null default current_date,
  inr_record_id uuid references inr_records(id),
  doctor_notes text,
  created_at timestamptz default now()
);

-- RLS 策略
alter table dose_regimes enable row level security;

create policy "用户查看自己的处方" on dose_regimes
  for select using (auth.uid() = user_id);

create policy "用户创建自己的处方" on dose_regimes
  for insert with check (auth.uid() = user_id);

create policy "用户更新自己的处方" on dose_regimes
  for update using (auth.uid() = user_id);

create policy "用户删除自己的处方" on dose_regimes
  for delete using (auth.uid() = user_id);
```

#### 4. `dose_logs` 表（每日服药记录）

```sql
create table dose_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  date date not null default current_date,
  actual_dose numeric,
  status text not null default '已服用',
  regime_id uuid references dose_regimes(id),
  notes text,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- RLS 策略
alter table dose_logs enable row level security;

create policy "用户查看自己的服药记录" on dose_logs
  for select using (auth.uid() = user_id);

create policy "用户创建自己的服药记录" on dose_logs
  for insert with check (auth.uid() = user_id);

create policy "用户更新自己的服药记录" on dose_logs
  for update using (auth.uid() = user_id);

create policy "用户删除自己的服药记录" on dose_logs
  for delete using (auth.uid() = user_id);
```

#### 5. `profiles` 表（可选）

```sql
create table profiles (
  id text primary key,
  name text,
  phone text,
  created_at timestamptz default now()
);

-- RLS 策略
alter table profiles enable row level security;

create policy "用户可以查看自己的资料"
on profiles for select
using (auth.uid()::text = id);
```

### 创建测试账号

在 Supabase Authentication → Users 中创建一个账号：

```
Email: your-email@example.com
Password: your-secure-password
```

## 功能说明

### 1. 登录

- 固定账号登录（email + password）
- 登录后 session 自动持久化，无需反复登录

### 2. 记录页面

- 查看最近 30 天的 INR、血压和**服药**记录
- 筛选：类型（全部/INR/血压/**服药**）、时间范围（7/30/90 天或自定义）
- 快速新增：点击顶部按钮新增 INR、血压或**服药记录**
- 编辑/删除：每条记录支持编辑和删除（删除需二次确认）

### 3. 每日服药

- **医嘱处方**: 每次复诊后录入医生开具的处方剂量，作为日常服药的参考基准
- **一键确认**: 首页显示"今日服药"快捷卡片，点击即完成当日记录
- **剂量选择**: 支持 0.5、1、1.125、1.25、1.5 片（华法林常见规格）
- **状态标记**: 已服用 / 漏服 / 剂量调整
- **设计理念**: 处方稳定期只需一键确认，降低长辈使用门槛

### 4. 趋势页面

- INR 折线图：显示目标区间（2-3），按天平均
- 血压折线图：收缩压与舒张压，按天平均
- 心率折线图：从血压记录中提取，按天平均
- **剂量趋势**: 每日实际服药剂量折线图，与 INR 对比查看
- 统计卡片：INR 达标率、平均血压、**服药依从率**
- 时间范围切换：7/30/90 天或自定义

### 5. PDF 导出

- 点击"导出 PDF"按钮
- 选择时间范围
- 报告包含 INR、血压及**服药剂量**数据
- 点击"打印/保存 PDF"
- 使用浏览器的打印功能保存为 PDF

### 6. 设置页面

- 显示当前账号信息
- 退出登录

### 7. 调试页面

访问 `/#/debug` 可以：

- 检查环境变量是否配置
- 检查 Supabase 客户端是否初始化
- 检查登录状态
- 测试查询（诊断 RLS 问题）

## 常见问题

### 1. 白屏或无法加载

**原因**: 环境变量缺失，或路由模式不兼容

**解决**:
1. 确认 `.env` 文件存在且包含正确的配置
2. 确认使用 `HashRouter`（非 `BrowserRouter`），避免 iframe/代理环境下白屏
3. 重启开发服务器 (`npm run dev`)
4. 访问 `/#/debug` 查看详细信息

### 2. 登录后看不到数据

**原因**: RLS 策略问题或 user_id 类型不匹配

**解决**:
1. `inr_records` / `blood_pressure_records` 的 `user_id` 字段类型为 `text`
2. `dose_regimes` / `dose_logs` 的 `user_id` 字段类型为 `uuid`（直接引用 `auth.users`）
3. 确认 RLS 策略已正确配置
4. 在 `/#/debug` 页面测试查询，查看错误信息

### 3. 401/403 错误

**原因**:
- RLS 策略未正确配置
- Session 过期
- user_id 不匹配

**解决**:
1. 检查 RLS 策略（见上方 SQL）
2. 尝试退出登录后重新登录
3. 访问 `/#/debug` 查看详细错误

### 4. 图表不显示

**原因**:
- 没有数据
- 时间范围内没有记录

**解决**:
1. 先添加一些记录
2. 调整时间范围
3. 检查浏览器控制台是否有错误

### 5. 打印/PDF 样式不对

**解决**:
- 使用 Chrome/Edge 浏览器
- 打印设置中选择"背景图形"
- 调整页边距和缩放比例

## 项目结构

```
warfarin-inr-monitor/
├── src/
│   ├── lib/              # 核心库（Supabase、认证、API、聚合）
│   ├── components/       # 通用组件（按钮、卡片、导航等）
│   ├── pages/            # 页面组件（登录、记录、趋势、服药等）
│   │   ├── RecordsPage.tsx
│   │   ├── TrendsPage.tsx
│   │   ├── DoseFormPage.tsx    ← 🆕 每日服药记录页
│   │   ├── ReportPrintPage.tsx
│   │   └── ...
│   ├── types/            # TypeScript 类型定义
│   ├── App.tsx           # 路由配置（HashRouter）
│   ├── main.tsx          # 入口文件
│   └── index.css         # 全局样式
├── index.html            # HTML 入口
├── package.json          # 依赖配置
├── vite.config.ts        # Vite 配置（base: './'）
├── tailwind.config.js    # Tailwind 配置
└── .env                  # 环境变量（需自行创建）
```

## 开发指南

### 添加新功能

1. 在 `src/pages/` 中创建新页面组件
2. 在 `src/App.tsx` 中添加路由
3. 如需访问数据，在 `src/lib/api.ts` 中添加 API 函数
4. 如需通用组件，在 `src/components/` 中创建

### 样式定制

- 修改 `tailwind.config.js` 中的颜色主题
- 在 `src/index.css` 中添加自定义 CSS

### 数据聚合

所有聚合逻辑在 `src/lib/aggregate.ts` 中，按"本地日"分组以避免 UTC 跨天问题。新增 `DoseChartDataPoint` 和 `DoseAdherenceStats` 类型支持剂量数据聚合。

## 配置说明

### Vite 配置 (`vite.config.ts`)

| 配置项 | 值 | 说明 |
|--------|------|------|
| `base` | `'./'` | 使用相对路径，兼容 iframe / 代理等非根路径部署 |
| `server.host` | `'127.0.0.1'` | 仅监听本地，提升安全性 |
| `server.strictPort` | `true` | 端口被占用时直接报错，避免静默换端口 |

### TypeScript 配置 (`tsconfig.json`)

| 配置项 | 值 | 说明 |
|--------|------|------|
| `noUnusedLocals` | `false` | 允许未使用的局部变量（开发便利性） |
| `noUnusedParameters` | `false` | 允许未使用的参数（开发便利性） |

## 测试

项目使用 **Vitest** 和 **React Testing Library** 进行测试。

### 运行测试

```bash
# 运行测试（监听模式）
npm test

# 运行测试一次
npm run test:run

# 生成覆盖率报告
npm run test:coverage

# 使用 UI 界面
npm run test:ui
```

### 测试文件位置

- 工具函数测试：`src/lib/__tests__/`
- 组件测试：`src/components/__tests__/`
- 测试工具：`src/test/`

详细的测试文档请参考 [TESTING.md](./TESTING.md)。

## 部署

### Vercel

```bash
npm run build
# 上传 dist/ 目录到 Vercel
```

### Netlify

```bash
npm run build
# 上传 dist/ 目录到 Netlify
```

### 自托管

```bash
npm run build
# 将 dist/ 目录部署到任何静态托管服务
```

**重要**: 部署时确保在托管平台配置环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。

## 许可证

MIT

## 联系方式

如有问题，请提交 Issue。
