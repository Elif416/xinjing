'use client';

import { useEffect, useRef } from 'react';

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
  onSelect?: (post: ResonancePost) => void;
  onReady?: () => void;
  onError?: (message: string) => void;
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

export function ResonanceMap({ posts, focus, onSelect, onReady, onError }: ResonanceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<AMapMapInstance | null>(null);
  const markersRef = useRef<AMapMarkerInstance[]>([]);
  const previewRef = useRef<AMapMarkerInstance | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

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

    const nextMarkers = posts.map((post) => {
      const isPrivate = post.visibility === 'private';
      const marker = new AMap.Marker({
        position: [post.lng, post.lat],
        anchor: 'center',
        offset: new AMap.Pixel(-10, -10),
        title: post.title || post.address,
        content: `<div style="position:relative;width:20px;height:20px;"><span style="position:absolute;inset:-8px;border-radius:999px;background:${isPrivate ? 'rgba(216,180,254,0.18)' : 'rgba(96,165,250,0.18)'};box-shadow:0 0 18px ${isPrivate ? 'rgba(216,180,254,0.45)' : 'rgba(96,165,250,0.45)'};"></span><span style="position:absolute;inset:0;border-radius:999px;background:${isPrivate ? 'rgba(232,121,249,0.96)' : 'rgba(96,165,250,0.96)'};border:3px solid rgba(255,255,255,0.95);box-shadow:0 0 24px ${isPrivate ? 'rgba(232,121,249,0.7)' : 'rgba(96,165,250,0.75)'};"></span></div>`
      });

      marker.on('click', () => onSelect?.(post));
      return marker;
    });

    if (nextMarkers.length > 0) {
      map.add(nextMarkers);
      markersRef.current = nextMarkers;
    }
  }, [posts, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    const AMap = (window as Window & { AMap?: AMapLike }).AMap;
    if (!map || !AMap) {
      return;
    }

    if (!focus) {
      if (previewRef.current) {
        map.remove(previewRef.current);
        previewRef.current = null;
      }
      return;
    }

    const position = [focus.lng, focus.lat];
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
  }, [focus]);

  return <div ref={containerRef} className="h-full w-full" />;
}
