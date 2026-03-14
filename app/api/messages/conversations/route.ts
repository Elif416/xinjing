import { NextResponse } from 'next/server';

import { listMessageConversations } from '@/lib/messageRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await listMessageConversations();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load conversations'
      },
      { status: 500 }
    );
  }
}
