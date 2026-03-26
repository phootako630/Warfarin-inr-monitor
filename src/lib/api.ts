import { supabase } from './supabaseClient';
import type {
  InrRecord,
  BloodPressureRecord,
  Profile,
  DoseRegime,
  DoseLog,
  DoseStatus,
} from '../types';

// ============ INR 记录 ============

export async function getInrRecords(params: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<InrRecord[]> {
  let query = supabase
    .from('inr_records')
    .select('*')
    .order('record_time', { ascending: false });

  if (params.startDate) query = query.gte('record_time', params.startDate.toISOString());
  if (params.endDate)   query = query.lte('record_time', params.endDate.toISOString());
  if (params.limit)     query = query.limit(params.limit);

  const { data, error } = await query;
  if (error) throw new Error(`获取 INR 记录失败: ${error.message}`);
  return data || [];
}

export async function createInrRecord(
  record: Omit<InrRecord, 'id' | 'is_in_range' | 'target_range_low' | 'target_range_high'>
): Promise<InrRecord> {
  const { data, error } = await supabase
    .from('inr_records')
    .insert(record)
    .select()
    .single();
  if (error) throw new Error(`创建 INR 记录失败: ${error.message}`);
  return data;
}

export async function updateInrRecord(
  id: string,
  updates: Partial<Omit<InrRecord, 'id' | 'user_id'>>
): Promise<InrRecord> {
  const { data, error } = await supabase
    .from('inr_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`更新 INR 记录失败: ${error.message}`);
  return data;
}

export async function deleteInrRecord(id: string): Promise<void> {
  const { error } = await supabase.from('inr_records').delete().eq('id', id);
  if (error) throw new Error(`删除 INR 记录失败: ${error.message}`);
}

// ============ 血压记录 ============

export async function getBloodPressureRecords(params: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<BloodPressureRecord[]> {
  let query = supabase
    .from('blood_pressure_records')
    .select('*')
    .order('record_time', { ascending: false });

  if (params.startDate) query = query.gte('record_time', params.startDate.toISOString());
  if (params.endDate)   query = query.lte('record_time', params.endDate.toISOString());
  if (params.limit)     query = query.limit(params.limit);

  const { data, error } = await query;
  if (error) throw new Error(`获取血压记录失败: ${error.message}`);
  return data || [];
}

export async function createBloodPressureRecord(
  record: Omit<BloodPressureRecord, 'id'>
): Promise<BloodPressureRecord> {
  const { data, error } = await supabase
    .from('blood_pressure_records')
    .insert(record)
    .select()
    .single();
  if (error) throw new Error(`创建血压记录失败: ${error.message}`);
  return data;
}

export async function updateBloodPressureRecord(
  id: string,
  updates: Partial<Omit<BloodPressureRecord, 'id' | 'user_id'>>
): Promise<BloodPressureRecord> {
  const { data, error } = await supabase
    .from('blood_pressure_records')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`更新血压记录失败: ${error.message}`);
  return data;
}

export async function deleteBloodPressureRecord(id: string): Promise<void> {
  const { error } = await supabase.from('blood_pressure_records').delete().eq('id', id);
  if (error) throw new Error(`删除血压记录失败: ${error.message}`);
}

// ============ 用户资料 ============

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`获取用户资料失败: ${error.message}`);
  }
  return data;
}

// ============ 医嘱处方 (dose_regimes) ============

/**
 * 获取处方历史列表
 */
export async function getDoseRegimes(params: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
} = {}): Promise<DoseRegime[]> {
  let query = supabase
    .from('dose_regimes')
    .select('*')
    .order('start_date', { ascending: false });

  if (params.startDate) query = query.gte('start_date', params.startDate.toISOString().split('T')[0]);
  if (params.endDate)   query = query.lte('start_date', params.endDate.toISOString().split('T')[0]);
  if (params.limit)     query = query.limit(params.limit);

  const { data, error } = await query;
  if (error) throw new Error(`获取医嘱记录失败: ${error.message}`);
  return data || [];
}

/**
 * 获取某日期的有效处方（最近一条 start_date <= date 的记录）
 */
