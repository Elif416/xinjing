import { NextResponse } from 'next/server';

import { sendConversationMessage } from '@/lib/messageRepository';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const conversationId = Number.parseInt(id, 10);
    const formData = await request.formData();
    const content = getString(formData, 'content');
    const replyToId = getOptionalNumber(formData, 'replyToId');
    const image = getFile(formData, 'image');
    const payload = await sendConversationMessage(conversationId, { content, replyToId }, image);

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to send conversation message';

    return NextResponse.json(
      { error: message },
      { status: /请输入|仅支持|不能超过|不存在|无权/.test(message) ? 400 : 500 }
    );
  }
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

function getOptionalNumber(formData: FormData, key: string) {
  const raw = getString(formData, key);
  if (!raw) {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function getFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof File !== 'undefined' && value instanceof File && value.size > 0 ? value : null;
}
