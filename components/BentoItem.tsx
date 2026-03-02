import React from 'react';
import clsx from 'clsx';

import { GlassCard } from './GlassCard';

export type BentoItemProps = {
  title: string;
  description: string;
  size?: 'large' | 'small';
  children?: React.ReactNode;
  className?: string;
  href?: string;
};

// BentoItem：便当盒布局中的单元
// 通过 size 控制在桌面端的列宽（large=2/3，small=1/3），移动端自动回退为单列
export function BentoItem({
  title,
  description,
  size = 'small',
  children,
  className,
  href
}: BentoItemProps) {
  const sizeClass =
    size === 'large' ? 'md:col-span-2' : 'md:col-span-1';

  const content = (
    <GlassCard
      title={title}
      description={description}
      className={href ? 'cursor-pointer clickable-card' : undefined}
    >
      {children}
    </GlassCard>
  );

  return (
    <div className={clsx(sizeClass, className)}>
      {href ? (
        <a href={href} className="block h-full">
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}
