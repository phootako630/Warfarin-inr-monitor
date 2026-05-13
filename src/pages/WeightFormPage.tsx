import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import {
  getWeightLogsByDate,
  getLatestWeightLog,
  upsertWeightLog,
  deleteWeightLog,
} from '../lib/api';
import { getSession } from '../lib/auth';
import { TIME_OF_DAY_LABELS } from '../types';
import type { WeightLog, TimeOfDay } from '../types';

export function WeightFormPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const dateParam = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [userId, setUserId]   = useState('');

  // 当前日期的记录
  const [morningLog, setMorningLog] = useState<WeightLog | null>(null);
  const [eveningLog, setEveningLog] = useState<WeightLog | null>(null);

  // 输入值
  const [morningWeight, setMorningWeight] = useState('');
  const [eveningWeight, setEveningWeight] = useState('');
  const [morningNotes, setMorningNotes]   = useState('');
  const [eveningNotes, setEveningNotes]   = useState('');

  // 上次体重（用于"和上次一样"）
  const [lastWeight, setLastWeight] = useState<number | null>(null);

  // 当前编辑的时段
  const [activeSlot, setActiveSlot] = useState<TimeOfDay | null>(null);

  useEffect(() => {
    loadData();
  }, [dateParam]);

  const loadData = async () => {
    setLoading(true);
    try {
      const session = await getSession();
      if (!session) { navigate('/login'); return; }
      setUserId(session.user.id);

      const [logs, latest] = await Promise.all([
        getWeightLogsByDate(dateParam),
        getLatestWeightLog(),
      ]);

      const morning = logs.find((l) => l.time_of_day === 'morning') ?? null;
      const evening = logs.find((l) => l.time_of_day === 'evening') ?? null;

      setMorningLog(morning);
      setEveningLog(evening);
      setMorningWeight(morning ? String(morning.weight_kg) : '');
      setEveningWeight(evening ? String(evening.weight_kg) : '');
      setMorningNotes(morning?.notes ?? '');
      setEveningNotes(evening?.notes ?? '');
      setLastWeight(latest?.weight_kg ?? null);
    } catch (err) {
      console.error('加载体重数据失败:', err);
      alert('加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (timeOfDay: TimeOfDay) => {
    const weightStr = timeOfDay === 'morning' ? morningWeight : eveningWeight;
    const notes     = timeOfDay === 'morning' ? morningNotes  : eveningNotes;
    const weight    = parseFloat(weightStr);

    if (isNaN(weight) || weight < 20 || weight > 300) {
      alert('请输入有效体重（20-300 kg）');
      return;
    }

    setSaving(true);
    try {
      await upsertWeightLog(userId, dateParam, timeOfDay, weight, notes || undefined);
      await loadData();
      setActiveSlot(null);
    } catch (err) {
      console.error('保存失败:', err);
      alert('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (timeOfDay: TimeOfDay) => {
    const log = timeOfDay === 'morning' ? morningLog : eveningLog;
    if (!log) return;
    if (!confirm('确定删除这条体重记录吗？')) return;

    try {
      await deleteWeightLog(log.id);
      await loadData();
      setActiveSlot(null);
    } catch (err) {
      console.error('删除失败:', err);
      alert('删除失败，请重试');
    }
  };

  const fillLastWeight = (timeOfDay: TimeOfDay) => {
    if (lastWeight === null) return;
    if (timeOfDay === 'morning') setMorningWeight(String(lastWeight));
    else setEveningWeight(String(lastWeight));
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-4"><Loading message="加载中..." /></div>
      </Layout>
    );
  }

  const isToday = dateParam === format(new Date(), 'yyyy-MM-dd');

  return (
    <Layout>
      <div className="p-4 space-y-4">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            ← 返回
          </Button>
          <h1 className="text-xl font-bold text-gray-900">
            {isToday ? '今日体重' : `${dateParam} 体重`}
          </h1>
          <div className="w-16" />
        </div>

        {/* 两个时段卡片 */}
        {(['morning', 'evening'] as TimeOfDay[]).map((slot) => {
          const log     = slot === 'morning' ? morningLog : eveningLog;
          const weight  = slot === 'morning' ? morningWeight : eveningWeight;
          const notes   = slot === 'morning' ? morningNotes : eveningNotes;
          const setW    = slot === 'morning' ? setMorningWeight : setEveningWeight;
          const setN    = slot === 'morning' ? setMorningNotes : setEveningNotes;
          const isActive = activeSlot === slot;

          return (
            <Card
              key={slot}
              className={`border-2 ${
                log
                  ? 'border-green-300 bg-green-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-lg font-semibold">
                  {TIME_OF_DAY_LABELS[slot]}
                </span>
                {log && !isActive && (
                  <span className="text-2xl font-bold text-gray-900">
                    {log.weight_kg} kg
                  </span>
                )}
              </div>

              {/* 已记录且未编辑 */}
              {log && !isActive && (
                <div className="flex items-center justify-between">
                  <div>
                    {log.notes && (
                      <p className="text-sm text-gray-500">备注: {log.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveSlot(slot)}
                    >
                      修改
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(slot)}
                      className="text-red-500"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              )}

              {/* 未记录 或 编辑模式 */}
              {(!log || isActive) && (
                <div className="space-y-3">
                  {/* 体重输入 */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      体重 (kg)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        step="0.1"
                        min="20"
                        max="300"
                        value={weight}
                        onChange={(e) => setW(e.target.value)}
                        placeholder="如 65.5"
                        className="flex-1 px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        inputMode="decimal"
                      />
                      {lastWeight !== null && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => fillLastWeight(slot)}
                          className="whitespace-nowrap text-xs"
                        >
                          同上次
                          <br />
                          {lastWeight}kg
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* 备注 */}
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      备注（可选）
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setN(e.target.value)}
                      placeholder="如：饭后、运动后"
                      className="w-full px-4 py-2 border border-gray-300 rounded-xl text-sm"
                    />
                  </div>

                  {/* 按钮 */}
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      className="flex-1"
                      onClick={() => handleSave(slot)}
                      disabled={saving || !weight}
                    >
                      {saving ? '保存中...' : log ? '更新' : '保存'}
                    </Button>
                    {isActive && (
                      <Button
                        variant="ghost"
                        onClick={() => setActiveSlot(null)}
                      >
                        取消
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          );
        })}

        {/* 早晚体重差异提醒 */}
        {morningLog && eveningLog && (
          (() => {
            const diff = Math.abs(eveningLog.weight_kg - morningLog.weight_kg);
            if (diff > 1.0) {
              return (
                <Card className="border-2 border-yellow-300 bg-yellow-50">
                  <p className="text-base font-medium text-yellow-800">
                    ⚠️ 今日早晚体重相差 {diff.toFixed(1)} kg，波动较大，请留意
                  </p>
                </Card>
              );
            }
            return null;
          })()
        )}
      </div>
    </Layout>
  );
}
