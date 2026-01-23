import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subDays, startOfDay, endOfDay, format, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { EmptyState } from '../components/EmptyState';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { getInrRecords, getBloodPressureRecords } from '../lib/api';
import {
  aggregateInrByDay,
  aggregateBloodPressureByDay,
  aggregateHeartRateByDay,
  calculateInrInRangeRate,
  calculateBloodPressureStats,
} from '../lib/aggregate';
import {
  checkInrRecordHealth,
  checkBloodPressureRecordHealth,
} from '../lib/healthCheck';
import type { TimeRangePreset, InrRecord, BloodPressureRecord } from '../types';

export function TrendsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('30d');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();

  const [inrData, setInrData] = useState<any[]>([]);
  const [bpData, setBpData] = useState<any[]>([]);
  const [hrData, setHrData] = useState<any[]>([]);
  const [inrRate, setInrRate] = useState(0);
  const [bpStats, setBpStats] = useState<any>(null);
  const [recentInrRecords, setRecentInrRecords] = useState<InrRecord[]>([]);
  const [recentBpRecords, setRecentBpRecords] = useState<BloodPressureRecord[]>([]);

  useEffect(() => {
    loadTrends();
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

  const loadTrends = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();

      const [inrRecords, bpRecords] = await Promise.all([
        getInrRecords({ startDate: dateRange.start, endDate: dateRange.end }),
        getBloodPressureRecords({ startDate: dateRange.start, endDate: dateRange.end }),
      ]);

      // 保存原始记录用于异常检查
      setRecentInrRecords(inrRecords);
      setRecentBpRecords(bpRecords);

      // 聚合数据
      const inrAggregated = aggregateInrByDay(inrRecords);
      const bpAggregated = aggregateBloodPressureByDay(bpRecords);
      const hrAggregated = aggregateHeartRateByDay(bpRecords);

      setInrData(inrAggregated);
      setBpData(bpAggregated);
      setHrData(hrAggregated);

      // 计算统计
      setInrRate(calculateInrInRangeRate(inrRecords));
      setBpStats(calculateBloodPressureStats(bpRecords));
    } catch (error) {
      console.error('加载趋势失败:', error);
      alert('加载趋势失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const hasData = inrData.length > 0 || bpData.length > 0 || hrData.length > 0;

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">健康趋势</h1>
          <Button
            variant="secondary"
            onClick={() => navigate('/report-print')}
          >
            📄 导出 PDF
          </Button>
        </div>

        {/* 时间范围选择 */}
        <Card>
          <label className="block text-base font-medium text-gray-700 mb-2">
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
        </Card>

        {loading ? (
          <Loading message="加载趋势中..." />
        ) : !hasData ? (
          <EmptyState
            icon="📊"
            title="还没有数据"
            description="记录至少一条 INR 或血压数据即可查看趋势"
            action={
              <Button onClick={() => navigate('/records')}>去添加记录</Button>
            }
          />
        ) : (
          <>
            {/* 统计卡片 */}
            <div className="grid grid-cols-2 gap-3">
              {inrData.length > 0 && (
                <Card>
                  <p className="text-sm text-gray-600 mb-1">INR 达标率</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {inrRate}%
                  </p>
                </Card>
              )}

              {bpStats && bpStats.count > 0 && (
                <Card>
                  <p className="text-sm text-gray-600 mb-1">平均血压</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {bpStats.avgSystolic}/{bpStats.avgDiastolic}
                  </p>
                </Card>
              )}
            </div>

            {/* 异常警告区域 */}
            <HealthAlertsSection
              inrRecords={recentInrRecords}
              bpRecords={recentBpRecords}
            />

            {/* INR 趋势图 */}
            {inrData.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  INR 趋势
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={inrData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: '14px',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />

                    {/* 目标区间带 (2-3) */}
                    <ReferenceArea
                      y1={2}
                      y2={3}
                      fill="#22c55e"
                      fillOpacity={0.1}
                      label="目标区间"
                    />
                    <ReferenceLine
                      y={2}
                      stroke="#22c55e"
                      strokeDasharray="3 3"
                    />
                    <ReferenceLine
                      y={3}
                      stroke="#22c55e"
                      strokeDasharray="3 3"
                    />

                    <Line
                      type="monotone"
                      dataKey="value"
                      name="INR"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* 血压趋势图 */}
            {bpData.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  血压趋势
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={bpData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis domain={[40, 180]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: '14px',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />

                    <Line
                      type="monotone"
                      dataKey="systolic"
                      name="收缩压"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="diastolic"
                      name="舒张压"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* 心率趋势图 */}
            {hrData.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  心率趋势
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hrData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis domain={[40, 120]} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: '14px',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />

                    <Line
                      type="monotone"
                      dataKey="heartRate"
                      name="心率 (bpm)"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-600 mt-2">
                  * 仅显示血压记录中包含心率的数据
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

/**
 * 健康异常警告区域组件
 */
function HealthAlertsSection({
  inrRecords,
  bpRecords,
}: {
  inrRecords: InrRecord[];
  bpRecords: BloodPressureRecord[];
}) {
  // 收集所有异常记录 (最多显示最近 5 条)
  const alerts: Array<{
    type: 'inr' | 'bp';
    level: 'warning' | 'danger';
    messages: string[];
    time: string;
  }> = [];

  // 检查最近的 INR 记录
  inrRecords.slice(0, 5).forEach((record) => {
    const healthCheck = checkInrRecordHealth(record);
    if (healthCheck.hasAlert) {
      alerts.push({
        type: 'inr',
        level: healthCheck.level as 'warning' | 'danger',
        messages: healthCheck.messages,
        time: record.record_time,
      });
    }
  });

  // 检查最近的血压记录
  bpRecords.slice(0, 5).forEach((record) => {
    const healthCheck = checkBloodPressureRecordHealth(record);
    if (healthCheck.hasAlert) {
      alerts.push({
        type: 'bp',
        level: healthCheck.level as 'warning' | 'danger',
        messages: healthCheck.messages,
        time: record.record_time,
      });
    }
  });

  // 按时间排序 (最新的在前)
  alerts.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

  // 只显示最近 3 条
  const recentAlerts = alerts.slice(0, 3);

  if (recentAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
        <span>⚠️</span>
        <span>健康提醒</span>
      </h2>

      {recentAlerts.map((alert, idx) => (
        <Card
          key={idx}
          className={`border-2 ${
            alert.level === 'danger'
              ? 'border-red-300 bg-red-50'
              : 'border-yellow-300 bg-yellow-50'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">
              {alert.type === 'inr' ? '🩸' : '💓'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 mb-1">
                {alert.type === 'inr' ? 'INR' : '血压'} -{' '}
                {format(parseISO(alert.time), 'MM-dd HH:mm')}
              </p>
              {alert.messages.map((msg, msgIdx) => (
                <p
                  key={msgIdx}
                  className={`text-base font-medium ${
                    alert.level === 'danger' ? 'text-red-800' : 'text-yellow-800'
                  }`}
                >
                  {msg}
                </p>
              ))}
            </div>
          </div>
        </Card>
      ))}

      <p className="text-xs text-gray-500 text-center">
        💡 如有不适,请及时就医咨询
      </p>
    </div>
  );
}
