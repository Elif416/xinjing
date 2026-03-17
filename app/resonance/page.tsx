'use client';

import type { ChangeEvent } from 'react';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion, type Transition } from 'framer-motion';
import { Navigation, Plus, Search, Sparkles } from 'lucide-react';

import { GlassCard } from '@/components/GlassCard';
import { GlassNavbar } from '@/components/GlassNavbar';
import { ResonanceComposer } from '@/components/resonance/ResonanceComposer';
import { loadAmap } from '@/components/resonance/amap';
import { ResonanceLocationModal } from '@/components/resonance/ResonanceLocationModal';
import { ResonanceMap, type ResonanceMapSelection } from '@/components/resonance/ResonanceMap';
import { ResonancePostModal } from '@/components/resonance/ResonancePostModal';
import homeData from '@/data/home.json';
import type {
  ResonanceFavoriteState,
  ResonanceMediaType,
  ResonancePost,
  ResonanceVisibility
} from '@/lib/resonanceTypes';

type GeoResult = {
  address: string;
  township: string;
  label: string;
  lng: number;
  lat: number;
};

type LocalMediaPreview = {
  key: string;
  name: string;
  url: string;
  mediaType: ResonanceMediaType;
};

type AMapLocation = {
  getLng?: () => number;
  getLat?: () => number;
  lng?: number;
  lat?: number;
};

type AMapAddressComponent = {
  province?: string;
  city?: string | string[];
  district?: string;
  township?: string;
  towncode?: string;
  street?: string;
};

type AMapGeocode = {
  location?: AMapLocation;
  formattedAddress?: string;
  addressComponent?: AMapAddressComponent;
};

type AMapGeocodeResult = {
  geocodes?: AMapGeocode[];
};

const AMAP_PLUGINS = ['AMap.Geocoder', 'AMap.Scale'];
const DEFAULT_STATS_LABEL = '当前你可见的记忆坐标';
const MAX_ATTACHMENTS = 4;

function roundCoord(value: number, decimals = 3) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function extractLocationValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function resolveLocalMediaType(file: File): ResonanceMediaType {
  return file.type.startsWith('video/') ? 'video' : 'image';
}

