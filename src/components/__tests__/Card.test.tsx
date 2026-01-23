import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test/utils';
import userEvent from '@testing-library/user-event';
import { Card } from '../Card';

describe('Card 组件', () => {
  it('应该渲染子元素', () => {
    render(
      <Card>
        <h2>标题</h2>
        <p>内容</p>
      </Card>
    );

    expect(screen.getByText('标题')).toBeInTheDocument();
    expect(screen.getByText('内容')).toBeInTheDocument();
  });

  it('应该应用基础样式', () => {
    const { container } = render(<Card>内容</Card>);
    const card = container.firstChild as HTMLElement;

    expect(card).toHaveClass('bg-white');
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('shadow-sm');
  });

  it('应该在可点击时应用悬停样式', () => {
    const handleClick = vi.fn();
    const { container } = render(<Card onClick={handleClick}>点击卡片</Card>);
    const card = container.firstChild as HTMLElement;

    expect(card).toHaveClass('cursor-pointer');
    expect(card).toHaveClass('hover:shadow-md');
  });

  it('应该在不可点击时不应用悬停样式', () => {
    const { container } = render(<Card>普通卡片</Card>);
    const card = container.firstChild as HTMLElement;

    expect(card).not.toHaveClass('cursor-pointer');
    expect(card).not.toHaveClass('hover:shadow-md');
  });

  it('应该响应点击事件', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    const { container } = render(<Card onClick={handleClick}>点击我</Card>);

    await user.click(container.firstChild as HTMLElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('应该合并自定义类名', () => {
    const { container } = render(
      <Card className="custom-padding">内容</Card>
    );
    const card = container.firstChild as HTMLElement;

    expect(card).toHaveClass('custom-padding');
    expect(card).toHaveClass('bg-white'); // 仍保留基础类
  });
});
