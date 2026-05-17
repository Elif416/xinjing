import { NextResponse } from 'next/server';

import { createAuthSessionResponse } from '@/lib/authSession';
import { getSupabaseAuthClient } from '@/lib/supabaseAuth';

export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const token = String(body?.code ?? body?.token ?? '').replace(/\s/g, '');

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    if (!/^\d{6}$/.test(token)) {
      return NextResponse.json({ error: '请输入 6 位邮箱验证码' }, { status: 400 });
    }

    const supabase = getSupabaseAuthClient();
    const { data, error } = await verifyEmailToken(supabase, email, token);

    if (error || !data.user?.email) {
      return NextResponse.json(
        { error: error?.message ?? '验证码无效或已过期' },
        { status: 401 }
      );
    }

    return createAuthSessionResponse({
      email: data.user.email,
      supabaseUserId: data.user.id,
      provider: 'supabase-email-otp'
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '验证码验证失败' },
      { status: 500 }
    );
  }
}

async function verifyEmailToken(
  supabase: ReturnType<typeof getSupabaseAuthClient>,
  email: string,
  token: string
) {
  const emailResult = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email'
  });

  if (!emailResult.error) {
    return emailResult;
  }

  return supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup'
  });
}
