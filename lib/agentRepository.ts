import 'server-only';

import { supabaseAdmin } from './supabaseAdmin';
import { generateAgentPersona, generateAgentReply } from './deepseekAgent';
import type {
  AgentConfigInput,
  AgentDetail,
  AgentListItem,
  AgentMemory,
  AgentMessage,
  AgentPersonaResult,
  AgentReply,
  AgentStatus,
  EmotionalTraits
} from './agentTypes';

type UserRow = {
  userid: number;
  account: string | null;
  nickname: string | null;
};

type WorldbookRow = {
  worldid: number;
  worldname: string | null;
  settinglore: string | null;
  rules: string | null;
};

type CharacterCardRow = {
  cardid: number;
  charname: string | null;
  personality: string | null;
  appearance: string | null;
  dialoguestyle: string | null;
};

type AgentRow = {
  agentid: number;
  creatorid: number | null;
  agentname: string | null;
  systemprompt: string | null;
  temperature: number | null;
  modeltype: string | null;
  avatarurl: string | null;
  worldid: number | null;
  cardid: number | null;
  worldbooks: WorldbookRow | WorldbookRow[] | null;
  charactercards: CharacterCardRow | CharacterCardRow[] | null;
};

type ChatlogRow = {
  logid: number;
  agentid: number | null;
  userid: number | null;
  userinput: string | null;
  airesponse: string | null;
  logtimestamp: string | null;
};

type AgentMetadata = {
  keywords: string[];
  emotionalTraits: EmotionalTraits;
  memories: AgentMemory[];
  characterCardFileName?: string;
};

type WorldbookMetadata = {
  worldbookFileName?: string;
};

const AGENT_SELECT = [
  'agentid',
  'creatorid',
  'agentname',
  'systemprompt',
  'temperature',
  'modeltype',
  'avatarurl',
  'worldid',
  'cardid',
  'worldbooks(worldid,worldname,settinglore,rules)',
  'charactercards(cardid,charname,personality,appearance,dialoguestyle)'
].join(',');

const DEFAULT_TRAITS: EmotionalTraits = {
  emotion: 60,
  logic: 50,
  humor: 55
};

export async function listAgents() {
  const user = await ensureAppUser();
  const { data, error } = await supabaseAdmin
    .from('agents')
    .select(AGENT_SELECT)
    .eq('creatorid', user.userid)
    .order('agentid', { ascending: false });

  if (error) {
    throw new Error(`Failed to list agents: ${error.message}`);
  }

  const agents = (data ?? []) as unknown as AgentRow[];
  const logMap = await getLatestChatlogMap(agents.map((agent) => agent.agentid));

  return agents.map((agent) => mapAgentListItem(agent, logMap.get(agent.agentid) ?? null));
}

export async function getAgentDetail(agentId: number) {
  const user = await ensureAppUser();
  const agent = await getAgentRow(agentId, user.userid);
  if (!agent) {
    return null;
  }

  const messages = await getAgentMessages(agentId);
  return mapAgentDetail(agent, messages);
}

export async function createAgent(input: AgentConfigInput) {
  const user = await ensureAppUser();

  const [worldId, cardId, agentId] = await Promise.all([
    getNextId('worldbooks', 'worldid'),
    getNextId('charactercards', 'cardid'),
    getNextId('agents', 'agentid')
  ]);

  const normalized = normalizeAgentInput(input);
  const avatarUrl = normalized.avatarUrl || normalized.memories.find((item) => item.imageUrl)?.imageUrl || '/mock-soul.svg';

  const { error: worldError } = await supabaseAdmin.from('worldbooks').insert({
    worldid: worldId,
    worldname: `${normalized.name} 世界书`,
    settinglore: normalized.worldbookText,
    rules: JSON.stringify({
      worldbookFileName: normalized.worldbookFileName || ''
    } satisfies WorldbookMetadata)
  });

  if (worldError) {
    throw new Error(`Failed to create worldbook: ${worldError.message}`);
  }

  const { error: cardError } = await supabaseAdmin.from('charactercards').insert({
    cardid: cardId,
    charname: normalized.name,
    personality: '',
    appearance: JSON.stringify({
      keywords: normalized.keywords,
      emotionalTraits: normalized.emotionalTraits,
      memories: normalized.memories,
      characterCardFileName: normalized.characterCardFileName || ''
    } satisfies AgentMetadata),
    dialoguestyle: normalized.characterCardText
  });

  if (cardError) {
    throw new Error(`Failed to create character card: ${cardError.message}`);
  }

  const { error: agentError } = await supabaseAdmin.from('agents').insert({
    agentid: agentId,
    creatorid: user.userid,
    agentname: normalized.name,
    systemprompt: '',
    temperature: 0.8,
    modeltype: composeModelType('building'),
    avatarurl: avatarUrl,
    worldid: worldId,
    cardid: cardId
  });

  if (agentError) {
    throw new Error(`Failed to create agent: ${agentError.message}`);
  }

  const detail = await getAgentDetail(agentId);
  if (!detail) {
    throw new Error('Failed to load created agent');
  }

  return detail;
}

