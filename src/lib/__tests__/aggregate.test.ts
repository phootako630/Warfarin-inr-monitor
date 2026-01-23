import { describe, it, expect } from 'vitest';
import {
  aggregateInrByDay,
  aggregateBloodPressureByDay,
  aggregateHeartRateByDay,
  calculateInrInRangeRate,
  calculateBloodPressureStats,
} from '../aggregate';
import type { InrRecord, BloodPressureRecord } from '../../types';

describe('aggregateInrByDay', () => {
  it('应该正确按天聚合 INR 数据', () => {
    const records: InrRecord[] = [
      {
        id: '1',
        user_id: 'user1',
        value: 2.5,
        record_time: '2026-01-20T08:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: true,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-20T08:00:00Z',
      },
      {
        id: '2',
        user_id: 'user1',
        value: 2.7,
        record_time: '2026-01-20T18:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: true,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-20T18:00:00Z',
      },
      {
        id: '3',
        user_id: 'user1',
        value: 3.0,
        record_time: '2026-01-21T10:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: true,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-21T10:00:00Z',
      },
    ];

    const result = aggregateInrByDay(records);

    expect(result).toHaveLength(2);
    expect(result[0].value).toBe(2.6); // (2.5 + 2.7) / 2 = 2.6
    expect(result[1].value).toBe(3.0);
  });

  it('应该返回空数组当没有记录时', () => {
    const result = aggregateInrByDay([]);
    expect(result).toEqual([]);
  });

  it('应该保留两位小数', () => {
    const records: InrRecord[] = [
      {
        id: '1',
        user_id: 'user1',
        value: 2.555,
        record_time: '2026-01-20T10:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: true,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-20T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'user1',
        value: 2.666,
        record_time: '2026-01-20T14:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: true,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-20T14:00:00Z',
      },
    ];

    const result = aggregateInrByDay(records);
    expect(result[0].value).toBe(2.61); // 向下取整到两位小数
  });

  it('应该按日期升序排序', () => {
    const records: InrRecord[] = [
      {
        id: '1',
        user_id: 'user1',
        value: 3.0,
        record_time: '2026-01-22T10:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: true,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-22T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'user1',
        value: 2.5,
        record_time: '2026-01-20T10:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: true,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-20T10:00:00Z',
      },
    ];

    const result = aggregateInrByDay(records);
    expect(result[0].date < result[1].date).toBe(true);
  });
});

describe('aggregateBloodPressureByDay', () => {
  it('应该正确按天聚合血压数据', () => {
    const records: BloodPressureRecord[] = [
      {
        id: '1',
        user_id: 'user1',
        systolic: 120,
        diastolic: 80,
        heart_rate: 70,
        record_time: '2026-01-20T08:00:00Z',
        created_at: '2026-01-20T08:00:00Z',
      },
      {
        id: '2',
        user_id: 'user1',
        systolic: 130,
        diastolic: 85,
        heart_rate: 75,
        record_time: '2026-01-20T18:00:00Z',
        created_at: '2026-01-20T18:00:00Z',
      },
    ];

    const result = aggregateBloodPressureByDay(records);

    expect(result).toHaveLength(1);
    expect(result[0].systolic).toBe(125); // (120 + 130) / 2 = 125
    expect(result[0].diastolic).toBe(83); // (80 + 85) / 2 = 82.5 -> 83
  });

  it('应该返回空数组当没有记录时', () => {
    const result = aggregateBloodPressureByDay([]);
    expect(result).toEqual([]);
  });
});

