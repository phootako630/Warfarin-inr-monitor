import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/records', label: '记录', icon: '📝' },
  { path: '/trends', label: '趋势', icon: '📈' },
  { path: '/settings', label: '设置', icon: '⚙️' },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 safe-area-inset-bottom print:hidden">
      <div className="flex justify-around items-center h-16 max-w-2xl mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-600'
              }`}
            >
              <span className="text-2xl mb-1">{item.icon}</span>
              <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
