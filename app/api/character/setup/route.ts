import { NextResponse } from 'next/server';

// 角色设定写入接口：将 System Prompt / Character Card / Lorebook 转发至 DeepSeek
// TODO: 在环境变量中配置 DEEPSEEK_API_KEY / DEEPSEEK_BASE_URL / DEEPSEEK_MODEL
export async function POST(request: Request) {
  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
    const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing DEEPSEEK_API_KEY' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { systemPrompt, characterCard, lorebook } = body ?? {};

    const systemText = [
      '【System Prompt】',
      systemPrompt ?? '',
      '【Character Card】',
      JSON.stringify(characterCard ?? {}),
      '【Lorebook】',
      JSON.stringify(lorebook ?? {})
    ].join('\n');

    const payload = {
      model,
      messages: [
        { role: 'system', content: systemText },
        { role: 'user', content: '确认收到设定。' }
      ],
      stream: false
    };

    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: 'DeepSeek request failed', detail: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}