export async function initializeAgent(agentId: number) {
  const user = await ensureAppUser();
  const agent = await getAgentRow(agentId, user.userid);
  if (!agent) {
    return null;
  }

  const input = buildAgentInputFromRow(agent);
  const persona = await generateAgentPersona(input);

  await persistPersona(agent, input, persona, false);

  return getAgentDetail(agentId);
}

export async function updateAgent(agentId: number, input: AgentConfigInput) {
  const user = await ensureAppUser();
  const agent = await getAgentRow(agentId, user.userid);
  if (!agent) {
    return null;
  }

  const normalized = normalizeAgentInput(input);
  const worldbook = unwrapRelation(agent.worldbooks);
  const card = unwrapRelation(agent.charactercards);

  if (!worldbook || !card) {
    throw new Error('Agent relations are incomplete');
  }

  const { error: worldError } = await supabaseAdmin
    .from('worldbooks')
    .update({
      worldname: `${normalized.name} 世界书`,
      settinglore: normalized.worldbookText,
      rules: JSON.stringify({
        worldbookFileName: normalized.worldbookFileName || ''
      } satisfies WorldbookMetadata)
    })
    .eq('worldid', worldbook.worldid);

  if (worldError) {
    throw new Error(`Failed to update worldbook: ${worldError.message}`);
  }

  const { error: cardError } = await supabaseAdmin
    .from('charactercards')
    .update({
      charname: normalized.name,
      appearance: JSON.stringify({
        keywords: normalized.keywords,
        emotionalTraits: normalized.emotionalTraits,
        memories: normalized.memories,
        characterCardFileName: normalized.characterCardFileName || ''
      } satisfies AgentMetadata),
      dialoguestyle: normalized.characterCardText
    })
    .eq('cardid', card.cardid);

  if (cardError) {
    throw new Error(`Failed to update character card: ${cardError.message}`);
  }

  const persona = await generateAgentPersona(normalized);
  await persistPersona(agent, normalized, persona, true);

  return getAgentDetail(agentId);
}

export async function sendMessageToAgent(agentId: number, input: string, imageUrls: string[]) {
  const user = await ensureAppUser();
  const agent = await getAgentRow(agentId, user.userid);
  if (!agent) {
    return null;
  }

  const detail = mapAgentDetail(agent, await getAgentMessages(agentId));
  const normalizedInput = formatUserMessage(input, imageUrls);
  const history = detail.messages.map((message) => ({
    role: message.role,
    text: message.text
  }));

  const reply = await generateAgentReply({
    agentName: detail.name,
    systemPrompt: detail.systemPrompt,
    history,
    userMessage: normalizedInput
  });

  await insertChatlog({
    agentId,
    userId: user.userid,
    userInput: normalizedInput,
    reply
  });

  return getAgentDetail(agentId);
}

