import React from 'react';
import { GlassCard } from '../GlassCard';
import { PersonalitySlider } from './PersonalitySlider';

export type PersonalitySlider = {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
};

export type PersonalityMatrixProps = {
  name: string;
  traits: string;
  nameLabel: string;
  traitsLabel: string;
  onNameChange: (value: string) => void;
  onTraitsChange: (value: string) => void;
  sliders: PersonalitySlider[];
};

// PersonalityMatrix：人格特征配置区，采用 Bento Grid 布局
// 通过 props 注入字段与滑动条，便于未来接入 AI 参数接口
export function PersonalityMatrix({
  name,
  traits,
  nameLabel,
  traitsLabel,
  onNameChange,
  onTraitsChange,
  sliders
}: PersonalityMatrixProps) {
  return (
    <section className="grid gap-6 md:grid-cols-3">
      <GlassCard className="glass-card--dark md:col-span-2">
        <h2 className="text-xl font-semibold tracking-tight text-white">基础设定</h2>
        <p className="mt-2 text-sm text-blue-100/70">
          为数字生命命名并定义核心性格关键词。
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-blue-100/60">
            {nameLabel}
            <input
              value={name}
              onChange={(event) => onNameChange(event.target.value)}
              className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none"
              placeholder="请输入名字"
            />
          </label>
          <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-blue-100/60">
            {traitsLabel}
            <input
              value={traits}
              onChange={(event) => onTraitsChange(event.target.value)}
              className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none"
              placeholder="温柔 / 理性 / 细腻"
            />
          </label>
        </div>
      </GlassCard>

      <GlassCard className="glass-card--dark md:col-span-1">
        <h2 className="text-xl font-semibold tracking-tight text-white">情感引擎参数</h2>
        <p className="mt-2 text-sm text-blue-100/70">
          调节情绪权重，形成独特的陪伴方式。
        </p>
        <div className="mt-6 flex flex-col gap-4">
          {sliders.map((slider) => (
            <PersonalitySlider
              key={slider.id}
              label={slider.label}
              value={slider.value}
              onChange={slider.onChange}
            />
          ))}
        </div>
      </GlassCard>
    </section>
  );
}
