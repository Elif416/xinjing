import { NextResponse } from 'next/server';
import { signAuthToken } from '@/lib/authToken';

export const runtime = 'edge';

// 登录接口：校验账号密码 -> 写入安全 Cookie
// 注意：账号/密码/密钥均来自环境变量，避免硬编码
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? '');
    const password = String(body?.password ?? '');

    const allowEmail = process.env.AUTH_EMAIL;
    const allowPassword = process.env.AUTH_PASSWORD;
    const secret = process.env.AUTH_SECRET;

    if (!allowEmail || !allowPassword || !secret) {
      return NextResponse.json(
        { error: 'Auth not configured' },
        { status: 500 }
      );
    }

    if (email !== allowEmail || password !== allowPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signAuthToken(
      {
        email,
        exp: Date.now() + 7 * 24 * 60 * 60 * 1000
      },
      secret
    );

    const response = NextResponse.json({ ok: true });
    response.cookies.set('hm_auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 7 * 24 * 60 * 60
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
