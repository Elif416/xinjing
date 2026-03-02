'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus, Search, Sparkles, X } from 'lucide-react';

import { GlassCard } from '@/components/GlassCard';
import { GlassNavbar } from '@/components/GlassNavbar';
import { ResonancePin, type ResonancePinColor } from '@/components/resonance/ResonancePin';
import homeData from '@/data/home.json';
import resonanceData from '@/data/resonance.json';

export type ResonancePinData = {
  id: string;
  x: number;
  y: number;
  color: ResonancePinColor;
  delay?: number;
  title: string;
  text: string;
  image: string;
};

type ResonanceFilterOption = {
  id: ResonancePinColor;
  label: string;
  swatch: string;
};

const resonanceFilters: ResonanceFilterOption[] = [
  {
    id: 'warm',
    label: '欢愉',
    swatch: 'bg-amber-300'
  },
  {
    id: 'cool',
    label: '忧郁',
    swatch: 'bg-blue-400'
  },
  {
    id: 'calm',
    label: '宁静',
    swatch: 'bg-purple-400'
  }
];

export default function ResonancePage() {
  // 复用首页品牌与导航结构，保持信息架构一致
  const resonanceBrand = homeData.brand ?? { name: '心镜', en: 'HeartMirror' };
  const resonanceNavItems = (Array.isArray(homeData.nav) ? homeData.nav : []).map(
    (item) => ({
      ...item,
      href: item.href.startsWith('#') ? `/${item.href}` : item.href
    })
  );

  const resonancePins: ResonancePinData[] = Array.isArray(resonanceData.pins)
    ? resonanceData.pins
    : [];

  const resonanceStatsBase = resonanceData.stats?.base ?? 1423012;
  const resonanceStatsLabel = resonanceData.stats?.label ?? '当前共鸣记忆';
  const resonanceSearchPlaceholder =
    resonanceData.searchPlaceholder ?? '搜寻那个让你共鸣的情感频段...';

  const [resonanceQuery, setResonanceQuery] = useState('');
  const [resonanceFilter, setResonanceFilter] = useState<ResonancePinColor | null>(null);
  const [resonanceSelected, setResonanceSelected] = useState<ResonancePinData | null>(null);
  const [resonanceInjected, setResonanceInjected] = useState<Record<string, boolean>>({});
  const [resonanceCount, setResonanceCount] = useState(resonanceStatsBase);

  const shouldReduceMotion = useReducedMotion();

  // 数字跳动动画：仅在客户端定时更新，避免复杂计算
  useEffect(() => {
    const timer = window.setInterval(() => {
      setResonanceCount((prev) => prev + Math.floor(Math.random() * 18) + 6);
    }, 3200);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!resonanceSelected) {
      return;
    }

    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setResonanceSelected(null);
      }
    };

    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [resonanceSelected]);

  const resonanceFilteredPins = useMemo(() => {
    const query = resonanceQuery.trim().toLowerCase();
    return resonancePins.filter((pin) => {
      if (resonanceFilter && pin.color !== resonanceFilter) {
        return false;
      }
      if (!query) {
        return true;
      }
      const content = `${pin.title} ${pin.text}`.toLowerCase();
      return content.includes(query);
    });
  }, [resonancePins, resonanceFilter, resonanceQuery]);

  const formattedCount = useMemo(() => {
    return new Intl.NumberFormat('zh-CN').format(resonanceCount);
  }, [resonanceCount]);

  const modalTransition = (shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring', damping: 26, stiffness: 240 }) as const;

  const selectedIsInjected = resonanceSelected
    ? Boolean(resonanceInjected[resonanceSelected.id])
    : false;

  const handleResonanceInject = () => {
    if (!resonanceSelected) {
      return;
    }

    setResonanceInjected((prev) => ({
      ...prev,
      [resonanceSelected.id]: true
    }));

    if (!resonanceInjected[resonanceSelected.id]) {
      setResonanceCount((prev) => prev + 1);
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="page-bg resonance-bg">
        <GlassNavbar brand={resonanceBrand} items={resonanceNavItems} />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
          {/* 全屏底图：抽象点阵世界地图作为情感共鸣底座 */}
          <section className="relative">
            <div className="relative min-h-[520px] overflow-hidden rounded-[36px] border border-white/10 bg-[#0a1024]/70 shadow-[0_40px_120px_rgba(6,10,25,0.55)] backdrop-blur-[10px]">
              <img
                src="/mock-world.svg"
                alt="共鸣地图底图"
                className="absolute inset-0 h-full w-full object-cover opacity-70"
                loading="lazy"
                decoding="async"
              />
              <div className="resonance-map-overlay absolute inset-0" />

              {/* 发光点层：使用绝对定位 + transform 动画，避免高成本计算 */}
              <div className="absolute inset-0">
                {resonanceFilteredPins.map((pin) => (
                  <ResonancePin
                    key={pin.id}
                    id={pin.id}
                    x={pin.x}
                    y={pin.y}
                    color={pin.color}
                    delay={pin.delay}
                    label={pin.title}
                    onSelect={() => setResonanceSelected(pin)}
                  />
                ))}
              </div>

              <div className="absolute bottom-8 left-8">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-200/70">
                  Resonance Map
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  时空共鸣 · 集体记忆地图
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100/70">
                  让被隐藏的情感在夜空中相遇，构建一张柔软却可追溯的共鸣网络。
                </p>
              </div>
            </div>
          </section>
        </main>

        {/* 左上角 Floating HUD：搜索与情感色带过滤 */}
        <aside className="fixed left-6 top-24 z-40 hidden w-72 flex-col gap-4 md:flex">
          <GlassCard className="glass-card--dark gap-4 border-white/10">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-blue-100/70">
              <Sparkles className="h-3 w-3" />
              情感频段
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-blue-100/80">
              <Search className="h-3.5 w-3.5 text-blue-200/70" />
              <input
                value={resonanceQuery}
                onChange={(event) => setResonanceQuery(event.target.value)}
                placeholder={resonanceSearchPlaceholder}
                className="w-full bg-transparent text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              {resonanceFilters.map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  onClick={() =>
                    setResonanceFilter((prev) => (prev === filter.id ? null : filter.id))
                  }
                  className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] uppercase tracking-[0.2em] text-blue-100/80 transition ${
                    resonanceFilter === filter.id
                      ? 'border-white/60 bg-white/20'
                      : 'border-white/20 bg-white/5 hover:border-white/40'
                  }`}
                  aria-pressed={resonanceFilter === filter.id}
                  aria-label={filter.label}
                >
                  <span className={`h-3 w-3 rounded-full ${filter.swatch}`} />
                </button>
              ))}
            </div>
          </GlassCard>
        </aside>

        {/* 右下角全局统计板 */}
        <aside className="fixed bottom-24 right-6 z-40 hidden md:block">
          <GlassCard className="glass-card--dark w-56 gap-3 border-white/10">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-100/60">
              Resonance Stats
            </p>
            <p className="text-2xl font-semibold text-white">{formattedCount}</p>
            <p className="text-xs text-blue-100/70">{resonanceStatsLabel}</p>
          </GlassCard>
        </aside>

        {/* 底部中央 CTA */}
        <button
          type="button"
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 px-8 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.45)] transition hover:scale-[1.01]"
        >
          <Plus className="h-4 w-4" />
          + 添加我的记忆坐标
        </button>

        {/* 记忆胶囊弹窗：点击发光点后出现 */}
        <AnimatePresence>
          {resonanceSelected ? (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#050712]/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={modalTransition}
              onClick={() => setResonanceSelected(null)}
              style={{ transform: 'translateZ(0)' }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={resonanceSelected.title}
                className="glass-card glass-card--dark relative mx-6 w-full max-w-lg rounded-3xl p-6 text-blue-50"
                initial={{ y: 20, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 16, opacity: 0, scale: 0.98 }}
                transition={modalTransition}
                onClick={(event) => event.stopPropagation()}
                style={{ transform: 'translateZ(0)' }}
              >
                <button
                  type="button"
                  onClick={() => setResonanceSelected(null)}
                  className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-1 text-blue-100/70 hover:text-white"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>

                <p className="text-xs uppercase tracking-[0.2em] text-blue-100/70">
                  {resonanceSelected.title}
                </p>
                <div className="mt-4 overflow-hidden rounded-2xl border border-white/15 bg-white/5">
                  <img
                    src={resonanceSelected.image}
                    alt="记忆画面"
                    className="h-48 w-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-blue-100/80">
                  {resonanceSelected.text}
                </p>

                <button
                  type="button"
                  onClick={handleResonanceInject}
                  className={`mt-6 flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-sm font-semibold transition ${
                    selectedIsInjected
                      ? 'bg-white/15 text-blue-100/80'
                      : 'bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 text-white'
                  }`}
                >
                  {selectedIsInjected ? '已点亮 · +1' : '注入共鸣'}
                </button>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
