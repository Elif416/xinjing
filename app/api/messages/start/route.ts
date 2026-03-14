import { NextResponse } from 'next/server';

import { startDirectConversation } from '@/lib/messageRepository';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { targetUserId?: number };
    const targetUserId = Number(body?.targetUserId);
    const payload = await startDirectConversation(targetUserId);
    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to start message conversation';

    return NextResponse.json(
      { error: message },
      { status: /不存在|不能和自己/.test(message) ? 400 : 500 }
    );
  }
}
