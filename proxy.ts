import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyAuthToken } from './lib/authToken';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return true;
  }
  if (pathname.startsWith('/_next')) {
    return true;
  }
  if (pathname === '/favicon.ico') {
    return true;
  }
  return false;
}

// 登录门禁：未登录则跳转至 /login
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // 未配置密钥时，默认拒绝访问，避免误开放
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  const token = request.cookies.get('hm_auth')?.value;
  const payload = token ? await verifyAuthToken(token, secret) : null;

  if (!payload) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
};
