import React from 'react';
import { MemoryCard, MemoryCardData } from './MemoryCard';

export type MemoryItem = MemoryCardData;

export type MemoryInfusionPanelProps = {
  title: string;
  items: MemoryItem[];
  selected: string[];
  onToggle: (id: string) => void;
};

// MemoryInfusionPanel：记忆注入面板，横向滚动卡片组
// 选中时显示淡蓝连线提示，预留未来接入真实记忆数据
export function MemoryInfusionPanel({ title, items, selected, onToggle }: MemoryInfusionPanelProps) {
  return (
    <section className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-2 text-sm text-blue-100/70">
          选择将被注入的记忆碎片，系统会据此生成情感共鸣路径。
        </p>
      </div>

      <div className="relative flex gap-6 overflow-x-auto pb-2">
        {items.map((item) => (
          <MemoryCard
            key={item.id}
            item={item}
            selected={selected.includes(item.id)}
            onToggle={() => onToggle(item.id)}
            className="min-w-[240px]"
          />
        ))}
      </div>
    </section>
  );
}