export async function getActiveRegime(date: string): Promise<DoseRegime | null> {
  const { data, error } = await supabase
    .from('dose_regimes')
    .select('*')
    .lte('start_date', date)
    .order('start_date', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`获取当前医嘱失败: ${error.message}`);
  }
  return data;
}

/**
 * 创建新的医嘱处方
 */
export async function createDoseRegime(
  regime: Omit<DoseRegime, 'id' | 'created_at'>
): Promise<DoseRegime> {
  const { data, error } = await supabase
    .from('dose_regimes')
    .insert(regime)
    .select()
    .single();
  if (error) throw new Error(`创建医嘱记录失败: ${error.message}`);
  return data;
}

/**
 * 更新医嘱处方
 */
export async function updateDoseRegime(
  id: string,
  updates: Partial<Omit<DoseRegime, 'id' | 'user_id' | 'created_at'>>
): Promise<DoseRegime> {
  const { data, error } = await supabase
    .from('dose_regimes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`更新医嘱记录失败: ${error.message}`);
  return data;
}

/**
 * 删除医嘱处方
 */
export async function deleteDoseRegime(id: string): Promise<void> {
  const { error } = await supabase.from('dose_regimes').delete().eq('id', id);
  if (error) throw new Error(`删除医嘱记录失败: ${error.message}`);
}

// ============ 每日服药记录 (dose_logs) ============

/**
 * 获取服药记录列表
 */
export async function getDoseLogs(params: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
} = {}): Promise<DoseLog[]> {
  let query = supabase
    .from('dose_logs')
    .select('*')
    .order('date', { ascending: false });

  if (params.startDate) query = query.gte('date', params.startDate.toISOString().split('T')[0]);
  if (params.endDate)   query = query.lte('date', params.endDate.toISOString().split('T')[0]);
  if (params.limit)     query = query.limit(params.limit);

  const { data, error } = await query;
  if (error) throw new Error(`获取服药记录失败: ${error.message}`);
  return data || [];
}

/**
 * 获取某天的服药记录（可能为 null 表示未记录）
 */
export async function getDoseLogByDate(date: string): Promise<DoseLog | null> {
  const { data, error } = await supabase
    .from('dose_logs')
    .select('*')
    .eq('date', date)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`获取当日服药记录失败: ${error.message}`);
  }
  return data;
}

/**
 * 创建每日服药记录
 */
export async function createDoseLog(
  log: Omit<DoseLog, 'id' | 'created_at'>
): Promise<DoseLog> {
  const { data, error } = await supabase
    .from('dose_logs')
    .insert(log)
    .select()
    .single();
  if (error) throw new Error(`创建服药记录失败: ${error.message}`);
  return data;
}

/**
 * 更新每日服药记录
 */
export async function updateDoseLog(
  id: string,
  updates: Partial<Omit<DoseLog, 'id' | 'user_id' | 'created_at'>>
): Promise<DoseLog> {
  const { data, error } = await supabase
    .from('dose_logs')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(`更新服药记录失败: ${error.message}`);
  return data;
}

/**
 * 删除每日服药记录
 */
export async function deleteDoseLog(id: string): Promise<void> {
  const { error } = await supabase.from('dose_logs').delete().eq('id', id);
  if (error) throw new Error(`删除服药记录失败: ${error.message}`);
}

/**
 * 便捷方法：upsert 今日服药记录（已存在则更新，不存在则创建）
 */
export async function upsertTodayDoseLog(
  userId: string,
  today: string,          // yyyy-MM-dd
  status: DoseStatus,
  actualDose: number | null,
  regimeId: string | null,
  notes?: string
): Promise<DoseLog> {
  const existing = await getDoseLogByDate(today);

  if (existing) {
    return updateDoseLog(existing.id, {
      status,
      actual_dose: actualDose,
      regime_id: regimeId,
      notes: notes ?? existing.notes,
    });
  } else {
    return createDoseLog({
      user_id: userId,
      date: today,
      status,
      actual_dose: actualDose,
      regime_id: regimeId,
      notes: notes ?? null,
    });
  }
}
