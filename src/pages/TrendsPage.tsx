import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subDays, startOfDay, endOfDay, format, parseISO } from 'date-fns';
import {
  LineChart,
  Line,
  Bar,
  ComposedChart,
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
import { getInrRecords, getBloodPressureRecords, getDoseLogs, getDoseRegimes } from '../lib/api';
import {
  aggregateInrByDay,
  aggregateBloodPressureByDay,
  aggregateHeartRateByDay,
  calculateInrInRangeRate,
  calculateBloodPressureStats,
  calculateDoseAdherenceStats,
  buildDoseChartData,
} from '../lib/aggregate';
import {
  checkInrRecordHealth,
  checkBloodPressureRecordHealth,
} from '../lib/healthCheck';
import type {
  TimeRangePreset,
  InrRecord,
  BloodPressureRecord,
  DoseRegime,
  DoseAdherenceStats,
  DoseChartDataPoint,
} from '../types';

// 图表标签：简化日期
const formatDateTick = (d: string) => {
  try { return format(parseISO(d), 'MM/dd'); } catch { return d; }
};

export function TrendsPage() {
  const navigate = useNavigate();
  const [loading, setLoading]       = useState(true);
  const [timeRange, setTimeRange]   = useState<TimeRangePreset>('30d');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd]   = useState<Date>();

  // 原有数据
  const [inrData, setInrData]       = useState<any[]>([]);
  const [bpData, setBpData]         = useState<any[]>([]);
  const [hrData, setHrData]         = useState<any[]>([]);
  const [inrRate, setInrRate]       = useState(0);
  const [bpStats, setBpStats]       = useState<any>(null);
  const [recentInrRecords, setRecentInrRecords] = useState<InrRecord[]>([]);
  const [recentBpRecords, setRecentBpRecords]   = useState<BloodPressureRecord[]>([]);

  // 新增：剂量相关
  const [doseChartData, setDoseChartData]     = useState<DoseChartDataPoint[]>([]);
  const [adherenceStats, setAdherenceStats]   = useState<DoseAdherenceStats | null>(null);
  const [activeTab, setActiveTab]             = useState<'inr' | 'bp' | 'dose'>('inr');

  useEffect(() => { loadTrends(); }, [timeRange, customStart, customEnd]);

  const getDateRange = () => {
    const now = new Date();
    const end = endOfDay(now);
    if (timeRange === 'custom') {
      return { start: customStart || startOfDay(subDays(now, 30)), end: customEnd || end };
    }
    const days = ({ '7d': 7, '30d': 30, '90d': 90 } as Record<string, number>)[timeRange] || 30;
    return { start: startOfDay(subDays(now, days)), end };
  };

  const loadTrends = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();

      const [inrRecords, bpRecords, doseLogs, regimes] = await Promise.all([
        getInrRecords({ startDate: dateRange.start, endDate: dateRange.end }),
        getBloodPressureRecords({ startDate: dateRange.start, endDate: dateRange.end }),
        getDoseLogs({ startDate: dateRange.start, endDate: dateRange.end }),
        getDoseRegimes(),
      ]);

      setRecentInrRecords(inrRecords);
      setRecentBpRecords(bpRecords);

      setInrData(aggregateInrByDay(inrRecords));
      setBpData(aggregateBloodPressureByDay(bpRecords));
      setHrData(aggregateHeartRateByDay(bpRecords));
      setInrRate(calculateInrInRangeRate(inrRecords));
      setBpStats(calculateBloodPressureStats(bpRecords));

      // 剂量图表数据
      const doseChart = buildDoseChartData(
        inrRecords, doseLogs, regimes as DoseRegime[],
        dateRange.start, dateRange.end
      );
      setDoseChartData(doseChart);

      // 服药统计
      const stats = calculateDoseAdherenceStats(doseLogs, dateRange.start, dateRange.end);
      setAdherenceStats(stats);

    } catch (error) {
      console.error('加载趋势失败:', error);
      alert('加载趋势失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const hasData = inrData.length > 0 || bpData.length > 0 || hrData.length > 0 || doseChartData.length > 0;

  // ─── 异常警告（原有逻辑）──────────────────────────────────
  const alerts: { type: 'inr' | 'bp'; level: string; messages: string[]; time: string }[] = [];
  recentInrRecords.slice(0, 5).forEach((r) => {
    const check = checkInrRecordHealth(r);
    if (check.level !== 'normal') {
      alerts.push({ type: 'inr', level: check.level, messages: check.messages, time: r.record_time });
    }
  });
  recentBpRecords.slice(0, 5).forEach((r) => {
    const check = checkBloodPressureRecordHealth(r);
    if (check.level !== 'normal') {
      alerts.push({ type: 'bp', level: check.level, messages: check.messages, time: r.record_time });
    }
  });

  return (
    <Layout>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">趋势分析</h1>
          <Button variant="ghost" size="sm" onClick={loadTrends}>刷新</Button>
        </div>

        {/* 时间范围选择 */}
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

        {loading ? (
          <Loading message="加载趋势数据中..." />
        ) : !hasData ? (
          <EmptyState
            icon="📊"
            title="暂无数据"
            description="该时间段内还没有任何记录"
          />
        ) : (
          <>
            {/* ─── 标签页切换 ─── */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              {(['inr', 'bp', 'dose'] as const).map((tab) => {
                const labels = { inr: '🩸 INR', bp: '💓 血压', dose: '💊 服药' };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            {/* ─── INR 图表 ─── */}
            {activeTab === 'inr' && inrData.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">INR 趋势</h2>
                <p className="text-sm text-gray-500 mb-3">达标率 {inrRate}%</p>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={inrData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={formatDateTick} tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v: number) => [v, 'INR']} labelFormatter={(l) => `日期: ${l}`} />
                    <ReferenceArea y1={2.0} y2={3.0} fill="#dcfce7" fillOpacity={0.4} />
                    <ReferenceLine y={2.0} stroke="#16a34a" strokeDasharray="4 4" />
                    <ReferenceLine y={3.0} stroke="#16a34a" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="INR" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* ─── 血压图表 ─── */}
            {activeTab === 'bp' && bpData.length > 0 && (
              <Card>
                <h2 className="text-lg font-semibold text-gray-800 mb-3">血压趋势</h2>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={bpData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tickFormatter={formatDateTick} tick={{ fontSize: 11 }} />
                    <YAxis domain={[40, 200]} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(l) => `日期: ${l}`} />
                    <Legend />
                    <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="4 4" label={{ value: '140', fontSize: 10 }} />
                    <ReferenceLine y={90}  stroke="#f97316" strokeDasharray="4 4" label={{ value: '90', fontSize: 10 }} />
                    <Line type="monotone" dataKey="systolic"  stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="收缩压" />
                    <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="舒张压" />
                  </LineChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* ─── 剂量 vs INR 双轴图表 ─── */}
            {activeTab === 'dose' && (
              <>
                {doseChartData.length > 0 ? (
                  <Card>
                    <h2 className="text-lg font-semibold text-gray-800 mb-1">剂量与INR对比</h2>
                    <p className="text-xs text-gray-400 mb-3">柱：实际服药量　线：INR值　虚线：处方剂量</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={doseChartData} margin={{ top: 5, right: 20, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" tickFormatter={formatDateTick} tick={{ fontSize: 11 }} />
                        {/* 左轴：剂量 */}
                        <YAxis
                          yAxisId="dose"
                          orientation="left"
                          domain={[0, 2.5]}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v}片`}
                        />
                        {/* 右轴：INR */}
                        <YAxis
                          yAxisId="inr"
                          orientation="right"
                          domain={[0, 5]}
                          tick={{ fontSize: 11 }}
                          tickFormatter={(v) => `${v}`}
                        />
                        <Tooltip
                          formatter={(value: number, name: string) => {
                            if (name === 'INR') return [`${value}`, 'INR'];
                            if (name === '实际剂量') return [`${value}片`, '实际剂量'];
                            if (name === '处方剂量') return [`${value}片`, '处方剂量'];
                            return [value, name];
                          }}
                          labelFormatter={(l) => `日期: ${l}`}
                        />
                        <Legend />
                        {/* INR 目标区间 */}
                        <ReferenceArea yAxisId="inr" y1={2.0} y2={3.0} fill="#dcfce7" fillOpacity={0.3} />
                        {/* 处方剂量参考线（阶梯线） */}
                        <Line
                          yAxisId="dose"
                          type="stepAfter"
                          dataKey="prescribedDose"
                          stroke="#94a3b8"
                          strokeDasharray="5 5"
                          strokeWidth={1.5}
                          dot={false}
                          name="处方剂量"
                        />
                        {/* 实际服药量（柱状） */}
                        <Bar
                          yAxisId="dose"
                          dataKey="dose"
                          fill="#93c5fd"
                          name="实际剂量"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={24}
                        />
                        {/* INR 折线 */}
                        <Line
                          yAxisId="inr"
                          type="monotone"
                          dataKey="inr"
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          dot={{ r: 5, fill: '#3b82f6' }}
                          name="INR"
                          connectNulls={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </Card>
                ) : (
                  <EmptyState icon="💊" title="暂无服药记录" description="开始记录每日服药后，这里将显示剂量与INR的关系图" />
                )}

                {/* 服药统计卡片 */}
                {adherenceStats && adherenceStats.takenDays + adherenceStats.missedDays + adherenceStats.adjustedDays > 0 && (
                  <Card>
                    <h2 className="text-lg font-semibold text-gray-800 mb-3">服药依从性</h2>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-green-50 rounded-xl p-3 text-center">
                        <p className="text-3xl font-bold text-green-600">{adherenceStats.adherenceRate}%</p>
                        <p className="text-xs text-gray-500 mt-1">服药率</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-3 text-center">
                        <p className="text-3xl font-bold text-blue-600">{adherenceStats.currentStreak}</p>
                        <p className="text-xs text-gray-500 mt-1">连续服药天数</p>
                      </div>
                      <div className="bg-gray-50 rounded-xl p-3 text-center">
                        <p className="text-3xl font-bold text-gray-700">{adherenceStats.takenDays}</p>
                        <p className="text-xs text-gray-500 mt-1">✅ 已按时服用</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-3 text-center">
                        <p className="text-3xl font-bold text-red-500">{adherenceStats.missedDays}</p>
                        <p className="text-xs text-gray-500 mt-1">❌ 漏服次数</p>
                      </div>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ─── 异常警告（始终显示，独立于标签页） ─── */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-base font-semibold text-gray-700">⚠️ 近期异常提醒</h3>
                {alerts.map((alert, idx) => (
                  <Card
                    key={idx}
                    className={alert.level === 'danger' ? 'border-red-300 bg-red-50' : 'border-yellow-300 bg-yellow-50'}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl flex-shrink-0">
                        {alert.type === 'inr' ? '🩸' : '💓'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          {alert.type === 'inr' ? 'INR' : '血压'} — {format(parseISO(alert.time), 'MM-dd HH:mm')}
                        </p>
                        {alert.messages.map((msg, msgIdx) => (
                          <p key={msgIdx} className={`text-base font-medium ${alert.level === 'danger' ? 'text-red-800' : 'text-yellow-800'}`}>
                            {msg}
                          </p>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))}
                <p className="text-xs text-gray-500 text-center">💡 如有不适，请及时就医咨询</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
