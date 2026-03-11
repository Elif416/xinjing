import { NextResponse } from 'next/server';

import { getAgentDetail, updateAgent } from '@/lib/agentRepository';
import type { AgentConfigInput } from '@/lib/agentTypes';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const detail = await getAgentDetail(Number(id));

    if (!detail) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load agent detail'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as AgentConfigInput;
    const detail = await updateAgent(Number(id), body);

    if (!detail) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    return NextResponse.json(detail);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update agent'
      },
      { status: 500 }
    );
  }
}
