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
const DEFAULT_STATS_LABEL = '\u5df2\u53d1\u5e03\u5171\u9e23\u8bb0\u5fc6';

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
            '\u672a\u80fd\u5b9a\u4f4d\u5230\u8be5\u5730\u5740\uff0c\u8bf7\u5c1d\u8bd5\u66f4\u7cbe\u786e\u7684\u9547\u002f\u8857\u9053\u540d\u79f0\u3002'
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
          new Error('\u5b9a\u4f4d\u5750\u6807\u5f02\u5e38\uff0c\u8bf7\u66f4\u6362\u5730\u5740\u63cf\u8ff0\u3002')
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
  const resonanceBrand = homeData.brand ?? { name: '\u5fc3\u955c', en: 'HeartMirror' };
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
          throw new Error(payload.error || '\u5171\u9e23\u5730\u56fe\u6570\u636e\u52a0\u8f7d\u5931\u8d25');
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
              : '\u5171\u9e23\u5730\u56fe\u6570\u636e\u52a0\u8f7d\u5931\u8d25'
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
      setFormError('\u8bf7\u8f93\u5165\u8981\u5b9a\u4f4d\u7684\u9547\u002f\u8857\u9053\u5730\u5740\u3002');
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
          : '\u5b9a\u4f4d\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u518d\u8bd5\u3002'
      );
    } finally {
      setLocating(false);
    }
  };

  const handlePublish = async () => {
    if (!geoResult) {
      setFormError('\u8bf7\u5148\u5b8c\u6210\u5730\u5740\u5b9a\u4f4d\uff0c\u518d\u53d1\u5e03\u8bb0\u5fc6\u3002');
      return;
    }

    if (!contentInput.trim()) {
      setFormError('\u8bf7\u586b\u5199\u8981\u53d1\u5e03\u7684\u8bb0\u5fc6\u5185\u5bb9\u3002');
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
        throw new Error(payload.error || '\u53d1\u5e03\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002');
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
          : '\u53d1\u5e03\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002'
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
        \u53d1\u5e03\u8bb0\u5fc6\u5750\u6807
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
          placeholder="\u8f93\u5165\u7cbe\u786e\u5230\u9547\u7684\u5730\u5740"
          className="w-full bg-transparent text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
        />
        <button
          type="button"
          onClick={handleLocate}
          className="flex items-center gap-1 rounded-full border border-white/20 px-2 py-1 text-[10px] uppercase tracking-[0.2em] text-blue-100/80 transition hover:border-white/40"
          disabled={locating}
        >
          <Navigation className="h-3 w-3" />
          {locating ? '\u5b9a\u4f4d\u4e2d' : '\u5b9a\u4f4d'}
        </button>
      </div>

      {geoResult ? (
        <p className="text-xs text-blue-100/70">
          \u5df2\u5b9a\u4f4d\uff1a{geoResult.label}\uff08\u5750\u6807\u5df2\u964d\u7cbe\u5ea6\u5230\u9547\u7ea7\uff09
        </p>
      ) : (
        <p className="text-xs text-blue-100/60">
          \u8bf7\u5148\u5b9a\u4f4d\u5730\u5740\uff0c\u5730\u56fe\u5c06\u81ea\u52a8\u79fb\u52a8\u5230\u8be5\u9547\u3002
        </p>
      )}

      <input
        value={titleInput}
        onChange={(event) => setTitleInput(event.target.value)}
        placeholder="\u8bb0\u5fc6\u6807\u9898\uff08\u53ef\u9009\uff09"
        className="rounded-2xl border border-white/15 bg-white/5 px-4 py-2 text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
      />

      <textarea
        value={contentInput}
        onChange={(event) => setContentInput(event.target.value)}
        placeholder="\u5199\u4e0b\u60f3\u8d34\u5728\u5730\u56fe\u4e0a\u7684\u8bb0\u5fc6\u7247\u6bb5..."
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
        {publishing ? '\u53d1\u5e03\u4e2d...' : '\u53d1\u5e03\u5230\u5730\u56fe'}
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
                  \u65f6\u7a7a\u5171\u9e23 \u00b7 \u96c6\u4f53\u8bb0\u5fc6\u5730\u56fe
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100/70">
                  \u4f7f\u7528\u4f4e\u7cbe\u5ea6\u73b0\u5b9e\u5730\u56fe\u5448\u73b0\u6bcf\u4e00\u6bb5\u8bb0\u5fc6\u5750\u6807\uff0c\u8ba9\u5171\u9e23\u505c\u7559\u5728\u9547\u7ea7\u5c3a\u5ea6\u4e4b\u4e0a\u3002
                </p>
              </div>
            </div>
          </section>

          <div ref={formRef} className="flex flex-col gap-4 md:hidden">
            <GlassCard className="glass-card--dark gap-4 border-white/10">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-blue-100/70">
                <Sparkles className="h-3 w-3" />
                \u5171\u9e23\u68c0\u7d22
              </div>
              <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-blue-100/80">
                <Search className="h-3.5 w-3.5 text-blue-200/70" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="\u641c\u7d22\u5730\u70b9\u3001\u8bb0\u5fc6\u6216\u5173\u952e\u8bcd..."
                  className="w-full bg-transparent text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
                />
              </div>
              <div className="text-xs text-blue-100/70">
                {loadingPosts
                  ? '\u6b63\u5728\u52a0\u8f7d\u5730\u56fe\u8bb0\u5fc6...'
                  : `\u5f53\u524d\u5c55\u793a ${filteredCount} / ${totalCount} \u6761\u5171\u9e23\u8bb0\u5f55`}
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
              \u5171\u9e23\u68c0\u7d22
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-blue-100/80">
              <Search className="h-3.5 w-3.5 text-blue-200/70" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="\u641c\u7d22\u5730\u70b9\u3001\u8bb0\u5fc6\u6216\u5173\u952e\u8bcd..."
                className="w-full bg-transparent text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none"
              />
            </div>
            <div className="text-xs text-blue-100/70">
              {loadingPosts
                ? '\u6b63\u5728\u52a0\u8f7d\u5730\u56fe\u8bb0\u5fc6...'
                : `\u5f53\u524d\u5c55\u793a ${filteredCount} / ${totalCount} \u6761\u5171\u9e23\u8bb0\u5f55`}
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
          \u002b \u6dfb\u52a0\u6211\u7684\u8bb0\u5fc6\u5750\u6807
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
                  aria-label="\u5173\u95ed"
                >
                  <X className="h-4 w-4" />
                </button>

                <p className="text-xs uppercase tracking-[0.2em] text-blue-100/70">
                  {selectedPost.title || '\u5171\u9e23\u8bb0\u5fc6'}
                </p>
                <p className="mt-3 text-sm text-blue-100/70">{selectedPost.address}</p>
                <p className="mt-4 text-sm leading-relaxed text-blue-100/85">
                  {selectedPost.content}
                </p>
                {selectedPost.township ? (
                  <p className="mt-4 text-xs text-blue-100/60">
                    \u5b9a\u4f4d\u9547\u57df\uff1a{selectedPost.township}
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
