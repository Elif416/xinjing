import { NextResponse } from 'next/server';

import { buildAuthCallbackUrl, sanitizeRedirectPath } from '@/lib/siteUrl';
import { getSupabaseAuthClient } from '@/lib/supabaseAuth';

export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const redirect = sanitizeRedirectPath(body?.redirect);

    if (!EMAIL_PATTERN.test(email)) {
      return NextResponse.json({ error: '请输入有效的邮箱地址' }, { status: 400 });
    }

    const supabase = getSupabaseAuthClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: buildAuthCallbackUrl(request, redirect)
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '验证码发送失败' },
      { status: 500 }
    );
  }
}
