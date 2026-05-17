import 'server-only';

import { NextResponse } from 'next/server';

import { ensureRegisteredUser } from './authUsers';
import { signAuthToken } from './authToken';

export const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

export async function createAuthSessionResponse(input: {
  email: string;
  supabaseUserId?: string;
  provider: string;
}) {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  const user = await ensureRegisteredUser(input.email);
  const token = await signAuthToken(
    {
      email: user.account,
      sub: input.supabaseUserId,
      userId: user.userid,
      name: user.nickname,
      provider: input.provider,
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

  response.cookies.set('hm_auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE
  });

  return response;
}
