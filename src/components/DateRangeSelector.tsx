import { useState } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import type { TimeRangePreset } from '../types';

interface DateRangeSelectorProps {
  value: TimeRangePreset;
  customStart?: Date;
  customEnd?: Date;
  onChange: (
    preset: TimeRangePreset,
    customStart?: Date,
    customEnd?: Date
  ) => void;
}

export function DateRangeSelector({
  value,
  customStart,
  customEnd,
  onChange,
}: DateRangeSelectorProps) {
  const [showCustom, setShowCustom] = useState(value === 'custom');

  const presets: { value: TimeRangePreset; label: string }[] = [
    { value: '7d', label: '最近 7 天' },
    { value: '30d', label: '最近 30 天' },
    { value: '90d', label: '最近 90 天' },
    { value: 'custom', label: '自定义' },
  ];

  const handlePresetChange = (preset: TimeRangePreset) => {
    if (preset === 'custom') {
      setShowCustom(true);
      const defaultEnd = endOfDay(new Date());
      const defaultStart = startOfDay(subDays(defaultEnd, 30));
      onChange(preset, defaultStart, defaultEnd);
    } else {
      setShowCustom(false);
      onChange(preset);
    }
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    const date = new Date(value);
    if (type === 'start') {
      onChange('custom', startOfDay(date), customEnd);
    } else {
      onChange('custom', customStart, endOfDay(date));
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {presets.map((preset) => (
          <button
            key={preset.value}
            onClick={() => handlePresetChange(preset.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
              value === preset.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {showCustom && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              开始日期
            </label>
            <input
              type="date"
              value={customStart ? format(customStart, 'yyyy-MM-dd') : ''}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              结束日期
            </label>
            <input
              type="date"
              value={customEnd ? format(customEnd, 'yyyy-MM-dd') : ''}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base min-h-[44px]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
