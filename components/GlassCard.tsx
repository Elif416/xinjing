import React from 'react';
import type { ComponentPropsWithoutRef } from 'react';
import clsx from 'clsx';

export type GlassCardProps = ComponentPropsWithoutRef<'article'> & {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
};

// GlassCard 通用玻璃卡片：适用于闭环与商业化模块
// 通过 props 控制内容，保证组件解耦与可维护
export function GlassCard({
  title,
  description,
  icon,
  children,
  className,
  ...rest
}: GlassCardProps) {
  return (
    <article
      className={clsx(
        'glass-card group relative isolate flex h-full flex-col gap-4 rounded-3xl p-6',
        className
      )}
      {...rest}
    >
      {(title || description || icon) && (
        <header className="relative z-10 flex items-start gap-3">
          {icon ? (
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/40 bg-white/70 text-blue-600 shadow-sm">
              {icon}
            </span>
          ) : null}
          <div className="flex-1">
            {title ? <h3 className="text-lg font-semibold text-ink">{title}</h3> : null}
            {description ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p>
            ) : null}
          </div>
        </header>
      )}

      {children ? <div className="relative z-10 flex-1">{children}</div> : null}

      {/* 光影流动层：hover 时显现，提升玻璃质感 */}
      <span className="glass-card-glow pointer-events-none absolute -inset-12 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
    </article>
  );
}
