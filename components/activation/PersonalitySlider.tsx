import React from 'react';

export type PersonalitySliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  tone?: 'dark' | 'light';
};

// PersonalitySlider：受控滑块组件，外部管理 value 与 onChange
export function PersonalitySlider({ label, value, onChange, tone = 'dark' }: PersonalitySliderProps) {
  const textClass = tone === 'light' ? 'text-slate-500' : 'text-blue-100/70';
  const valueClass = tone === 'light' ? 'text-slate-400' : 'text-blue-100/70';
  return (
    <div className="flex flex-col gap-2">
      <div className={`flex items-center justify-between text-xs ${textClass}`}>
        <span>{label}</span>
        <span className={valueClass}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-blue-400"
      />
    </div>
  );
}
