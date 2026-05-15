import type {
  InrRecord,
  BloodPressureRecord,
  DoseLog,
  WeightLog,
  MealLogWithItems,
} from '../types';
import { DOSE_OPTIONS, TIME_OF_DAY_LABELS, MEAL_TYPE_LABELS, PORTION_LABELS } from '../types';
import { getFoodById } from './foodData';

// ============ CSV 工具 ============

/**
 * 转义 CSV 字段：含逗号/换行/引号时加双引号包裹
 */
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * 生成 CSV 字符串（带 BOM 以便 Excel 正确识别中文）
 */
function buildCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const bom = '\uFEFF';
  const headerLine = headers.map(csvEscape).join(',');
  const dataLines = rows.map((row) => row.map(csvEscape).join(','));
  return bom + [headerLine, ...dataLines].join('\n');
}

/**
 * 触发浏览器下载
 */
function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ============ 各类型导出 ============

export function exportInrRecords(records: InrRecord[]): void {
  const headers = ['日期时间', 'INR值', '华法林剂量(片)', '是否达标', '目标范围低', '目标范围高', '备注'];
  const rows = records
    .sort((a, b) => a.record_time.localeCompare(b.record_time))
    .map((r) => [
      r.record_time.replace('T', ' ').replace(/\.\d+.*/, ''),
      r.value,
      r.warfarin_dose_mg,
      r.is_in_range === true ? '是' : r.is_in_range === false ? '否' : '',
      r.target_range_low,
      r.target_range_high,
      r.note,
    ]);
  downloadCsv(buildCsv(headers, rows), `INR记录_${todayStr()}.csv`);
}

export function exportBpRecords(records: BloodPressureRecord[]): void {
  const headers = ['日期时间', '收缩压', '舒张压', '心率', '手臂', '体位'];
  const rows = records
    .sort((a, b) => a.record_time.localeCompare(b.record_time))
    .map((r) => [
      r.record_time.replace('T', ' ').replace(/\.\d+.*/, ''),
      r.systolic,
      r.diastolic,
      r.heart_rate,
      r.arm === 'left' ? '左手' : r.arm === 'right' ? '右手' : '',
      r.position,
    ]);
  downloadCsv(buildCsv(headers, rows), `血压记录_${todayStr()}.csv`);
}

export function exportDoseLogs(logs: DoseLog[]): void {
  const headers = ['日期', '状态', '实际剂量(片)', '剂量描述', '备注'];
  const rows = logs
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((l) => {
      const doseLabel = l.actual_dose != null
        ? (DOSE_OPTIONS.find((d) => d.value === l.actual_dose)?.label ?? `${l.actual_dose}片`)
        : '—';
      return [l.date, l.status, l.actual_dose, doseLabel, l.notes];
    });
  downloadCsv(buildCsv(headers, rows), `服药记录_${todayStr()}.csv`);
}

export function exportWeightLogs(logs: WeightLog[]): void {
  const headers = ['日期', '时段', '体重(kg)', '备注'];
  const rows = logs
    .sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      if (d !== 0) return d;
      return a.time_of_day.localeCompare(b.time_of_day);
    })
    .map((l) => [
      l.date,
      l.time_of_day === 'morning' ? '早晨' : '睡前',
      l.weight_kg,
      l.notes,
    ]);
  downloadCsv(buildCsv(headers, rows), `体重记录_${todayStr()}.csv`);
}

export function exportMealLogs(logs: MealLogWithItems[]): void {
  const headers = ['日期', '餐次', '食物', '维K等级', '份量'];
  const rows: (string | number | null)[] [] = [];

  const sorted = [...logs].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    if (d !== 0) return d;
    return a.meal_type.localeCompare(b.meal_type);
  });

  sorted.forEach((log) => {
    const mealLabel = log.meal_type === 'breakfast' ? '早餐' :
                      log.meal_type === 'lunch' ? '午餐' :
                      log.meal_type === 'dinner' ? '晚餐' : '加餐';
    if (log.items.length === 0) {
      rows.push([log.date, mealLabel, '', '', '']);
    } else {
      log.items.forEach((item) => {
        const food = getFoodById(item.food_id);
        const name = item.custom_name || food?.name || item.food_id;
        const vkLabel = item.vk_level === 'high' ? '高' : item.vk_level === 'medium' ? '中' : '低';
        const portionLabel = item.portion === 'small' ? '少量' : item.portion === 'large' ? '多' : '正常';
        rows.push([log.date, mealLabel, name, vkLabel, portionLabel]);
      });
    }
  });

  downloadCsv(buildCsv(headers, rows), `饮食记录_${todayStr()}.csv`);
}

