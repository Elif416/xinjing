import { NextResponse } from 'next/server';

import { createResonancePost, listResonancePosts } from '@/lib/resonanceRepository';
import type { ResonancePostInput } from '@/lib/resonanceTypes';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const items = await listResonancePosts();
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load resonance posts'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ResonancePostInput;
    const created = await createResonancePost(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create resonance post';
    const status = message.includes('请') || message.includes('无效') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
