'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, ChevronDown, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { AgentConfigEditor, type AgentEditorDraft } from '@/components/agent/AgentConfigEditor';
import { ActivationTrigger } from '@/components/activation/ActivationTrigger';
import { GlassCard } from '@/components/GlassCard';
import { GlassNavbar } from '@/components/GlassNavbar';
import activationData from '@/data/activation.json';
import homeData from '@/data/home.json';
import type { AgentConfigInput, AgentListItem } from '@/lib/agentTypes';

const INITIAL_DRAFT: AgentEditorDraft = {
  name: '',
  keywordsInput: '',
  emotionalTraits: {
    emotion: 70,
    logic: 50,
    humor: 55
  },
  memories: [],
  worldbookText: '',
  worldbookFileName: '',
  characterCardText: '',
  characterCardFileName: ''
};

export default function ActivationPage() {
  const router = useRouter();
  const setupRef = useRef<HTMLDivElement | null>(null);

  const [draft, setDraft] = useState<AgentEditorDraft>(INITIAL_DRAFT);
  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const activationNavItems = useMemo(() => {
    const items = Array.isArray(homeData.nav) ? homeData.nav : [];
    return items.map((item) => ({
      ...item,
      href: item.href.startsWith('#') ? `/${item.href}` : item.href
    }));
  }, []);

  const resonanceScore = useMemo(() => {
    const memoriesWeight = Math.min(45, draft.memories.length * 12);
    const textWeight = draft.worldbookText || draft.characterCardText ? 20 : 0;
    const traitWeight =
      (draft.emotionalTraits.emotion + draft.emotionalTraits.logic + draft.emotionalTraits.humor) /
      5;

    return Math.min(100, Math.round(memoriesWeight + textWeight + traitWeight));
  }, [draft]);

  useEffect(() => {
    async function loadAgents() {
      setLoadingAgents(true);

      try {
        const response = await fetch('/api/agents', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('智能体列表加载失败');
        }

        const payload = (await response.json()) as { items: AgentListItem[] };
        setAgents(payload.items ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : '智能体列表加载失败，请稍后重试。'
        );
      } finally {
        setLoadingAgents(false);
      }
    }

    void loadAgents();
  }, []);

  const handleCreateAgent = async () => {
    if (!draft.name.trim()) {
      setError('请先填写智能体名字。');
      setupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setCreating(true);
    setError('');

    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildCreatePayload(draft))
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || '智能体创建失败');
      }

      const payload = (await response.json()) as { id: number };
      router.push(`/chat?agentId=${payload.id}`);
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : '智能体创建失败，请稍后重试。'
      );
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050915] text-white">
      <div className="page-bg activation-bg">
        <GlassNavbar
          brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }}
          items={activationNavItems}
        />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
          <section className="rounded-[36px] border border-white/15 bg-white/8 p-8 shadow-[0_30px_80px_rgba(2,12,32,0.35)] backdrop-blur-[24px]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-blue-100/60">
                  Activation · Agent Shelf
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">
                  已建立的智能体
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-blue-100/75">
                  顶部区域改为长期可用的智能体列表。点击已有智能体可直接进入对话；若要新建，请继续下滑完成设定。
                </p>
              </div>

              <button
                type="button"
                onClick={() => setupRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="glass-button glass-button--ghost text-sm"
              >
                <Plus className="h-4 w-4" />
                新建智能体
              </button>
            </div>

            <div className="mt-8">
              {loadingAgents ? (
                <div className="rounded-[28px] border border-white/15 bg-black/10 px-6 py-16 text-center text-blue-100/75">
                  正在加载已有智能体...
                </div>
              ) : agents.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {agents.map((agent) => (
                    <button
                      key={agent.id}
                      type="button"
                      onClick={() => router.push(`/chat?agentId=${agent.id}`)}
                      className="rounded-[28px] border border-white/15 bg-white/8 p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/10"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10">
                            {agent.avatarUrl ? (
                              <img
                                src={agent.avatarUrl}
                                alt={agent.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Bot className="h-5 w-5 text-blue-100" />
                            )}
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-white">{agent.name}</p>
                            <p className="text-xs text-blue-100/60">
                              {agent.status === 'building'
                                ? '正在生成'
                                : agent.status === 'error'
                                  ? '初始化失败'
                                  : '可直接对话'}
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-blue-100/70">
                          {agent.keywords.slice(0, 2).join(' / ') || '已建立'}
                        </span>
                      </div>
                      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-blue-100/75">
                        {agent.summary}
                      </p>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-[28px] border border-dashed border-white/20 bg-black/10 px-6 py-16 text-center">
                  <p className="text-lg font-semibold text-white">{activationData.entity.title}</p>
                  <p className="mt-3 text-sm text-blue-100/70">{activationData.entity.description}</p>
                </div>
              )}
            </div>
          </section>

          <section ref={setupRef} className="flex flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-blue-100/60">
                  New Agent Setup
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  新建智能体并注入长期设定
                </h2>
              </div>
              <ChevronDown className="hidden h-5 w-5 text-blue-100/50 md:block" />
            </div>

            <AgentConfigEditor draft={draft} onChange={setDraft} tone="dark" />

            <GlassCard className="glass-card--dark">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-100/60">初始化说明</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">唤醒后立即进入聊天页</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-relaxed text-blue-100/70">
                    聊天页会先显示“正在生成智能体”，随后后台调用 DeepSeek 整理名字、关键词、情感参数、记忆碎片、世界书和角色卡，并把结果写回数据库长期保存。
                  </p>
                </div>
                <div className="rounded-3xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-blue-100/80">
                  当前已记录 {draft.memories.length} 条记忆
                </div>
              </div>
            </GlassCard>

            {error ? (
              <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}

            <ActivationTrigger
              progressLabel={activationData.trigger.progressLabel}
              progress={resonanceScore}
              buttonLabel={creating ? '正在唤醒...' : activationData.trigger.buttonLabel}
              awakened={creating}
              onActivate={() => {
                if (!creating) {
                  void handleCreateAgent();
                }
              }}
            />
          </section>
        </main>
      </div>
    </div>
  );
}

function buildCreatePayload(draft: AgentEditorDraft): AgentConfigInput {
  return {
    name: draft.name,
    keywords: parseKeywords(draft.keywordsInput),
    emotionalTraits: draft.emotionalTraits,
    memories: draft.memories,
    worldbookText: draft.worldbookText,
    worldbookFileName: draft.worldbookFileName || undefined,
    characterCardText: draft.characterCardText,
    characterCardFileName: draft.characterCardFileName || undefined,
    avatarUrl: draft.memories.find((item) => item.imageUrl)?.imageUrl
  };
}

function parseKeywords(value: string) {
  return value
    .split(/[,，/\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}
