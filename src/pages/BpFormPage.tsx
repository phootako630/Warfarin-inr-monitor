import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getCurrentUser } from '../lib/auth';
import { createBloodPressureRecord, updateBloodPressureRecord } from '../lib/api';
import type { BloodPressureRecord } from '../types';
import { POSITION_OPTIONS } from '../types';

export function BpFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const existingRecord = location.state?.record as
    | BloodPressureRecord
    | undefined;

  const isEditMode = !!id && !!existingRecord;

  const [userId, setUserId] = useState('');
  const [systolic, setSystolic] = useState(
    existingRecord?.systolic.toString() || ''
  );
  const [diastolic, setDiastolic] = useState(
    existingRecord?.diastolic.toString() || ''
  );
  const [heartRate, setHeartRate] = useState(
    existingRecord?.heart_rate?.toString() || ''
  );
  const [position, setPosition] = useState(existingRecord?.position || '');
  const [recordTime, setRecordTime] = useState(
    existingRecord
      ? format(new Date(existingRecord.record_time), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
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
    if (!systolic || !diastolic) {
      setError('请输入收缩压和舒张压');
      return;
    }

    const systolicValue = parseInt(systolic);
    const diastolicValue = parseInt(diastolic);

    if (isNaN(systolicValue) || systolicValue <= 0) {
      setError('收缩压必须大于 0');
      return;
    }

    if (isNaN(diastolicValue) || diastolicValue <= 0) {
      setError('舒张压必须大于 0');
      return;
    }

    if (diastolicValue >= systolicValue) {
      setError('舒张压必须小于收缩压');
      return;
    }

    let heartRateValue: number | null = null;
    if (heartRate.trim()) {
      heartRateValue = parseInt(heartRate);
      if (isNaN(heartRateValue) || heartRateValue <= 0) {
        setError('心率必须大于 0');
        return;
      }
    }

    if (!userId) {
      setError('用户信息获取失败，请重新登录');
      return;
    }

    setLoading(true);

    try {
      const recordData = {
        user_id: userId,
        systolic: systolicValue,
        diastolic: diastolicValue,
        heart_rate: heartRateValue,
        position: position.trim() || null,
        record_time: new Date(recordTime).toISOString(),
      };

      if (isEditMode) {
        await updateBloodPressureRecord(id, recordData);
      } else {
        await createBloodPressureRecord(recordData);
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
            {isEditMode ? '编辑血压记录' : '新增血压记录'}
          </h1>
          <Button variant="ghost" onClick={() => navigate(-1)}>
            取消
          </Button>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="systolic"
                  className="block text-base font-medium text-gray-700 mb-2"
                >
                  收缩压 *
                </label>
                <input
                  id="systolic"
                  type="number"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  placeholder="120"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-gray-600 mt-1">高压</p>
              </div>

              <div>
                <label
                  htmlFor="diastolic"
                  className="block text-base font-medium text-gray-700 mb-2"
                >
                  舒张压 *
                </label>
                <input
                  id="diastolic"
                  type="number"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  placeholder="80"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-gray-600 mt-1">低压</p>
              </div>
            </div>

            <div>
              <label
                htmlFor="heartRate"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                心率 (可选)
              </label>
              <input
                id="heartRate"
                type="number"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                placeholder="例如: 72"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
              />
              <p className="text-sm text-gray-600 mt-1">单位: bpm (次/分钟)</p>
            </div>

            <div>
              <label
                htmlFor="position"
                className="block text-base font-medium text-gray-700 mb-2"
              >
                测量体位 (可选)
              </label>
              <select
                id="position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent min-h-[48px]"
                disabled={loading}
              >
                <option value="">请选择</option>
                {POSITION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
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
            <li>• 正常血压参考: 收缩压 90-120, 舒张压 60-80</li>
            <li>• 心率数据用于趋势分析，可以不填</li>
            <li>• 建议在相同体位下测量以保持数据一致性</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
