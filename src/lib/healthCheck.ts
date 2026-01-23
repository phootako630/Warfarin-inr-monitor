/**
 * 健康指标异常值检测工具函数
 */

import type { InrRecord, BloodPressureRecord } from '../types';

// ============ INR 异常判断 ============

/**
 * INR 异常级别
 */
export type InrAbnormalLevel = 'normal' | 'warning' | 'danger';

/**
 * 判断 INR 值是否异常
 *
 * 标准:
 * - 正常: 2.0 ~ 3.0
 * - 警告: 1.5 ~ 2.0 或 3.0 ~ 3.5
 * - 危险: < 1.5 或 > 3.5
 */
export function checkInrAbnormal(value: number): InrAbnormalLevel {
  if (value < 1.5) {
    return 'danger'; // 过低,血栓风险
  }
  if (value > 3.5) {
    return 'danger'; // 过高,出血风险
  }
  if (value < 2.0 || value > 3.0) {
    return 'warning'; // 偏离目标范围
  }
  return 'normal';
}

/**
 * 获取 INR 异常提示文字
 */
export function getInrAbnormalMessage(value: number): string | null {
  const level = checkInrAbnormal(value);

  if (level === 'danger' && value < 1.5) {
    return '⚠️ INR 过低,血栓风险增加,请尽快就医';
  }
  if (level === 'danger' && value > 3.5) {
    return '⚠️ INR 过高,出血风险增加,请尽快就医';
  }
  if (level === 'warning' && value < 2.0) {
    return '⚡ INR 偏低,可能需要调整剂量';
  }
  if (level === 'warning' && value > 3.0) {
    return '⚡ INR 偏高,可能需要调整剂量';
  }
  return null;
}

/**
 * 获取 INR 异常颜色样式
 */
export function getInrAbnormalColor(value: number): {
  bg: string;
  text: string;
  border: string;
} {
  const level = checkInrAbnormal(value);

  if (level === 'danger') {
    return {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-300',
    };
  }
  if (level === 'warning') {
    return {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-300',
    };
  }
  return {
    bg: 'bg-white',
    text: 'text-gray-900',
    border: 'border-gray-200',
  };
}

// ============ 血压异常判断 ============

/**
 * 血压异常级别
 */
export type BloodPressureAbnormalLevel = 'normal' | 'warning' | 'danger';

/**
 * 判断血压是否异常
 *
 * 参考标准 (中国高血压防治指南):
 * - 正常: 收缩压 < 130, 舒张压 < 85
 * - 正常高值: 收缩压 130-139, 舒张压 85-89
 * - 1级高血压: 收缩压 140-159, 舒张压 90-99
 * - 2级高血压: 收缩压 160-179, 舒张压 100-109
 * - 3级高血压: 收缩压 >= 180, 舒张压 >= 110
 */
export function checkBloodPressureAbnormal(
  systolic: number,
  diastolic: number
): BloodPressureAbnormalLevel {
  // 3级高血压或2级高血压 - 危险
  if (systolic >= 160 || diastolic >= 100) {
    return 'danger';
  }
  // 1级高血压或正常高值 - 警告
  if (systolic >= 130 || diastolic >= 85) {
    return 'warning';
  }
  // 低血压 - 警告
  if (systolic < 90 || diastolic < 60) {
    return 'warning';
  }
  return 'normal';
}

/**
 * 获取血压异常提示文字
 */
export function getBloodPressureAbnormalMessage(
  systolic: number,
  diastolic: number
): string | null {
  const level = checkBloodPressureAbnormal(systolic, diastolic);

  if (level === 'danger') {
    if (systolic >= 180 || diastolic >= 110) {
      return '⚠️ 血压严重偏高,请立即就医';
    }
    return '⚠️ 血压偏高,建议尽快就医';
  }

  if (level === 'warning') {
    if (systolic < 90 || diastolic < 60) {
      return '⚡ 血压偏低,请注意观察';
    }
    if (systolic >= 140 || diastolic >= 90) {
      return '⚡ 血压偏高,建议咨询医生';
    }
    return '⚡ 血压偏高,注意饮食和运动';
  }

  return null;
}

