import { GlassCard } from '@/components/GlassCard';
import { GlassNavbar } from '@/components/GlassNavbar';
import { MarketProductCard } from '@/components/market/MarketProductCard';
import homeData from '@/data/home.json';
import { getMarketProducts } from '@/lib/marketCatalog';

export default function MarketPage() {
  const navItems = (Array.isArray(homeData.nav) ? homeData.nav : []).map((item) => ({
    ...item,
    href: item.href.startsWith('#') ? `/${item.href}` : item.href
  }));
  const products = getMarketProducts();

  return (
    <div className="min-h-screen bg-[#f3f6fb] text-slate-950">
      <div className="page-bg activation-bg min-h-screen">
        <GlassNavbar brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }} items={navItems} />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-24 pt-12 sm:pt-16">
          <section className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
            <GlassCard className="gap-6 border-slate-200/80 bg-white/92 p-8 shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">HeartMirror Goods</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                  心镜 物
                </h1>
                <p className="mt-4 max-w-2xl text-base leading-8 text-slate-700">
                  把数字情绪、角色设定与纪念故事延伸成可以长期保存的实体作品。你可以先挑选商品，再进入详情页调整规格与预算，最后直接和客服沟通细节。
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <MetricCard label="当前品类" value="5 项" note="覆盖周边 / 收藏 / 礼物" />
                <MetricCard label="沟通方式" value="在线私聊" note="可直接跳转消息页" />
                <MetricCard label="确认机制" value="先确认再排产" note="减少返工和误差" />
              </div>
            </GlassCard>

            <GlassCard className="gap-5 border-slate-200/80 bg-white/92 p-6 shadow-[0_28px_80px_rgba(15,23,42,0.08)]">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">How It Works</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  下单前建议这样做
                </h2>
              </div>

              <div className="space-y-3">
                {[
                  '先挑选最接近需求的商品品类，确认材质方向。',
                  '进入详情页选择规格，快速看到预算变化。',
                  '若参考图或故事较复杂，优先点击“联系客服”沟通。'
                ].map((item, index) => (
                  <div
                    key={item}
                    className="rounded-[24px] border border-slate-200 bg-slate-50/95 px-4 py-4 text-sm leading-6 text-slate-700 shadow-sm"
                  >
                    <span className="mr-3 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
                      {index + 1}
                    </span>
                    {item}
                  </div>
                ))}
              </div>
            </GlassCard>
          </section>

          <section className="space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Catalog</p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  可定制品类
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-700">
                每张卡片都可以直接进入详情页，查看规格、价格区间与制作流程。
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <MarketProductCard key={product.slug} product={product} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  note
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/95 p-4 shadow-sm">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{note}</p>
    </div>
  );
}
