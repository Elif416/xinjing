import { notFound } from 'next/navigation';

import { GlassCard } from '@/components/GlassCard';
import { GlassNavbar } from '@/components/GlassNavbar';
import { ProductDetailClient } from '@/components/market/ProductDetailClient';
import homeData from '@/data/home.json';
import { getMarketProductBySlug, getMarketProducts } from '@/lib/marketCatalog';

export function generateStaticParams() {
  return getMarketProducts().map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getMarketProductBySlug(slug);

  if (!product) {
    return {
      title: '心镜物'
    };
  }

  return {
    title: `${product.title}｜心镜物`,
    description: product.summary
  };
}

export default async function MarketDetailPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getMarketProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const navItems = (Array.isArray(homeData.nav) ? homeData.nav : []).map((item) => ({
    ...item,
    href: item.href.startsWith('#') ? `/${item.href}` : item.href
  }));

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-950">
      <div className="page-bg activation-bg min-h-screen">
        <GlassNavbar brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }} items={navItems} />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 pb-24 pt-12 sm:pt-16">
          <GlassCard className="gap-4 border-slate-200/80 bg-white/92 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)] sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                  HeartMirror Goods Detail
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {product.title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">{product.summary}</p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700">
                规格、价格与咨询入口集中在右侧，方便快速比对
              </span>
            </div>
          </GlassCard>

          <ProductDetailClient product={product} />
        </main>
      </div>
    </div>
  );
}