async function persistPersona(
  agent: AgentRow,
  input: AgentConfigInput,
  persona: AgentPersonaResult,
  addUpdateGreeting: boolean
) {
  const worldbook = unwrapRelation(agent.worldbooks);
  const card = unwrapRelation(agent.charactercards);

  if (!worldbook || !card) {
    throw new Error('Agent relations are incomplete');
  }

  const avatarUrl =
    input.avatarUrl ||
    input.memories.find((item) => item.imageUrl)?.imageUrl ||
    agent.avatarurl ||
    '/mock-soul.svg';

  const { error: cardError } = await supabaseAdmin
    .from('charactercards')
    .update({
      charname: input.name,
      personality: persona.personaSummary,
      appearance: JSON.stringify({
        keywords: input.keywords,
        emotionalTraits: input.emotionalTraits,
        memories: input.memories,
        characterCardFileName: input.characterCardFileName || ''
      } satisfies AgentMetadata),
      dialoguestyle: input.characterCardText
    })
    .eq('cardid', card.cardid);

  if (cardError) {
    throw new Error(`Failed to persist persona: ${cardError.message}`);
  }

  const { error: worldError } = await supabaseAdmin
    .from('worldbooks')
    .update({
      worldname: `${input.name} 世界书`,
      settinglore: input.worldbookText,
      rules: JSON.stringify({
        worldbookFileName: input.worldbookFileName || ''
      } satisfies WorldbookMetadata)
    })
    .eq('worldid', worldbook.worldid);

  if (worldError) {
    throw new Error(`Failed to persist worldbook: ${worldError.message}`);
  }

  const { error: agentError } = await supabaseAdmin
    .from('agents')
    .update({
      agentname: input.name,
      systemprompt: persona.systemPrompt,
      avatarurl: avatarUrl,
      modeltype: composeModelType('ready')
    })
    .eq('agentid', agent.agentid);

  if (agentError) {
    throw new Error(`Failed to update agent prompt: ${agentError.message}`);
  }

  const existingMessages = await getAgentMessages(agent.agentid);

  if (existingMessages.length === 0 || addUpdateGreeting) {
    const text = addUpdateGreeting
      ? `我已经根据最新设定完成调整。\n\n${persona.greeting}`
      : persona.greeting;

    await insertChatlog({
      agentId: agent.agentid,
      userId: agent.creatorid ?? (await ensureAppUser()).userid,
      userInput: '',
      reply: {
        text,
        options: persona.storyOptions
      }
    });
  }
}

async function getAgentRow(agentId: number, userId: number) {
  const { data, error } = await supabaseAdmin
    .from('agents')
    .select(AGENT_SELECT)
    .eq('agentid', agentId)
    .eq('creatorid', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load agent: ${error.message}`);
  }

  return (data as AgentRow | null) ?? null;
}

async function getAgentMessages(agentId: number) {
  const { data, error } = await supabaseAdmin
    .from('chatlogs')
    .select('logid,agentid,userid,userinput,airesponse,logtimestamp')
    .eq('agentid', agentId)
    .order('logtimestamp', { ascending: true })
    .order('logid', { ascending: true });

  if (error) {
    throw new Error(`Failed to load chat logs: ${error.message}`);
  }

  return mapChatlogs((data ?? []) as ChatlogRow[]);
}

async function getLatestChatlogMap(agentIds: number[]) {
  const map = new Map<number, ChatlogRow>();
  if (agentIds.length === 0) {
    return map;
  }

  const { data, error } = await supabaseAdmin
    .from('chatlogs')
    .select('logid,agentid,userid,userinput,airesponse,logtimestamp')
    .in('agentid', agentIds)
    .order('logtimestamp', { ascending: false })
    .order('logid', { ascending: false });

  if (error) {
    throw new Error(`Failed to load latest chat logs: ${error.message}`);
  }

  for (const row of (data ?? []) as ChatlogRow[]) {
    const agentId = row.agentid;
    if (!agentId || map.has(agentId)) {
      continue;
    }
    map.set(agentId, row);
  }

  return map;
}

async function insertChatlog({
  agentId,
  userId,
  userInput,
  reply
}: {
  agentId: number;
  userId: number;
  userInput: string;
  reply: AgentReply;
}) {
  const logId = await getNextId('chatlogs', 'logid');

  const { error } = await supabaseAdmin.from('chatlogs').insert({
    logid: logId,
    agentid: agentId,
    userid: userId,
    userinput: userInput,
    airesponse: JSON.stringify(reply),
    logtimestamp: new Date().toISOString()
  });

  if (error) {
    throw new Error(`Failed to insert chat log: ${error.message}`);
  }
}

async function ensureAppUser() {
  const account = process.env.AUTH_EMAIL?.trim() || 'heartmirror@app.local';

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('userid,account,nickname')
    .eq('account', account)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load app user: ${error.message}`);
  }

  if (data) {
    return data as UserRow;
  }

  const userId = await getNextId('users', 'userid');
  const nickname = account.split('@')[0] || 'HeartMirror';

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      userid: userId,
      account,
      passwordhash: '',
      nickname,
      userrole: 'User',
      createdat: new Date().toISOString()
    })
    .select('userid,account,nickname')
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to create app user: ${insertError?.message ?? 'Unknown error'}`);
  }

  return inserted as UserRow;
}

async function getNextId(table: string, column: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(column)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to allocate id for ${table}: ${error.message}`);
  }

  const current = Number(
    data && typeof data === 'object' ? (data as Record<string, unknown>)[column] : 0
  );

  return Number.isFinite(current) ? current + 1 : 1;
}