/**
 * 获取血压异常颜色样式
 */
export function getBloodPressureAbnormalColor(
  systolic: number,
  diastolic: number
): {
  bg: string;
  text: string;
  border: string;
} {
  const level = checkBloodPressureAbnormal(systolic, diastolic);

  if (level === 'danger') {
    return {
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-300',
    };
  }
  if (level === 'warning') {
    return {
      bg: 'bg-yellow-50',
      text: 'text-yellow-700',
      border: 'border-yellow-300',
    };
  }
  return {
    bg: 'bg-white',
    text: 'text-gray-900',
    border: 'border-gray-200',
  };
}

// ============ 心率异常判断 ============

/**
 * 心率异常级别
 */
export type HeartRateAbnormalLevel = 'normal' | 'warning' | 'danger';

/**
 * 判断心率是否异常
 *
 * 标准:
 * - 正常: 60-100 bpm
 * - 警告: 50-60 或 100-120 bpm
 * - 危险: < 50 或 > 120 bpm
 */
export function checkHeartRateAbnormal(
  heartRate: number
): HeartRateAbnormalLevel {
  if (heartRate < 50 || heartRate > 120) {
    return 'danger';
  }
  if (heartRate < 60 || heartRate > 100) {
    return 'warning';
  }
  return 'normal';
}

/**
 * 获取心率异常提示文字
 */
export function getHeartRateAbnormalMessage(
  heartRate: number
): string | null {
  const level = checkHeartRateAbnormal(heartRate);

  if (level === 'danger') {
    if (heartRate < 50) {
      return '⚠️ 心率过慢,请及时就医';
    }
    return '⚠️ 心率过快,请及时就医';
  }

  if (level === 'warning') {
    if (heartRate < 60) {
      return '⚡ 心率偏慢,请注意观察';
    }
    return '⚡ 心率偏快,请注意观察';
  }

  return null;
}

// ============ 综合检查 ============

/**
 * 综合健康异常信息
 */
export interface HealthAlert {
  hasAlert: boolean;
  level: 'normal' | 'warning' | 'danger';
  messages: string[];
}

/**
 * 检查 INR 记录的异常情况
 */
export function checkInrRecordHealth(record: InrRecord): HealthAlert {
  const message = getInrAbnormalMessage(record.value);
  const level = checkInrAbnormal(record.value);

  return {
    hasAlert: level !== 'normal',
    level,
    messages: message ? [message] : [],
  };
}

/**
 * 检查血压记录的异常情况
 */
export function checkBloodPressureRecordHealth(
  record: BloodPressureRecord
): HealthAlert {
  const messages: string[] = [];
  let maxLevel: 'normal' | 'warning' | 'danger' = 'normal';

  // 检查血压
  const bpMessage = getBloodPressureAbnormalMessage(
    record.systolic,
    record.diastolic
  );
  const bpLevel = checkBloodPressureAbnormal(record.systolic, record.diastolic);

  if (bpMessage) {
    messages.push(bpMessage);
  }
  if (bpLevel === 'danger') {
    maxLevel = 'danger';
  } else if (bpLevel === 'warning' && maxLevel === 'normal') {
    maxLevel = 'warning';
  }

  // 检查心率（如果有）
  if (record.heart_rate) {
    const hrMessage = getHeartRateAbnormalMessage(record.heart_rate);
    const hrLevel = checkHeartRateAbnormal(record.heart_rate);

    if (hrMessage) {
      messages.push(hrMessage);
    }
    if (hrLevel === 'danger') {
      maxLevel = 'danger';
    } else if (hrLevel === 'warning' && maxLevel === 'normal') {
      maxLevel = 'warning';
    }
  }

  return {
    hasAlert: messages.length > 0,
    level: maxLevel,
    messages,
  };
}
