'use client';

import {
  BookOpen,
  Layers3,
  Package,
  Palette,
  Sparkles,
  type LucideIcon
} from 'lucide-react';
import clsx from 'clsx';

type MarketProductVisualProps = {
  slug: string;
  title: string;
  subtitle?: string;
  labels?: string[];
  size?: 'card' | 'hero';
};

type VisualTheme = {
  icon: LucideIcon;
  gradient: string;
  halo: string;
  accent: string;
};

const visualThemeBySlug: Record<string, VisualTheme> = {
  'standee-custom': {
    icon: Layers3,
    gradient: 'from-violet-500/80 via-fuchsia-400/65 to-sky-300/80',
    halo: 'bg-violet-400/40',
    accent: 'text-violet-700'
  },
  'acrylic-custom': {
    icon: Sparkles,
    gradient: 'from-cyan-400/80 via-sky-300/70 to-indigo-400/75',
    halo: 'bg-cyan-300/45',
    accent: 'text-sky-700'
  },
  'picture-book-custom': {
    icon: BookOpen,
    gradient: 'from-emerald-400/75 via-teal-300/70 to-cyan-200/75',
    halo: 'bg-emerald-300/45',
    accent: 'text-emerald-700'
  },
  'canvas-art-custom': {
    icon: Palette,
    gradient: 'from-amber-400/80 via-orange-300/75 to-rose-300/75',
    halo: 'bg-amber-300/45',
    accent: 'text-amber-700'
  },
  'cotton-doll-custom': {
    icon: Package,
    gradient: 'from-rose-400/75 via-pink-300/75 to-violet-300/75',
    halo: 'bg-pink-300/45',
    accent: 'text-rose-700'
  }
};

export function MarketProductVisual({
  slug,
  title,
  subtitle,
  labels = [],
  size = 'card'
}: MarketProductVisualProps) {
  const theme = visualThemeBySlug[slug] ?? visualThemeBySlug['standee-custom'];
  const Icon = theme.icon;
  const isHero = size === 'hero';

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-[32px] border border-white/55 bg-white/60 shadow-[0_24px_70px_rgba(15,23,42,0.12)]',
        isHero ? 'min-h-[340px] p-6 sm:min-h-[420px] sm:p-8' : 'min-h-[220px] p-5'
      )}
    >
      <div className={clsx('absolute inset-0 bg-gradient-to-br', theme.gradient)} />
      <div className={clsx('absolute right-[-4rem] top-[-4rem] h-40 w-40 rounded-full blur-3xl', theme.halo)} />
      <div className={clsx('absolute bottom-[-5rem] left-[-3rem] h-48 w-48 rounded-full blur-3xl', theme.halo)} />

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex flex-wrap gap-2">
          {labels.slice(0, isHero ? 3 : 2).map((label) => (
            <span
              key={label}
              className="rounded-full border border-white/55 bg-white/72 px-3 py-1 text-xs font-medium text-slate-700 shadow-sm"
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex items-end justify-between gap-4">
          <div className="max-w-[70%]">
            <p className="text-lg font-semibold tracking-tight text-white drop-shadow-sm sm:text-2xl">
              {title}
            </p>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-white/90 sm:text-[15px]">{subtitle}</p>
            ) : null}
          </div>

          <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border border-white/55 bg-white/78 shadow-[0_18px_40px_rgba(255,255,255,0.28)] backdrop-blur-xl sm:h-24 sm:w-24">
            <div className={clsx('absolute inset-3 rounded-[20px] bg-white/60 blur-lg', theme.halo)} />
            <Icon className={clsx('relative h-9 w-9 sm:h-11 sm:w-11', theme.accent)} />
          </div>
        </div>
      </div>
    </div>
  );
}
