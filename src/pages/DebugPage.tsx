import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSupabaseConfig } from '../lib/supabaseClient';
import { getSession } from '../lib/auth';
import { getInrRecords } from '../lib/api';
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export function DebugPage() {
  const navigate = useNavigate();
  const [config] = useState(getSupabaseConfig());
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [testResult, setTestResult] = useState<string>('');
  const [testError, setTestError] = useState<string>('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const session = await getSession();
      setIsSignedIn(!!session);
      setUserId(session?.user?.id || '');
    } catch (error) {
      setIsSignedIn(false);
      console.error('检查登录状态失败:', error);
    }
  };

  const handleTestQuery = async () => {
    setTestResult('');
    setTestError('');
    setTesting(true);

    try {
      const records = await getInrRecords({ limit: 1 });
      setTestResult(
        `成功！找到 ${records.length} 条记录。${
          records.length > 0
            ? `最新记录: INR ${records[0].value}, 时间 ${new Date(
                records[0].record_time
              ).toLocaleString('zh-CN')}`
            : '暂无数据。'
        }`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setTestError(message);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">调试页面</h1>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            返回
          </Button>
        </div>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            环境变量检查
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-base text-gray-700">
                VITE_SUPABASE_URL
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  config.hasUrl
                    ? 'bg-success-50 text-success-700'
                    : 'bg-danger-50 text-danger-700'
                }`}
              >
                {config.hasUrl ? '✓ 已设置' : '✗ 缺失'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-base text-gray-700">
                VITE_SUPABASE_ANON_KEY
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  config.hasKey
                    ? 'bg-success-50 text-success-700'
                    : 'bg-danger-50 text-danger-700'
                }`}
              >
                {config.hasKey ? '✓ 已设置' : '✗ 缺失'}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-base text-gray-700">Supabase 客户端</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  config.isConfigured
                    ? 'bg-success-50 text-success-700'
                    : 'bg-danger-50 text-danger-700'
                }`}
              >
                {config.isConfigured ? '✓ 已初始化' : '✗ 未初始化'}
              </span>
            </div>
          </div>

          {!config.isConfigured && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-base text-yellow-800 mb-2 font-medium">
                ⚠️ 配置缺失
              </p>
              <p className="text-sm text-yellow-700">
                请在项目根目录创建 .env 文件，并添加以下内容：
              </p>
              <pre className="mt-2 bg-yellow-100 p-2 rounded text-xs overflow-x-auto">
                {`VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key`}
              </pre>
              <p className="text-sm text-yellow-700 mt-2">
                然后重启开发服务器（npm run dev）
              </p>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            登录状态
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-base text-gray-700">当前状态</span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isSignedIn
                    ? 'bg-success-50 text-success-700'
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                {isSignedIn === null
                  ? '检查中...'
                  : isSignedIn
                  ? '✓ 已登录'
                  : '✗ 未登录'}
              </span>
            </div>

            {userId && (
              <div>
                <span className="text-sm text-gray-600">用户 ID:</span>
                <p className="text-xs font-mono bg-gray-50 p-2 rounded mt-1 break-all">
                  {userId}
                </p>
              </div>
            )}
          </div>

          {!isSignedIn && isSignedIn !== null && (
            <div className="mt-4">
              <Button
                variant="primary"
                fullWidth
                onClick={() => navigate('/login')}
              >
                前往登录
              </Button>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            测试查询
          </h2>
          <p className="text-base text-gray-600 mb-4">
            测试读取 INR 记录（需要先登录）
          </p>

          <Button
            variant="primary"
            fullWidth
            onClick={handleTestQuery}
            disabled={testing || !isSignedIn}
          >
            {testing ? '测试中...' : '测试查询'}
          </Button>

          {testResult && (
            <div className="mt-4 bg-success-50 border border-success-200 rounded-lg p-4">
              <p className="text-base text-success-800">{testResult}</p>
            </div>
          )}

          {testError && (
            <div className="mt-4 bg-danger-50 border border-danger-200 rounded-lg p-4">
              <p className="text-sm font-medium text-danger-800 mb-2">
                测试失败
              </p>
              <p className="text-sm text-danger-700 font-mono break-words">
                {testError}
              </p>
              <div className="mt-3 text-sm text-danger-700">
                <p className="font-medium mb-1">可能的原因：</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>RLS (Row Level Security) 策略未正确配置</li>
                  <li>user_id 字段格式不正确（应为 text 类型）</li>
                  <li>未登录或 session 已过期</li>
                  <li>网络连接问题</li>
                </ul>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            常见问题
          </h2>
          <div className="space-y-3 text-base text-gray-700">
            <div>
              <p className="font-medium mb-1">1. 白屏或无法加载</p>
              <p className="text-sm text-gray-600">
                检查环境变量是否正确配置，确保 .env 文件存在且格式正确
              </p>
            </div>

            <div>
              <p className="font-medium mb-1">2. 登录后看不到数据</p>
              <p className="text-sm text-gray-600">
                检查 RLS 策略，确保 user_id 字段类型为 text，且等于
                auth.uid()::text
              </p>
            </div>

            <div>
              <p className="font-medium mb-1">3. 401/403 错误</p>
              <p className="text-sm text-gray-600">
                可能是 RLS 策略问题或 session 过期，尝试重新登录
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
