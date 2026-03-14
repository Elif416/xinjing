'use client';

import { cn } from '@/lib/utils';

type ChatAvatarProps = {
  name: string;
  imageUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const sizeClassMap = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-12 w-12 text-base',
  lg: 'h-16 w-16 text-lg'
} satisfies Record<NonNullable<ChatAvatarProps['size']>, string>;

export function ChatAvatar({
  name,
  imageUrl,
  size = 'md',
  className
}: ChatAvatarProps) {
  const label = name.trim().slice(0, 1).toUpperCase() || '心';

  if (imageUrl) {
    return (
      <div
        aria-label={name}
        title={name}
        className={cn(
          'overflow-hidden rounded-full border border-white/20 bg-white/10 bg-cover bg-center shadow-[0_14px_32px_rgba(15,23,42,0.24)]',
          sizeClassMap[size],
          className
        )}
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
    );
  }

  return (
    <div
      aria-label={name}
      title={name}
      className={cn(
        'flex items-center justify-center rounded-full border border-white/20 bg-gradient-to-br from-blue-400/75 via-indigo-400/70 to-violet-400/75 font-semibold text-white shadow-[0_14px_32px_rgba(15,23,42,0.24)]',
        sizeClassMap[size],
        className
      )}
    >
      {label}
    </div>
  );
}
