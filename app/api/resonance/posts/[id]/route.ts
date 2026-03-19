import { NextResponse } from 'next/server';

import { getResonancePostDetail } from '@/lib/resonanceRepository';
import { applyResonanceViewerCookie, getResonanceViewerContext } from '@/lib/resonanceSession';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1';

const CACHE_CONTROL_HEADER = 'public, s-maxage=60, stale-while-revalidate=300';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const [{ id }, viewer] = await Promise.all([context.params, getResonanceViewerContext()]);
    const item = await getResonancePostDetail(id, viewer.userId);

    if (!item) {
      const response = NextResponse.json(
        { error: 'Post not found' },
        {
          status: 404,
          headers: {
            'Cache-Control': CACHE_CONTROL_HEADER
          }
        }
      );
      return applyResonanceViewerCookie(response, viewer.guestKey);
    }

    const response = NextResponse.json(item, {
      headers: {
        'Cache-Control': CACHE_CONTROL_HEADER
      }
    });
    return applyResonanceViewerCookie(response, viewer.guestKey);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load resonance post'
      },
      {
        status: 500,
        headers: {
          'Cache-Control': CACHE_CONTROL_HEADER
        }
      }
    );
  }
}
