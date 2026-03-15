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
    overlay: 'from-slate-900/12 via-white/10 to-violet-100/32'
  },
  'acrylic-custom': {
    icon: Sparkles,
    surface: 'from-slate-50 via-cyan-50 to-sky-100',
    chip: 'border-cyan-200 bg-cyan-100/90 text-cyan-900',
    iconWrap: 'border-cyan-200/80 bg-cyan-100/92',
    iconColor: 'text-cyan-800',
    overlay: 'from-slate-900/10 via-white/12 to-cyan-100/34'
  },
  'picture-book-custom': {
    icon: BookOpen,
    surface: 'from-slate-50 via-emerald-50 to-teal-100',
    chip: 'border-emerald-200 bg-emerald-100/90 text-emerald-900',
    iconWrap: 'border-emerald-200/80 bg-emerald-100/92',
    iconColor: 'text-emerald-800',
    overlay: 'from-slate-900/10 via-white/12 to-emerald-100/34'
  },
  'canvas-art-custom': {
    icon: Palette,
    surface: 'from-slate-50 via-amber-50 to-orange-100',
    chip: 'border-amber-200 bg-amber-100/90 text-amber-900',
    iconWrap: 'border-amber-200/80 bg-amber-100/92',
    iconColor: 'text-amber-800',
    overlay: 'from-slate-900/12 via-white/10 to-amber-100/34'
  },
  'cotton-doll-custom': {
    icon: Package,
    surface: 'from-slate-50 via-rose-50 to-pink-100',
    chip: 'border-rose-200 bg-rose-100/90 text-rose-900',
    iconWrap: 'border-rose-200/80 bg-rose-100/92',
    iconColor: 'text-rose-800',
    overlay: 'from-slate-900/12 via-white/10 to-rose-100/34'
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

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-[32px] border border-slate-200/80 bg-gradient-to-br shadow-[0_20px_60px_rgba(15,23,42,0.08)]',
        theme.surface,
        isHero ? 'min-h-[340px] p-6 sm:min-h-[420px] sm:p-8' : 'min-h-[260px] p-5'
      )}
    >
      <div className="absolute inset-0">
        <Image
          src={imagePath}
          alt={`${title}示意图`}
          fill
          sizes={isHero ? '(min-width: 1024px) 720px, 100vw' : '(min-width: 1280px) 380px, (min-width: 768px) 50vw, 100vw'}
          className={clsx(
            'object-cover object-center transition duration-500',
            isHero ? 'scale-[1.02]' : 'scale-[1.01]'
          )}
          priority={isHero}
        />
        <div className={clsx('absolute inset-0 bg-gradient-to-br', theme.overlay)} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.88),transparent_42%)]" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex flex-wrap gap-2">
          {labels.slice(0, isHero ? 3 : 2).map((label) => (
            <span
              key={label}
              className={clsx(
                'rounded-full border px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm',
                theme.chip
              )}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <div className="rounded-[28px] border border-white/85 bg-white/90 px-4 py-4 shadow-[0_16px_40px_rgba(15,23,42,0.10)] backdrop-blur-md sm:px-5 sm:py-5">
            <p className="text-lg font-semibold tracking-tight text-slate-950 sm:text-2xl">{title}</p>
            {subtitle ? (
              <p className="mt-2 text-sm leading-6 text-slate-700 sm:text-[15px]">{subtitle}</p>
            ) : null}
          </div>

          <div
            className={clsx(
              'relative flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border shadow-[0_18px_40px_rgba(15,23,42,0.10)] backdrop-blur-md sm:h-24 sm:w-24',
              theme.iconWrap
            )}
          >
            <Icon className={clsx('h-9 w-9 sm:h-11 sm:w-11', theme.iconColor)} />
          </div>
        </div>
      </div>
    </div>
  );
}
