import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Loading } from '../components/Loading';
import { getCurrentUser, signOut } from '../lib/auth';
import { getProfile } from '../lib/api';
import type { Profile } from '../types';

export function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setEmail(user.email || '');
        const profileData = await getProfile(user.id);
        setProfile(profileData);
      }
    } catch (error) {
      console.error('加载用户数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('退出登录失败:', error);
      alert('退出登录失败，请重试');
    }
  };

  if (loading) {
    return (
      <Layout>
        <Loading message="加载中..." />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">设置</h1>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            账号信息
          </h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-1">邮箱</p>
              <p className="text-base text-gray-900">{email || '未设置'}</p>
            </div>

            {profile?.name && (
              <div>
                <p className="text-sm text-gray-600 mb-1">姓名</p>
                <p className="text-base text-gray-900">{profile.name}</p>
              </div>
            )}

            {profile?.phone && (
              <div>
                <p className="text-sm text-gray-600 mb-1">电话</p>
                <p className="text-base text-gray-900">{profile.phone}</p>
              </div>
            )}
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            关于应用
          </h2>
          <div className="space-y-2 text-base text-gray-600">
            <p>版本: 1.0.0</p>
            <p>用于记录与查看 INR、血压、心率数据</p>
          </div>
        </Card>

        <div className="space-y-3">
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onClick={() => navigate('/debug')}
          >
            调试页面
          </Button>

          <Button
            variant="danger"
            fullWidth
            size="lg"
            onClick={() => setShowLogoutDialog(true)}
          >
            退出登录
          </Button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showLogoutDialog}
        title="退出登录"
        message="确定要退出登录吗？"
        confirmText="退出"
        cancelText="取消"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
        variant="danger"
      />
    </Layout>
  );
}
