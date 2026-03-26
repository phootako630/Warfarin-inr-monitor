import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { getCurrentUser } from '../lib/auth';
import {
  getActiveRegime,
  getDoseLogByDate,
  upsertTodayDoseLog,
  createDoseRegime,
} from '../lib/api';
import type { DoseRegime, DoseLog, DoseStatus } from '../types';
import { DOSE_OPTIONS } from '../types';

export function DoseFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // 支持从 URL 传入日期，默认今天
  const targetDate = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  const [userId, setUserId]         = useState('');
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  // 当日已有记录（编辑模式）
  const [existingLog, setExistingLog] = useState<DoseLog | null>(null);
  // 当前有效处方
  const [activeRegime, setActiveRegime] = useState<DoseRegime | null>(null);

  // 表单状态
  const [status, setStatus]         = useState<DoseStatus>('已服用');
  const [selectedDose, setSelectedDose] = useState<number>(1.0);
  const [notes, setNotes]           = useState('');

  // 新增/更新处方
  const [showRegimeForm, setShowRegimeForm] = useState(false);
  const [newPrescribedDose, setNewPrescribedDose] = useState<number>(1.0);
  const [doctorNotes, setDoctorNotes] = useState('');
  const [savingRegime, setSavingRegime] = useState(false);

  useEffect(() => {
    init();
  }, [targetDate]);

  const init = async () => {
    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) { navigate('/login'); return; }
      setUserId(user.id);

      const [regime, existLog] = await Promise.all([
        getActiveRegime(targetDate),
        getDoseLogByDate(targetDate),
      ]);

      setActiveRegime(regime);
      setExistingLog(existLog);

      // 预填：优先用已有记录，其次用处方默认值
      if (existLog) {
        setStatus(existLog.status);
        setSelectedDose(existLog.actual_dose ?? regime?.prescribed_dose ?? 1.0);
        setNotes(existLog.notes ?? '');
      } else if (regime) {
        setSelectedDose(regime.prescribed_dose);
      }
    } catch (err) {
      console.error('初始化失败:', err);
      setError('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const dose = status === '漏服' ? null : selectedDose;
      await upsertTodayDoseLog(
        userId,
        targetDate,
        status,
        dose,
        activeRegime?.id ?? null,
        notes.trim() || undefined
      );
      navigate('/records');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRegime = async () => {
    setError('');
    setSavingRegime(true);
    try {
      const regime = await createDoseRegime({
        user_id: userId,
        prescribed_dose: newPrescribedDose,
        start_date: targetDate,
        inr_record_id: null,
        doctor_notes: doctorNotes.trim() || null,
      });
      setActiveRegime(regime);
      setSelectedDose(regime.prescribed_dose);
      setShowRegimeForm(false);
      setDoctorNotes('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : '保存失败';
      setError(msg);
    } finally {
      setSavingRegime(false);
    }
  };

  if (loading) {
    return (
      <Layout hideNav>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-500 text-lg">加载中...</p>
        </div>
      </Layout>
    );
  }

  const isToday = targetDate === format(new Date(), 'yyyy-MM-dd');
  const dateLabel = isToday ? '今天' : targetDate;

  return (
    <Layout hideNav>
      <div className="p-4 space-y-4">
        {/* 标题 */}
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-gray-900">
            💊 {dateLabel}服药记录
          </h1>
          <Button variant="ghost" onClick={() => navigate(-1)}>取消</Button>
        </div>

        {/* 当前处方卡片 */}
        <Card>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">当前处方剂量</p>
              {activeRegime ? (
                <>
                  <p className="text-2xl font-bold text-blue-600">
                    {DOSE_OPTIONS.find(d => d.value === activeRegime.prescribed_dose)?.label
                      ?? `${activeRegime.prescribed_dose}片`}
                  </p>
                  {activeRegime.doctor_notes && (
                    <p className="text-sm text-gray-500 mt-1">
                      医嘱：{activeRegime.doctor_notes}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    自 {activeRegime.start_date} 起
                  </p>
                </>
              ) : (
                <p className="text-base text-gray-400">尚未设定处方</p>
              )}
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setNewPrescribedDose(activeRegime?.prescribed_dose ?? 1.0);
                setShowRegimeForm(!showRegimeForm);
              }}
            >
              {activeRegime ? '更新医嘱' : '设定医嘱'}
            </Button>
          </div>

          {/* 更新医嘱表单 */}
          {showRegimeForm && (
            <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
              <p className="text-sm font-medium text-gray-700">新处方剂量</p>
              <div className="grid grid-cols-3 gap-2">
                {DOSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setNewPrescribedDose(opt.value)}
                    className={`py-3 rounded-xl text-center border-2 transition-all ${
                      newPrescribedDose === opt.value
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <span className="block text-xl font-bold text-gray-800">
                      {opt.fraction}
                    </span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
              <textarea
                value={doctorNotes}
                onChange={(e) => setDoctorNotes(e.target.value)}
                placeholder="医嘱备注（可选）"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  fullWidth
                  onClick={() => setShowRegimeForm(false)}
                >
                  取消
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  onClick={handleSaveRegime}
                  disabled={savingRegime}
                >
                  {savingRegime ? '保存中...' : '保存医嘱'}
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* 服药状态选择 */}
        <Card>
          <p className="text-base font-medium text-gray-700 mb-3">今日状态</p>
          <div className="grid grid-cols-3 gap-3">
            {(['已服用', '漏服', '剂量调整'] as DoseStatus[]).map((s) => {
              const emoji = s === '已服用' ? '✅' : s === '漏服' ? '❌' : '⚠️';
              const color =
                status === s
                  ? s === '已服用'
                    ? 'border-green-500 bg-green-50'
                    : s === '漏服'
                    ? 'border-red-500 bg-red-50'
                    : 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-200 bg-white';
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`py-4 rounded-xl border-2 text-center transition-all ${color}`}
                >
                  <span className="block text-2xl mb-1">{emoji}</span>
                  <span className="text-sm font-medium text-gray-700">{s}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 实际剂量选择（漏服时隐藏） */}
        {status !== '漏服' && (
          <Card>
            <p className="text-base font-medium text-gray-700 mb-3">
              实际服用量
              {status === '剂量调整' && (
                <span className="text-sm text-yellow-600 ml-2">（与处方不同）</span>
              )}
            </p>
            <div className="grid grid-cols-3 gap-3">
              {DOSE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedDose(opt.value)}
                  className={`py-4 rounded-xl border-2 text-center transition-all ${
                    selectedDose === opt.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <span className="block text-2xl font-bold text-gray-800">
                    {opt.fraction}
                  </span>
                  <span className="block text-sm text-gray-600 mt-1">
                    {opt.label}
                  </span>
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* 备注 */}
        <Card>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            备注（可选）
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="例如：忘记了下午补服、因为检查暂停服用等"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500"
          />
        </Card>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* 提交按钮 */}
        <div className="flex gap-3 pt-2 pb-6">
          <Button
            variant="secondary"
            fullWidth
            size="lg"
            onClick={() => navigate(-1)}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleSubmit}
            disabled={saving}
          >
            {saving ? '保存中...' : existingLog ? '更新记录' : '保存记录'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
