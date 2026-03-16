'use client';

import Image from 'next/image';
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
  imagePath: string;
  labels?: string[];
  size?: 'card' | 'hero';
};

type VisualTheme = {
  icon: LucideIcon;
  surface: string;
  chip: string;
  iconWrap: string;
  iconColor: string;
  overlay: string;
};

const visualThemeBySlug: Record<string, VisualTheme> = {
  'standee-custom': {
    icon: Layers3,
    surface: 'from-slate-50 via-violet-50 to-sky-100',
    chip: 'border-violet-200 bg-violet-100/90 text-violet-900',
    iconWrap: 'border-violet-200/80 bg-violet-100/92',
    iconColor: 'text-violet-800',
    overlay: 'from-slate-900/10 via-white/8 to-violet-100/20'
  },
  'acrylic-custom': {
    icon: Sparkles,
    surface: 'from-slate-50 via-cyan-50 to-sky-100',
    chip: 'border-cyan-200 bg-cyan-100/90 text-cyan-900',
    iconWrap: 'border-cyan-200/80 bg-cyan-100/92',
    iconColor: 'text-cyan-800',
    overlay: 'from-slate-900/8 via-white/8 to-cyan-100/20'
  },
  'picture-book-custom': {
    icon: BookOpen,
    surface: 'from-slate-50 via-emerald-50 to-teal-100',
    chip: 'border-emerald-200 bg-emerald-100/90 text-emerald-900',
    iconWrap: 'border-emerald-200/80 bg-emerald-100/92',
    iconColor: 'text-emerald-800',
    overlay: 'from-slate-900/8 via-white/8 to-emerald-100/20'
  },
  'canvas-art-custom': {
    icon: Palette,
    surface: 'from-slate-50 via-amber-50 to-orange-100',
    chip: 'border-amber-200 bg-amber-100/90 text-amber-900',
    iconWrap: 'border-amber-200/80 bg-amber-100/92',
    iconColor: 'text-amber-800',
    overlay: 'from-slate-900/8 via-white/8 to-amber-100/20'
  },
  'cotton-doll-custom': {
    icon: Package,
    surface: 'from-slate-50 via-rose-50 to-pink-100',
    chip: 'border-rose-200 bg-rose-100/90 text-rose-900',
    iconWrap: 'border-rose-200/80 bg-rose-100/92',
    iconColor: 'text-rose-800',
    overlay: 'from-slate-900/8 via-white/8 to-rose-100/20'
  }
};

export function MarketProductVisual({
  slug,
  title,
  subtitle,
  imagePath,
  labels = [],
  size = 'card'
}: MarketProductVisualProps) {
  const theme = visualThemeBySlug[slug] ?? visualThemeBySlug['standee-custom'];
  const Icon = theme.icon;
  const isHero = size === 'hero';

  if (isHero) {
    return (
      <div
        className={clsx(
          'overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br p-4 shadow-[0_20px_60px_rgba(15,23,42,0.08)] sm:p-5',
          theme.surface
        )}
      >
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.78fr)] lg:items-stretch">
          <div className="flex flex-col gap-4 rounded-[28px] border border-white/80 bg-white/84 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-6">
            <div className="flex flex-wrap gap-2">
              {labels.slice(0, 3).map((label) => (
                <span
                  key={label}
                  className={clsx(
                    'rounded-full border px-3 py-1 text-xs font-semibold shadow-sm',
                    theme.chip
                  )}
                >
                  {label}
                </span>
              ))}
            </div>

            <div className="space-y-3">
              <p className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{title}</p>
              {subtitle ? <p className="text-sm leading-7 text-slate-700 sm:text-base">{subtitle}</p> : null}
            </div>

            <div className="mt-auto flex items-center gap-3">
              <div
                className={clsx(
                  'flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border shadow-sm',
                  theme.iconWrap
                )}
              >
                <Icon className={clsx('h-7 w-7', theme.iconColor)} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-950">成品示意图</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  例图单独展示，便于看清实物质感与结构。
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white/86 shadow-[0_18px_42px_rgba(15,23,42,0.10)]">
            <div className="relative aspect-[4/3] min-h-[280px]">
              <Image
                src={imagePath}
                alt={`${title}示意图`}
                fill
                sizes="(min-width: 1024px) 420px, 100vw"
                className="object-cover object-center"
                priority
              />
              <div className={clsx('absolute inset-0 bg-gradient-to-br', theme.overlay)} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br shadow-[0_20px_60px_rgba(15,23,42,0.08)]',
        theme.surface
      )}
    >
      <div className="relative h-44 w-full overflow-hidden border-b border-white/70">
        <Image
          src={imagePath}
          alt={`${title}示意图`}
          fill
          sizes="(min-width: 1280px) 380px, (min-width: 768px) 50vw, 100vw"
          className="object-cover object-center"
        />
        <div className={clsx('absolute inset-0 bg-gradient-to-br', theme.overlay)} />
      </div>

      <div className="space-y-4 p-5">
        <div className="flex flex-wrap gap-2">
          {labels.slice(0, 2).map((label) => (
            <span
              key={label}
              className={clsx('rounded-full border px-3 py-1 text-xs font-semibold shadow-sm', theme.chip)}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="rounded-[24px] border border-white/80 bg-white/88 px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <p className="text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</p>
            {subtitle ? <p className="mt-2 text-sm leading-6 text-slate-700">{subtitle}</p> : null}
          </div>

          <div
            className={clsx(
              'flex h-20 w-20 shrink-0 items-center justify-center rounded-[24px] border shadow-[0_18px_40px_rgba(15,23,42,0.08)]',
              theme.iconWrap
            )}
          >
            <Icon className={clsx('h-9 w-9', theme.iconColor)} />
          </div>
        </div>
      </div>
    </div>
  );
}
