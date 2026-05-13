import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, subDays, startOfDay, endOfDay } from 'date-fns';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DateRangeSelector } from '../components/DateRangeSelector';
import {
  getInrRecords,
  getBloodPressureRecords,
  getDoseLogs,
  getActiveRegime,
  getWeightLogs,
  getWeightLogsByDate,
  getMealLogsByDate,
  getMealLogs,
  deleteInrRecord,
  deleteBloodPressureRecord,
  deleteDoseLog,
  deleteWeightLog,
  deleteMealLog,
} from '../lib/api';
import { getFoodById } from '../lib/foodData';
import {
  checkInrRecordHealth,
  checkBloodPressureRecordHealth,
  getInrAbnormalColor,
  getBloodPressureAbnormalColor,
} from '../lib/healthCheck';
import { DOSE_OPTIONS, TIME_OF_DAY_LABELS, MEAL_TYPE_LABELS, PORTION_LABELS } from '../types';
import type {
  InrRecord,
  BloodPressureRecord,
  DoseLog,
  DoseRegime,
  WeightLog,
  MealLogWithItems,
  RecordType,
  TimeRangePreset,
} from '../types';

type CombinedRecord =
  | { type: 'inr';  data: InrRecord }
  | { type: 'bp';   data: BloodPressureRecord }
  | { type: 'dose'; data: DoseLog }
  | { type: 'weight'; data: WeightLog }
  | { type: 'meal'; data: MealLogWithItems };