describe('aggregateHeartRateByDay', () => {
  it('应该正确按天聚合心率数据', () => {
    const records: BloodPressureRecord[] = [
      {
        id: '1',
        user_id: 'user1',
        systolic: 120,
        diastolic: 80,
        heart_rate: 70,
        record_time: '2026-01-20T08:00:00Z',
        created_at: '2026-01-20T08:00:00Z',
      },
      {
        id: '2',
        user_id: 'user1',
        systolic: 130,
        diastolic: 85,
        heart_rate: 80,
        record_time: '2026-01-20T18:00:00Z',
        created_at: '2026-01-20T18:00:00Z',
      },
    ];

    const result = aggregateHeartRateByDay(records);

    expect(result).toHaveLength(1);
    expect(result[0].heartRate).toBe(75); // (70 + 80) / 2 = 75
  });

  it('应该忽略没有心率数据的记录', () => {
    const records: BloodPressureRecord[] = [
      {
        id: '1',
        user_id: 'user1',
        systolic: 120,
        diastolic: 80,
        heart_rate: 70,
        record_time: '2026-01-20T08:00:00Z',
        created_at: '2026-01-20T08:00:00Z',
      },
      {
        id: '2',
        user_id: 'user1',
        systolic: 130,
        diastolic: 85,
        heart_rate: null,
        record_time: '2026-01-20T18:00:00Z',
        created_at: '2026-01-20T18:00:00Z',
      },
    ];

    const result = aggregateHeartRateByDay(records);

    expect(result).toHaveLength(1);
    expect(result[0].heartRate).toBe(70);
  });

  it('应该返回空数组当所有记录都没有心率时', () => {
    const records: BloodPressureRecord[] = [
      {
        id: '1',
        user_id: 'user1',
        systolic: 120,
        diastolic: 80,
        heart_rate: null,
        record_time: '2026-01-20T08:00:00Z',
        created_at: '2026-01-20T08:00:00Z',
      },
    ];

    const result = aggregateHeartRateByDay(records);
    expect(result).toEqual([]);
  });
});

describe('calculateInrInRangeRate', () => {
  it('应该正确计算 INR 达标率', () => {
    const records: InrRecord[] = [
      {
        id: '1',
        user_id: 'user1',
        value: 2.5,
        record_time: '2026-01-20T10:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: true,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-20T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'user1',
        value: 1.5,
        record_time: '2026-01-21T10:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: false,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-21T10:00:00Z',
      },
      {
        id: '3',
        user_id: 'user1',
        value: 2.8,
        record_time: '2026-01-22T10:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: true,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-22T10:00:00Z',
      },
      {
        id: '4',
        user_id: 'user1',
        value: 3.5,
        record_time: '2026-01-23T10:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: false,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-23T10:00:00Z',
      },
    ];

    const rate = calculateInrInRangeRate(records);
    expect(rate).toBe(50); // 2 out of 4 = 50%
  });

  it('应该返回 0 当没有记录时', () => {
    const rate = calculateInrInRangeRate([]);
    expect(rate).toBe(0);
  });

  it('应该返回 100 当所有记录都达标时', () => {
    const records: InrRecord[] = [
      {
        id: '1',
        user_id: 'user1',
        value: 2.5,
        record_time: '2026-01-20T10:00:00Z',
        warfarin_dose_mg: 3.0,
        is_in_range: true,
        target_range_low: 2.0,
        target_range_high: 3.0,
        created_at: '2026-01-20T10:00:00Z',
      },
    ];

    const rate = calculateInrInRangeRate(records);
    expect(rate).toBe(100);
  });
});

describe('calculateBloodPressureStats', () => {
  it('应该正确计算血压统计信息', () => {
    const records: BloodPressureRecord[] = [
      {
        id: '1',
        user_id: 'user1',
        systolic: 120,
        diastolic: 80,
        heart_rate: 70,
        record_time: '2026-01-20T10:00:00Z',
        created_at: '2026-01-20T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'user1',
        systolic: 130,
        diastolic: 85,
        heart_rate: 80,
        record_time: '2026-01-21T10:00:00Z',
        created_at: '2026-01-21T10:00:00Z',
      },
    ];

    const stats = calculateBloodPressureStats(records);

    expect(stats.avgSystolic).toBe(125);
    expect(stats.avgDiastolic).toBe(83);
    expect(stats.avgHeartRate).toBe(75);
    expect(stats.count).toBe(2);
  });

  it('应该正确处理缺失的心率数据', () => {
    const records: BloodPressureRecord[] = [
      {
        id: '1',
        user_id: 'user1',
        systolic: 120,
        diastolic: 80,
        heart_rate: 70,
        record_time: '2026-01-20T10:00:00Z',
        created_at: '2026-01-20T10:00:00Z',
      },
      {
        id: '2',
        user_id: 'user1',
        systolic: 130,
        diastolic: 85,
        heart_rate: null,
        record_time: '2026-01-21T10:00:00Z',
        created_at: '2026-01-21T10:00:00Z',
      },
    ];

    const stats = calculateBloodPressureStats(records);

    expect(stats.avgHeartRate).toBe(70); // 只基于有心率的记录
  });

  it('应该返回默认值当没有记录时', () => {
    const stats = calculateBloodPressureStats([]);

    expect(stats.avgSystolic).toBe(0);
    expect(stats.avgDiastolic).toBe(0);
    expect(stats.avgHeartRate).toBe(0);
    expect(stats.count).toBe(0);
  });
});
