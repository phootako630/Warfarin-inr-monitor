import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Loading } from '../components/Loading';
import { getCurrentUser, signOut } from '../lib/auth';
import {
  getProfile,
  getInrRecords,
  getBloodPressureRecords,
  getDoseLogs,
  getWeightLogs,
  getMealLogs,
} from '../lib/api';
import {
  exportInrRecords,
  exportBpRecords,
  exportDoseLogs,
  exportWeightLogs,
  exportMealLogs,
  exportAllRecords,
} from '../lib/export';
import type { Profile } from '../types';

export function SettingsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

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

  const handleExport = async (type: 'inr' | 'bp' | 'dose' | 'weight' | 'meal' | 'all') => {
    setExporting(type);
    try {
      if (type === 'all') {
        const [inr, bp, dose, weight, meals] = await Promise.all([
          getInrRecords({}),
          getBloodPressureRecords({}),
          getDoseLogs({}),
          getWeightLogs({}),
          getMealLogs({}),
        ]);
        exportAllRecords(inr, bp, dose, weight, meals);
      } else if (type === 'inr') {
        const data = await getInrRecords({});
        if (data.length === 0) { alert('没有INR记录可导出'); return; }
        exportInrRecords(data);
      } else if (type === 'bp') {
        const data = await getBloodPressureRecords({});
        if (data.length === 0) { alert('没有血压记录可导出'); return; }
        exportBpRecords(data);
      } else if (type === 'dose') {
        const data = await getDoseLogs({});
        if (data.length === 0) { alert('没有服药记录可导出'); return; }
        exportDoseLogs(data);
      } else if (type === 'weight') {
        const data = await getWeightLogs({});
        if (data.length === 0) { alert('没有体重记录可导出'); return; }
        exportWeightLogs(data);
      } else if (type === 'meal') {
        const data = await getMealLogs({});
        if (data.length === 0) { alert('没有饮食记录可导出'); return; }
        exportMealLogs(data);
      }
    } catch (err) {
      console.error('导出失败:', err);
      alert('导出失败，请重试');
    } finally {
      setExporting(null);
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
            📤 导出数据
          </h2>
          <p className="text-sm text-gray-500 mb-4">导出为 CSV 文件（可用 Excel 打开）</p>

          <div className="space-y-2">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => handleExport('all')}
              disabled={!!exporting}
            >
              {exporting === 'all' ? '导出中...' : '📦 导出全部数据'}
            </Button>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('inr')}
                disabled={!!exporting}
              >
                {exporting === 'inr' ? '...' : '🩸 INR'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('bp')}
                disabled={!!exporting}
              >
                {exporting === 'bp' ? '...' : '💓 血压'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('dose')}
                disabled={!!exporting}
              >
                {exporting === 'dose' ? '...' : '💊 服药'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('weight')}
                disabled={!!exporting}
              >
                {exporting === 'weight' ? '...' : '⚖️ 体重'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleExport('meal')}
                disabled={!!exporting}
                className="col-span-2"
              >
                {exporting === 'meal' ? '...' : '🥬 饮食'}
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            关于应用
          </h2>
          <div className="space-y-2 text-base text-gray-600">
            <p>版本: 1.1.0</p>
            <p>华法林剂量管理 — INR、血压、服药、体重、饮食记录</p>
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
