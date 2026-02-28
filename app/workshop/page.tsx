import { GlassNavbar } from '@/components/GlassNavbar';
import homeData from '@/data/home.json';

export default function WorkshopPage() {
  const navItems = (Array.isArray(homeData.nav) ? homeData.nav : []).map((item) => ({
    ...item,
    href: item.href.startsWith('#') ? `/${item.href}` : item.href
  }));

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-ink">
      <div className="page-bg">
        <GlassNavbar
          brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }}
          items={navItems}
        />
        <div className="flex min-h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">实体工坊</h1>
          <p className="text-sm text-slate-600">页面建设中，稍后将完善体验细节。</p>
        </div>
      </div>
    </div>
  );
}