function sortPostsByTime(items: ResonancePost[]) {
  return [...items].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

function formatDisplayTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '刚刚';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

async function geocodeAddress(address: string): Promise<GeoResult> {
  const key = process.env.NEXT_PUBLIC_AMAP_KEY ?? '';
  const security = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE ?? '';
  const AMap = (await loadAmap({ key, security, plugins: AMAP_PLUGINS })) as {
    Geocoder: new (options: { extensions: 'all' }) => {
      getLocation: (
        target: string,
        callback: (status: string, result?: AMapGeocodeResult) => void
      ) => void;
    };
  };
  const geocoder = new AMap.Geocoder({ extensions: 'all' });

  return new Promise((resolve, reject) => {
    geocoder.getLocation(address, (status: string, result?: AMapGeocodeResult) => {
      if (status !== 'complete' || !result?.geocodes?.length) {
        reject(new Error('未能定位到该地址，请尝试更精确到镇或街道的写法。'));
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
        reject(new Error('定位坐标异常，请更换更清晰的地址描述。'));
        return;
      }

      const component = geo.addressComponent ?? {};
      const province = extractLocationValue(component.province);
      const city = extractLocationValue(component.city || component.province);
      const district = extractLocationValue(component.district);
      const township = extractLocationValue(component.township || component.towncode || component.street);

      resolve({
        address: geo.formattedAddress || address,
        township: township || district,
        label: [province, city, district, township].filter(Boolean).join('') || geo.formattedAddress || address,
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
  const [selectedLocation, setSelectedLocation] = useState<ResonanceMapSelection | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [query, setQuery] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [contentInput, setContentInput] = useState('');
  const [visibilityInput, setVisibilityInput] = useState<ResonanceVisibility>('public');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<LocalMediaPreview[]>([]);
  const [geoResult, setGeoResult] = useState<GeoResult | null>(null);
  const [locating, setLocating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [formError, setFormError] = useState('');
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [commentPending, setCommentPending] = useState(false);
  const [favoritePending, setFavoritePending] = useState(false);

  const shouldReduceMotion = useReducedMotion();
  const deferredQuery = useDeferredValue(query);
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const previews = selectedFiles.map((file, index) => ({
      key: `${file.name}-${file.size}-${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
      mediaType: resolveLocalMediaType(file)
    }));
    setMediaPreviews(previews);
    return () => previews.forEach((item) => URL.revokeObjectURL(item.url));
  }, [selectedFiles]);

  const mergePost = useCallback((nextPost: ResonancePost) => {
    setPosts((prev) => sortPostsByTime(prev.some((item) => item.id === nextPost.id) ? prev.map((item) => (item.id === nextPost.id ? { ...item, ...nextPost } : item)) : [nextPost, ...prev]));
    setSelectedPost((prev) => (prev?.id === nextPost.id ? { ...prev, ...nextPost } : prev));
    setSelectedLocation((prev) =>
      prev
        ? {
            ...prev,
            posts: sortPostsByTime(
              prev.posts.some((item) => item.id === nextPost.id)
                ? prev.posts.map((item) => (item.id === nextPost.id ? { ...item, ...nextPost } : item))
                : prev.posts
            )
          }
        : prev
    );
  }, []);

  const updateFavoriteState = useCallback((state: ResonanceFavoriteState) => {
    setPosts((prev) => prev.map((item) => (item.id === state.postId ? { ...item, favoriteCount: state.favoriteCount, isFavorite: state.isFavorite } : item)));
    setSelectedPost((prev) => (prev?.id === state.postId ? { ...prev, favoriteCount: state.favoriteCount, isFavorite: state.isFavorite } : prev));
    setSelectedLocation((prev) =>
      prev
        ? {
            ...prev,
            posts: prev.posts.map((item) =>
              item.id === state.postId
                ? { ...item, favoriteCount: state.favoriteCount, isFavorite: state.isFavorite }
                : item
            )
          }
        : prev
    );
  }, []);

  const handleMapReady = useCallback(() => {
    setMapReady(true);
    setMapError('');
  }, []);

  const handleMapError = useCallback((message: string) => {
    setMapReady(false);
    setMapError(message);
  }, []);

  const handleMapSelect = useCallback((selection: ResonanceMapSelection) => {
    if (selection.posts.length <= 1) {
      setSelectedLocation(null);
      setSelectedPost(selection.posts[0] ?? null);
      return;
    }

    setSelectedPost(null);
    setSelectedLocation(selection);
  }, []);

  const handleSelectPostFromLocation = useCallback((post: ResonancePost) => {
    setSelectedLocation(null);
    setSelectedPost(post);
  }, []);

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true);
    setLoadError('');
    try {
      const response = await fetch('/api/resonance/posts', { cache: 'no-store' });
      const payload = (await response.json()) as { items?: ResonancePost[]; error?: string };
      if (!response.ok) throw new Error(payload.error || '共鸣地图数据加载失败');
      setPosts(sortPostsByTime(payload.items ?? []));
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '共鸣地图数据加载失败');
    } finally {
      setLoadingPosts(false);
    }
  }, []);

  const loadPostDetail = useCallback(async (postId: number) => {
    setDetailLoading(true);
    setDetailError('');
    try {
      const response = await fetch(`/api/resonance/posts/${postId}`, { cache: 'no-store' });
      const payload = (await response.json()) as ResonancePost & { error?: string };
      if (!response.ok) throw new Error(payload.error || '贴文详情加载失败');
      mergePost(payload);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : '贴文详情加载失败');
    } finally {
      setDetailLoading(false);
    }
  }, [mergePost]);

  useEffect(() => { void loadPosts(); }, [loadPosts]);
  const selectedPostId = selectedPost?.id ?? null;

  useEffect(() => {
    if (!selectedPostId) {
      setDetailError('');
      setCommentInput('');
      return;
    }
    setCommentInput('');
    void loadPostDetail(selectedPostId);
  }, [selectedPostId, loadPostDetail]);

  const filteredPosts = useMemo(() => {
    const trimmed = deferredQuery.trim().toLowerCase();
    if (!trimmed) return posts;
    return posts.filter((post) => [post.title, post.content, post.address, post.township, post.authorName, post.visibility === 'private' ? '私密 private' : '公开 public'].join(' ').toLowerCase().includes(trimmed));
  }, [deferredQuery, posts]);

  const modalTransition: Transition = shouldReduceMotion ? { duration: 0 } : { type: 'spring', damping: 26, stiffness: 240 };
  const focus = useMemo(
    () => (geoResult ? { lng: geoResult.lng, lat: geoResult.lat, label: geoResult.label } : null),
    [geoResult?.label, geoResult?.lat, geoResult?.lng]
  );
  const mapPostsSignature = useMemo(
    () =>
      filteredPosts
        .map((post) =>
          [
            post.id,
            post.lng,
            post.lat,
            post.visibility,
            post.title,
            post.address,
            post.createdAt,
            post.commentCount,
            post.favoriteCount
          ].join('|')
        )
        .join('~'),
    [filteredPosts]
  );

  const handleLocate = async () => {
    if (!addressInput.trim()) return setFormError('请输入要定位的镇或街道地址。');
    setFormError('');
    setLocating(true);
    try {
      setGeoResult(await geocodeAddress(addressInput.trim()));
    } catch (error) {
      setGeoResult(null);
      setFormError(error instanceof Error ? error.message : '定位失败，请稍后重试。');
    } finally {
      setLocating(false);
    }
  };

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (incomingFiles.length === 0) return;
    const validFiles = incomingFiles.filter((file) => file.type.startsWith('image/') || file.type.startsWith('video/'));
    if (validFiles.length !== incomingFiles.length) setFormError('仅支持上传图片或视频文件。');
    setSelectedFiles((prev) => {
      const merged = [...prev, ...validFiles].slice(0, MAX_ATTACHMENTS);
      if (prev.length + validFiles.length > MAX_ATTACHMENTS) setFormError(`最多上传 ${MAX_ATTACHMENTS} 个图片或视频文件。`);
      return merged;
    });
  };

  const handlePublish = async () => {
    if (!geoResult) return setFormError('请先完成地址定位，再发布记忆。');
    if (!contentInput.trim()) return setFormError('请填写要发布的记忆内容。');
    setFormError('');
    setPublishing(true);
    try {
      const formData = new FormData();
      [['title', titleInput.trim()], ['content', contentInput.trim()], ['address', geoResult.address], ['township', geoResult.township], ['lng', String(geoResult.lng)], ['lat', String(geoResult.lat)], ['visibility', visibilityInput]].forEach(([key, value]) => formData.set(key, value));
      selectedFiles.forEach((file) => formData.append('media', file));
      const response = await fetch('/api/resonance/posts', { method: 'POST', body: formData });
      const payload = (await response.json()) as ResonancePost & { error?: string };
      if (!response.ok) throw new Error(payload.error || '发布失败，请稍后重试。');
      mergePost(payload);
      setSelectedPost(payload);
      setAddressInput('');
      setTitleInput('');
      setContentInput('');
      setVisibilityInput('public');
      setSelectedFiles([]);
      setGeoResult(null);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : '发布失败，请稍后重试。');
    } finally {
      setPublishing(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!selectedPost) return;
    if (!commentInput.trim()) return setDetailError('请输入评论内容。');
    setCommentPending(true);
    setDetailError('');
    try {
      const response = await fetch(`/api/resonance/posts/${selectedPost.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: commentInput.trim() }) });
      const payload = (await response.json()) as { item?: ResonancePost; error?: string };
      if (!response.ok) throw new Error(payload.error || '评论发送失败');
      if (payload.item) mergePost(payload.item);
      setCommentInput('');
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : '评论发送失败');
    } finally {
      setCommentPending(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!selectedPost) return;
    setFavoritePending(true);
    setDetailError('');
    try {
      const response = await fetch(`/api/resonance/posts/${selectedPost.id}/favorite`, { method: 'POST' });
      const payload = (await response.json()) as ResonanceFavoriteState & { error?: string };
      if (!response.ok) throw new Error(payload.error || '收藏状态更新失败');
      updateFavoriteState(payload);
    } catch (error) {
      setDetailError(error instanceof Error ? error.message : '收藏状态更新失败');
    } finally {
      setFavoritePending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030612] text-slate-100">
      <div className="page-bg resonance-bg flex min-h-screen flex-col">
        <GlassNavbar brand={resonanceBrand} items={resonanceNavItems} />
        <main className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col px-6 py-6 sm:py-8">
          {loadError ? <GlassCard className="glass-card--dark mb-6 border-red-500/40 text-red-100">{loadError}</GlassCard> : null}
          <section className="grid flex-1 gap-6 xl:min-h-[calc(100svh-8.5rem)] xl:grid-cols-[360px_minmax(0,1fr)] xl:items-stretch">
            <aside ref={formRef} className="order-2 flex flex-col gap-4 xl:order-1 xl:sticky xl:top-28 xl:self-start">
              <GlassCard className="glass-card--dark gap-4 border-white/10">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-blue-100/70"><Sparkles className="h-3 w-3" />共鸣检索</div>
                <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs text-blue-100/80"><Search className="h-3.5 w-3.5 shrink-0 text-blue-200/70" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索地点、记忆、作者或公开状态…" className="w-full bg-transparent text-xs text-blue-100/80 placeholder:text-blue-200/50 focus:outline-none" /></div>
                <div className="text-xs text-blue-100/70">{loadingPosts ? '正在加载地图记忆…' : `当前展示 ${filteredPosts.length} / ${posts.length} 条可见记忆`}</div>
              </GlassCard>
              <GlassCard className="glass-card--dark gap-4 border-white/10">
                <ResonanceComposer
                  addressInput={addressInput}
                  titleInput={titleInput}
                  contentInput={contentInput}
                  visibilityInput={visibilityInput}
                  geoLabel={geoResult?.label}
                  locating={locating}
                  publishing={publishing}
                  formError={formError}
                  maxAttachments={MAX_ATTACHMENTS}
                  mediaPreviews={mediaPreviews}
                  addressInputRef={addressInputRef}
                  fileInputRef={fileInputRef}
                  onAddressChange={(value) => {
                    setAddressInput(value);
                    if (geoResult) setGeoResult(null);
                  }}
                  onTitleChange={setTitleInput}
                  onContentChange={setContentInput}
                  onVisibilityChange={setVisibilityInput}
                  onLocate={handleLocate}
                  onPublish={handlePublish}
                  onFilePick={() => fileInputRef.current?.click()}
                  onFileChange={handleFilesSelected}
                  onRemoveFile={(key) => setSelectedFiles((prev) => prev.filter((file, index) => `${file.name}-${file.size}-${index}` !== key))}
                />
              </GlassCard>
              <GlassCard className="glass-card--dark w-full gap-3 border-white/10 xl:hidden"><p className="text-xs uppercase tracking-[0.2em] text-blue-100/60">Resonance Stats</p><p className="text-3xl font-semibold text-white">{posts.length}</p><p className="text-xs text-blue-100/70">{DEFAULT_STATS_LABEL}</p></GlassCard>
            </aside>
            <section className="order-1 flex xl:order-2">
              <div className="relative min-h-[640px] w-full overflow-hidden rounded-[36px] border border-white/10 bg-[#0a1024]/84 shadow-[0_26px_88px_rgba(6,10,25,0.45)] backdrop-blur-[6px] sm:min-h-[760px] xl:h-full xl:min-h-0">
                <div className="absolute inset-0">
                  <ResonanceMap
                    posts={filteredPosts}
                    postsSignature={mapPostsSignature}
                    focus={focus}
                    onSelect={handleMapSelect}
                    onReady={handleMapReady}
                    onError={handleMapError}
                  />
                </div>
                <div className="resonance-map-overlay absolute inset-0 z-[1]" />
                <div className="absolute inset-x-0 bottom-0 z-[2] h-56 bg-gradient-to-t from-[#040817] via-[#040817]/80 to-transparent" />
                <div className="absolute left-6 top-6 z-[3] flex max-w-lg flex-col gap-3">
                  {mapError ? <GlassCard className="glass-card--dark border-amber-400/30 bg-[#071226]/85 text-amber-100"><p className="text-sm font-semibold text-white">地图服务初始化失败</p><p className="mt-2 text-sm leading-relaxed text-blue-100/80">{mapError}</p><p className="mt-3 text-xs text-blue-100/60">请检查高德 Key、安全密钥以及当前访问域名是否在白名单中。</p></GlassCard> : !mapReady ? <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-[#071226]/84 px-4 py-2 text-xs text-blue-100/80 backdrop-blur-[10px]"><Navigation className="h-3.5 w-3.5 text-blue-200/70" />地图服务连接中…</div> : null}
                </div>
                <div className="absolute right-6 top-6 z-[3] hidden w-60 md:block"><GlassCard className="glass-card--dark w-full gap-3 border-white/10"><p className="text-xs uppercase tracking-[0.2em] text-blue-100/60">Resonance Stats</p><p className="text-3xl font-semibold text-white">{posts.length}</p><p className="text-xs text-blue-100/70">{DEFAULT_STATS_LABEL}</p></GlassCard></div>
                <div className="absolute bottom-8 left-6 right-6 z-[3] max-w-2xl"><p className="text-xs uppercase tracking-[0.3em] text-blue-200/70">Resonance Map</p><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">时空共鸣 · 集体记忆地图</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-blue-100/70 md:text-base">用低精度现实地图承载记忆帖文。你可以留下公开的地方故事，也能把私密片段留给自己。</p></div>
              </div>
            </section>
          </section>
        </main>
        <button type="button" onClick={() => { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); addressInputRef.current?.focus(); }} className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 cursor-pointer items-center gap-3 rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 px-8 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(59,130,246,0.45)] transition hover:scale-[1.01] xl:hidden"><Plus className="h-4 w-4" />添加我的记忆坐标</button>
        <ResonanceLocationModal
          open={Boolean(selectedLocation)}
          title={selectedLocation?.label || '该地点'}
          posts={selectedLocation?.posts ?? []}
          transition={modalTransition}
          formatDisplayTime={formatDisplayTime}
          onClose={() => setSelectedLocation(null)}
          onSelectPost={handleSelectPostFromLocation}
        />
        <ResonancePostModal
          post={selectedPost}
          detailLoading={detailLoading}
          detailError={detailError}
          favoritePending={favoritePending}
          commentPending={commentPending}
          commentInput={commentInput}
          transition={modalTransition}
          onClose={() => setSelectedPost(null)}
          onToggleFavorite={handleToggleFavorite}
          onCommentChange={setCommentInput}
          onSubmitComment={handleSubmitComment}
          formatDisplayTime={formatDisplayTime}
        />
      </div>
    </div>
  );
}
