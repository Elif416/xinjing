import { Search, UserCircle } from 'lucide-react';
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
};

// GlassNavbar：复用首页的玻璃导航栏样式，确保多页面一致性
// 通过 props 注入品牌与导航数据，避免硬编码，便于后续扩展
export function GlassNavbar({ brand, items = [] }: GlassNavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/30 bg-white/60 backdrop-blur-[20px]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3 text-[12px] text-slate-700">
        <div className="flex items-center gap-3">
          <BackButton />
          <a href="/" className="flex items-center gap-2 text-sm text-ink">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/70 shadow-sm">
              心镜
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-medium text-ink">{brand.name}</p>
              {brand.en ? <p className="text-[11px] text-slate-500">{brand.en}</p> : null}
            </div>
          </a>
        </div>

        <div className="hidden items-center gap-6 md:flex">
          {items.length > 0 ? (
            items.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="transition-colors hover:text-ink"
              >
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/70 shadow-sm">
            <UserCircle className="h-5 w-5 text-slate-500" />
          </div>
        </div>
      </nav>
    </header>
  );
}