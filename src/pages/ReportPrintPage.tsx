import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Loading } from '../components/Loading';
import { DateRangeSelector } from '../components/DateRangeSelector';
import { getInrRecords, getBloodPressureRecords } from '../lib/api';
import {
  calculateInrInRangeRate,
  calculateBloodPressureStats,
} from '../lib/aggregate';
import type { InrRecord, BloodPressureRecord, TimeRangePreset } from '../types';

export function ReportPrintPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRangePreset>('30d');
  const [customStart, setCustomStart] = useState<Date>();
  const [customEnd, setCustomEnd] = useState<Date>();

  const [inrRecords, setInrRecords] = useState<InrRecord[]>([]);
  const [bpRecords, setBpRecords] = useState<BloodPressureRecord[]>([]);
  const [inrRate, setInrRate] = useState(0);
  const [bpStats, setBpStats] = useState<any>(null);

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    setLoading(true);
    try {
      const dateRange = getDateRange();

      const [inrData, bpData] = await Promise.all([
        getInrRecords(dateRange),
        getBloodPressureRecords(dateRange),
      ]);

      setInrRecords(inrData);
      setBpRecords(bpData);

      setInrRate(calculateInrInRangeRate(inrData));
      setBpStats(calculateBloodPressureStats(bpData));
    } catch (error) {
      console.error('加载数据失败:', error);
      alert('加载数据失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const dateRange = getDateRange();
  const dateRangeText = `${format(dateRange.start, 'yyyy-MM-dd')} 至 ${format(
    dateRange.end,
    'yyyy-MM-dd'
  )}`;

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
        <Button variant="secondary" onClick={() => navigate(-1)}>
          返回
        </Button>
        <Button variant="primary" onClick={handlePrint}>
          🖨️ 打印/保存 PDF
        </Button>
      </div>

      {/* 报告内容 */}
      <div className="max-w-4xl mx-auto p-8 bg-white min-h-screen print:p-6">
        {/* 报告标题 */}
        <div className="text-center mb-8 print:mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 print:text-2xl">
            健康记录报告
          </h1>
          <p className="text-base text-gray-600 print:text-sm">
            报告时间范围: {dateRangeText}
          </p>
          <p className="text-sm text-gray-500 print:text-xs">
            生成时间: {format(new Date(), 'yyyy-MM-dd HH:mm')}
          </p>
        </div>

        {/* 选择时间范围 - 打印时隐藏 */}
        <div className="print:hidden mb-6">
          <Card>
            <label className="block text-base font-medium text-gray-700 mb-2">
              选择报告时间范围
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
        </div>

        {/* 统计摘要 */}
        <div className="mb-8 print:mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 print:text-lg">
            统计摘要
          </h2>
          <div className="grid grid-cols-2 gap-4 print:gap-3">
            <div className="border border-gray-200 rounded-lg p-4 print:p-3">
              <p className="text-sm text-gray-600 mb-2 print:text-xs">
                INR 记录数
              </p>
              <p className="text-2xl font-bold text-gray-900 print:text-xl">
                {inrRecords.length} 条
              </p>
              {inrRecords.length > 0 && (
                <p className="text-sm text-gray-600 mt-2 print:text-xs">
                  达标率: {inrRate}%
                </p>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4 print:p-3">
              <p className="text-sm text-gray-600 mb-2 print:text-xs">
                血压记录数
              </p>
              <p className="text-2xl font-bold text-gray-900 print:text-xl">
                {bpRecords.length} 条
              </p>
              {bpStats && bpStats.count > 0 && (
                <p className="text-sm text-gray-600 mt-2 print:text-xs">
                  平均: {bpStats.avgSystolic}/{bpStats.avgDiastolic}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* INR 记录详情 */}
        {inrRecords.length > 0 && (
          <div className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-xl font-bold text-gray-900 mb-4 print:text-lg">
              INR 记录详情
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">
                      日期时间
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">
                      INR
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">
                      达标
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">
                      华法林 (mg)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inrRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">
                        {format(
                          new Date(record.record_time),
                          'yyyy-MM-dd HH:mm'
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium print:text-xs print:px-2 print:py-1">
                        {record.value}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">
                        {record.is_in_range ? '✓' : '✗'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">
                        {record.warfarin_dose_mg}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 血压记录详情 */}
        {bpRecords.length > 0 && (
          <div className="mb-8 print:mb-6 print:break-inside-avoid">
            <h2 className="text-xl font-bold text-gray-900 mb-4 print:text-lg">
              血压记录详情
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">
                      日期时间
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">
                      收缩压
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">
                      舒张压
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">
                      心率
                    </th>
                    <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold print:text-xs print:px-2 print:py-1">
                      体位
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {bpRecords.map((record) => (
                    <tr key={record.id}>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">
                        {format(
                          new Date(record.record_time),
                          'yyyy-MM-dd HH:mm'
                        )}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium print:text-xs print:px-2 print:py-1">
                        {record.systolic}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm font-medium print:text-xs print:px-2 print:py-1">
                        {record.diastolic}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">
                        {record.heart_rate || '-'}
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-sm print:text-xs print:px-2 print:py-1">
                        {record.position || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 报告说明 */}
        <div className="mt-8 pt-6 border-t border-gray-200 print:mt-6 print:pt-4">
          <p className="text-xs text-gray-500 print:text-[10px]">
            * INR 目标范围: 2.0 - 3.0
          </p>
          <p className="text-xs text-gray-500 print:text-[10px]">
            * 本报告仅供参考，请遵医嘱进行治疗
          </p>
          <p className="text-xs text-gray-500 mt-2 print:text-[10px]">
            生成自健康记录应用 v1.0.0
          </p>
        </div>
      </div>
    </>
  );
}
