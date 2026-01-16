import { supabase } from './supabaseClient';
import type { InrRecord, BloodPressureRecord, Profile } from '../types';

// ============ INR 记录 ============

/**
 * 获取 INR 记录列表
 */
export async function getInrRecords(params: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<InrRecord[]> {
  let query = supabase
    .from('inr_records')
    .select('*')
    .order('record_time', { ascending: false });

  if (params.startDate) {
    query = query.gte('record_time', params.startDate.toISOString());
  }

  if (params.endDate) {
    query = query.lte('record_time', params.endDate.toISOString());
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`获取 INR 记录失败: ${error.message}`);
  }

  return data || [];
}

/**
 * 创建 INR 记录
 */
export async function createInrRecord(
  record: Omit<InrRecord, 'id' | 'is_in_range' | 'target_range_low' | 'target_range_high'>
): Promise<InrRecord> {
  const { data, error } = await supabase
    .from('inr_records')
    .insert(record)
    .select()
    .single();

  if (error) {
    throw new Error(`创建 INR 记录失败: ${error.message}`);
  }

  return data;
}

/**
 * 更新 INR 记录
 */
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

  if (error) {
    throw new Error(`更新 INR 记录失败: ${error.message}`);
  }

  return data;
}

/**
 * 删除 INR 记录
 */
export async function deleteInrRecord(id: string): Promise<void> {
  const { error } = await supabase.from('inr_records').delete().eq('id', id);

  if (error) {
    throw new Error(`删除 INR 记录失败: ${error.message}`);
  }
}

// ============ 血压记录 ============

/**
 * 获取血压记录列表
 */
export async function getBloodPressureRecords(params: {
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): Promise<BloodPressureRecord[]> {
  let query = supabase
    .from('blood_pressure_records')
    .select('*')
    .order('record_time', { ascending: false });

  if (params.startDate) {
    query = query.gte('record_time', params.startDate.toISOString());
  }

  if (params.endDate) {
    query = query.lte('record_time', params.endDate.toISOString());
  }

  if (params.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`获取血压记录失败: ${error.message}`);
  }

  return data || [];
}

/**
 * 创建血压记录
 */
export async function createBloodPressureRecord(
  record: Omit<BloodPressureRecord, 'id'>
): Promise<BloodPressureRecord> {
  const { data, error } = await supabase
    .from('blood_pressure_records')
    .insert(record)
    .select()
    .single();

  if (error) {
    throw new Error(`创建血压记录失败: ${error.message}`);
  }

  return data;
}

/**
 * 更新血压记录
 */
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

  if (error) {
    throw new Error(`更新血压记录失败: ${error.message}`);
  }

  return data;
}

/**
 * 删除血压记录
 */
export async function deleteBloodPressureRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('blood_pressure_records')
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(`删除血压记录失败: ${error.message}`);
  }
}

// ============ 用户资料 ============

/**
 * 获取用户资料
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    // 如果是找不到记录，返回 null 而不是抛出错误
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`获取用户资料失败: ${error.message}`);
  }

  return data;
}
