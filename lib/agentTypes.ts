export type EmotionalTraits = {
  emotion: number;
  logic: number;
  humor: number;
};

export type AgentMemoryKind = 'image' | 'text';

export type AgentMemory = {
  id: string;
  kind: AgentMemoryKind;
  title: string;
  text: string;
  imageUrl?: string;
  fileName?: string;
};

export type AgentConfigInput = {
  name: string;
  keywords: string[];
  emotionalTraits: EmotionalTraits;
  memories: AgentMemory[];
  worldbookText: string;
  worldbookFileName?: string;
  characterCardText: string;
  characterCardFileName?: string;
  avatarUrl?: string;
};

export type AgentStatus = 'building' | 'ready' | 'error';

export type AgentListItem = {
  id: number;
  name: string;
  status: AgentStatus;
  summary: string;
  avatarUrl: string;
  updatedAt: string;
  keywords: string[];
};

export type AgentMessage = {
  id: number;
  role: 'user' | 'assistant';
  text: string;
  options: string[];
  createdAt: string;
};

export type AgentDetail = AgentListItem & {
  systemPrompt: string;
  personaSummary: string;
  greeting: string;
  emotionalTraits: EmotionalTraits;
  worldbookText: string;
  worldbookFileName?: string;
  characterCardText: string;
  characterCardFileName?: string;
  memories: AgentMemory[];
  messages: AgentMessage[];
};

export type AgentReply = {
  text: string;
  options: string[];
};

export type AgentPersonaResult = {
  systemPrompt: string;
  personaSummary: string;
  greeting: string;
  storyOptions: string[];
};
