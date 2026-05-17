import { NextResponse } from 'next/server';

import { createAuthSessionResponse } from '@/lib/authSession';
import { getSupabaseAuthClient } from '@/lib/supabaseAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accessToken = String(body?.accessToken ?? '').trim();
    const code = String(body?.code ?? '').trim();
    const supabase = getSupabaseAuthClient();

    if (accessToken) {
      const { data, error } = await supabase.auth.getUser(accessToken);

      if (error || !data.user?.email) {
        return NextResponse.json(
          { error: error?.message ?? '邮件确认失败，请重新发送验证邮件。' },
          { status: 401 }
        );
      }

      return createAuthSessionResponse({
        email: data.user.email,
        supabaseUserId: data.user.id,
        provider: 'supabase-email-link'
      });
    }

    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error || !data.user?.email) {
        return NextResponse.json(
          { error: error?.message ?? '邮件确认失败，请重新发送验证邮件。' },
          { status: 401 }
        );
      }

      return createAuthSessionResponse({
        email: data.user.email,
        supabaseUserId: data.user.id,
        provider: 'supabase-email-link'
      });
    }

    return NextResponse.json({ error: 'Missing auth token' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '邮件确认失败' },
      { status: 500 }
    );
  }
}
