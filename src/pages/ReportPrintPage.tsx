import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { DateRangeSelector } from '../components/DateRangeSelector';
import {
  getInrRecords,
  getBloodPressureRecords,
  getDoseLogs,
  getDoseRegimes,
  getWeightLogs,
} from '../lib/api';
import {
  calculateInrInRangeRate,
  calculateBloodPressureStats,
  calculateDoseAdherenceStats,
  calculateWeightStats,
} from '../lib/aggregate';
import { DOSE_OPTIONS, TIME_OF_DAY_LABELS } from '../types';
import type {
  InrRecord,
  BloodPressureRecord,
  DoseLog,
  DoseRegime,
  WeightLog,
  DoseAdherenceStats,
  TimeRangePreset,
} from '../types';

export function ReportPrintPage() {
  const navigate = useNavigate();
  const [loading, setLoading]       = useState(true);
  const [timeRange, setTimeRange]   = useState<TimeRangePreset>('30d');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd]   = useState<Date>();

  const [inrRecords, setInrRecords]   = useState<InrRecord[]>([]);
  const [bpRecords, setBpRecords]     = useState<BloodPressureRecord[]>([]);
  const [doseLogs, setDoseLogs]       = useState<DoseLog[]>([]);
  const [regimes, setRegimes]         = useState<DoseRegime[]>([]);
  const [weightLogs, setWeightLogs]   = useState<WeightLog[]>([]);

  const [inrRate, setInrRate]         = useState(0);
  const [bpStats, setBpStats]         = useState<any>(null);
  const [adherenceStats, setAdherenceStats] = useState<DoseAdherenceStats | null>(null);
  const [wStats, setWStats] = useState<any>(null);

  useEffect(() => { loadData(); }, [timeRange, customStart, customEnd]);

  const getDateRange = () => {
    const now = new Date();
    const end = endOfDay(now);
    if (timeRange === 'custom') {
      return { start: customStart || startOfDay(subDays(now, 30)), end: customEnd || end };
    }
    const days = ({ '7d': 7, '30d': 30, '90d': 90 } as Record<string, number>)[timeRange] || 30;
    return { start: startOfDay(subDays(now, days)), end };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();
      const [inrData, bpData, doseData, regimeData, weightData] = await Promise.all([
        getInrRecords({ startDate: dateRange.start, endDate: dateRange.end }),
        getBloodPressureRecords({ startDate: dateRange.start, endDate: dateRange.end }),
        getDoseLogs({ startDate: dateRange.start, endDate: dateRange.end }),
        getDoseRegimes(),
        getWeightLogs({ startDate: dateRange.start, endDate: dateRange.end }),
      ]);

      setInrRecords(inrData);
      setBpRecords(bpData);
      setDoseLogs(doseData);
      setRegimes(regimeData);
      setWeightLogs(weightData);

      setInrRate(calculateInrInRangeRate(inrData));
      setBpStats(calculateBloodPressureStats(bpData));
      setAdherenceStats(calculateDoseAdherenceStats(doseData, dateRange.start, dateRange.end));
      setWStats(calculateWeightStats(weightData));
    } catch (error) {
      console.error('加载数据失败:', error);
      alert('加载数据失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => { window.print(); };

  const dateRange = getDateRange();
  const dateRangeText = `${format(dateRange.start, 'yyyy-MM-dd')} 至 ${format(dateRange.end, 'yyyy-MM-dd')}`;

  // 查找某日期的处方剂量
  const getPrescribedDose = (dateStr: string): number | undefined => {
    const sorted = [...regimes].sort((a, b) => a.start_date.localeCompare(b.start_date));
    let prescribed: number | undefined;
    for (const r of sorted) {
      if (r.start_date <= dateStr) prescribed = r.prescribed_dose;
      else break;
    }
    return prescribed;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <Loading message="加载报告数据中..." />
      </div>
    );
  }

  return (
    <>
      {/* 打印按钮 - 打印时隐藏 */}
      <div className="print:hidden fixed top-4 right-4 z-10 flex gap-2">
        <Button variant="secondary" onClick={() => navigate(-1)}>返回</Button>
        <Button variant="primary" onClick={handlePrint}>🖨️ 打印/保存 PDF</Button>
      </div>

      {/* 报告内容 */}
      <div className="max-w-4xl mx-auto p-8 bg-white min-h-screen print:p-6">

        {/* 报告标题 */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">健康记录报告</h1>
          <p className="text-base text-gray-600 print:text-sm">报告时间范围: {dateRangeText}</p>
          <p className="text-sm text-gray-500 print:text-xs">
            生成时间: {format(new Date(), 'yyyy-MM-dd HH:mm')}
          </p>
        </div>

        {/* 时间范围选择 - 打印时隐藏 */}
        <div className="print:hidden mb-6">
          <Card>
            <label className="block text-base font-medium text-gray-700 mb-2">选择报告时间范围</label>
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
        </div>

        {/* ─── 统计摘要（4格）─── */}
        <div className="mb-8 print:mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 print:text-lg">统计摘要</h2>
          <div className="grid grid-cols-2 gap-4 print:gap-3">
            <div className="border border-gray-200 rounded-lg p-4 print:p-3">
              <p className="text-sm text-gray-600 mb-2 print:text-xs">INR 记录数</p>
              <p className="text-2xl font-bold text-gray-900 print:text-xl">{inrRecords.length} 条</p>
              {inrRecords.length > 0 && (
                <p className="text-sm text-gray-600 mt-2 print:text-xs">达标率: {inrRate}%</p>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg p-4 print:p-3">
              <p className="text-sm text-gray-600 mb-2 print:text-xs">血压记录数</p>
              <p className="text-2xl font-bold text-gray-900 print:text-xl">{bpRecords.length} 条</p>
              {bpStats && bpStats.count > 0 && (
                <p className="text-sm text-gray-600 mt-2 print:text-xs">
                  平均: {bpStats.avgSystolic}/{bpStats.avgDiastolic}
                </p>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg p-4 print:p-3">
              <p className="text-sm text-gray-600 mb-2 print:text-xs">服药记录数</p>
              <p className="text-2xl font-bold text-gray-900 print:text-xl">{doseLogs.length} 条</p>
              {adherenceStats && adherenceStats.takenDays + adherenceStats.missedDays > 0 && (
                <p className="text-sm text-gray-600 mt-2 print:text-xs">
                  服药率: {adherenceStats.adherenceRate}%
                </p>
              )}
            </div>
            <div className="border border-gray-200 rounded-lg p-4 print:p-3">
              <p className="text-sm text-gray-600 mb-2 print:text-xs">体重记录数</p>
              <p className="text-2xl font-bold text-gray-900 print:text-xl">{weightLogs.length} 条</p>
              {wStats && wStats.count > 0 && (
                <p className="text-sm text-gray-600 mt-2 print:text-xs">
                  最近: {wStats.latest} kg · 变化: {wStats.change > 0 ? '+' : ''}{wStats.change} kg
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ─── 服药记录详情 ─── */}
        {doseLogs.length > 0 && (
          <div className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-xl font-bold text-gray-900 mb-4 print:text-lg">服药记录详情</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">日期</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">状态</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">实际剂量</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">处方剂量</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {[...doseLogs]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map((log) => {
                      const prescribed = getPrescribedDose(log.date);
                      const doseLabel = log.actual_dose != null
                        ? (DOSE_OPTIONS.find((d) => d.value === log.actual_dose)?.label ?? `${log.actual_dose}片`)
                        : '—';
                      const prescribedLabel = prescribed != null
                        ? (DOSE_OPTIONS.find((d) => d.value === prescribed)?.label ?? `${prescribed}片`)
                        : '—';
                      const statusIcon =
                        log.status === '已服用' ? '✅' :
                        log.status === '漏服'   ? '❌' : '⚠️';
                      return (
                        <tr key={log.id} className={log.status === '漏服' ? 'bg-red-50' : ''}>
                          <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{log.date}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{statusIcon} {log.status}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{doseLabel}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{prescribedLabel}</td>
                          <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{log.notes || '—'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── INR 记录详情 ─── */}
        {inrRecords.length > 0 && (
          <div className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-xl font-bold text-gray-900 mb-4 print:text-lg">INR 记录详情</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">日期时间</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">INR</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">达标</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">华法林 (mg)</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {inrRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">
                        {format(new Date(record.record_time), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium print:text-xs print:px-2 print:py-1">{record.value}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">
                        {record.is_in_range ? '✓' : '✗'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{record.warfarin_dose_mg}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{record.note || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── 血压记录详情 ─── */}
        {bpRecords.length > 0 && (
          <div className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-xl font-bold text-gray-900 mb-4 print:text-lg">血压记录详情</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">日期时间</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">收缩压</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">舒张压</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">心率</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">手臂</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">体位</th>
                  </tr>
                </thead>
                <tbody>
                  {bpRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">
                        {format(new Date(record.record_time), 'yyyy-MM-dd HH:mm')}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium print:text-xs print:px-2 print:py-1">{record.systolic}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium print:text-xs print:px-2 print:py-1">{record.diastolic}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{record.heart_rate || '—'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{record.arm === 'left' ? '左手' : record.arm === 'right' ? '右手' : '—'}</td>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{record.position || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── 体重记录详情 ─── */}
        {weightLogs.length > 0 && (
          <div className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-xl font-bold text-gray-900 mb-4 print:text-lg">体重记录详情</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">日期</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">时段</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">体重 (kg)</th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">备注</th>
                  </tr>
                </thead>
                <tbody>
                  {[...weightLogs]
                    .sort((a, b) => {
                      const dateCmp = a.date.localeCompare(b.date);
                      if (dateCmp !== 0) return dateCmp;
                      return a.time_of_day.localeCompare(b.time_of_day);
                    })
                    .map((log) => (
                      <tr key={log.id}>
                        <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{log.date}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{TIME_OF_DAY_LABELS[log.time_of_day]}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm font-medium print:text-xs print:px-2 print:py-1">{log.weight_kg}</td>
                        <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">{log.notes || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 报告说明 */}
        <div className="mt-8 pt-6 border-t border-gray-200 print:mt-6 print:pt-4">
          <p className="text-xs text-gray-500 print:text-[10px]">* INR 目标范围: 2.0 - 3.0</p>
          <p className="text-xs text-gray-500 print:text-[10px]">* 本报告仅供参考，请遵医嘱进行治疗</p>
          <p className="text-xs text-gray-500 mt-2 print:text-[10px]">生成自健康记录应用 v1.1.0</p>
        </div>
      </div>
    </>
  );
}
