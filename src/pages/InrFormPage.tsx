import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getCurrentUser } from '../lib/auth';
import { createInrRecord, updateInrRecord } from '../lib/api';
import type { InrRecord } from '../types';

export function InrFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const existingRecord = location.state?.record as InrRecord | undefined;

  const isEditMode = !!id && !!existingRecord;

  const [userId, setUserId] = useState('');
  const [value, setValue] = useState(existingRecord?.value.toString() || '');
  const [warfarinDose, setWarfarinDose] = useState(
    existingRecord?.warfarin_dose_mg.toString() || '3.0'
  );
  const [recordTime, setRecordTime] = useState(
    existingRecord
      ? format(new Date(existingRecord.record_time), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [note, setNote] = useState(existingRecord?.note || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setUserId(user.id);
      } else {
        alert('未登录，请先登录');
        navigate('/login');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      navigate('/login');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // 表单验证
    if (!value) {
      setError('请输入 INR 数值');
      return;
    }

    const inrValue = parseFloat(value);
    if (isNaN(inrValue) || inrValue <= 0) {
      setError('INR 数值必须大于 0');
      return;
    }

    if (!warfarinDose) {
      setError('请输入华法林剂量');
      return;
    }

    const doseValue = parseFloat(warfarinDose);
    if (isNaN(doseValue) || doseValue <= 0) {
      setError('华法林剂量必须大于 0');
      return;
    }

    if (!userId) {
      setError('用户信息获取失败，请重新登录');
      return;
    }

    setLoading(true);

    try {
      const recordData = {
        user_id: userId,
        value: inrValue,
        warfarin_dose_mg: doseValue,
        record_time: new Date(recordTime).toISOString(),
        note: note.trim() || null,
      };

      if (isEditMode) {
        await updateInrRecord(id, recordData);
      } else {
        await createInrRecord(recordData);
      }

      navigate('/records');
    } catch (err) {
      const message = err instanceof Error ? err.message : '操作失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout hideNav>
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? '编辑 INR 记录' : '新增 INR 记录'}
          </h1>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            取消
          </Button>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="value"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                INR 数值 *
              </label>
              <input
                id="value"
                type="number"
                step="0.1"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="例如: 2.5"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label
                htmlFor="warfarinDose"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                华法林剂量 (mg) *
              </label>
              <input
                id="warfarinDose"
                type="number"
                step="0.5"
                value={warfarinDose}
                onChange={(e) => setWarfarinDose(e.target.value)}
                placeholder="例如: 3.0"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
                required
              />
              <p className="text-sm text-gray-600 mt-1">默认 3.0 mg</p>
            </div>

            <div>
              <label
                htmlFor="recordTime"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                记录时间 *
              </label>
              <input
                id="recordTime"
                type="datetime-local"
                value={recordTime}
                onChange={(e) => setRecordTime(e.target.value)}
                max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
                required
              />
            </div>

            <div>
              <label
                htmlFor="note"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                备注 (可选)
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="可以记录特殊情况、症状等"
                rows={3}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-base text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                fullWidth
                size="lg"
                onClick={() => navigate(-1)}
                disabled={loading}
              >
                取消
              </Button>
              <Button
                type="submit"
                variant="primary"
                fullWidth
                size="lg"
                disabled={loading}
              >
                {loading ? '保存中...' : '保存'}
              </Button>
            </div>
          </form>
        </Card>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800 mb-2 font-medium">💡 提示</p>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• INR 目标范围固定为 2.0 - 3.0</li>
            <li>• 系统会自动判断是否达标</li>
            <li>• 记录时间默认为现在，可以修改</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
