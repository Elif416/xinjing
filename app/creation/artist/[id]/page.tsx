'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { ArtistChatDrawer } from '@/components/ArtistChatDrawer';
import { CommissionFormModal } from '@/components/CommissionFormModal';
import { GlassCard } from '@/components/GlassCard';
import { GlassNavbar } from '@/components/GlassNavbar';
import homeData from '@/data/home.json';
import type { ArtistDetailData, ArtistPortfolioItem } from '@/lib/artistTypes';

export default function ArtistDetailPage() {
  const params = useParams<{ id: string }>();
  const shouldReduceMotion = useReducedMotion();
  const [artist, setArtist] = useState<ArtistDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedArtwork, setSelectedArtwork] = useState<ArtistPortfolioItem | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const artistNavItems = useMemo(() => {
    const items = Array.isArray(homeData.nav) ? homeData.nav : [];
    return items.map((item) => ({
      ...item,
      href: item.href.startsWith('#') ? `/${item.href}` : item.href
    }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadArtist() {
      setIsLoading(true);
      setLoadError('');
      setSelectedArtwork(null);

      try {
        const response = await fetch(`/api/artists/${params.id}`, {
          cache: 'no-store',
          signal: controller.signal
        });

        if (response.status === 404) {
          setArtist(null);
          return;
        }

        if (!response.ok) {
          throw new Error('画师详情加载失败');
        }

        const payload = (await response.json()) as ArtistDetailData;
        setArtist(payload);
      } catch (error) {
        if ((error as Error).name === 'AbortError') {
          return;
        }

        setArtist(null);
        setLoadError(
          error instanceof Error ? error.message : '画师详情加载失败，请稍后重试。'
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    if (params.id) {
      void loadArtist();
    }

    return () => controller.abort();
  }, [params.id]);

  const gridVariants = {
    hidden: { opacity: 1 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.08,
        delayChildren: shouldReduceMotion ? 0 : 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 24 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: shouldReduceMotion ? 0 : 0.6, ease: 'easeOut' }
    }
  } as const;

  const sizeClassMap: Record<string, string> = {
    large: 'md:col-span-2 md:row-span-2',
    tall: 'md:row-span-2',
    wide: 'md:col-span-2',
    normal: ''
  };

  if (isLoading) {
    return (
      <PageShell navItems={artistNavItems}>
        <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-6 py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Artist · 画师详情</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">正在加载画师档案</h1>
          <p className="text-sm text-slate-500">正在从数据库同步基础资料与作品集，请稍候。</p>
        </main>
      </PageShell>
    );
  }

  if (!artist) {
    return (
      <PageShell navItems={artistNavItems}>
        <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-6 py-24">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Artist · 画师详情</p>
          <h1 className="text-3xl font-semibold tracking-tight text-ink">未找到对应的画师</h1>
          <p className="text-sm text-slate-500">
            {loadError || '画师信息可能已调整，请返回约稿中心选择其他创作者。'}
          </p>
          <Link href="/creation" className="glass-button glass-button--ghost">
            返回约稿中心
          </Link>
        </main>
      </PageShell>
    );
  }

  return (
    <PageShell navItems={artistNavItems}>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-28 pt-16">
        <GlassCard className="flex flex-col gap-6 p-8 md:flex-row md:items-center md:gap-10 md:p-10">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/70">
            {artist.heroImage ? (
              <img
                src={artist.heroImage}
                alt={artist.name}
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className="text-lg font-semibold text-ink">{artist.name.slice(0, 1)}</span>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">画师档案</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-ink md:text-4xl">
              {artist.name}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{artist.subtitle}</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">{artist.concept}</p>
            <p className="mt-3 text-sm text-slate-500">{artist.intro}</p>
            <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
              {artist.stats.map((stat) => (
                <span
                  key={stat.label}
                  className="rounded-full border border-white/50 bg-white/70 px-4 py-1"
                >
                  {stat.label} {stat.value}
                </span>
              ))}
              {artist.startingPrice ? (
                <span className="rounded-full border border-white/50 bg-white/70 px-4 py-1 text-ink">
                  起步价 {artist.startingPrice}
                </span>
              ) : null}
            </div>
            {artist.keywords.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {artist.keywords.slice(0, 8).map((keyword) => (
                  <span
                    key={keyword}
                    className="rounded-full border border-blue-100 bg-blue-50/80 px-3 py-1 text-xs text-blue-700"
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </GlassCard>

        <section className="grid gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">作品展示矩阵</h2>
              <p className="mt-2 text-sm text-slate-500">
                作品数据已替换为数据库中的真实帖子与附件内容，点击可查看大图预览。
              </p>
            </div>

            {artist.portfolio.length > 0 ? (
              <motion.div
                className="grid auto-rows-[140px] gap-4 sm:auto-rows-[160px] md:grid-cols-3"
                variants={gridVariants}
                initial="hidden"
                animate="show"
              >
                {artist.portfolio.map((item) => (
                  <motion.button
                    key={item.id}
                    type="button"
                    variants={itemVariants}
                    className={`group relative overflow-hidden rounded-2xl border border-white/40 bg-white/70 text-left ${
                      sizeClassMap[item.size ?? 'normal']
                    }`}
                    onClick={() => setSelectedArtwork(item)}
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                      decoding="async"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-3 text-xs opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <span className="font-semibold text-ink">{item.title}</span>
                      <span className="rounded-full border border-white/60 bg-white/80 px-2 py-1 text-slate-600">
                        ♥ {item.favoriteCount}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
                当前画师在数据库中还没有可展示的作品附件。
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-ink">约稿信息</h2>
              <p className="mt-2 text-sm text-slate-500">优先展示数据库中的真实价格、状态与方案信息。</p>
            </div>

            <GlassCard className="gap-3 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-ink">起约价格</h3>
                <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs text-ink">
                  {artist.startingPrice}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                当前取自数据库中的 `artists.startingprice` 字段，可作为沟通预算参考。
              </p>
            </GlassCard>

            <GlassCard className="gap-3 p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-ink">创作状态</h3>
                <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs text-ink">
                  {artist.activity.progress}%
                </span>
              </div>
              <p className="text-sm text-slate-500">{artist.activity.eta}</p>
            </GlassCard>

            {artist.services.length > 0 ? (
              artist.services.map((service) => (
                <GlassCard key={service.id} className="gap-3 p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-semibold text-ink">{service.title}</h3>
                    <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs text-ink">
                      {service.price}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500">{service.description}</p>
                  <button type="button" className="glass-button glass-button--ghost w-fit text-xs">
                    选择
                  </button>
                </GlassCard>
              ))
            ) : (
              <GlassCard className="gap-3 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-ink">约稿方案</h3>
                  <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1 text-xs text-slate-500">
                    暂缺
                  </span>
                </div>
                <p className="text-sm text-slate-500">
                  当前数据库中的 `commissionplans` 仍为空，建议先通过私聊沟通需求与报价。
                </p>
              </GlassCard>
            )}
          </aside>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/40 bg-white/70 backdrop-blur-[24px]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>{artist.activity.label}</span>
              <span>{artist.activity.eta}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/70">
              <span
                className="block h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                style={{ width: `${artist.activity.progress}%` }}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsFormOpen(true)}
              className="rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(37,99,235,0.35)]"
            >
              立即下单
            </button>
            <button
              type="button"
              onClick={() => setIsChatOpen(true)}
              className="glass-button glass-button--ghost text-sm"
            >
              发起私聊
            </button>
          </div>
        </div>
      </div>

      <CommissionFormModal
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={() => setIsFormOpen(false)}
      />

      <AnimatePresence>
        {selectedArtwork ? (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedArtwork(null)}
          >
            <motion.div
              className="glass-card relative mx-6 w-full max-w-3xl rounded-3xl p-6"
              initial={{ y: 20, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 16, opacity: 0, scale: 0.98 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.4 }}
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedArtwork(null)}
                className="absolute right-4 top-4 rounded-full border border-white/40 bg-white/70 p-1 text-slate-500 hover:text-ink"
                aria-label="关闭"
              >
                <X className="h-4 w-4" />
              </button>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">作品预览</p>
              <h3 className="mt-2 text-xl font-semibold text-ink">{selectedArtwork.title}</h3>
              <div className="mt-4 overflow-hidden rounded-2xl border border-white/40 bg-white/70">
                <img
                  src={selectedArtwork.image}
                  alt={selectedArtwork.title}
                  className="h-72 w-full object-cover md:h-96"
                  loading="lazy"
                  decoding="async"
                />
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ArtistChatDrawer
        open={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        artist={{
          name: artist.name,
          avatar: artist.avatar,
          contextLabel: `${artist.name} · ${artist.subtitle || '作品沟通'}`
        }}
      />
    </PageShell>
  );
}

function PageShell({
  children,
  navItems
}: {
  children: React.ReactNode;
  navItems: { label: string; href: string }[];
}) {
  return (
    <div className="min-h-screen bg-[#f5f7ff] text-ink">
      <div className="page-bg artist-bg">
        <GlassNavbar
          brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }}
          items={navItems}
        />
        {children}
      </div>
    </div>
  );
}
