import { NextResponse } from 'next/server';

import { createResonancePost, listResonancePosts } from '@/lib/resonanceRepository';
import { applyResonanceViewerCookie, getResonanceViewerContext } from '@/lib/resonanceSession';
import type { ResonancePostInput } from '@/lib/resonanceTypes';

export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1';

const CACHE_CONTROL_HEADER = 'public, s-maxage=60, stale-while-revalidate=300';

export async function GET() {
  try {
    const viewer = await getResonanceViewerContext();
    const items = await listResonancePosts({ viewerUserId: viewer.userId });
    const response = NextResponse.json(
      { items },
      {
        headers: {
          'Cache-Control': CACHE_CONTROL_HEADER
        }
      }
    );
    return applyResonanceViewerCookie(response, viewer.guestKey);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load resonance posts'
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

export async function POST(request: Request) {
  try {
    const viewer = await getResonanceViewerContext();
    const { input, files } = await parseCreateRequest(request);
    const created = await createResonancePost(input, {
      viewerUserId: viewer.userId,
      files
    });
    const response = NextResponse.json(created, { status: 201 });
    return applyResonanceViewerCookie(response, viewer.guestKey);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create resonance post';
    return NextResponse.json({ error: message }, { status: getErrorStatus(message) });
  }
}

async function parseCreateRequest(request: Request) {
  const contentType = request.headers.get('content-type') || '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const files = formData
      .getAll('media')
      .filter((value): value is File => typeof File !== 'undefined' && value instanceof File);

    return {
      input: {
        title: getString(formData, 'title'),
        content: getRequiredString(formData, 'content'),
        address: getRequiredString(formData, 'address'),
        township: getString(formData, 'township'),
        lng: getNumber(formData, 'lng'),
        lat: getNumber(formData, 'lat'),
        visibility: getString(formData, 'visibility') as ResonancePostInput['visibility']
      } satisfies ResonancePostInput,
      files
    };
  }

  const body = (await request.json()) as ResonancePostInput;
  return {
    input: body,
    files: [] as File[]
  };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function getRequiredString(formData: FormData, key: string) {
  const value = getString(formData, key);
  if (!value) {
    throw new Error('表单内容不完整。');
  }

  return value;
}

function getNumber(formData: FormData, key: string) {
  const value = Number(getString(formData, key));
  if (!Number.isFinite(value)) {
    throw new Error('定位坐标无效。');
  }

  return value;
}

function getErrorStatus(message: string) {
  return /请|无效|仅支持|最多|不能超过|不可见|不存在|不完整/.test(message) ? 400 : 500;
}
