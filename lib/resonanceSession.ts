import 'server-only';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { ensureResonanceViewer } from './resonanceRepository';

const COOKIE_NAME = 'hm_resonance_guest';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export async function getResonanceViewerContext() {
  const cookieStore = await cookies();
  const existingKey = cookieStore.get(COOKIE_NAME)?.value?.trim();
  const guestKey = existingKey || crypto.randomUUID();
  const viewer = await ensureResonanceViewer(guestKey);

  return {
    ...viewer,
    guestKey,
    needsCookie: !existingKey
  };
}

export function applyResonanceViewerCookie(response: NextResponse, guestKey: string) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: guestKey,
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE
  });

  return response;
}
