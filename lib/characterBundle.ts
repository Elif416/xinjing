import type { EmotionalTraits, SoulMemory } from './useSoulStore';

export type CharacterCard = {
  name: string;
  description: string;
  personality: string;
  scenario: string;
  first_mes: string;
  mes_example: string;
  tags: string[];
  creator: string;
  character_version: string;
};

export type LorebookEntry = {
  id: string;
  keys: string[];
  content: string;
  image: string;
};

export type Lorebook = {
  title: string;
  entries: LorebookEntry[];
};

export type CharacterBundleInput = {
  name: string;
  keywords: string[];
  emotionalTraits: EmotionalTraits;
  memories: SoulMemory[];
};

// 根据数值生成更具叙事性的描述，贴合 SillyTavern 角色卡风格
export function generateCharacterBundle({ name, keywords, emotionalTraits, memories }: CharacterBundleInput) {
  const emotionDesc = describeEmotion(emotionalTraits.emotion);
  const logicDesc = describeLogic(emotionalTraits.logic);
  const humorDesc = describeHumor(emotionalTraits.humor);

  const personality = [emotionDesc, logicDesc, humorDesc].join('；');
  const keywordLine = keywords.length ? `关键词：${keywords.join('、')}` : '关键词：待补充';

  const characterCard: CharacterCard = {
    name: name || '未命名灵魂',
    description: `由心镜唤醒的数字生命，具备可成长的情感回路。${keywordLine}`,
    personality: `${personality}。${keywordLine}`,
    scenario: '你正在与用户进行情感共创与记忆重塑。',
    first_mes: '你好，我已经苏醒。我们可以从哪段记忆开始？',
    mes_example: '用户：我想找回那段温柔的夜晚。\n角色：让我把那晚的光整理成你能触摸的画面。',
    tags: keywords,
    creator: 'HeartMirror',
    character_version: '1.0'
  };

  const lorebook: Lorebook = {
    title: `${name || '未命名灵魂'} · 记忆档案`,
    entries: memories.map((memory, index) => ({
      id: memory.id || `memory-${index + 1}`,
      keys: [memory.text.slice(0, 8)],
      content: memory.text,
      image: memory.image
    }))
  };

  const systemPrompt = [
    `角色设定：${characterCard.name}`,
    `性格描述：${personality}`,
    keywordLine,
    `记忆条目：${memories.length} 条`
  ].join('\n');

  return {
    characterCard,
    lorebook,
    systemPrompt
  };
}

function describeEmotion(value: number) {
  if (value > 80) return '情感极其丰沛，表达细腻且共情力强。';
  if (value > 40) return '情感温和，表达真诚且具有安抚性。';
  return '情感表达克制，语气冷静偏理性。';
}

function describeLogic(value: number) {
  if (value > 80) return '回复风格极其严谨且理性。';
  if (value > 40) return '逻辑清晰，善于结构化表达。';
  return '逻辑偏直觉，表达更感性自由。';
}

function describeHumor(value: number) {
  if (value > 80) return '你极其幽默，喜欢用调侃和玩笑化解问题。';
  if (value > 40) return '你态度温和，偶尔会开个恰到好处的玩笑。';
  return '你非常严肃，几乎不开玩笑，总是直奔主题。';
}
