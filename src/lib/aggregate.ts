import { format, parseISO } from 'date-fns';
import type { InrRecord, BloodPressureRecord, ChartDataPoint } from '../types';

/**
 * 将 UTC 时间转换为本地日期字符串（yyyy-MM-dd）
 */
function toLocalDateString(isoString: string): string {
  // 使用本地时区解析日期，避免 UTC 跨天问题
  const date = parseISO(isoString);
  return format(date, 'yyyy-MM-dd');
}

/**
 * 按天聚合 INR 数据（平均值）
 */
export function aggregateInrByDay(records: InrRecord[]): ChartDataPoint[] {
  const grouped = new Map<string, number[]>();

  // 分组
  records.forEach((record) => {
    const dateKey = toLocalDateString(record.record_time);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(record.value);
  });

  // 计算平均值
  const result: ChartDataPoint[] = [];
  grouped.forEach((values, date) => {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    result.push({
      date,
      value: Math.round(avg * 100) / 100, // 保留两位小数
    });
  });

  // 按日期排序
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 按天聚合血压数据（平均值）
 */
export function aggregateBloodPressureByDay(
  records: BloodPressureRecord[]
): ChartDataPoint[] {
  const grouped = new Map<
    string,
    { systolic: number[]; diastolic: number[] }
  >();

  // 分组
  records.forEach((record) => {
    const dateKey = toLocalDateString(record.record_time);
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, { systolic: [], diastolic: [] });
    }
    const group = grouped.get(dateKey)!;
    group.systolic.push(record.systolic);
    group.diastolic.push(record.diastolic);
  });

  // 计算平均值
  const result: ChartDataPoint[] = [];
  grouped.forEach((values, date) => {
    const avgSystolic =
      values.systolic.reduce((sum, val) => sum + val, 0) /
      values.systolic.length;
    const avgDiastolic =
      values.diastolic.reduce((sum, val) => sum + val, 0) /
      values.diastolic.length;

    result.push({
      date,
      systolic: Math.round(avgSystolic),
      diastolic: Math.round(avgDiastolic),
    });
  });

  // 按日期排序
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 按天聚合心率数据（平均值）
 * 只从 blood_pressure_records 中提取非空的 heart_rate
 */
export function aggregateHeartRateByDay(
  records: BloodPressureRecord[]
): ChartDataPoint[] {
  const grouped = new Map<string, number[]>();

  // 分组（只处理有心率数据的记录）
  records.forEach((record) => {
    if (record.heart_rate !== null && record.heart_rate !== undefined) {
      const dateKey = toLocalDateString(record.record_time);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(record.heart_rate);
    }
  });

  // 计算平均值
  const result: ChartDataPoint[] = [];
  grouped.forEach((values, date) => {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    result.push({
      date,
      heartRate: Math.round(avg),
    });
  });

  // 按日期排序
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 计算 INR 达标率（目标范围 2-3）
 */
export function calculateInrInRangeRate(records: InrRecord[]): number {
  if (records.length === 0) return 0;

  const inRangeCount = records.filter(
    (r) => r.is_in_range === true
  ).length;

  return Math.round((inRangeCount / records.length) * 100);
}

/**
 * 计算血压的统计信息
 */
export function calculateBloodPressureStats(records: BloodPressureRecord[]) {
  if (records.length === 0) {
    return {
      avgSystolic: 0,
      avgDiastolic: 0,
      avgHeartRate: 0,
      count: 0,
    };
  }

  const systolicSum = records.reduce((sum, r) => sum + r.systolic, 0);
  const diastolicSum = records.reduce((sum, r) => sum + r.diastolic, 0);

  const heartRateRecords = records.filter(
    (r) => r.heart_rate !== null && r.heart_rate !== undefined
  );
  const heartRateSum = heartRateRecords.reduce(
    (sum, r) => sum + (r.heart_rate || 0),
    0
  );

  return {
    avgSystolic: Math.round(systolicSum / records.length),
    avgDiastolic: Math.round(diastolicSum / records.length),
    avgHeartRate:
      heartRateRecords.length > 0
        ? Math.round(heartRateSum / heartRateRecords.length)
        : 0,
    count: records.length,
  };
}
