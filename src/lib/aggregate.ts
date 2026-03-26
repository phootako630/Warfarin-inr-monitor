import { format, parseISO, eachDayOfInterval } from 'date-fns';
import type {
  InrRecord,
  BloodPressureRecord,
  ChartDataPoint,
  DoseLog,
  DoseRegime,
  DoseAdherenceStats,
  DoseChartDataPoint,
} from '../types';

// ============ 工具函数 ============

function toLocalDateString(isoString: string): string {
  const date = parseISO(isoString);
  return format(date, 'yyyy-MM-dd');
}

// ============ INR 聚合 ============

export function aggregateInrByDay(records: InrRecord[]): ChartDataPoint[] {
  const grouped = new Map<string, number[]>();

  records.forEach((record) => {
    const dateKey = toLocalDateString(record.record_time);
    if (!grouped.has(dateKey)) grouped.set(dateKey, []);
    grouped.get(dateKey)!.push(record.value);
  });

  const result: ChartDataPoint[] = [];
  grouped.forEach((values, date) => {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    result.push({ date, value: Math.round(avg * 100) / 100 });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// ============ 血压聚合 ============

export function aggregateBloodPressureByDay(
  records: BloodPressureRecord[]
): ChartDataPoint[] {
  const grouped = new Map<string, { systolic: number[]; diastolic: number[] }>();

  records.forEach((record) => {
    const dateKey = toLocalDateString(record.record_time);
    if (!grouped.has(dateKey)) grouped.set(dateKey, { systolic: [], diastolic: [] });
    const group = grouped.get(dateKey)!;
    group.systolic.push(record.systolic);
    group.diastolic.push(record.diastolic);
  });

  const result: ChartDataPoint[] = [];
  grouped.forEach((values, date) => {
    const avgSystolic = values.systolic.reduce((sum, val) => sum + val, 0) / values.systolic.length;
    const avgDiastolic = values.diastolic.reduce((sum, val) => sum + val, 0) / values.diastolic.length;
    result.push({ date, systolic: Math.round(avgSystolic), diastolic: Math.round(avgDiastolic) });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

export function aggregateHeartRateByDay(records: BloodPressureRecord[]): ChartDataPoint[] {
  const grouped = new Map<string, number[]>();

  records.forEach((record) => {
    if (record.heart_rate !== null && record.heart_rate !== undefined) {
      const dateKey = toLocalDateString(record.record_time);
      if (!grouped.has(dateKey)) grouped.set(dateKey, []);
      grouped.get(dateKey)!.push(record.heart_rate);
    }
  });

  const result: ChartDataPoint[] = [];
  grouped.forEach((values, date) => {
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    result.push({ date, heartRate: Math.round(avg) });
  });

  return result.sort((a, b) => a.date.localeCompare(b.date));
}

// ============ INR 统计 ============

export function calculateInrInRangeRate(records: InrRecord[]): number {
  if (records.length === 0) return 0;
  const inRangeCount = records.filter((r) => r.is_in_range === true).length;
  return Math.round((inRangeCount / records.length) * 100);
}

// ============ 血压统计 ============

export function calculateBloodPressureStats(records: BloodPressureRecord[]) {
  if (records.length === 0) {
    return { avgSystolic: 0, avgDiastolic: 0, avgHeartRate: 0, count: 0 };
  }

  const systolicSum  = records.reduce((sum, r) => sum + r.systolic, 0);
  const diastolicSum = records.reduce((sum, r) => sum + r.diastolic, 0);
  const hrRecords    = records.filter((r) => r.heart_rate !== null && r.heart_rate !== undefined);
  const hrSum        = hrRecords.reduce((sum, r) => sum + (r.heart_rate || 0), 0);

  return {
    avgSystolic:  Math.round(systolicSum / records.length),
    avgDiastolic: Math.round(diastolicSum / records.length),
    avgHeartRate: hrRecords.length > 0 ? Math.round(hrSum / hrRecords.length) : 0,
    count: records.length,
  };
}

// ============ 服药统计 ============

/**
 * 计算服药依从性统计
 * totalDays = 从最早处方 start_date 至今的天数
 */
export function calculateDoseAdherenceStats(
  logs: DoseLog[],
  startDate: Date,
  endDate: Date
): DoseAdherenceStats {
  const logMap = new Map<string, DoseLog>();
  logs.forEach((log) => logMap.set(log.date, log));

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const totalDays = days.length;

  let takenDays    = 0;
  let missedDays   = 0;
  let adjustedDays = 0;

  days.forEach((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const log = logMap.get(dateStr);
    if (!log) return; // 未记录的天不计入
    if (log.status === '已服用')   takenDays++;
    if (log.status === '漏服')     missedDays++;
    if (log.status === '剂量调整') adjustedDays++;
  });

  const recordedDays = takenDays + missedDays + adjustedDays;
  const adherenceRate = recordedDays === 0
    ? 0
    : Math.round(((takenDays + adjustedDays) / recordedDays) * 100);

  // 计算连续服药天数（从今天往前）
  let currentStreak = 0;
  const sortedDays = [...days].reverse();
  for (const day of sortedDays) {
    const dateStr = format(day, 'yyyy-MM-dd');
    const log = logMap.get(dateStr);
    if (log && (log.status === '已服用' || log.status === '剂量调整')) {
      currentStreak++;
    } else if (log && log.status === '漏服') {
      break;
    }
    // 未记录的天跳过（不中断streak）
  }

  return {
    totalDays,
    takenDays,
    missedDays,
    adjustedDays,
    adherenceRate,
    currentStreak,
  };
}

/**
 * 合并 INR + 服药记录为图表用数据点
 * 将 dose_logs 和 inr_records 按日期合并，并填入当日的处方剂量
 */
export function buildDoseChartData(
  inrRecords: InrRecord[],
  doseLogs: DoseLog[],
  regimes: DoseRegime[],
  startDate: Date,
  endDate: Date
): DoseChartDataPoint[] {
  // 建立 INR map（按日期取最后一条）
  const inrMap = new Map<string, number>();
  inrRecords.forEach((r) => {
    const d = toLocalDateString(r.record_time);
    inrMap.set(d, r.value);
  });

  // 建立 dose log map
  const doseMap = new Map<string, DoseLog>();
  doseLogs.forEach((log) => doseMap.set(log.date, log));

  // 处方按 start_date 升序排列
  const sortedRegimes = [...regimes].sort((a, b) =>
    a.start_date.localeCompare(b.start_date)
  );

  /**
   * 查找某日期对应的处方剂量
   */
  const getPrescribedDose = (dateStr: string): number | undefined => {
    let prescribed: number | undefined;
    for (const regime of sortedRegimes) {
      if (regime.start_date <= dateStr) {
        prescribed = regime.prescribed_dose;
      } else {
        break;
      }
    }
    return prescribed;
  };

  // 遍历日期范围内所有天，只输出有数据的天
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const result: DoseChartDataPoint[] = [];

  days.forEach((day) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const inr     = inrMap.get(dateStr);
    const log     = doseMap.get(dateStr);
    const prescribed = getPrescribedDose(dateStr);

    if (inr !== undefined || log !== undefined) {
      result.push({
        date: dateStr,
        inr,
        dose:           log?.actual_dose ?? undefined,
        prescribedDose: prescribed,
        status:         log?.status,
      });
    }
  });

  return result;
}
