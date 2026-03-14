import { NextResponse } from 'next/server';

import {
  deleteConversationForCurrentUser,
  getMessageConversationDetail
} from '@/lib/messageRepository';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = Number.parseInt(id, 10);
    const payload = await getMessageConversationDetail(conversationId);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to load message conversation';

    return NextResponse.json(
      { error: message },
      { status: /不存在|无权/.test(message) ? 404 : 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = Number.parseInt(id, 10);
    const payload = await deleteConversationForCurrentUser(conversationId);
    return NextResponse.json(payload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete message conversation';

    return NextResponse.json(
      { error: message },
      { status: /不存在|无权/.test(message) ? 404 : 500 }
    );
  }
}
