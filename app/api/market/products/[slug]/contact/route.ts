import { NextResponse } from 'next/server';

import { startMarketSupportConversation } from '@/lib/marketSupportRepository';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const conversation = await startMarketSupportConversation(slug);

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '创建客服会话失败';

    return NextResponse.json(
      { error: message },
      { status: /商品不存在/.test(message) ? 400 : 500 }
    );
  }
}
