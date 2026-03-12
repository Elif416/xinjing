'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'framer-motion';
import { MapPin, Navigation, Plus, Search, Sparkles, X } from 'lucide-react';

import { GlassCard } from '@/components/GlassCard';
import { GlassNavbar } from '@/components/GlassNavbar';
import { loadAmap } from '@/components/resonance/amap';
import { ResonanceMap } from '@/components/resonance/ResonanceMap';
import homeData from '@/data/home.json';
import type { ResonancePost } from '@/lib/resonanceTypes';

type GeoResult = {
  address: string;
  township: string;
  label: string;
  lng: number;
  lat: number;
};

const AMAP_PLUGINS = ['AMap.Geocoder', 'AMap.Scale'];
const DEFAULT_STATS_LABEL = '已发布共鸣记忆';

function roundCoord(value: number, decimals = 3) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function extractLocationValue(value: unknown) {
  if (typeof value === 'string') {
    return value.trim();
  }
  return '';
}

async function geocodeAddress(address: string): Promise<GeoResult> {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY ?? '';
  const security = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE ?? '';
  const AMap = (await loadAmap({ key, security, plugins: AMAP_PLUGINS })) as any;

  const geocoder = new AMap.Geocoder({
    extensions: 'all'
  });

  return new Promise((resolve, reject) => {
    geocoder.getLocation(address, (status: string, result: any) => {
      if (status !== 'complete' || !result?.geocodes?.length) {
        reject(
          new Error(
            '未能定位到该地址，请尝试更精确的镇/街道名称。'
          )
        );
        return;
      }

      const geo = result.geocodes[0];
      const location = geo.location;
      const lng = roundCoord(
        typeof location?.getLng === 'function' ? location.getLng() : Number(location?.lng)
      );
      const lat = roundCoord(
        typeof location?.getLat === 'function' ? location.getLat() : Number(location?.lat)
      );

      if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
        reject(
          new Error('定位坐标异常，请更换地址描述。')
        );
        return;
      }

      const component = geo.addressComponent ?? {};
      const province = extractLocationValue(component.province);
      const city = extractLocationValue(component.city || component.province);
      const district = extractLocationValue(component.district);
      const township = extractLocationValue(component.township || component.towncode || component.street);

      const label =
        [province, city, district, township].filter(Boolean).join('') ||
        geo.formattedAddress ||
        address;

      resolve({
        address: geo.formattedAddress || address,
        township: township || district,
        label,
        lng,
        lat
      });
    });
  });
}

