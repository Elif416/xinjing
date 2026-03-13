import { NextResponse } from 'next/server';

import { addResonanceComment } from '@/lib/resonanceRepository';
import { applyResonanceViewerCookie, getResonanceViewerContext } from '@/lib/resonanceSession';
import type { ResonanceCommentInput } from '@/lib/resonanceTypes';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, viewer, body] = await Promise.all([
      context.params,
      getResonanceViewerContext(),
      request.json() as Promise<ResonanceCommentInput>
    ]);

    const item = await addResonanceComment(id, body, viewer.userId);
    const response = NextResponse.json({ item });
    return applyResonanceViewerCookie(response, viewer.guestKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create resonance comment';
    return NextResponse.json(
      { error: message },
      { status: /请|不存在|不可见/.test(message) ? 400 : 500 }
    );
  }
}
