import type {
  AgentConfigInput,
  AgentPersonaResult,
  AgentReply
} from './agentTypes';

type ChatTurn = {
  role: 'user' | 'assistant';
  text: string;
};

const baseUrl = process.env.DEEPSEEK_BASE_URL ?? 'https://api.deepseek.com';
const apiKey = process.env.DEEPSEEK_API_KEY;
const model = process.env.DEEPSEEK_MODEL ?? 'deepseek-chat';

export async function generateAgentPersona(
  input: AgentConfigInput
): Promise<AgentPersonaResult> {
  const fallback = buildFallbackPersona(input);

  if (!apiKey) {
    return fallback;
  }

  const prompt = [
    '请根据以下设定整理一个长期陪伴型智能体人设。',
    '必须只返回 JSON，不要输出代码块，不要输出额外解释。',
    'JSON 字段固定为：systemPrompt, personaSummary, greeting, storyOptions。',
    '其中 storyOptions 必须是 3 条简短中文选项数组。',
    '',
    `名字：${input.name || '未命名智能体'}`,
    `关键词：${input.keywords.join('、') || '暂无'}`,
    `感性程度：${input.emotionalTraits.emotion}`,
    `逻辑性：${input.emotionalTraits.logic}`,
    `幽默感：${input.emotionalTraits.humor}`,
    '',
    '记忆碎片：',
    ...formatMemories(input),
    '',
    '世界书内容：',
    input.worldbookText || '暂无世界书',
    '',
    '角色卡内容：',
    input.characterCardText || '暂无角色卡'
  ].join('\n');

  const content = await callDeepSeek([
    {
      role: 'system',
      content:
        '你是一个擅长构建中文角色设定、开场问候和剧情分支选项的叙事设计师。输出必须是合法 JSON。'
    },
    { role: 'user', content: prompt }
  ]);

  if (!content) {
    return fallback;
  }

  const parsed = parseJson<AgentPersonaResult>(content);
  if (!parsed) {
    return fallback;
  }

  return {
    systemPrompt: parsed.systemPrompt?.trim() || fallback.systemPrompt,
    personaSummary: parsed.personaSummary?.trim() || fallback.personaSummary,
    greeting: parsed.greeting?.trim() || fallback.greeting,
    storyOptions: normalizeOptions(parsed.storyOptions, fallback.storyOptions)
  };
}

export async function generateAgentReply({
  agentName,
  systemPrompt,
  history,
  userMessage
}: {
  agentName: string;
  systemPrompt: string;
  history: ChatTurn[];
  userMessage: string;
}): Promise<AgentReply> {
  const fallback = buildFallbackReply(agentName, userMessage, history);

  if (!apiKey) {
    return fallback;
  }

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    {
      role: 'system',
      content: [
        systemPrompt,
        '',
        '你必须只输出 JSON，不要输出代码块。',
        'JSON 字段固定为：text, options。',
        'options 必须是 3 条中文剧情推进选项数组。'
      ].join('\n')
    },
    ...history.map((item) => ({
      role: item.role,
      content: item.text
    })),
    {
      role: 'user',
      content: userMessage
    }
  ];

  const content = await callDeepSeek(messages);
  if (!content) {
    return fallback;
  }

  const parsed = parseJson<{ text?: string; options?: string[] }>(content);
  if (!parsed?.text) {
    return fallback;
  }

  return {
    text: parsed.text.trim() || fallback.text,
    options: normalizeOptions(parsed.options, fallback.options)
  };
}

async function callDeepSeek(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
) {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        stream: false,
        temperature: 0.7,
        messages
      })
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return payload.choices?.[0]?.message?.content?.trim() ?? null;
  } catch {
    return null;
  }
}

function buildFallbackPersona(input: AgentConfigInput): AgentPersonaResult {
  const keywordText = input.keywords.join('、') || '温柔、细腻';
  const memories = formatMemories(input).join('；') || '暂无可用记忆';

  return {
    systemPrompt: [
      `你是智能体“${input.name || '未命名智能体'}”。`,
      `你的核心关键词是：${keywordText}。`,
      `你的情感参数为：感性 ${input.emotionalTraits.emotion}，逻辑 ${input.emotionalTraits.logic}，幽默 ${input.emotionalTraits.humor}。`,
      `你会把这些记忆视作长期陪伴的根基：${memories}。`,
      '请用中文进行温柔但具叙事张力的互动，并在每次回答结尾提供 3 个简短的剧情推进选项。'
    ].join('\n'),
    personaSummary: `围绕 ${keywordText} 展开的陪伴型角色，记忆核心包括：${memories}。`,
    greeting: `你好，我是${input.name || '你的新智能体'}。我已经记住你交给我的线索，想先陪你从哪一段故事开始？`,
    storyOptions: buildStoryOptions(input.keywords)
  };
}

function buildFallbackReply(
  agentName: string,
  userMessage: string,
  history: ChatTurn[]
): AgentReply {
  const hasHistory = history.length > 0;

  return {
    text: hasHistory
      ? `${agentName}收到了你的新线索：“${userMessage}”。我会顺着这条情绪继续推进，把它编织进接下来的故事里。`
      : `${agentName}已经听见你刚才的话：“${userMessage}”。我们可以从这句开始，把人物关系和世界背景慢慢铺开。`,
    options: [
      '继续扩展当前情节',
      '追问角色隐藏动机',
      '切换到新的故事分支'
    ]
  };
}

function buildStoryOptions(keywords: string[]) {
  const first = keywords[0] ?? '记忆线索';
  const second = keywords[1] ?? '人物关系';
  const third = keywords[2] ?? '世界背景';

  return [
    `从${first}开始推进故事`,
    `深入${second}背后的秘密`,
    `扩展${third}对应的场景`
  ];
}

function formatMemories(input: AgentConfigInput) {
  return input.memories.map((memory) => {
    const kind = memory.kind === 'image' ? '图片记忆' : '文本记忆';
    const fileName = memory.fileName ? `（${memory.fileName}）` : '';
    const text = memory.text?.trim() || '无附加说明';
    return `- ${kind}${fileName}：${memory.title}；${text}`;
  });
}

function normalizeOptions(options: string[] | undefined, fallback: string[]) {
  const normalized = (options ?? [])
    .map((item) => String(item).trim())
    .filter(Boolean)
    .slice(0, 3);

  if (normalized.length === 3) {
    return normalized;
  }

  return fallback;
}

function parseJson<T>(content: string): T | null {
  const direct = tryParseJson<T>(content);
  if (direct) {
    return direct;
  }

  const stripped = content
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
  const strippedParsed = tryParseJson<T>(stripped);
  if (strippedParsed) {
    return strippedParsed;
  }

  const match = stripped.match(/\{[\s\S]*\}/);
  if (!match) {
    return null;
  }

  return tryParseJson<T>(match[0]);
}

function tryParseJson<T>(content: string) {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
