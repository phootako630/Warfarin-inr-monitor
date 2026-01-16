// INR 记录
export interface InrRecord {
  id: string;
  user_id: string;
  value: number;
  record_time: string;
  warfarin_dose_mg: number;
  is_in_range: boolean | null;
  target_range_low: number | null;
  target_range_high: number | null;
  note: string | null;
}

// 血压记录
export interface BloodPressureRecord {
  id: string;
  user_id: string;
  systolic: number;
  diastolic: number;
  heart_rate: number | null;
  position: string | null;
  record_time: string;
}

// 用户资料
export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
}

// 记录类型（用于筛选）
export type RecordType = 'all' | 'inr' | 'bp';

// 时间范围预设
export type TimeRangePreset = '7d' | '30d' | '90d' | 'custom';

// 时间范围
export interface TimeRange {
  start: Date;
  end: Date;
}

// 按天聚合的数据点
export interface DailyData {
  date: string; // yyyy-mm-dd
  value: number;
}

// 图表数据类型
export interface ChartDataPoint {
  date: string;
  value?: number;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
}

// Toast 消息类型
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// 体位选项
export const POSITION_OPTIONS = [
  { value: '坐位', label: '坐位' },
  { value: '卧位', label: '卧位' },
  { value: '站立', label: '站立' },
  { value: '其它', label: '其它' },
] as const;
