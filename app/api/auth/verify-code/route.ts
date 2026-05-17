import { NextResponse } from 'next/server';

import { ensureRegisteredUser } from '@/lib/authUsers';
import { signAuthToken } from '@/lib/authToken';
import { getSupabaseAuthClient } from '@/lib/supabaseAuth';

export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const token = String(body?.code ?? body?.token ?? '').replace(/\s/g, '');
    const secret = process.env.AUTH_SECRET;

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json({ error: '请输入 6 位邮箱验证码' }, { status: 400 });
    }

    if (!secret) {
      return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
    }

    const supabase = getSupabaseAuthClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email'
    });

    if (error || !data.user?.email) {
      return NextResponse.json(
        { error: error?.message ?? '验证码无效或已过期' },
        { status: 401 }
      );
    }

    const user = await ensureRegisteredUser(data.user.email);
    const authToken = await signAuthToken(
      {
        email: user.account,
        sub: data.user.id,
        userId: user.userid,
        name: user.nickname,
        provider: 'supabase-email-otp',
        exp: Date.now() + SESSION_MAX_AGE * 1000
      },
      secret
    );

    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.userid,
        email: user.account,
        name: user.nickname
      }
    });

    response.cookies.set('hm_auth', authToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '验证码验证失败' },
      { status: 500 }
    );
  }
}
