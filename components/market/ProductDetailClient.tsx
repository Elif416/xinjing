'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  Clock3,
  MessageCircleMore,
  Minus,
  Plus,
  RefreshCw,
  ShieldCheck,
  Truck
} from 'lucide-react';
import clsx from 'clsx';

import { GlassCard } from '@/components/GlassCard';
import { formatMarketPrice, type MarketProduct } from '@/lib/marketCatalog';

import { MarketProductVisual } from './MarketProductVisual';

type ProductDetailClientProps = {
  product: MarketProduct;
};

export function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [chatPending, setChatPending] = useState(false);
  const [actionError, setActionError] = useState('');
  const [selectionMap, setSelectionMap] = useState<Record<string, string>>(() =>
    Object.fromEntries(product.specGroups.map((group) => [group.id, group.options[0]?.id ?? '']))
  );

  const selectedOptions = useMemo(
    () =>
      product.specGroups
        .map(
          (group) =>
            group.options.find((option) => option.id === selectionMap[group.id]) ?? group.options[0]
        )
        .filter(Boolean),
    [product.specGroups, selectionMap]
  );

  const unitPrice = useMemo(
    () => product.basePrice + selectedOptions.reduce((sum, option) => sum + option.priceDelta, 0),
    [product.basePrice, selectedOptions]
  );

  const totalPrice = unitPrice * quantity;
  const selectedSummary = selectedOptions.map((option) => option.label).join(' / ');

  async function handleContactSupport() {
    try {
      setChatPending(true);
      setActionError('');

      const response = await fetch(`/api/market/products/${product.slug}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const payload = (await response.json()) as { id?: number; error?: string };

      if (!response.ok || !payload.id) {
        throw new Error(payload.error || '创建客服会话失败');
      }

      router.push(`/messages/${payload.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '创建客服会话失败，请稍后重试。';
      setActionError(message);
      window.alert(message);
    } finally {
      setChatPending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
      <div className="space-y-6">
        <GlassCard className="gap-6 border-slate-200/80 bg-white/92 p-4 shadow-[0_24px_70px_rgba(15,23,42,0.08)] sm:p-6">
          <MarketProductVisual
            slug={product.slug}
            title={product.title}
            subtitle={product.subtitle}
            labels={product.badges}
            size="hero"
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <InfoChip icon={Clock3} label="预计周期" value={product.leadTime} />
            <InfoChip icon={ShieldCheck} label="服务保障" value="先确认方案再排产" />
            <InfoChip icon={Truck} label="发货说明" value="质检后包装寄出" />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Product Intro</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  {product.title}
                </h1>
                <p className="mt-3 text-sm leading-7 text-slate-700">{product.description}</p>
              </div>

              <div>
                <p className="text-sm font-semibold text-slate-950">适合场景</p>
                <div className="mt-3 flex flex-wrap gap-2">
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
            </div>

            <div className="space-y-4">
              <InfoList title="材料与工艺" items={product.materials} />
              <InfoList title="交付内容" items={product.deliverables} />
            </div>
          </div>
        </GlassCard>

        <GlassCard className="gap-5 border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Workflow</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">制作流程</h2>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-medium text-slate-700">
              下单前可先联系客服确认
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {product.serviceSteps.map((step, index) => (
              <div
                key={step}
                className="rounded-[26px] border border-slate-200 bg-slate-50/95 p-4 shadow-sm"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(15,23,42,0.18)]">
                  {index + 1}
                </div>
                <p className="mt-4 text-sm leading-6 text-slate-700">{step}</p>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="gap-5 border-slate-200/80 bg-white/92 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">FAQ</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">常见问题</h2>
          </div>

          <div className="space-y-3">
            {product.faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-[24px] border border-slate-200 bg-slate-50/95 px-5 py-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-950">{faq.question}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{faq.answer}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <div className="lg:sticky lg:top-24 lg:self-start">
        <GlassCard className="gap-6 border-slate-200/80 bg-white/94 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Selection</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">规格与价格</h2>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              余量 {product.stock}
            </span>
          </div>

          <div className="rounded-[28px] bg-slate-950 p-5 text-white shadow-[0_20px_50px_rgba(15,23,42,0.18)]">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Current Price</p>
            <div className="mt-3 flex items-end gap-3">
              <p className="text-4xl font-semibold tracking-tight text-white">
                {formatMarketPrice(totalPrice)}
              </p>
              <p className="pb-1 text-sm text-slate-300">{formatMarketPrice(unitPrice)} / 件</p>
            </div>
            <p className="mt-3 text-sm text-slate-200">
              已选：<span className="font-semibold text-white">{selectedSummary}</span> × {quantity}
            </p>
          </div>

          <div className="space-y-5">
            {product.specGroups.map((group) => (
              <div key={group.id}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{group.label}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-700">{group.helper}</p>
                  </div>
                </div>

                <div className="mt-3 grid gap-3">
                  {group.options.map((option) => {
                    const active = selectionMap[group.id] === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() =>
                          setSelectionMap((current) => ({
                            ...current,
                            [group.id]: option.id
                          }))
                        }
                        className={clsx(
                          'rounded-[24px] border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200/70',
                          active
                            ? 'border-blue-500 bg-blue-50 shadow-[0_16px_40px_rgba(59,130,246,0.12)]'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-slate-950">{option.label}</span>
                              {active ? (
                                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-blue-700 text-white">
                                  <Check className="h-3 w-3" />
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-700">{option.description}</p>
                          </div>
                          <span
                            className={clsx(
                              'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                              active ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-700'
                            )}
                          >
                            {option.priceDelta > 0 ? `+${formatMarketPrice(option.priceDelta)}` : '标准价'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/95 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-950">数量</p>
                <p className="mt-1 text-xs text-slate-700">可以先选 1 件与客服沟通，后续再追加。</p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-2 shadow-sm">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  aria-label="减少数量"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="min-w-8 text-center text-sm font-semibold text-slate-950">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(9, current + 1))}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
                  aria-label="增加数量"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void handleContactSupport()}
              disabled={chatPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_42px_rgba(15,23,42,0.16)] transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200/70 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {chatPending ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <MessageCircleMore className="h-4 w-4" />
              )}
              {chatPending ? '正在连接客服' : '联系客服'}
            </button>

            <Link
              href="/market"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200/70"
            >
              <ArrowLeft className="h-4 w-4" />
              返回心镜物
            </Link>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-slate-50/95 p-4 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-700" />
              <p>
                客服会协助你确认参考图、预算与交付周期。若你想先看更详细的材质建议，也可以直接说明用途和送礼对象。
              </p>
            </div>
            {actionError ? <p className="mt-3 text-sm text-rose-700">{actionError}</p> : null}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-slate-50/95 p-4 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-4 text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function InfoList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50/95 p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3 text-sm text-slate-700">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-slate-900" />
            <span className="leading-6">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
