'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Search, UserCircle } from 'lucide-react';
import clsx from 'clsx';

import { BackButton } from './BackButton';

export type GlassNavItem = {
  label: string;
  href: string;
};

export type GlassNavbarProps = {
  brand: {
    name: string;
    en?: string;
  };
  items?: GlassNavItem[];
  showBackButton?: boolean;
  className?: string;
};

type UnreadPayload = {
  unreadTotal?: number;
};

export function GlassNavbar({
  brand,
  items = [],
  showBackButton = true,
  className
}: GlassNavbarProps) {
  const pathname = usePathname();
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const syncUnread = async () => {
      const nextUnread = await fetchUnreadTotal();
      if (!cancelled) {
        setUnreadTotal(nextUnread);
      }
    };

    void syncUnread();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    const handleSync = () => {
      void (async () => {
        const nextUnread = await fetchUnreadTotal();
        setUnreadTotal(nextUnread);
      })();
    };

    window.addEventListener('messages:sync', handleSync);

    return () => window.removeEventListener('messages:sync', handleSync);
  }, []);

  const hasUnread = unreadTotal > 0;
  const unreadLabel = useMemo(() => (unreadTotal > 9 ? '9+' : String(unreadTotal)), [unreadTotal]);

  return (
    <header
      className={clsx(
        'sticky top-0 z-[200] w-full border-b border-white/30 bg-white backdrop-blur-[20px]',
        className
      )}
    >
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-[12px] text-slate-700">
        <div className="flex items-center gap-3">
          {showBackButton ? <BackButton /> : null}
          <Link href="/" className="flex items-center gap-2 text-sm text-ink">
            <div className="relative h-10 w-10 overflow-hidden rounded-full border border-white/40 bg-white/70 shadow-sm">
              <Image
                src="/pic/logo.jpg"
                alt={`${brand.name} logo`}
                fill
                sizes="40px"
                className="object-cover"
                priority
              />
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-medium text-ink">{brand.name}</p>
              {brand.en ? <p className="text-[11px] text-slate-500">{brand.en}</p> : null}
            </div>
          </Link>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          {items.length > 0 ? (
            items.map((item) => (
              <a key={item.label} href={item.href} className="transition-colors hover:text-ink">
                {item.label}
              </a>
            ))
          ) : (
            <span className="text-xs text-slate-500">暂无导航项</span>
          )}
        </div>

        <div className="flex items-center gap-3 text-slate-600">
          <button
            type="button"
            className="glass-button glass-button--ghost glass-button--icon"
            aria-label="搜索"
          >
            <Search className="h-4 w-4" />
          </button>

          <Link
            href="/messages"
            className="relative glass-button glass-button--ghost glass-button--icon"
            aria-label="消息"
          >
            <Bell className="h-4 w-4" />
            {hasUnread ? (
              <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white shadow-[0_8px_18px_rgba(244,63,94,0.35)]">
                {unreadLabel}
              </span>
            ) : null}
          </Link>

          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/70 shadow-sm">
            <UserCircle className="h-5 w-5 text-slate-500" />
          </div>
        </div>
      </nav>
    </header>
  );
}

async function fetchUnreadTotal() {
  try {
    const response = await fetch('/api/messages/unread', { cache: 'no-store' });
    const payload = (await response.json()) as UnreadPayload;

    if (!response.ok) {
      return 0;
    }

    return Math.max(0, Number(payload.unreadTotal ?? 0));
  } catch {
    return 0;
  }
}
