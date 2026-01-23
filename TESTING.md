# 测试文档

本项目使用 **Vitest** 和 **React Testing Library** 进行单元测试和组件测试。

## 测试技术栈

- **Vitest**: 基于 Vite 的测试框架，快速且与 Jest 兼容
- **React Testing Library**: React 组件测试库，注重用户行为测试
- **@testing-library/jest-dom**: 提供额外的 DOM 匹配器
- **@testing-library/user-event**: 模拟用户交互
- **jsdom**: 在 Node.js 中模拟浏览器环境

## 运行测试

### 基本命令

```bash
# 运行所有测试（监听模式）
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 运行测试一次（CI 模式）
npm run test:run

# 使用 UI 界面运行测试
npm run test:ui
```

### 监听模式快捷键

在监听模式下，可以使用以下快捷键：

- `a` - 运行所有测试
- `f` - 只运行失败的测试
- `p` - 按文件名过滤
- `t` - 按测试名称过滤
- `q` - 退出监听模式

## 项目结构

```
src/
├── lib/
│   ├── __tests__/
│   │   └── aggregate.test.ts      # 工具函数测试
│   └── aggregate.ts
├── components/
│   ├── __tests__/
│   │   ├── Button.test.tsx        # 组件测试
│   │   └── Card.test.tsx
│   ├── Button.tsx
│   └── Card.tsx
└── test/
    ├── setup.ts                   # 测试环境配置
    ├── utils.tsx                  # 测试工具函数
    └── mocks/
        └── supabase.ts            # Supabase mock
```

## 编写测试

### 工具函数测试

对于纯函数，直接测试输入和输出：

```typescript
import { describe, it, expect } from 'vitest';
import { aggregateInrByDay } from '../aggregate';

describe('aggregateInrByDay', () => {
  it('应该正确按天聚合 INR 数据', () => {
    const records = [
      { value: 2.5, record_time: '2026-01-20T08:00:00Z', /* ... */ },
      { value: 2.7, record_time: '2026-01-20T18:00:00Z', /* ... */ },
    ];

    const result = aggregateInrByDay(records);

    expect(result).toHaveLength(1);
    expect(result[0].value).toBe(2.6); // (2.5 + 2.7) / 2
  });
});
```

### React 组件测试

使用 React Testing Library 测试组件的用户行为：

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button 组件', () => {
  it('应该响应点击事件', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>点击我</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 使用 Mock

#### Mock Supabase 客户端

```typescript
import { vi } from 'vitest';
import { mockSupabaseClient, mockInrRecord } from '../../test/mocks/supabase';

vi.mock('../lib/supabaseClient', () => ({
  supabase: mockSupabaseClient,
}));

// 在测试中设置返回值
mockSupabaseClient.from.mockReturnValue({
  select: vi.fn().mockResolvedValue({ data: [mockInrRecord], error: null }),
});
```

#### Mock 函数

```typescript
import { vi } from 'vitest';

const mockFn = vi.fn();
mockFn.mockReturnValue('返回值');
mockFn.mockResolvedValue('异步返回值');

// 检查调用
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('参数');
expect(mockFn).toHaveBeenCalledTimes(2);
```

## 测试最佳实践

### 1. 测试用户行为而非实现细节

❌ **不推荐**：
```typescript
expect(component.state.isOpen).toBe(true);
```

✅ **推荐**：
```typescript
expect(screen.getByText('内容')).toBeVisible();
```

### 2. 使用语义化查询

优先级顺序：
1. `getByRole` - 最推荐，符合无障碍标准
2. `getByLabelText` - 表单字段
3. `getByPlaceholderText` - 占位符
4. `getByText` - 文本内容
5. `getByTestId` - 最后的选择

```typescript
// 优先使用 role
const button = screen.getByRole('button', { name: '提交' });

// 表单使用 label
const input = screen.getByLabelText('用户名');

// 避免使用 testId（除非必要）
const element = screen.getByTestId('custom-element');
```

### 3. 异步操作使用 async/await

```typescript
it('应该加载数据', async () => {
  render(<DataComponent />);

  // 等待元素出现
  const data = await screen.findByText('数据已加载');
  expect(data).toBeInTheDocument();
});
```

### 4. 使用用户事件而非直接触发

```typescript
import userEvent from '@testing-library/user-event';

it('应该输入文本', async () => {
  const user = userEvent.setup();
  render(<Input />);

  const input = screen.getByRole('textbox');
  await user.type(input, 'Hello');

  expect(input).toHaveValue('Hello');
});
```

### 5. 清理和隔离测试

每个测试应该是独立的，setup.ts 中已配置自动清理：

```typescript
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();  // 自动清理 DOM
  vi.clearAllMocks();  // 清理所有 mock
});
```

## 测试覆盖率

运行覆盖率报告：

```bash
npm run test:coverage
```

覆盖率报告将生成在 `coverage/` 目录，包括：
- `coverage/index.html` - HTML 格式的详细报告
- `coverage/coverage-final.json` - JSON 格式数据

### 覆盖率目标

建议的覆盖率目标：
- 工具函数（lib/）：**90%+**
- 通用组件（components/）：**80%+**
- 页面组件（pages/）：**60%+**

## 常见问题

### Q: 测试中如何 mock 环境变量？

```typescript
import { vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'http://localhost:54321');
```

### Q: 如何测试路由跳转？

使用 `renderWithRouter` 工具函数：

```typescript
import { renderWithRouter } from '../../test/utils';

it('应该导航到登录页', async () => {
  renderWithRouter(<App />, { initialRoute: '/login' });
  // ...测试逻辑
});
```

### Q: 如何调试失败的测试？

```typescript
import { screen } from '@testing-library/react';

// 打印当前 DOM 结构
screen.debug();

// 打印特定元素
screen.debug(screen.getByRole('button'));
```

### Q: 测试运行很慢怎么办？

1. 只运行特定文件：`npm test Button.test`
2. 使用 `it.only` 只运行一个测试
3. 使用 `describe.skip` 跳过测试套件

## 持续集成

在 CI/CD 中运行测试：

```yaml
# GitHub Actions 示例
- name: Run tests
  run: npm run test:run

- name: Generate coverage
  run: npm run test:coverage
```

## 参考资源

- [Vitest 官方文档](https://vitest.dev/)
- [React Testing Library 文档](https://testing-library.com/react)
- [Common mistakes with React Testing Library](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
