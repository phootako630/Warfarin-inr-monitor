import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { signIn } from '../lib/auth';
import { hasSupabaseConfig } from '../lib/supabaseClient';
import { Button } from '../components/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!hasSupabaseConfig) {
      setError('应用配置缺失，请检查环境变量。访问 /debug 查看详情。');
      return;
    }

    if (!email || !password) {
      setError('请输入邮箱和密码');
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      navigate('/records');
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败';

      // 转换常见错误为中文
      if (message.includes('Invalid login credentials')) {
        setError('邮箱或密码错误，请重试');
      } else if (message.includes('Email not confirmed')) {
        setError('邮箱未验证，请先验证邮箱');
      } else {
        setError(`登录失败: ${message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">❤️</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">健康记录</h1>
          <p className="text-base text-gray-600">
            记录 INR 与血压数据，守护您的健康
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-base font-medium text-gray-700 mb-2"
            >
              邮箱
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入邮箱"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-base font-medium text-gray-700 mb-2"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-base text-red-800">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            disabled={loading}
          >
            {loading ? '登录中...' : '登录'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <a
            href="/debug"
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            遇到问题？打开调试页面
          </a>
        </div>
      </div>
    </div>
  );
}
