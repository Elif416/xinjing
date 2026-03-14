import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { GlassCard } from '@/components/GlassCard';
import { formatMarketPrice, getMarketProductMaxPrice, type MarketProduct } from '@/lib/marketCatalog';

import { MarketProductVisual } from './MarketProductVisual';

type MarketProductCardProps = {
  product: MarketProduct;
};

export function MarketProductCard({ product }: MarketProductCardProps) {
  const maxPrice = getMarketProductMaxPrice(product);

  return (
    <Link href={`/market/${product.slug}`} className="block h-full">
      <GlassCard className="h-full gap-5 border-white/55 p-4 transition duration-300 hover:-translate-y-1 hover:border-blue-200/80 hover:shadow-[0_24px_70px_rgba(59,130,246,0.18)]">
        <MarketProductVisual
          slug={product.slug}
          title={product.title}
          subtitle={product.subtitle}
          labels={product.badges}
        />

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{product.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{product.summary}</p>
            </div>
            <span className="rounded-full border border-white/60 bg-white/75 px-3 py-1 text-xs text-slate-500">
              {product.leadTime}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {product.scenes.map((scene) => (
              <span
                key={scene}
                className="rounded-full border border-blue-100 bg-blue-50/70 px-3 py-1 text-xs text-blue-600"
              >
                {scene}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 border-t border-white/50 pt-4">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Price Range</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">
              {formatMarketPrice(product.basePrice)}
              <span className="ml-2 text-sm font-medium text-slate-400">起</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">高配约 {formatMarketPrice(maxPrice)}</p>
          </div>

          <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-ink shadow-sm transition hover:border-blue-200/80 hover:text-blue-600">
            查看详情
            <ChevronRight className="h-4 w-4" />
          </span>
        </div>
      </GlassCard>
    </Link>
  );
}
