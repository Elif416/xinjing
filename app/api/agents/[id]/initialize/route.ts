import { NextResponse } from 'next/server';

import { initializeAgent } from '@/lib/agentRepository';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const detail = await initializeAgent(Number(id));

    if (!detail) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to initialize agent'
      },
      { status: 500 }
    );
  }
}
