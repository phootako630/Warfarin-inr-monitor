import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getCurrentUser } from '../lib/auth';
import { createBloodPressureRecord, updateBloodPressureRecord } from '../lib/api';
import {
  getBloodPressureAbnormalMessage,
  checkBloodPressureAbnormal,
  getHeartRateAbnormalMessage,
  checkHeartRateAbnormal,
} from '../lib/healthCheck';
import type { BloodPressureRecord, Arm } from '../types';
import { POSITION_OPTIONS, ARM_LABELS } from '../types';

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
  const [arm, setArm] = useState<Arm | ''>(existingRecord?.arm || '');
  const [recordTime, setRecordTime] = useState(
    existingRecord
      ? format(new Date(existingRecord.record_time), "yyyy-MM-dd'T'HH:mm")
      : format(new Date(), "yyyy-MM-dd'T'HH:mm")
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [healthWarnings, setHealthWarnings] = useState<Array<{
    message: string;
    level: 'warning' | 'danger';
  }>>([]);

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

  const checkHealthWarnings = (
    sys: string,
    dia: string,
    hr: string
  ) => {
    const warnings: Array<{ message: string; level: 'warning' | 'danger' }> = [];

    const sysValue = parseInt(sys);
    const diaValue = parseInt(dia);

    // 检查血压
    if (!isNaN(sysValue) && !isNaN(diaValue) && sysValue > 0 && diaValue > 0) {
      const bpMessage = getBloodPressureAbnormalMessage(sysValue, diaValue);
      if (bpMessage) {
        const bpLevel = checkBloodPressureAbnormal(sysValue, diaValue);
        warnings.push({
          message: bpMessage,
          level: bpLevel as 'warning' | 'danger',
        });
      }
    }

    // 检查心率
    if (hr.trim()) {
      const hrValue = parseInt(hr);
      if (!isNaN(hrValue) && hrValue > 0) {
        const hrMessage = getHeartRateAbnormalMessage(hrValue);
        if (hrMessage) {
          const hrLevel = checkHeartRateAbnormal(hrValue);
          warnings.push({
            message: hrMessage,
            level: hrLevel as 'warning' | 'danger',
          });
        }
      }
    }

    setHealthWarnings(warnings);
  };

  const handleSystolicChange = (value: string) => {
    setSystolic(value);
    checkHealthWarnings(value, diastolic, heartRate);
  };

  const handleDiastolicChange = (value: string) => {
    setDiastolic(value);
    checkHealthWarnings(systolic, value, heartRate);
  };

  const handleHeartRateChange = (value: string) => {
    setHeartRate(value);
    checkHealthWarnings(systolic, diastolic, value);
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
        arm: arm || null,
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
                  onChange={(e) => handleSystolicChange(e.target.value)}
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
                  onChange={(e) => handleDiastolicChange(e.target.value)}
                  placeholder="80"
                  className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  disabled={loading}
                  required
                />
                <p className="text-xs text-gray-600 mt-1">低压</p>
              </div>
            </div>

            {/* 健康警告 */}
            {healthWarnings.length > 0 && (
              <div className="space-y-2">
                {healthWarnings.map((warning, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-lg border-2 ${
                      warning.level === 'danger'
                        ? 'bg-red-50 border-red-300'
                        : 'bg-yellow-50 border-yellow-300'
                    }`}
                  >
                    <p
                      className={`text-base font-medium ${
                        warning.level === 'danger'
                          ? 'text-red-800'
                          : 'text-yellow-800'
                      }`}
                    >
                      {warning.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <p className="text-sm text-gray-500">
              💡 正常血压: 低于 130/85 mmHg
            </p>

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
                onChange={(e) => handleHeartRateChange(e.target.value)}
                placeholder="例如: 72"
                className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={loading}
              />
              <p className="text-sm text-gray-600 mt-1">
                单位: bpm (次/分钟) · 正常: 60-100
              </p>
            </div>

            <div>
              <label className="block text-base font-medium text-gray-700 mb-2">
                测量手臂 (可选)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['left', 'right'] as Arm[]).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setArm(arm === side ? '' : side)}
                    disabled={loading}
                    className={`px-4 py-3 text-base font-medium rounded-xl border-2 transition-colors ${
                      arm === side
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {side === 'left' ? '🤚' : '✋'} {ARM_LABELS[side]}
                  </button>
                ))}
              </div>
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
