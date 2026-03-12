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
};

const AMAP_PLUGINS = ['AMap.Scale', 'AMap.Geocoder'];
const DEFAULT_CENTER: [number, number] = [104.1954, 35.8617];
const DEFAULT_ZOOM = 4;
const FOCUS_ZOOM = 11;

export function ResonanceMap({ posts, focus, onSelect }: ResonanceMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const previewRef = useRef<any>(null);

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      const key = process.env.NEXT_PUBLIC_AMAP_KEY ?? '';
      const security = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE ?? '';

      try {
        const AMap = (await loadAmap({ key, security, plugins: AMAP_PLUGINS })) as any;
        if (disposed || !containerRef.current || mapRef.current) {
          return;
        }

        const map = new AMap.Map(containerRef.current, {
          viewMode: '2D',
          zoom: DEFAULT_ZOOM,
          zooms: [3, 12],
          center: DEFAULT_CENTER,
          mapStyle: 'amap://styles/whitesmoke',
          features: ['bg', 'road', 'point'],
          pitchEnable: false,
          rotateEnable: false
        });

        map.addControl(new AMap.Scale());
        mapRef.current = map;

        requestAnimationFrame(() => {
          map.resize();
        });
      } catch {
        // Swallow errors here; UI will show missing key or network error elsewhere.
      }
    }

    void initMap();

    return () => {
      disposed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    if (markersRef.current.length > 0) {
      map.remove(markersRef.current);
      markersRef.current = [];
    }

    const AMap = (window as any).AMap;
    if (!AMap) {
      return;
    }

    const nextMarkers = posts.map((post) => {
      const marker = new AMap.Marker({
        position: [post.lng, post.lat],
        anchor: 'center',
        offset: new AMap.Pixel(-6, -6),
        title: post.title || post.address,
        content:
          '<div style="width:12px;height:12px;border-radius:999px;background:rgba(96,165,250,0.95);border:2px solid rgba(255,255,255,0.9);box-shadow:0 0 14px rgba(96,165,250,0.9);"></div>'
      });

      marker.on('click', () => {
        onSelect?.(post);
      });

      return marker;
    });

    if (nextMarkers.length > 0) {
      map.add(nextMarkers);
      markersRef.current = nextMarkers;
    }
  }, [posts, onSelect]);

  useEffect(() => {
    const map = mapRef.current;
    const AMap = (window as any).AMap;
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
        offset: new AMap.Pixel(-8, -8),
        content:
          '<div style="width:16px;height:16px;border-radius:999px;background:rgba(251,191,36,0.95);border:2px solid rgba(255,255,255,0.9);box-shadow:0 0 16px rgba(251,191,36,0.9);"></div>'
      });
      map.add(previewRef.current);
    } else {
      previewRef.current.setPosition(position);
    }

    map.setZoomAndCenter(FOCUS_ZOOM, position);
  }, [focus]);

  return <div ref={containerRef} className="h-full w-full" />;
}
