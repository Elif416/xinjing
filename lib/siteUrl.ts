import 'server-only';

const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

export function getSiteOrigin(request: Request) {
  const configuredOrigin = normalizeOrigin(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.SITE_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      process.env.VERCEL_URL ||
      ''
  );

  if (configuredOrigin) {
    return configuredOrigin;
  }

  const forwardedHost =
    request.headers.get('x-forwarded-host')?.trim() ||
    request.headers.get('host')?.trim() ||
    request.headers.get('x-vercel-deployment-url')?.trim();
  const forwardedProto = request.headers.get('x-forwarded-proto')?.trim() || 'https';

  if (forwardedHost && !LOCAL_HOST_PATTERN.test(forwardedHost)) {
    return normalizeOrigin(`${forwardedProto}://${forwardedHost}`) || new URL(request.url).origin;
  }

  const origin = request.headers.get('origin');

  if (origin) {
    return normalizeOrigin(origin) || new URL(request.url).origin;
  }

  return new URL(request.url).origin;
}

export function buildAuthCallbackUrl(request: Request, redirectPath = '/') {
  const url = new URL('/auth/callback', getSiteOrigin(request));
  url.searchParams.set('next', sanitizeRedirectPath(redirectPath));
  return url.toString();
}

export function sanitizeRedirectPath(value: unknown) {
  const redirect = String(value ?? '').trim();

  if (!redirect.startsWith('/') || redirect.startsWith('//')) {
    return '/';
  }

  return redirect;
}

function normalizeOrigin(value: string) {
  const raw = value.trim();

  if (!raw) {
    return '';
  }

  try {
    const url = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
    url.pathname = '';
    url.search = '';
    url.hash = '';
    return url.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}