function mapAgentListItem(agent: AgentRow, latestLog: ChatlogRow | null): AgentListItem {
  const card = unwrapRelation(agent.charactercards);
  const metadata = parseAgentMetadata(card?.appearance);
  const lastReply = parseReply(latestLog?.airesponse ?? '');
  const updatedAt = latestLog?.logtimestamp || new Date(0).toISOString();

  return {
    id: agent.agentid,
    name: agent.agentname?.trim() || card?.charname?.trim() || `Agent ${agent.agentid}`,
    status: parseAgentStatus(agent.modeltype),
    summary:
      card?.personality?.trim() ||
      lastReply.text ||
      (metadata.keywords.length > 0 ? metadata.keywords.join(' / ') : '等待初始化'),
    avatarUrl: agent.avatarurl?.trim() || '/mock-soul.svg',
    updatedAt,
    keywords: metadata.keywords
  };
}

function mapAgentDetail(agent: AgentRow, messages: AgentMessage[]): AgentDetail {
  const listItem = mapAgentListItem(agent, null);
  const worldbook = unwrapRelation(agent.worldbooks);
  const card = unwrapRelation(agent.charactercards);
  const metadata = parseAgentMetadata(card?.appearance);
  const worldbookMeta = parseWorldbookMetadata(worldbook?.rules);
  const greeting =
    messages.find((message) => message.role === 'assistant')?.text ||
    '智能体正在等待与你建立第一段对话。';

  return {
    ...listItem,
    summary: card?.personality?.trim() || listItem.summary,
    systemPrompt: agent.systemprompt?.trim() || '',
    personaSummary: card?.personality?.trim() || '',
    greeting,
    emotionalTraits: metadata.emotionalTraits,
    worldbookText: worldbook?.settinglore?.trim() || '',
    worldbookFileName: worldbookMeta.worldbookFileName || undefined,
    characterCardText: card?.dialoguestyle?.trim() || '',
    characterCardFileName: metadata.characterCardFileName || undefined,
    memories: metadata.memories,
    messages
  };
}

function mapChatlogs(rows: ChatlogRow[]) {
  const messages: AgentMessage[] = [];

  for (const row of rows) {
    const createdAt = row.logtimestamp || new Date().toISOString();
    const reply = parseReply(row.airesponse ?? '');

    if (row.userinput?.trim()) {
      messages.push({
        id: row.logid * 2,
        role: 'user',
        text: row.userinput.trim(),
        options: [],
        createdAt
      });
    }

    if (reply.text) {
      messages.push({
        id: row.logid * 2 + 1,
        role: 'assistant',
        text: reply.text,
        options: reply.options,
        createdAt
      });
    }
  }

  return messages;
}

function buildAgentInputFromRow(agent: AgentRow): AgentConfigInput {
  const worldbook = unwrapRelation(agent.worldbooks);
  const card = unwrapRelation(agent.charactercards);
  const metadata = parseAgentMetadata(card?.appearance);
  const worldbookMeta = parseWorldbookMetadata(worldbook?.rules);

  return normalizeAgentInput({
    name: agent.agentname?.trim() || card?.charname?.trim() || '未命名智能体',
    keywords: metadata.keywords,
    emotionalTraits: metadata.emotionalTraits,
    memories: metadata.memories,
    worldbookText: worldbook?.settinglore?.trim() || '',
    worldbookFileName: worldbookMeta.worldbookFileName || '',
    characterCardText: card?.dialoguestyle?.trim() || '',
    characterCardFileName: metadata.characterCardFileName || '',
    avatarUrl: agent.avatarurl?.trim() || ''
  });
}

