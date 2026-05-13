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

// 测量手臂
export type Arm = 'left' | 'right';

export const ARM_LABELS: Record<Arm, string> = {
  left: '左手',
  right: '右手',
};

// 血压记录
export interface BloodPressureRecord {
  id: string;
  user_id: string;
  systolic: number;
  diastolic: number;
  heart_rate: number | null;
  position: string | null;
  arm: Arm | null;
  record_time: string;
}

// 用户资料
export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
}

// ============ 新增：剂量管理 ============

// 医嘱处方记录（每次复诊后医生调整的剂量）
export interface DoseRegime {
  id: string;
  user_id: string;
  prescribed_dose: number;    // 0.5 / 0.75 / 1.0 / 1.125 / 1.25 / 1.5
  start_date: string;         // yyyy-MM-dd
  inr_record_id: string | null;
  doctor_notes: string | null;
  created_at: string;
}

// 每日服药记录
export interface DoseLog {
  id: string;
  user_id: string;
  date: string;               // yyyy-MM-dd
  actual_dose: number | null; // 漏服时为 null
  status: DoseStatus;
  regime_id: string | null;
  notes: string | null;
  created_at: string;
}

// 服药状态
export type DoseStatus = '已服用' | '漏服' | '剂量调整';

// 服药统计
export interface DoseAdherenceStats {
  totalDays: number;
  takenDays: number;
  missedDays: number;
  adjustedDays: number;
  adherenceRate: number;      // 百分比 0-100
  currentStreak: number;      // 连续服药天数
}

// 图表用：INR + 剂量合并数据点
export interface DoseChartDataPoint {
  date: string;
  inr?: number;
  dose?: number;
  prescribedDose?: number;    // 当日处方剂量（参考线）
  status?: DoseStatus;
}

// ============ 体重记录 ============

export type TimeOfDay = 'morning' | 'evening';

export interface WeightLog {
  id: string;
  user_id: string;
  date: string;               // yyyy-MM-dd
  time_of_day: TimeOfDay;
  weight_kg: number;           // 如 65.5
  notes: string | null;
  created_at: string;
}

export interface WeightChartDataPoint {
  date: string;
  morning?: number;
  evening?: number;
}

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  morning: '☀️ 早晨',
  evening: '🌙 睡前',
};

// ============ 饮食记录 ============

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type VkLevel = 'high' | 'medium' | 'low';
export type Portion = 'small' | 'normal' | 'large';
export type FoodCategory = 'vegetable' | 'meat' | 'fruit' | 'staple' | 'other';

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: '🌅 早餐',
  lunch: '☀️ 午餐',
  dinner: '🌙 晚餐',
  snack: '🍪 加餐',
};

export const VK_LEVEL_LABELS: Record<VkLevel, string> = {
  high: '🔴 高',
  medium: '🟡 中',
  low: '🟢 低',
};

export const PORTION_LABELS: Record<Portion, string> = {
  small: '少量',
  normal: '正常',
  large: '多',
};

export const FOOD_CATEGORY_LABELS: Record<FoodCategory, string> = {
  vegetable: '🥬 蔬菜',
  meat: '🥩 肉蛋',
  fruit: '🍎 水果',
  staple: '🍚 主食',
  other: '🥤 其他',
};

export interface FoodItem {
  id: string;
  name: string;
  icon: string;
  category: FoodCategory;
  vk_level: VkLevel;
  vk_mcg_per_100g?: number;
}

export interface MealLog {
  id: string;
  user_id: string;
  date: string;
  meal_type: MealType;
  notes: string | null;
  created_at: string;
}

export interface MealLogItem {
  id: string;
  meal_log_id: string;
  food_id: string;
  custom_name: string | null;
  vk_level: VkLevel;
  portion: Portion;
  created_at: string;
}

export interface MealLogWithItems extends MealLog {
  items: MealLogItem[];
}

export interface DailyVkSummary {
  date: string;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  level: VkLevel;  // overall daily level
}

// ============ 原有类型 ============

// 记录类型（用于筛选）
export type RecordType = 'all' | 'inr' | 'bp' | 'dose' | 'weight' | 'meal';

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

// 剂量选项（片数 → 实际mg以3mg/片为基准换算显示）
export const DOSE_OPTIONS = [
  { value: 0.5,   label: '半片',       fraction: '1/2' },
  { value: 0.75,  label: '3/4片',      fraction: '3/4' },
  { value: 1.0,   label: '1片',        fraction: '1' },
  { value: 1.25,  label: '1又1/4片',   fraction: '1¼' },
  { value: 1.5,   label: '1又半片',    fraction: '1½' },
  { value: 1.125, label: '1又1/8片',   fraction: '1⅛' },
] as const;
