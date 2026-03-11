import { NextRequest, NextResponse } from 'next/server';

import { getArtistsPage } from '@/lib/artistRepository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const offset = clampInteger(searchParams.get('offset'), 0, 10_000, 0);
    const limit = clampInteger(searchParams.get('limit'), 1, 24, 12);
    const keyword = searchParams.get('keyword')?.trim() || undefined;
    const priceMax = parseOptionalNumber(searchParams.get('priceMax'));

    const result = await getArtistsPage({
      offset,
      limit,
      keyword,
      priceMax
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load artists'
      },
      { status: 500 }
    );
  }
}

function clampInteger(
  value: string | null,
  min: number,
  max: number,
  fallback: number
) {
  const parsed = Number.parseInt(value ?? '', 10);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, parsed));
}

function parseOptionalNumber(value: string | null) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
}
