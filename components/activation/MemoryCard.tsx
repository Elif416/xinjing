import React from 'react';
import clsx from 'clsx';

export type MemoryCardData = {
  id: string;
  type: 'photo' | 'diary' | 'audio' | 'custom';
  title: string;
  description: string;
  image?: string;
};

export type MemoryCardProps = {
  item: MemoryCardData;
  selected: boolean;
  onToggle: () => void;
  className?: string;
};

// MemoryCard：受控记忆卡片，通过 selected/onToggle 控制状态
export function MemoryCard({ item, selected, onToggle, className }: MemoryCardProps) {
  return (
    <div
      className={clsx(
        'relative rounded-3xl border border-white/20 bg-white/10 p-6 shadow-[0_16px_40px_rgba(0,0,0,0.25)]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-100/60">
            {item.type === 'photo'
              ? '旧照片'
              : item.type === 'diary'
                ? '日记'
                : item.type === 'audio'
                  ? '音频'
                  : '记忆'}
          </p>
          <h3 className="mt-2 text-lg font-semibold text-white">{item.title}</h3>
        </div>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="h-4 w-4 rounded border-white/40 bg-white/10 accent-blue-400"
        />
      </div>
      <p className="mt-3 text-sm text-blue-100/70">{item.description}</p>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/20 bg-white/10">
        {item.type === 'photo' || item.image ? (
          <div
            className="h-24 w-full bg-gradient-to-br from-white/30 via-white/10 to-blue-300/20"
            style={item.image ? { backgroundImage: `url(${item.image})`, backgroundSize: 'cover' } : undefined}
          />
        ) : null}
        {item.type === 'diary' ? (
          <div className="flex h-24 flex-col justify-center gap-2 px-4 text-xs text-blue-100/70">
            <span className="h-1 w-4/5 rounded-full bg-white/30" />
            <span className="h-1 w-3/5 rounded-full bg-white/20" />
            <span className="h-1 w-2/5 rounded-full bg-white/20" />
          </div>
        ) : null}
        {item.type === 'audio' ? (
          <div className="flex h-24 items-end gap-1 px-4 pb-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <span
                key={`wave-${index}`}
                className="w-1 rounded-full bg-blue-300/60"
                style={{ height: `${30 + (index % 5) * 10}%` }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {selected ? (
        <span className="pointer-events-none absolute right-0 top-1/2 h-px w-10 -translate-y-1/2 bg-blue-300/60 shadow-[0_0_12px_rgba(147,197,253,0.8)]" />
      ) : null}
    </div>
  );
}