export default function ResonancePage() {
  const resonanceBrand = homeData.brand ?? { name: '心镜', en: 'HeartMirror' };
  const resonanceNavItems = (Array.isArray(homeData.nav) ? homeData.nav : []).map((item) => ({
    ...item,
    href: item.href.startsWith('#') ? `/${item.href}` : item.href
  }));

  const [posts, setPosts] = useState<ResonancePost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedPost, setSelectedPost] = useState<ResonancePost | null>(null);
  const [query, setQuery] = useState('');

  const [addressInput, setAddressInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [geoResult, setGeoResult] = useState<GeoResult | null>(null);
  const [locating, setLocating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState('');

  const shouldReduceMotion = useReducedMotion();
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      setLoadingPosts(true);
      setLoadError('');

      try {
        const response = await fetch('/api/resonance/posts', { cache: 'no-store' });
        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error || '共鸣地图数据加载失败');
        }

        const payload = (await response.json()) as { items?: ResonancePost[] };
        if (!cancelled) {
          setPosts(payload.items ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : '共鸣地图数据加载失败'
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingPosts(false);
        }
      }
    }

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      return posts;
    }

    return posts.filter((post) => {
      const content = `${post.title} ${post.content} ${post.address} ${post.township}`.toLowerCase();
      return content.includes(trimmed);
    });
  }, [posts, query]);

  const totalCount = posts.length;
  const filteredCount = filteredPosts.length;

  const modalTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring', damping: 26, stiffness: 240 };

  const handleLocate = async () => {
    const input = addressInput.trim();
    if (!input) {
      setFormError('请输入要定位的镇/街道地址。');
      return;
    }

    setFormError('');
    setLocating(true);

    try {
      const result = await geocodeAddress(input);
      setGeoResult(result);
    } catch (error) {
      setGeoResult(null);
      setFormError(
        error instanceof Error
          ? error.message
          : '定位失败，请稍后再试。'
      );
    } finally {
      setLocating(false);
    }
  };

  const handlePublish = async () => {
    if (!geoResult) {
      setFormError('请先完成地址定位，再发布记忆。');
      return;
    }

    if (!contentInput.trim()) {
      setFormError('请填写要发布的记忆内容。');
      return;
    }

    setFormError('');
    setPublishing(true);

    try {
      const response = await fetch('/api/resonance/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: titleInput.trim(),
          content: contentInput.trim(),
          address: geoResult.address,
          township: geoResult.township,
          lng: geoResult.lng,
          lat: geoResult.lat
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || '发布失败，请稍后重试。');
      }

      const created = (await response.json()) as ResonancePost;
      setPosts((prev) => [created, ...prev]);
      setSelectedPost(created);
      setTitleInput('');
      setContentInput('');
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : '发布失败，请稍后重试。'
      );
    } finally {
      setPublishing(false);
    }
  };

  const focus = geoResult ? { lng: geoResult.lng, lat: geoResult.lat, label: geoResult.label } : null;

  const formBody = (
    <>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-blue-100/70">
        <MapPin className="h-3 w-3" />
        发布记忆坐标
      </div>

      <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-blue-100/80">
        <input
          ref={addressInputRef}
          value={addressInput}
          onChange={(event) => {
            setAddressInput(event.target.value);
            if (geoResult) {
              setGeoResult(null);
            }
          }}
          placeholder="输入精确到镇的地址"
          className="w-full bg-transparent text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleLocate}
          className="flex items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-blue-100/80 transition hover:border-white/40"
          disabled={locating}
        >
          <Navigation className="h-3 w-3" />
          {locating ? '定位中' : '定位'}
        </button>
      </div>

      {geoResult ? (
        <p className="text-xs text-blue-100/70">
          已定位：{geoResult.label}（坐标已降精度到镇级）
        </p>
      ) : (
        <p className="text-xs text-blue-100/60">
          请先定位地址，地图将自动移动到该镇。
        </p>
      )}

      <input
        value={titleInput}
        onChange={(event) => setTitleInput(event.target.value)}
        placeholder="记忆标题（可选）"
        className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
      />

      <textarea
        value={contentInput}
        onChange={(event) => setContentInput(event.target.value)}
        placeholder="写下想贴在地图上的记忆片段..."
        rows={4}
        className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
      />

      {formError ? <p className="text-xs text-red-200">{formError}</p> : null}

      <button
        type="button"
        onClick={handlePublish}
        disabled={publishing}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 px-4 py-3 text-xs font-semibold text-white shadow-[0_16px_40px_rgba(59,130,246,0.35)] transition hover:scale-[1.01] disabled:opacity-60"
      >
        {publishing ? '发布中...' : '发布到地图'}
      </button>
    </>
  );

  return (
    <div className="min-h-screen text-slate-100">
      <div className="page-bg resonance-bg">
        <GlassNavbar brand={resonanceBrand} items={resonanceNavItems} />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-16">
          <section className="relative">
            <div className="relative min-h-[560px] overflow-hidden rounded-[36px] border border-white/10 bg-[#0a1024]/70 shadow-[0_40px_120px_rgba(6,10,25,0.55)] backdrop-blur-[10px]">
              <div className="absolute inset-0">
                <ResonanceMap posts={filteredPosts} focus={focus} onSelect={setSelectedPost} />
              </div>
              <div className="resonance-map-overlay absolute inset-0" />

              <div className="absolute bottom-8 left-8 z-10">
                <p className="text-xs uppercase tracking-[0.3em] text-blue-200/70">Resonance Map</p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  时空共鸣 · 集体记忆地图
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100/70">
                  使用低精度现实地图呈现每一段记忆坐标，让共鸣停留在镇级尺度之上。
                </p>
              </div>
            </div>
          </section>

          <div ref={formRef} className="flex flex-col gap-4 md:hidden">
            <GlassCard className="glass-card--dark gap-4 border-white/10">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-blue-100/70">
                <Sparkles className="h-3 w-3" />
                共鸣检索
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-blue-100/80">
                <Search className="h-3.5 w-3.5 text-blue-200/70" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜索地点、记忆或关键词..."
                  className="w-full bg-transparent text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
                />
              </div>
              <div className="text-xs text-blue-100/70">
                {loadingPosts
                  ? '正在加载地图记忆...'
                  : `当前展示 ${filteredCount} / ${totalCount} 条共鸣记录`}
              </div>
            </GlassCard>

            <GlassCard className="glass-card--dark gap-4 border-white/10">{formBody}</GlassCard>
          </div>

          {loadError ? (
            <GlassCard className="glass-card--dark border-red-500/40 text-red-100">
              {loadError}
            </GlassCard>
          ) : null}
        </main>

        <aside className="fixed left-6 top-24 z-40 hidden w-80 flex-col gap-4 md:flex">
          <GlassCard className="glass-card--dark gap-4 border-white/10">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-blue-100/70">
              <Sparkles className="h-3 w-3" />
              共鸣检索
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-blue-100/80">
              <Search className="h-3.5 w-3.5 text-blue-200/70" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索地点、记忆或关键词..."
                className="w-full bg-transparent text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
              />
            </div>
            <div className="text-xs text-blue-100/70">
              {loadingPosts
                ? '正在加载地图记忆...'
                : `当前展示 ${filteredCount} / ${totalCount} 条共鸣记录`}
            </div>
          </GlassCard>

          <GlassCard className="glass-card--dark gap-4 border-white/10">{formBody}</GlassCard>
        </aside>

        <aside className="fixed bottom-24 right-6 z-40 hidden md:block">
          <GlassCard className="glass-card--dark w-56 gap-3 border-white/10">
            <p className="text-xs uppercase tracking-[0.2em] text-blue-100/60">Resonance Stats</p>
            <p className="text-2xl font-semibold text-white">{totalCount}</p>
            <p className="text-xs text-blue-100/70">{DEFAULT_STATS_LABEL}</p>
          </GlassCard>
        </aside>

        <button
          type="button"
          onClick={() => {
            formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            addressInputRef.current?.focus();
          }}
          className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 px-8 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.45)] transition hover:scale-[1.01]"
        >
          <Plus className="h-4 w-4" />
          + 添加我的记忆坐标
        </button>

        <AnimatePresence>
          {selectedPost ? (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center bg-[#050712]/70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={modalTransition}
              onClick={() => setSelectedPost(null)}
              style={{ transform: 'translateZ(0)' }}
            >
              <motion.div
                role="dialog"
                aria-modal="true"
                aria-label={selectedPost.title || selectedPost.address}
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
                  onClick={() => setSelectedPost(null)}
                  className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-1 text-blue-100/70 hover:text-white"
                  aria-label="关闭"
                >
                  <X className="h-4 w-4" />
                </button>

                <p className="text-xs uppercase tracking-[0.2em] text-blue-100/70">
                  {selectedPost.title || '共鸣记忆'}
                </p>
                <p className="mt-3 text-sm text-blue-100/70">{selectedPost.address}</p>
                <p className="mt-4 text-sm leading-relaxed text-blue-100/85">
                  {selectedPost.content}
                </p>
                {selectedPost.township ? (
                  <p className="mt-4 text-xs text-blue-100/60">
                    定位镇域：{selectedPost.township}
                  </p>
                ) : null}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}
