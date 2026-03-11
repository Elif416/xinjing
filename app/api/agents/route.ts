import { NextResponse } from 'next/server';

import { createAgent, listAgents } from '@/lib/agentRepository';
import type { AgentConfigInput } from '@/lib/agentTypes';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const agents = await listAgents();
    return NextResponse.json({ items: agents });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load agents'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AgentConfigInput;
    const agent = await createAgent(body);
    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create agent'
      },
      { status: 500 }
    );
  }
}
