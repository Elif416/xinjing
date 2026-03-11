import { NextResponse } from 'next/server';

import { sendMessageToAgent } from '@/lib/agentRepository';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as {
      text?: string;
      imageUrls?: string[];
    };

    const detail = await sendMessageToAgent(
      Number(id),
      body.text?.trim() || '',
      Array.isArray(body.imageUrls) ? body.imageUrls.map((item) => String(item)) : []
    );

    if (!detail) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to send message'
      },
      { status: 500 }
    );
  }
}
