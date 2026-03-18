import { NextResponse } from 'next/server';

import { getArtistDetail } from '@/lib/artistRepository';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1';

const CACHE_CONTROL_HEADER = 'public, s-maxage=300, stale-while-revalidate=3600';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const artist = await getArtistDetail(id);

    if (!artist) {
      return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    }

    return NextResponse.json(artist, {
      headers: {
        'Cache-Control': CACHE_CONTROL_HEADER
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load artist detail'
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
