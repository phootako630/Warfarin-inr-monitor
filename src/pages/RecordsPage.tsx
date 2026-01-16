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
  deleteInrRecord,
  deleteBloodPressureRecord,
} from '../lib/api';
import type {
  InrRecord,
  BloodPressureRecord,
  RecordType,
  TimeRangePreset,
} from '../types';

type CombinedRecord =
  | { type: 'inr'; data: InrRecord }
  | { type: 'bp'; data: BloodPressureRecord };

export function RecordsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<CombinedRecord[]>([]);
  const [recordType, setRecordType] = useState<RecordType>('all');
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('30d');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    record: CombinedRecord | null;
  }>({ isOpen: false, record: null });

  useEffect(() => {
    loadRecords();
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

    const days = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
    }[timeRange] || 30;

    return {
      start: startOfDay(subDays(now, days)),
      end,
    };
  };

  const loadRecords = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();

      const [inrData, bpData] = await Promise.all([
        getInrRecords(dateRange),
        getBloodPressureRecords(dateRange),
      ]);

      const combined: CombinedRecord[] = [
        ...inrData.map((r) => ({ type: 'inr' as const, data: r })),
        ...bpData.map((r) => ({ type: 'bp' as const, data: r })),
      ];

      // 按时间倒序排序
      combined.sort((a, b) => {
        const timeA = new Date(
          a.type === 'inr' ? a.data.record_time : a.data.record_time
        ).getTime();
        const timeB = new Date(
          b.type === 'inr' ? b.data.record_time : b.data.record_time
        ).getTime();
        return timeB - timeA;
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
    if (recordType === 'all') return true;
    if (recordType === 'inr') return record.type === 'inr';
    if (recordType === 'bp') return record.type === 'bp';
    return true;
  });

  const handleDelete = async () => {
    if (!deleteDialog.record) return;

    try {
      const record = deleteDialog.record;
      if (record.type === 'inr') {
        await deleteInrRecord(record.data.id);
      } else {
        await deleteBloodPressureRecord(record.data.id);
      }

      setDeleteDialog({ isOpen: false, record: null });
      loadRecords();
    } catch (error) {
      console.error('删除失败:', error);
      alert('删除失败，请重试');
    }
  };

  const handleEdit = (record: CombinedRecord) => {
    if (record.type === 'inr') {
      navigate(`/records/inr/edit/${record.data.id}`, {
        state: { record: record.data },
      });
    } else {
      navigate(`/records/bp/edit/${record.data.id}`, {
        state: { record: record.data },
      });
    }
  };

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">健康记录</h1>

        {/* 快速新增按钮 */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={() => navigate('/records/inr/new')}
          >
            ➕ 新增 INR
          </Button>
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={() => navigate('/records/bp/new')}
          >
            ➕ 新增血压
          </Button>
        </div>

        {/* 筛选器 */}
        <Card>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                记录类型
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  { value: 'all' as const, label: '全部' },
                  { value: 'inr' as const, label: 'INR' },
                  { value: 'bp' as const, label: '血压' },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setRecordType(option.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                      recordType === option.value
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                时间范围
              </label>
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
            </div>
          </div>
        </Card>

        {/* 记录列表 */}
        {loading ? (
          <Loading message="加载记录中..." />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            icon="📝"
            title="还没有记录"
            description="点击上方按钮添加第一条记录"
          />
        ) : (
          <div className="space-y-3">
            {filteredRecords.map((record) => (
              <RecordCard
                key={`${record.type}-${record.data.id}`}
                record={record}
                onEdit={handleEdit}
                onDelete={(r) =>
                  setDeleteDialog({ isOpen: true, record: r })
                }
              />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="确认删除"
        message="删除后无法恢复，确定要删除这条记录吗？"
        confirmText="删除"
        cancelText="取消"
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, record: null })}
        variant="danger"
      />
    </Layout>
  );
}

function RecordCard({
  record,
  onEdit,
  onDelete,
}: {
  record: CombinedRecord;
  onEdit: (record: CombinedRecord) => void;
  onDelete: (record: CombinedRecord) => void;
}) {
  const time = format(
    parseISO(record.data.record_time),
    'yyyy-MM-dd HH:mm'
  );

  if (record.type === 'inr') {
    const data = record.data;
    return (
      <Card className="relative">
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={() => onEdit(record)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium px-2 py-1"
          >
            编辑
          </button>
          <button
            onClick={() => onDelete(record)}
            className="text-danger-600 hover:text-danger-700 text-sm font-medium px-2 py-1"
          >
            删除
          </button>
        </div>

        <div className="pr-20">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🩸</span>
            <span className="text-sm font-medium text-gray-600">INR</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">
                {data.value}
              </span>
              {data.is_in_range !== null && (
                <span
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    data.is_in_range
                      ? 'bg-success-50 text-success-700'
                      : 'bg-danger-50 text-danger-700'
                  }`}
                >
                  {data.is_in_range ? '✓ 达标' : '✗ 未达标'}
                </span>
              )}
            </div>

            <p className="text-sm text-gray-600">{time}</p>

            <p className="text-sm text-gray-600">
              华法林: {data.warfarin_dose_mg} mg
            </p>

            {data.target_range_low && data.target_range_high && (
              <p className="text-xs text-gray-500">
                目标范围: {data.target_range_low} - {data.target_range_high}
              </p>
            )}

            {data.note && (
              <p className="text-sm text-gray-700 mt-2 bg-gray-50 p-2 rounded">
                备注: {data.note}
              </p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // 血压记录
  const data = record.data;
  return (
    <Card className="relative">
      <div className="absolute top-3 right-3 flex gap-2">
        <button
          onClick={() => onEdit(record)}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium px-2 py-1"
        >
          编辑
        </button>
        <button
          onClick={() => onDelete(record)}
          className="text-danger-600 hover:text-danger-700 text-sm font-medium px-2 py-1"
        >
          删除
        </button>
      </div>

      <div className="pr-20">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">💓</span>
          <span className="text-sm font-medium text-gray-600">血压</span>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-900">
              {data.systolic}/{data.diastolic}
            </span>
            <span className="text-sm text-gray-600">mmHg</span>
          </div>

          <p className="text-sm text-gray-600">{time}</p>

          {data.heart_rate && (
            <p className="text-sm text-gray-600">
              心率: {data.heart_rate} bpm
            </p>
          )}

          {data.position && (
            <p className="text-sm text-gray-600">体位: {data.position}</p>
          )}
        </div>
      </div>
    </Card>
  );
}
