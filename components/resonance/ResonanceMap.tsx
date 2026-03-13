'use client';

import { useEffect, useMemo, useRef } from 'react';

import { loadAmap } from './amap';
import type { ResonancePost } from '@/lib/resonanceTypes';

type MapFocus = {
  lng: number;
  lat: number;
  label?: string;
};

type ResonanceMapProps = {
  posts: ResonancePost[];
  focus?: MapFocus | null;
  onSelect?: (selection: ResonanceMapSelection) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
};

export type ResonanceMapSelection = {
  key: string;
  lng: number;
  lat: number;
  label: string;
  posts: ResonancePost[];
};

type AMapMarkerInstance = {
  on: (event: string, handler: () => void) => void;
  setPosition: (position: [number, number]) => void;
};

type AMapMapInstance = {
  addControl: (control: unknown) => void;
  resize: () => void;
  destroy: () => void;
  remove: (target: AMapMarkerInstance | AMapMarkerInstance[]) => void;
  add: (target: AMapMarkerInstance | AMapMarkerInstance[]) => void;
  setZoomAndCenter: (zoom: number, position: [number, number]) => void;
};

type AMapLike = {
  Map: new (
    target: HTMLDivElement,
    options: {
      viewMode: '2D';
      zoom: number;
      zooms: [number, number];
      center: [number, number];
      mapStyle: string;
      features: string[];
      pitchEnable: boolean;
      rotateEnable: boolean;
      resizeEnable: boolean;
    }
  ) => AMapMapInstance;
  Scale: new () => unknown;
  Marker: new (options: {
    position: [number, number];
    anchor: 'center';
    offset: unknown;
    title?: string;
    content: string;
  }) => AMapMarkerInstance;
  Pixel: new (x: number, y: number) => unknown;
};

const AMAP_PLUGINS = ['AMap.Scale', 'AMap.Geocoder'];
const DEFAULT_CENTER: [number, number] = [104.1954, 35.8617];
const DEFAULT_ZOOM = 4;
const FOCUS_ZOOM = 11;

type MarkerGroup = ResonanceMapSelection & {
  markerTitle: string;
  markerTone: 'public' | 'private' | 'mixed';
};

function groupPostsByLocation(posts: ResonancePost[]): MarkerGroup[] {
  const groups = new Map<string, ResonancePost[]>();

  posts.forEach((post) => {
    const key = `${post.lng.toFixed(6)}:${post.lat.toFixed(6)}`;
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(post);
    } else {
      groups.set(key, [post]);
    }
  });

  return [...groups.entries()].map(([key, groupPosts]) => {
    const sortedPosts = [...groupPosts].sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
    const hasPrivate = sortedPosts.some((post) => post.visibility === 'private');
    const hasPublic = sortedPosts.some((post) => post.visibility === 'public');
    const tone: MarkerGroup['markerTone'] =
      hasPrivate && hasPublic ? 'mixed' : hasPrivate ? 'private' : 'public';
    const first = sortedPosts[0];

    return {
      key,
      lng: first.lng,
      lat: first.lat,
      label: first.address || first.title || '该地点',
      posts: sortedPosts,
      markerTitle:
        sortedPosts.length > 1
          ? `${first.address || first.title || '该地点'}（${sortedPosts.length} 条）`
          : first.title || first.address,
      markerTone: tone
    };
  });
}

function buildMarkerContent(group: MarkerGroup) {
  const tone =
    group.markerTone === 'private'
      ? {
          glow: 'rgba(216,180,254,0.45)',
          aura: 'rgba(216,180,254,0.18)',
          core: 'rgba(232,121,249,0.96)'
        }
      : group.markerTone === 'mixed'
        ? {
            glow: 'rgba(251,191,36,0.5)',
            aura: 'rgba(251,191,36,0.18)',
            core: 'rgba(251,191,36,0.96)'
          }
        : {
            glow: 'rgba(96,165,250,0.45)',
            aura: 'rgba(96,165,250,0.18)',
            core: 'rgba(96,165,250,0.96)'
          };

  const size = group.posts.length > 1 ? 26 : 20;
  const haloInset = group.posts.length > 1 ? -10 : -8;
  const badge =
    group.posts.length > 1
      ? `<span style="position:absolute;right:-6px;top:-6px;display:flex;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:rgba(15,23,42,0.92);border:1px solid rgba(255,255,255,0.65);align-items:center;justify-content:center;font-size:10px;font-weight:700;color:white;">${group.posts.length}</span>`
      : '';

  return `<div style="position:relative;width:${size}px;height:${size}px;"><span style="position:absolute;inset:${haloInset}px;border-radius:999px;background:${tone.aura};box-shadow:0 0 18px ${tone.glow};"></span><span style="position:absolute;inset:0;border-radius:999px;background:${tone.core};border:3px solid rgba(255,255,255,0.95);box-shadow:0 0 24px ${tone.glow};"></span>${badge}</div>`;
}