export function RecordsPage() {
  const navigate = useNavigate();
  const [loading, setLoading]     = useState(true);
  const [records, setRecords]     = useState<CombinedRecord[]>([]);
  const [recordType, setRecordType] = useState<RecordType>('all');
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('30d');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    record: CombinedRecord | null;
  }>({ isOpen: false, record: null });

  // 今日服药快捷入口
  const [todayDoseLog, setTodayDoseLog]     = useState<DoseLog | null>(null);
  const [activeRegime, setActiveRegime]     = useState<DoseRegime | null>(null);
  // 今日体重
  const [todayWeightLogs, setTodayWeightLogs] = useState<WeightLog[]>([]);
  // 今日饮食
  const [todayMeals, setTodayMeals] = useState<MealLogWithItems[]>([]);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    loadRecords();
    loadTodayDose();
    loadTodayWeight();
    loadTodayMeals();
  }, [timeRange, customStart, customEnd]);

  const getDateRange = () => {
    const now = new Date();
    const end = endOfDay(now);
    if (timeRange === 'custom') {
      return {
        start: customStart || startOfDay(subDays(now, 30)),
        end: customEnd || end,
      };
    }
    const days = ({ '7d': 7, '30d': 30, '90d': 90 } as Record<string, number>)[timeRange] || 30;
    return { start: startOfDay(subDays(now, days)), end };
  };

  const loadTodayDose = async () => {
    try {
      const [logs, regime] = await Promise.all([
        getDoseLogs({ startDate: new Date(today), endDate: new Date(today) }),
        getActiveRegime(today),
      ]);
      setTodayDoseLog(logs.find((l) => l.date === today) ?? null);
      setActiveRegime(regime);
    } catch (err) {
      console.error('加载今日服药状态失败:', err);
    }
  };

  const loadTodayWeight = async () => {
    try {
      const logs = await getWeightLogsByDate(today);
      setTodayWeightLogs(logs);
    } catch (err) {
      console.error('加载今日体重失败:', err);
    }
  };

  const loadTodayMeals = async () => {
    try {
      const meals = await getMealLogsByDate(today);
      setTodayMeals(meals);
    } catch (err) {
      console.error('加载今日饮食失败:', err);
    }
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();
      const [inrData, bpData, doseData, weightData, mealData] = await Promise.all([
        getInrRecords({ startDate: dateRange.start, endDate: dateRange.end }),
        getBloodPressureRecords({ startDate: dateRange.start, endDate: dateRange.end }),
        getDoseLogs({ startDate: dateRange.start, endDate: dateRange.end }),
        getWeightLogs({ startDate: dateRange.start, endDate: dateRange.end }),
        getMealLogs({ startDate: dateRange.start, endDate: dateRange.end }),
      ]);

      const combined: CombinedRecord[] = [
        ...inrData.map((r) => ({ type: 'inr' as const, data: r })),
        ...bpData.map((r) => ({ type: 'bp' as const, data: r })),
        ...doseData.map((r) => ({ type: 'dose' as const, data: r })),
        ...weightData.map((r) => ({ type: 'weight' as const, data: r })),
        ...mealData.map((r) => ({ type: 'meal' as const, data: r })),
      ];

      // 按时间倒序排序
      combined.sort((a, b) => {
        const getTime = (r: CombinedRecord) =>
          r.type === 'dose' || r.type === 'weight' || r.type === 'meal'
            ? new Date(r.data.date + 'T00:00:00').getTime()
            : new Date(r.data.record_time).getTime();
        return getTime(b) - getTime(a);
      });

      setRecords(combined);
    } catch (error) {
      console.error('加载记录失败:', error);
      alert('加载记录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    if (recordType === 'all')  return true;
    if (recordType === 'inr')  return record.type === 'inr';
    if (recordType === 'bp')   return record.type === 'bp';
    if (recordType === 'dose') return record.type === 'dose';
    if (recordType === 'weight') return record.type === 'weight';
    if (recordType === 'meal') return record.type === 'meal';
    return true;
  });

  const handleDelete = async () => {
    if (!deleteDialog.record) return;
    try {
      if (deleteDialog.record.type === 'inr') {
        await deleteInrRecord(deleteDialog.record.data.id);
      } else if (deleteDialog.record.type === 'bp') {
        await deleteBloodPressureRecord(deleteDialog.record.data.id);
      } else if (deleteDialog.record.type === 'dose') {
        await deleteDoseLog(deleteDialog.record.data.id);
      } else if (deleteDialog.record.type === 'weight') {
        await deleteWeightLog(deleteDialog.record.data.id);
      } else if (deleteDialog.record.type === 'meal') {
        await deleteMealLog(deleteDialog.record.data.id);
      }
      setDeleteDialog({ isOpen: false, record: null });
      await loadRecords();
      await loadTodayDose();
      await loadTodayWeight();
      await loadTodayMeals();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">记录</h1>
          {/* 新增按钮组 */}
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/records/inr/new')}
            >
              + INR
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/records/bp/new')}
            >
              + 血压
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/records/weight?date=${today}`)}
            >
              + 体重
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/records/meal?date=${today}`)}
            >
              + 饮食
            </Button>
          </div>
        </div>

        {/* ─── 今日服药快捷卡片 ─── */}
        <Card
          className={`border-2 ${
            todayDoseLog?.status === '已服用'
              ? 'border-green-300 bg-green-50'
              : todayDoseLog?.status === '漏服'
              ? 'border-red-300 bg-red-50'
              : todayDoseLog?.status === '剂量调整'
              ? 'border-yellow-300 bg-yellow-50'
              : 'border-blue-300 bg-blue-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-0.5">今日华法林</p>
              {activeRegime ? (
                <p className="text-base font-semibold text-gray-700">
                  处方：{DOSE_OPTIONS.find((d) => d.value === activeRegime.prescribed_dose)?.label ?? `${activeRegime.prescribed_dose}片`}
                </p>
              ) : (
                <p className="text-sm text-gray-400">尚未设定处方剂量</p>
              )}
              {todayDoseLog ? (
                <p className={`text-lg font-bold mt-1 ${
                  todayDoseLog.status === '已服用'   ? 'text-green-700' :
                  todayDoseLog.status === '漏服'     ? 'text-red-700'   :
                                                       'text-yellow-700'
                }`}>
                  {todayDoseLog.status === '已服用'   ? '✅ 已服用' :
                   todayDoseLog.status === '漏服'     ? '❌ 漏服'   :
                                                        '⚠️ 剂量调整'}
                  {todayDoseLog.actual_dose != null && (
                    <span className="text-sm font-normal ml-2 text-gray-500">
                      ({DOSE_OPTIONS.find((d) => d.value === todayDoseLog.actual_dose)?.label ?? `${todayDoseLog.actual_dose}片`})
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-base text-gray-500 mt-1">尚未记录今日服药</p>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/records/dose?date=${today}`)}
            >
              {todayDoseLog ? '修改' : '记录'}
            </Button>
          </div>
        </Card>

        {/* ─── 今日体重快捷卡片 ─── */}
        <Card
          className={`border-2 ${
            todayWeightLogs.length >= 2
              ? 'border-green-300 bg-green-50'
              : todayWeightLogs.length === 1
              ? 'border-blue-300 bg-blue-50'
              : 'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-0.5">今日体重</p>
              {todayWeightLogs.length > 0 ? (
                <div className="flex gap-4 mt-1">
                  {todayWeightLogs.map((wl) => (
                    <p key={wl.id} className="text-lg font-bold text-gray-900">
                      {wl.time_of_day === 'morning' ? '☀️' : '🌙'} {wl.weight_kg} kg
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-base text-gray-500 mt-1">尚未记录今日体重</p>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/records/weight?date=${today}`)}
            >
              {todayWeightLogs.length > 0 ? '修改' : '记录'}
            </Button>
          </div>
        </Card>

        {/* ─── 今日饮食快捷卡片 ─── */}
        <Card
          className={`border-2 ${
            todayMeals.length >= 3 ? 'border-green-300 bg-green-50' :
            todayMeals.length > 0 ? 'border-blue-300 bg-blue-50' :
            'border-gray-200 bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-0.5">今日饮食</p>
              {todayMeals.length > 0 ? (
                <div className="flex gap-3 mt-1 flex-wrap">
                  {todayMeals.map((m) => (
                    <span key={m.id} className="text-sm text-gray-700">
                      {MEAL_TYPE_LABELS[m.meal_type].split(' ')[0]} {m.items.length}项
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-base text-gray-500 mt-1">尚未记录今日饮食</p>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(`/records/meal?date=${today}`)}
            >
              {todayMeals.length > 0 ? '查看' : '记录'}
            </Button>
          </div>
        </Card>

        {/* ─── 时间范围 ─── */}
        <Card>
          <DateRangeSelector
            value={timeRange}
            customStart={customStart}
            customEnd={customEnd}
            onChange={(preset, start, end) => {
              setTimeRange(preset);
              setCustomStart(start);
              setCustomEnd(end);
            }}
          />
        </Card>

        {/* ─── 类型筛选 ─── */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200">
          {(['all', 'inr', 'bp', 'dose', 'weight', 'meal'] as RecordType[]).map((type) => {
            const labels = { all: '全部', inr: '🩸 INR', bp: '💓 血压', dose: '💊 服药', weight: '⚖️ 体重', meal: '🥬 饮食' };
            return (
              <button
                key={type}
                onClick={() => setRecordType(type)}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  recordType === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {labels[type]}
              </button>
            );
          })}
        </div>

        {/* ─── 记录列表 ─── */}
        {loading ? (
          <Loading message="加载记录中..." />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            icon="📋"
            title="暂无记录"
            description="该时间段内没有符合条件的记录"
          />
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => {
              if (record.type === 'inr') {
                return (
                  <InrRecordCard
                    key={record.data.id}
                    record={record.data}
                    onEdit={() => navigate(`/records/inr/edit/${record.data.id}`, { state: { record: record.data } })}
                    onDelete={() => setDeleteDialog({ isOpen: true, record })}
                  />
                );
              } else if (record.type === 'bp') {
                return (
                  <BpRecordCard
                    key={record.data.id}
                    record={record.data}
                    onEdit={() => navigate(`/records/bp/edit/${record.data.id}`, { state: { record: record.data } })}
                    onDelete={() => setDeleteDialog({ isOpen: true, record })}
                  />
                );
              } else if (record.type === 'dose') {
                return (
                  <DoseRecordCard
                    key={record.data.id}
                    record={record.data}
                    onEdit={() => navigate(`/records/dose?date=${record.data.date}`)}
                    onDelete={() => setDeleteDialog({ isOpen: true, record })}
                  />
                );
              } else if (record.type === 'weight') {
                return (
                  <WeightRecordCard
                    key={record.data.id}
                    record={record.data}
                    onEdit={() => navigate(`/records/weight?date=${record.data.date}`)}
                    onDelete={() => setDeleteDialog({ isOpen: true, record })}
                  />
                );
              } else {
                return (
                  <MealRecordCard
                    key={record.data.id}
                    record={record.data}
                    onEdit={() => navigate(`/records/meal?date=${record.data.date}`)}
                    onDelete={() => setDeleteDialog({ isOpen: true, record })}
                  />
                );
              }
            })}
          </div>
        )}

        {/* 删除确认弹窗 */}
        <ConfirmDialog
          isOpen={deleteDialog.isOpen}
          title="确认删除"
          message="删除后无法恢复，确定要删除这条记录吗？"
          onConfirm={handleDelete}
          onCancel={() => setDeleteDialog({ isOpen: false, record: null })}
        />
      </div>
    </Layout>
  );
}

// ─── INR 卡片 ──────────────────────────────────────
function InrRecordCard({
  record,
  onEdit,
  onDelete,
}: {
  record: InrRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const healthCheck = checkInrRecordHealth(record);
  const borderColor = getInrAbnormalColor(record.value);
  const time = format(parseISO(record.record_time), 'yyyy-MM-dd HH:mm');

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-medium text-gray-500">🩸 INR</span>
            {record.is_in_range ? (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">达标</span>
            ) : (
              <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">未达标</span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-900">{record.value}</p>
          {healthCheck.messages.map((msg, i) => (
            <div key={i} className={`mt-2 p-2 rounded-lg ${healthCheck.level === 'danger' ? 'bg-red-100 border border-red-300' : 'bg-yellow-100 border border-yellow-300'}`}>
              <p className={`text-sm font-medium ${healthCheck.level === 'danger' ? 'text-red-800' : 'text-yellow-800'}`}>{msg}</p>
            </div>
          ))}
          <p className="text-sm text-gray-500 mt-1">{time}</p>
          <p className="text-sm text-gray-500">华法林: {record.warfarin_dose_mg} mg</p>
          {record.note && <p className="text-sm text-gray-500">备注: {record.note}</p>}
        </div>
        <div className="flex flex-col gap-1 ml-3">
          <Button variant="ghost" size="sm" onClick={onEdit}>编辑</Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500">删除</Button>
        </div>
      </div>
    </Card>
  );
}

// ─── 血压卡片 ───────────────────────────────────────
function BpRecordCard({
  record,
  onEdit,
  onDelete,
}: {
  record: BloodPressureRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const healthCheck = checkBloodPressureRecordHealth(record);
  const borderColor = getBloodPressureAbnormalColor(record.systolic, record.diastolic);
  const time = format(parseISO(record.record_time), 'yyyy-MM-dd HH:mm');

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-base font-medium text-gray-500 mb-1">💓 血压</p>
          <p className="text-3xl font-bold text-gray-900">
            {record.systolic}/{record.diastolic}
          </p>
          {healthCheck.messages.map((msg, i) => (
            <div key={i} className={`mt-2 p-2 rounded-lg ${healthCheck.level === 'danger' ? 'bg-red-100 border border-red-300' : 'bg-yellow-100 border border-yellow-300'}`}>
              <p className={`text-sm font-medium ${healthCheck.level === 'danger' ? 'text-red-800' : 'text-yellow-800'}`}>{msg}</p>
            </div>
          ))}
          <p className="text-sm text-gray-500 mt-1">{time}</p>
          {record.heart_rate && <p className="text-sm text-gray-500">心率: {record.heart_rate} bpm</p>}
          {record.arm && <p className="text-sm text-gray-500">手臂: {record.arm === 'left' ? '🤚 左手' : '✋ 右手'}</p>}
          {record.position && <p className="text-sm text-gray-500">体位: {record.position}</p>}
        </div>
        <div className="flex flex-col gap-1 ml-3">
          <Button variant="ghost" size="sm" onClick={onEdit}>编辑</Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500">删除</Button>
        </div>
      </div>
    </Card>
  );
}

// ─── 服药记录卡片 ────────────────────────────────────
function DoseRecordCard({
  record,
  onEdit,
  onDelete,
}: {
  record: DoseLog;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const borderColor =
    record.status === '已服用'   ? 'border-l-green-400' :
    record.status === '漏服'     ? 'border-l-red-400'   :
                                   'border-l-yellow-400';
  const statusEmoji =
    record.status === '已服用'   ? '✅' :
    record.status === '漏服'     ? '❌' : '⚠️';

  const doseLabel = record.actual_dose != null
    ? (DOSE_OPTIONS.find((d) => d.value === record.actual_dose)?.label ?? `${record.actual_dose}片`)
    : '—';

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-base font-medium text-gray-500 mb-1">💊 华法林</p>
          <p className="text-2xl font-bold text-gray-900">
            {statusEmoji} {record.status}
          </p>
          {record.status !== '漏服' && (
            <p className="text-base text-gray-700 mt-0.5">服用量：{doseLabel}</p>
          )}
          <p className="text-sm text-gray-500 mt-1">{record.date}</p>
          {record.notes && <p className="text-sm text-gray-500">备注: {record.notes}</p>}
        </div>
        <div className="flex flex-col gap-1 ml-3">
          <Button variant="ghost" size="sm" onClick={onEdit}>编辑</Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500">删除</Button>
        </div>
      </div>
    </Card>
  );
}

// ─── 体重记录卡片 ────────────────────────────────────
function WeightRecordCard({
  record,
  onEdit,
  onDelete,
}: {
  record: WeightLog;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="border-l-4 border-l-purple-400">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-base font-medium text-gray-500 mb-1">⚖️ 体重</p>
          <p className="text-2xl font-bold text-gray-900">
            {record.weight_kg} kg
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            {TIME_OF_DAY_LABELS[record.time_of_day]} · {record.date}
          </p>
          {record.notes && <p className="text-sm text-gray-500">备注: {record.notes}</p>}
        </div>
        <div className="flex flex-col gap-1 ml-3">
          <Button variant="ghost" size="sm" onClick={onEdit}>编辑</Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500">删除</Button>
        </div>
      </div>
    </Card>
  );
}

// ─── 饮食记录卡片 ────────────────────────────────────
function MealRecordCard({
  record,
  onEdit,
  onDelete,
}: {
  record: MealLogWithItems;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const highCount = record.items.filter((i) => i.vk_level === 'high').length;
  const borderColor = highCount >= 2 ? 'border-l-red-400' : highCount >= 1 ? 'border-l-yellow-400' : 'border-l-green-400';

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-base font-medium text-gray-500 mb-1">
            🥬 {MEAL_TYPE_LABELS[record.meal_type]}
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {record.items.map((item) => {
              const food = getFoodById(item.food_id);
              const bgColor = item.vk_level === 'high' ? 'bg-red-100' : item.vk_level === 'medium' ? 'bg-yellow-100' : 'bg-green-100';
              return (
                <span key={item.id} className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-xs ${bgColor}`}>
                  {food?.icon || '🍽️'} {item.custom_name || food?.name || item.food_id}
                </span>
              );
            })}
          </div>
          <p className="text-sm text-gray-500 mt-1">{record.date}</p>
          {record.notes && <p className="text-sm text-gray-500">备注: {record.notes}</p>}
        </div>
        <div className="flex flex-col gap-1 ml-3">
          <Button variant="ghost" size="sm" onClick={onEdit}>编辑</Button>
          <Button variant="ghost" size="sm" onClick={onDelete} className="text-red-500">删除</Button>
        </div>
      </div>
    </Card>
  );
}
