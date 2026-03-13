import { NextResponse } from 'next/server';

import { toggleResonanceFavorite } from '@/lib/resonanceRepository';
import { applyResonanceViewerCookie, getResonanceViewerContext } from '@/lib/resonanceSession';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, viewer] = await Promise.all([context.params, getResonanceViewerContext()]);
    const state = await toggleResonanceFavorite(id, viewer.userId);
    const response = NextResponse.json(state);
    return applyResonanceViewerCookie(response, viewer.guestKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to toggle resonance favorite';
    return NextResponse.json(
      { error: message },
      { status: /不存在|不可见/.test(message) ? 400 : 500 }
    );
  }
}
