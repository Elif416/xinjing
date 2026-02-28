import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import type { CharacterCard, Lorebook } from './characterBundle';

export type EmotionalTraits = {
  emotion: number;
  logic: number;
  humor: number;
};

export type SoulMemory = {
  id: string;
  text: string;
  image: string;
};

export type CharacterBundle = {
  characterCard: CharacterCard;
  lorebook: Lorebook;
  systemPrompt: string;
};

export type SoulState = {
  name: string;
  keywords: string[];
  emotionalTraits: EmotionalTraits;
  memories: SoulMemory[];
  characterBundle: CharacterBundle | null;
  setName: (name: string) => void;
  setKeywords: (keywords: string[]) => void;
  setEmotionalTraits: (traits: EmotionalTraits) => void;
  setMemories: (memories: SoulMemory[]) => void;
  addMemory: (memory: SoulMemory) => void;
  removeMemory: (id: string) => void;
  setCharacterBundle: (bundle: CharacterBundle) => void;
};

// useSoulStore：灵魂活化配置的持久化状态
// 使用 Zustand + persist，确保刷新后依旧能恢复配置
export const useSoulStore = create<SoulState>()(
  persist(
    (set) => ({
      name: '',
      keywords: [],
      emotionalTraits: { emotion: 60, logic: 50, humor: 55 },
      memories: [],
      characterBundle: null,
      setName: (name) => set({ name }),
      setKeywords: (keywords) => set({ keywords }),
      setEmotionalTraits: (traits) => set({ emotionalTraits: traits }),
      setMemories: (memories) => set({ memories }),
      addMemory: (memory) =>
        set((state) => ({ memories: [...state.memories, memory] })),
      removeMemory: (id) =>
        set((state) => ({ memories: state.memories.filter((item) => item.id !== id) })),
      setCharacterBundle: (bundle) => set({ characterBundle: bundle })
    }),
    {
      name: 'heartmirror-soul-store',
      storage: createJSONStorage(() => localStorage)
    }
  )
);