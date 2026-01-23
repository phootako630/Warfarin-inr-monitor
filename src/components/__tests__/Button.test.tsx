import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { Button } from '../Button';

describe('Button 组件', () => {
  it('应该渲染子元素', () => {
    render(<Button>点击我</Button>);
    expect(screen.getByRole('button', { name: '点击我' })).toBeInTheDocument();
  });

  it('应该应用 primary 变体样式（默认）', () => {
    render(<Button>Primary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary-600');
  });

  it('应该应用 secondary 变体样式', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-gray-200');
  });

  it('应该应用 danger 变体样式', () => {
    render(<Button variant="danger">删除</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-danger-600');
  });

  it('应该应用 ghost 变体样式', () => {
    render(<Button variant="ghost">Ghost</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-transparent');
  });

  it('应该应用不同的尺寸', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-4 py-2 text-sm');

    rerender(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-6 py-3 text-base');

    rerender(<Button size="lg">Large</Button>);
    expect(screen.getByRole('button')).toHaveClass('px-8 py-4 text-lg');
  });

  it('应该应用全宽样式', () => {
    render(<Button fullWidth>全宽按钮</Button>);
    expect(screen.getByRole('button')).toHaveClass('w-full');
  });

  it('应该响应点击事件', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>点击我</Button>);

    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('应该在禁用时不响应点击', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        禁用按钮
      </Button>
    );

    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('应该在禁用时应用禁用样式', () => {
    render(<Button disabled>禁用</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('应该合并自定义类名', () => {
    render(<Button className="custom-class">按钮</Button>);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('应该传递其他 HTML 属性', () => {
    render(<Button type="submit">提交</Button>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });
});
