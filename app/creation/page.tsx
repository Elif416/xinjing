'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import Link from 'next/link';

import { ArtistCard, ArtistCardData } from '@/components/ArtistCard';
import { GlassCard } from '@/components/GlassCard';
import { GlassNavbar } from '@/components/GlassNavbar';
import creationData from '@/data/creation.json';
import homeData from '@/data/home.json';

type CreationStory = {
  id: string;
  title: string;
  description: string;
  image: string;
  progress?: string;
  participants?: number;
  href?: string;
  status?: string;
};

type CreationModalContent = {
  title: string;
  description?: string;
  image?: string;
  meta?: string;
};

export default function CreationPage() {
  // 复用首页的品牌与导航配置，保持视觉与信息架构一致
  const creationBrand = homeData.brand ?? { name: '心镜', en: 'HeartMirror' };
  const creationNavItems = (Array.isArray(homeData.nav) ? homeData.nav : []).map(
    (item) => ({
      ...item,
      // 当导航是锚点时，自动补全为首页路径，避免在本页失效
      href: item.href.startsWith('#') ? `/${item.href}` : item.href
    })
  );

  const creationHero = creationData.hero ?? {
    title: '接力绘画小说',
    subtitle: '',
    stories: []
  };
  const creationStories: CreationStory[] = Array.isArray(creationHero.stories)
    ? creationHero.stories
    : [];

  const creationFilters = creationData.filters ?? {
    styles: [],
    schedules: [],
    price: { min: 100, max: 800, step: 50, default: 300 }
  };

  const creationArtists: ArtistCardData[] = Array.isArray(creationData.artists)
    ? creationData.artists
    : [];

  const creationEmptyState = creationData.emptyState ?? '暂无匹配画师，换个关键词试试？';

  const [creationStyle, setCreationStyle] = useState(
    creationFilters.styles?.[0] ?? '全部'
  );
  const [creationSchedule, setCreationSchedule] = useState(
    creationFilters.schedules?.[0] ?? '全部'
  );
  const [creationPrice, setCreationPrice] = useState(
    creationFilters.price?.default ?? 300
  );
  const [creationModal, setCreationModal] = useState<CreationModalContent | null>(null);

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    if (!creationModal) {
      return;
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setCreationModal(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [creationModal]);

  const modalTransition = (shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring', damping: 26, stiffness: 260 }) as const;

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-ink">
      <div className="page-bg creation-bg">
        <GlassNavbar brand={creationBrand} items={creationNavItems} />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
          {/* 顶部 Hero：接力绘画小说 Carousel */}
          <section className="flex flex-col gap-6">
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Creation · 灵感创造
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-ink md:text-5xl">
                灵感创造：约稿中心
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-600">
                在心镜的共创大厅，捕捉每一次灵感、每一个角色与场景，完成可持续的情感叙事。
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-ink">
                  {creationHero.title}
                </h2>
                <p className="mt-2 text-sm text-slate-500">{creationHero.subtitle}</p>
              </div>
              <span className="hidden items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-1 text-xs text-slate-600 shadow-sm md:flex">
                <span className="relay-indicator" />
                正在接力中
              </span>
            </div>

            {/* Carousel 布局：横向滚动，移动端也保持轻量交互 */}
            <div className="flex gap-6 overflow-x-auto pb-2">
              {creationStories.length > 0 ? (
                creationStories.map((story) => (
                  <Link
                    key={story.id}
                    href={story.href ?? `/creation/relay/${story.id}`}
                    aria-label={`进入 ${story.title} 的接力绘画小说详情`}
                  >
                    <GlassCard className="min-w-[240px] cursor-pointer transition-transform duration-300 hover:scale-[1.02] md:min-w-[280px]">
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <span className="relay-indicator" />
                        <span>{story.status ?? '正在接力'}</span>
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70">
                        <img
                          src={story.image}
                          alt={story.title}
                          className="h-36 w-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-ink">{story.title}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          {story.description}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                        <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1">
                          {story.progress ?? '进度更新中'}
                        </span>
                        <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1">
                          {story.participants ? `${story.participants} 位参与者` : '新参与者招募中'}
                        </span>
                      </div>
                    </GlassCard>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-sm text-slate-500">
                  暂无接力故事，请稍后再来。
                </div>
              )}
            </div>
          </section>

          {/* 主体双栏：左侧筛选栏，右侧画师卡片列表 */}
          <section className="grid gap-10 md:grid-cols-[280px_minmax(0,1fr)]">
            <GlassCard
              title="筛选条件"
              description="以风格、预算与档期快速匹配合适的画师。"
              icon={<SlidersHorizontal className="h-4 w-4" />}
              className="h-fit"
            >
              {/* 筛选栏布局说明：使用纵向堆叠，移动端自动回流为顶部区域 */}
              <div className="flex flex-col gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    风格选择
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {creationFilters.styles?.length ? (
                      creationFilters.styles.map((style) => (
                        <button
                          key={style}
                          type="button"
                          aria-pressed={creationStyle === style}
                          onClick={() => setCreationStyle(style)}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            creationStyle === style
                              ? 'border-blue-400/70 bg-white text-ink shadow-sm'
                              : 'border-white/40 bg-white/60 text-slate-500 hover:text-ink'
                          }`}
                        >
                          {style}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">暂无风格选项</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    价格区间
                  </p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>￥{creationFilters.price?.min ?? 0}</span>
                    <span className="font-semibold text-ink">￥{creationPrice}+</span>
                    <span>￥{creationFilters.price?.max ?? 0}</span>
                  </div>
                  <input
                    type="range"
                    min={creationFilters.price?.min ?? 0}
                    max={creationFilters.price?.max ?? 800}
                    step={creationFilters.price?.step ?? 50}
                    value={creationPrice}
                    onChange={(event) => setCreationPrice(Number(event.target.value))}
                    className="mt-3 w-full accent-blue-500"
                  />
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    排期状态
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {creationFilters.schedules?.length ? (
                      creationFilters.schedules.map((schedule) => (
                        <button
                          key={schedule}
                          type="button"
                          aria-pressed={creationSchedule === schedule}
                          onClick={() => setCreationSchedule(schedule)}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            creationSchedule === schedule
                              ? 'border-blue-400/70 bg-white text-ink shadow-sm'
                              : 'border-white/40 bg-white/60 text-slate-500 hover:text-ink'
                          }`}
                        >
                          {schedule}
                        </button>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">暂无排期选项</span>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/40 bg-white/70 p-4 text-xs text-slate-500">
                  <p>当前筛选：</p>
                  <p className="mt-2 text-ink">{creationStyle} · {creationSchedule} · ￥{creationPrice}+</p>
                </div>
              </div>
            </GlassCard>

            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-ink">
                    画师作品网格
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    精选画师阵列，支持从灵感到成品的快速对接。
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-1 text-xs text-slate-600 shadow-sm">
                  <Sparkles className="h-3 w-3" />
                  匹配 {creationArtists.length} 位画师
                </div>
              </div>

              {creationArtists.length > 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {creationArtists.map((artist) => (
                    <ArtistCard
                      key={artist.id}
                      artist={artist}
                      onOpen={(target) =>
                        setCreationModal({
                          title: target.name,
                          description: target.note ?? target.specialty,
                          image: target.image,
                          meta: target.price
                        })
                      }
                    />
                  ))}
                </div>
              ) : (
                // 空状态逻辑：数据为空时显示提示信息，便于异常与边界处理
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-10 text-center text-sm text-slate-500">
                  {creationEmptyState}
                </div>
              )}
            </div>
          </section>
        </main>

        {/* 情绪配色器挂件：小型玻璃装置，预留功能入口 */}
        <aside className="fixed bottom-24 left-6 hidden w-40 flex-col gap-3 rounded-3xl border border-white/40 bg-white/70 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.12)] backdrop-blur-[20px] md:flex">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <span className="relay-indicator" />
            情绪配色器
          </div>
          <div className="h-16 rounded-2xl bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200" />
          <p className="text-xs text-slate-500">即将开放情感配色与调性联动。</p>
        </aside>

        {/* 右下角悬浮按钮：发布需求 */}
        <button
          type="button"
          className="fixed bottom-6 right-6 flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-white/70 text-ink shadow-[0_18px_40px_rgba(15,23,42,0.12)] backdrop-blur-[20px] transition hover:scale-[1.02]"
          aria-label="发布需求"
        >
          <Plus className="h-5 w-5" />
        </button>

        {/* 模态弹窗占位：用于展示详情，动画由 Framer Motion 提供 */}
        <AnimatePresence>
          {creationModal ? (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={modalTransition}
              onClick={() => setCreationModal(null)}
              style={{ transform: 'translateZ(0)' }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={creationModal.title}
                className="glass-card relative mx-6 w-full max-w-lg rounded-3xl p-6"
                initial={{ y: 20, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 16, opacity: 0, scale: 0.98 }}
                transition={modalTransition}
                onClick={(event) => event.stopPropagation()}
                style={{ transform: 'translateZ(0)' }}
              >
                <button
                  type="button"
                  onClick={() => setCreationModal(null)}
                  className="absolute right-4 top-4 rounded-full border border-white/40 bg-white/70 p-1 text-slate-500 hover:text-ink"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">详情预览</p>
                <h3 className="mt-3 text-2xl font-semibold text-ink">
                  {creationModal.title}
                </h3>
                {creationModal.meta ? (
                  <p className="mt-2 text-sm text-blue-600">{creationModal.meta}</p>
                ) : null}
                {creationModal.image ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/40 bg-white/70">
                    <img
                      src={creationModal.image}
                      alt={creationModal.title}
                      className="h-48 w-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : null}
                {creationModal.description ? (
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">
                    {creationModal.description}
                  </p>
                ) : null}
                <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1">
                    详情模块占位
                  </span>
                  <span className="rounded-full border border-white/50 bg-white/70 px-3 py-1">
                    后续接入 Creation 数据模型
                  </span>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