/**
 * 导出全部数据到一个合并 CSV
 */
export function exportAllRecords(
  inr: InrRecord[],
  bp: BloodPressureRecord[],
  dose: DoseLog[],
  weight: WeightLog[],
  meals: MealLogWithItems[]
): void {
  const sections: string[] = [];

  // INR
  if (inr.length > 0) {
    const headers = ['日期时间', 'INR值', '华法林剂量(片)', '是否达标', '备注'];
    const rows = inr
      .sort((a, b) => a.record_time.localeCompare(b.record_time))
      .map((r) => [
        csvEscape(r.record_time.replace('T', ' ').replace(/\.\d+.*/, '')),
        csvEscape(r.value),
        csvEscape(r.warfarin_dose_mg),
        csvEscape(r.is_in_range === true ? '是' : r.is_in_range === false ? '否' : ''),
        csvEscape(r.note),
      ].join(','));
    sections.push(`=== INR记录 (${inr.length}条) ===`);
    sections.push(headers.map(csvEscape).join(','));
    sections.push(...rows);
    sections.push('');
  }

  // 血压
  if (bp.length > 0) {
    const headers = ['日期时间', '收缩压', '舒张压', '心率', '手臂', '体位'];
    const rows = bp
      .sort((a, b) => a.record_time.localeCompare(b.record_time))
      .map((r) => [
        csvEscape(r.record_time.replace('T', ' ').replace(/\.\d+.*/, '')),
        csvEscape(r.systolic),
        csvEscape(r.diastolic),
        csvEscape(r.heart_rate),
        csvEscape(r.arm === 'left' ? '左手' : r.arm === 'right' ? '右手' : ''),
        csvEscape(r.position),
      ].join(','));
    sections.push(`=== 血压记录 (${bp.length}条) ===`);
    sections.push(headers.map(csvEscape).join(','));
    sections.push(...rows);
    sections.push('');
  }

  // 服药
  if (dose.length > 0) {
    const headers = ['日期', '状态', '实际剂量(片)', '备注'];
    const rows = dose
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((l) => [
        csvEscape(l.date),
        csvEscape(l.status),
        csvEscape(l.actual_dose),
        csvEscape(l.notes),
      ].join(','));
    sections.push(`=== 服药记录 (${dose.length}条) ===`);
    sections.push(headers.map(csvEscape).join(','));
    sections.push(...rows);
    sections.push('');
  }

  // 体重
  if (weight.length > 0) {
    const headers = ['日期', '时段', '体重(kg)', '备注'];
    const rows = weight
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((l) => [
        csvEscape(l.date),
        csvEscape(l.time_of_day === 'morning' ? '早晨' : '睡前'),
        csvEscape(l.weight_kg),
        csvEscape(l.notes),
      ].join(','));
    sections.push(`=== 体重记录 (${weight.length}条) ===`);
    sections.push(headers.map(csvEscape).join(','));
    sections.push(...rows);
    sections.push('');
  }

  // 饮食
  if (meals.length > 0) {
    const headers = ['日期', '餐次', '食物', '维K等级', '份量'];
    const rows: string[] = [];
    [...meals]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((log) => {
        const mealLabel = log.meal_type === 'breakfast' ? '早餐' :
                          log.meal_type === 'lunch' ? '午餐' :
                          log.meal_type === 'dinner' ? '晚餐' : '加餐';
        log.items.forEach((item) => {
          const food = getFoodById(item.food_id);
          rows.push([
            csvEscape(log.date),
            csvEscape(mealLabel),
            csvEscape(item.custom_name || food?.name || item.food_id),
            csvEscape(item.vk_level === 'high' ? '高' : item.vk_level === 'medium' ? '中' : '低'),
            csvEscape(item.portion === 'small' ? '少量' : item.portion === 'large' ? '多' : '正常'),
          ].join(','));
        });
      });
    sections.push(`=== 饮食记录 (${meals.length}餐) ===`);
    sections.push(headers.map(csvEscape).join(','));
    sections.push(...rows);
  }

  const content = '\uFEFF' + sections.join('\n');
  downloadCsv(content, `健康数据汇总_${todayStr()}.csv`);
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}
