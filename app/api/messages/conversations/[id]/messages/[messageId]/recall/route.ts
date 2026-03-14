import { NextResponse } from 'next/server';

import { recallConversationMessage } from '@/lib/messageRepository';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; messageId: string }> }
) {
  try {
    const { id, messageId } = await params;
    const conversationId = Number.parseInt(id, 10);
    const targetMessageId = Number.parseInt(messageId, 10);
    const payload = await recallConversationMessage(conversationId, targetMessageId);

    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to recall conversation message';

    return NextResponse.json(
      { error: message },
      { status: /不存在|只能撤回|已经撤回|无权/.test(message) ? 400 : 500 }
    );
  }
}
