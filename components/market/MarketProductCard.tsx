import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { GlassCard } from '@/components/GlassCard';
import {
  formatMarketPrice,
  getMarketProductMaxPrice,
  type MarketProduct
} from '@/lib/marketCatalog';

import { MarketProductVisual } from './MarketProductVisual';

type MarketProductCardProps = {
  product: MarketProduct;
  preloadImage?: boolean;
};

export function MarketProductCard({ product, preloadImage = false }: MarketProductCardProps) {
  const maxPrice = getMarketProductMaxPrice(product);

  return (
    <Link
      href={`/market/${product.slug}`}
      className="block h-full rounded-[32px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200/80 focus-visible:ring-offset-4"
    >
      <GlassCard className="h-full gap-5 border-slate-200/80 bg-white/92 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:border-blue-300/80 hover:shadow-[0_28px_80px_rgba(59,130,246,0.14)]">
        <MarketProductVisual
          slug={product.slug}
          title={product.title}
          subtitle={product.subtitle}
          imagePath={product.imagePath}
          labels={product.badges}
          preload={preloadImage}
        />

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950">{product.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">{product.summary}</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              {product.leadTime}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {product.scenes.map((scene) => (
              <span
                key={scene}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
              >
                {scene}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-200/80 pt-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Price Range</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {formatMarketPrice(product.basePrice)}
              <span className="ml-2 text-sm font-medium text-slate-600">起</span>
            </p>
            <p className="mt-1 text-xs text-slate-600">高配约 {formatMarketPrice(maxPrice)}</p>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-950 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800">
            查看详情
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </GlassCard>
    </Link>
  );
}