function normalizeAgentInput(input: AgentConfigInput): AgentConfigInput {
  return {
    ...input,
    name: input.name.trim() || '未命名智能体',
    keywords: input.keywords
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 12),
    emotionalTraits: {
      emotion: clampTrait(input.emotionalTraits.emotion),
      logic: clampTrait(input.emotionalTraits.logic),
      humor: clampTrait(input.emotionalTraits.humor)
    },
    memories: input.memories.map((memory) => ({
      ...memory,
      title: memory.title.trim() || '未命名记忆',
      text: memory.text.trim(),
      imageUrl: memory.imageUrl?.trim(),
      fileName: memory.fileName?.trim()
    })),
    worldbookText: input.worldbookText.trim(),
    worldbookFileName: input.worldbookFileName?.trim(),
    characterCardText: input.characterCardText.trim(),
    characterCardFileName: input.characterCardFileName?.trim(),
    avatarUrl: input.avatarUrl?.trim()
  };
}

function parseAgentMetadata(value: string | null | undefined): AgentMetadata {
  const parsed = safeParse<Record<string, unknown>>(value);
  const emotionalTraits = safeParseTraits(parsed?.emotionalTraits);

  return {
    keywords: Array.isArray(parsed?.keywords)
      ? parsed.keywords
          .map((item) => String(item).trim())
          .filter(Boolean)
      : [],
    emotionalTraits,
    memories: parseMemories(parsed?.memories),
    characterCardFileName:
      typeof parsed?.characterCardFileName === 'string' ? parsed.characterCardFileName : undefined
  };
}

function parseWorldbookMetadata(value: string | null | undefined): WorldbookMetadata {
  const parsed = safeParse<Record<string, unknown>>(value);
  return {
    worldbookFileName:
      typeof parsed?.worldbookFileName === 'string' ? parsed.worldbookFileName : undefined
  };
}

function parseMemories(value: unknown): AgentMemory[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const memories: AgentMemory[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const record = item as Record<string, unknown>;
    const kind = record.kind === 'image' ? 'image' : 'text';

    memories.push({
      id: typeof record.id === 'string' ? record.id : `memory-${Date.now()}`,
      kind,
      title: typeof record.title === 'string' ? record.title : '记忆碎片',
      text: typeof record.text === 'string' ? record.text : '',
      imageUrl: typeof record.imageUrl === 'string' ? record.imageUrl : undefined,
      fileName: typeof record.fileName === 'string' ? record.fileName : undefined
    });
  }

  return memories;
}

function safeParseTraits(value: unknown): EmotionalTraits {
  if (!value || typeof value !== 'object') {
    return DEFAULT_TRAITS;
  }

  const record = value as Record<string, unknown>;

  return {
    emotion: clampTrait(Number(record.emotion)),
    logic: clampTrait(Number(record.logic)),
    humor: clampTrait(Number(record.humor))
  };
}

function parseReply(value: string) {
  const parsed = safeParse<Record<string, unknown>>(value);
  if (parsed && typeof parsed.text === 'string') {
    return {
      text: parsed.text,
      options: Array.isArray(parsed.options)
        ? parsed.options.map((item) => String(item).trim()).filter(Boolean)
        : []
    };
  }

  return {
    text: value?.trim() || '',
    options: []
  };
}

function formatUserMessage(input: string, imageUrls: string[]) {
  const segments = [input.trim()].filter(Boolean);

  if (imageUrls.length > 0) {
    segments.push(
      ...imageUrls.map((url, index) => `附加图片 ${index + 1}：${url}`)
    );
  }

  return segments.join('\n');
}

function composeModelType(status: AgentStatus) {
  return `deepseek-chat|${status}`;
}

function parseAgentStatus(modelType: string | null | undefined): AgentStatus {
  if (!modelType) {
    return 'ready';
  }

  if (modelType.includes('|building')) {
    return 'building';
  }

  if (modelType.includes('|error')) {
    return 'error';
  }

  return 'ready';
}

function clampTrait(value: number) {
  if (!Number.isFinite(value)) {
    return 50;
  }

  return Math.max(0, Math.min(100, Math.round(value)));
}

function safeParse<T>(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function unwrapRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}