export function ResonanceMap({ posts, focus, onSelect, onReady, onError }: ResonanceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapMapInstance | null>(null);
  const markersRef = useRef<AMapMarkerInstance[]>([]);
  const previewRef = useRef<AMapMarkerInstance | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const focusRef = useRef<MapFocus | null>(focus ?? null);
  const postsRef = useRef<ResonancePost[]>(posts);
  const selectionHandlerRef = useRef<typeof onSelect>(onSelect);

  useEffect(() => {
    focusRef.current = focus ?? null;
  }, [focus]);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  const markerSignature = useMemo(
    () =>
      posts
        .map((post) =>
          [post.id, post.lng, post.lat, post.visibility, post.title, post.address].join('|')
        )
        .join('~'),
    [posts]
  );

  useEffect(() => {
    selectionHandlerRef.current = onSelect;
  }, [onSelect]);

  const applyFocus = (map: AMapMapInstance, AMap: AMapLike, nextFocus: MapFocus | null) => {
    if (!nextFocus) {
      if (previewRef.current) {
        map.remove(previewRef.current);
        previewRef.current = null;
      }
      return;
    }

    const position: [number, number] = [nextFocus.lng, nextFocus.lat];
    if (!previewRef.current) {
      previewRef.current = new AMap.Marker({
        position,
        anchor: 'center',
        offset: new AMap.Pixel(-13, -13),
        content:
          '<div style="position:relative;width:26px;height:26px;"><span style="position:absolute;inset:-9px;border-radius:999px;background:rgba(251,191,36,0.18);box-shadow:0 0 22px rgba(251,191,36,0.7);"></span><span style="position:absolute;inset:0;border-radius:999px;background:rgba(251,191,36,0.98);border:3px solid rgba(255,255,255,0.95);box-shadow:0 0 22px rgba(251,191,36,0.92);"></span></div>'
      });
      map.add(previewRef.current);
    } else {
      previewRef.current.setPosition(position);
    }

    map.setZoomAndCenter(FOCUS_ZOOM, position);
  };

  const applyMarkers = (
    map: AMapMapInstance,
    AMap: AMapLike,
    nextPosts: ResonancePost[]
  ) => {
    if (markersRef.current.length > 0) {
      map.remove(markersRef.current);
      markersRef.current = [];
    }

    const nextMarkers = groupPostsByLocation(nextPosts).map((group) => {
      const marker = new AMap.Marker({
        position: [group.lng, group.lat],
        anchor: 'center',
        offset: new AMap.Pixel(group.posts.length > 1 ? -13 : -10, group.posts.length > 1 ? -13 : -10),
        title: group.markerTitle,
        content: buildMarkerContent(group)
      });

      marker.on('click', () => selectionHandlerRef.current?.(group));
      return marker;
    });

    if (nextMarkers.length > 0) {
      map.add(nextMarkers);
      markersRef.current = nextMarkers;
    }
  };

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      const key = process.env.NEXT_PUBLIC_AMAP_KEY ?? '';
      const security = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE ?? '';

      try {
        const AMap = (await loadAmap({ key, security, plugins: AMAP_PLUGINS })) as AMapLike;
        if (disposed || !containerRef.current || mapRef.current) {
          return;
        }

        const map = new AMap.Map(containerRef.current, {
          viewMode: '2D',
          zoom: DEFAULT_ZOOM,
          zooms: [3, 12],
          center: DEFAULT_CENTER,
          mapStyle: 'amap://styles/darkblue',
          features: ['bg', 'road', 'building', 'point'],
          pitchEnable: false,
          rotateEnable: false,
          resizeEnable: true
        });

        map.addControl(new AMap.Scale());
        mapRef.current = map;
        onReady?.();
        requestAnimationFrame(() => map.resize());
        applyMarkers(map, AMap, postsRef.current);
        applyFocus(map, AMap, focusRef.current);

        if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
          resizeObserverRef.current = new ResizeObserver(() => map.resize());
          resizeObserverRef.current.observe(containerRef.current);
        }
      } catch (error) {
        onError?.(
          error instanceof Error ? error.message : '高德地图初始化失败，请检查 Key 与安全密钥配置。'
        );
      }
    }

    void initMap();

    return () => {
      disposed = true;
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [onError, onReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (markersRef.current.length > 0) {
      map.remove(markersRef.current);
      markersRef.current = [];
    }

    const AMap = (window as Window & { AMap?: AMapLike }).AMap;
    if (!AMap) {
      return;
    }
    applyMarkers(map, AMap, postsRef.current);
  }, [markerSignature]);

  useEffect(() => {
    const map = mapRef.current;
    const AMap = (window as Window & { AMap?: AMapLike }).AMap;
    if (!map || !AMap) {
      return;
    }
    applyFocus(map, AMap, focus ?? null);
  }, [focus]);

  return <div ref={containerRef} className="h-full w-full" />;
}
