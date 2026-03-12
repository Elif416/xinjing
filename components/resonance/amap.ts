'use client';

type AMapLoaderOptions = {
  key: string;
  security?: string;
  plugins?: string[];
};

let amapPromise: Promise<unknown> | null = null;

export function loadAmap({ key, security, plugins = [] }: AMapLoaderOptions) {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('AMap can only load in the browser.'));
  }

  if ((window as unknown as { AMap?: unknown }).AMap) {
    return Promise.resolve((window as unknown as { AMap: unknown }).AMap);
  }

  if (!key) {
    return Promise.reject(new Error('Missing AMap key.'));
  }

  if (!amapPromise) {
    amapPromise = new Promise((resolve, reject) => {
      if (security) {
        (window as unknown as { _AMapSecurityConfig?: { securityJsCode: string } })
          ._AMapSecurityConfig = { securityJsCode: security };
      }

      const script = document.createElement('script');
      script.id = 'amap-js-sdk';
      const pluginParam = plugins.length > 0 ? `&plugin=${plugins.join(',')}` : '';
      script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}${pluginParam}`;
      script.async = true;
      script.onload = () => resolve((window as unknown as { AMap: unknown }).AMap);
      script.onerror = () => reject(new Error('Failed to load AMap SDK.'));
      document.head.appendChild(script);
    });
  }

  return amapPromise;
}
