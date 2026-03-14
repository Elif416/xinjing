import { NextResponse } from 'next/server';

import { getMessageUnreadSummary } from '@/lib/messageRepository';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const payload = await getMessageUnreadSummary();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to load unread summary'
      },
      { status: 500 }
    );
  }
}
