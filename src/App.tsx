import { useState, useEffect } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { RecordsPage } from './pages/RecordsPage';
import { InrFormPage } from './pages/InrFormPage';
import { BpFormPage } from './pages/BpFormPage';
import { TrendsPage } from './pages/TrendsPage';
import { SettingsPage } from './pages/SettingsPage';
import { ReportPrintPage } from './pages/ReportPrintPage';
import { DebugPage } from './pages/DebugPage';
import { getSession, onAuthStateChange } from './lib/auth';
import { Loading } from './components/Loading';
import type { ToastMessage } from './types';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [toastMessages, setToastMessages] = useState<ToastMessage[]>([]);

  useEffect(() => {
    // 检查初始 session
    checkAuth();

    // 监听认证状态变化
    const { data: authListener } = onAuthStateChange((session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    try {
      const session = await getSession();
      setIsAuthenticated(!!session);
    } catch (error) {
      console.error('检查认证状态失败:', error);
      setIsAuthenticated(false);
    }
  };

  const removeToast = (id: string) => {
    setToastMessages((prev) => prev.filter((msg) => msg.id !== id));
  };

  // 加载中状态
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loading message="加载中..." />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ToastContainer messages={toastMessages} onClose={removeToast} />
        <Routes>
          {/* 公开路由 */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/debug" element={<DebugPage />} />

          {/* 受保护的路由 */}
          <Route
            path="/records"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <RecordsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/records/inr/new"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <InrFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/records/inr/edit/:id"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <InrFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/records/bp/new"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <BpFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/records/bp/edit/:id"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <BpFormPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trends"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <TrendsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-print"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ReportPrintPage />
              </ProtectedRoute>
            }
          />

          {/* 默认重定向 */}
          <Route
            path="/"
            element={
              <Navigate
                to={isAuthenticated ? '/records' : '/login'}
                replace
              />
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

// 受保护路由组件
function ProtectedRoute({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: React.ReactNode;
}) {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}

// 404 页面
function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-6">页面未找到</p>
        <a
          href="/"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700"
        >
          返回首页
        </a>
      </div>
    </div>
  );
}
