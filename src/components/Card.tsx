import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  const clickable = onClick ? 'cursor-pointer hover:shadow-md' : '';

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${clickable} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
