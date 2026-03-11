'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ImagePlus, Settings, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { ChatConfigDrawer } from '@/components/chat/ChatConfigDrawer';
import { GlassNavbar } from '@/components/GlassNavbar';
import type { AgentDetail, AgentConfigInput, AgentListItem } from '@/lib/agentTypes';
import type { AgentEditorDraft } from '@/components/agent/AgentConfigEditor';
import homeData from '@/data/home.json';

export const dynamic = 'force-dynamic';

export default function ChatPage() {
  return (
    <Suspense fallback={<ChatPageFallback />}>
      <ChatPageContent />
    </Suspense>
  );
}

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const shouldReduceMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [agents, setAgents] = useState<AgentListItem[]>([]);
  const [activeAgent, setActiveAgent] = useState<AgentDetail | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [sending, setSending] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');

  const requestedAgentId = searchParams.get('agentId');

  const navItems = useMemo(() => {
    const items = Array.isArray(homeData.nav) ? homeData.nav : [];
    return items.map((item) => ({
      ...item,
      href: item.href.startsWith('#') ? `/${item.href}` : item.href
    }));
  }, []);

  const configDraft = useMemo<AgentEditorDraft | null>(() => {
    if (!activeAgent) {
      return null;
    }

    return {
      name: activeAgent.name,
      keywordsInput: activeAgent.keywords.join(' / '),
      emotionalTraits: activeAgent.emotionalTraits,
      memories: activeAgent.memories,
      worldbookText: activeAgent.worldbookText,
      worldbookFileName: activeAgent.worldbookFileName || '',
      characterCardText: activeAgent.characterCardText,
      characterCardFileName: activeAgent.characterCardFileName || ''
    };
  }, [activeAgent]);

  const loadAgents = useCallback(async () => {
    setLoadingAgents(true);

    try {
      const response = await fetch('/api/agents', { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('智能体列表加载失败');
      }

      const payload = (await response.json()) as { items: AgentListItem[] };
      setAgents(payload.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '智能体列表加载失败');
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  const loadAgentDetail = useCallback(async (agentId: number) => {
    setLoadingDetail(true);

    try {
      const response = await fetch(`/api/agents/${agentId}`, { cache: 'no-store' });
      if (response.status === 404) {
        setActiveAgent(null);
        return;
      }

      if (!response.ok) {
        throw new Error('智能体详情加载失败');
      }

      const payload = (await response.json()) as AgentDetail;
      setActiveAgent(payload);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '智能体详情加载失败');
      setActiveAgent(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    if (loadingAgents) {
      return;
    }

    if (requestedAgentId) {
      void loadAgentDetail(Number(requestedAgentId));
      return;
    }

    if (agents.length > 0) {
      router.replace(`/chat?agentId=${agents[0].id}`);
    }
  }, [agents, loadAgentDetail, loadingAgents, requestedAgentId, router]);

  useEffect(() => {
    if (!activeAgent || activeAgent.status !== 'building' || initializing) {
      return;
    }

    const buildingAgentId = activeAgent.id;
    let cancelled = false;

    async function initializeAgent() {
      setInitializing(true);

      try {
        const response = await fetch(`/api/agents/${buildingAgentId}/initialize`, {
          method: 'POST'
        });

        if (!response.ok) {
          const payload = (await response.json()) as { error?: string };
          throw new Error(payload.error || '智能体初始化失败');
        }

        const payload = (await response.json()) as AgentDetail;
        if (!cancelled) {
          setActiveAgent(payload);
          void loadAgents();
        }
      } catch (initError) {
        if (!cancelled) {
          setError(initError instanceof Error ? initError.message : '智能体初始化失败');
        }
      } finally {
        if (!cancelled) {
          setInitializing(false);
        }
      }
    }

    void initializeAgent();

    return () => {
      cancelled = true;
    };
  }, [activeAgent, initializing, loadAgents]);

  const handleSelectAgent = (agentId: number) => {
    if (String(agentId) === requestedAgentId) {
      return;
    }

    router.replace(`/chat?agentId=${agentId}`);
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    const preview = await compressImage(file);
    if (preview) {
      setImages((prev) => [...prev, preview]);
    }
  };

  const handleSend = async (presetText?: string) => {
    if (!activeAgent || initializing) {
      return;
    }

    const text = (presetText ?? input).trim();
    if (!text && images.length === 0) {
      return;
    }

    setSending(true);
    setError('');

    try {
      const response = await fetch(`/api/agents/${activeAgent.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          imageUrls: images
        })
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || '消息发送失败');
      }

      const payload = (await response.json()) as AgentDetail;
      setActiveAgent(payload);
      setInput('');
      setImages([]);
      void loadAgents();
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '消息发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleSaveConfig = async (draft: AgentEditorDraft) => {
    if (!activeAgent) {
      return;
    }

    setSavingConfig(true);
    setError('');

    try {
      const response = await fetch(`/api/agents/${activeAgent.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(buildAgentPayload(draft))
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || '智能体同步失败');
      }

      const payload = (await response.json()) as AgentDetail;
      setActiveAgent(payload);
      void loadAgents();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '智能体同步失败');
    } finally {
      setSavingConfig(false);
    }
  };

  const latestOptions =
    activeAgent?.messages
      .filter((message) => message.role === 'assistant' && message.options.length > 0)
      .at(-1)?.options ?? [];

  return (
    <div className="min-h-screen bg-[#050915] text-white">
      <div className="page-bg activation-bg">
        <GlassNavbar
          brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }}
          items={navItems}
        />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-100/60">Chat · Agent Dialogue</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {activeAgent?.name || '智能体对话'}
              </h1>
              <p className="mt-2 text-sm text-blue-100/70">
                {activeAgent?.status === 'building'
                  ? '正在根据设定生成系统提示词、主动问候与剧情分支。'
                  : activeAgent?.personaSummary || '从左侧选择一个智能体进入长期对话。'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="glass-button glass-button--ghost text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!activeAgent || initializing}
            >
              <Settings className="h-4 w-4" />
              人设配置
            </button>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}

          <section className="grid gap-6 lg:grid-cols-[280px_minmax(0,1.8fr)_320px]">
            <aside className="glass-card glass-card--dark flex flex-col gap-4 p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-100/70">智能体列表</p>
                <Link href="/activation" className="text-xs text-blue-200/80 hover:text-white">
                  新建
                </Link>
              </div>

              {loadingAgents ? (
                <p className="text-sm text-blue-100/60">正在加载智能体...</p>
              ) : agents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {agents.map((agent) => {
                    const isActive = String(agent.id) === requestedAgentId;
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => handleSelectAgent(agent.id)}
                        className={`rounded-3xl border p-4 text-left transition ${
                          isActive
                            ? 'border-blue-400/50 bg-white/15'
                            : 'border-white/15 bg-white/5 hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10">
                            {agent.avatarUrl ? (
                              <img
                                src={agent.avatarUrl}
                                alt={agent.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Sparkles className="h-4 w-4 text-blue-100" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-white">{agent.name}</p>
                            <p className="text-xs text-blue-100/60">
                              {agent.status === 'building' ? '正在生成' : '可用'}
                            </p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-blue-100/65">{agent.summary}</p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center text-sm text-blue-100/70">
                  还没有建立任何智能体，先去 Activation 页面唤醒一个。
                </div>
              )}
            </aside>

            <section className="glass-card glass-card--dark flex min-h-[680px] flex-col gap-4 p-5">
              {!requestedAgentId ? (
                <div className="flex flex-1 items-center justify-center text-center text-blue-100/70">
                  请先从左侧选择一个智能体，或前往 Activation 页面新建。
                </div>
              ) : loadingDetail && !activeAgent ? (
                <div className="flex flex-1 items-center justify-center text-center text-blue-100/70">
                  正在加载对话内容...
                </div>
              ) : activeAgent ? (
                <>
                  <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-blue-100/50">Conversation</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">{activeAgent.name}</h2>
                    </div>
                    <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-blue-100/70">
                      {initializing || activeAgent.status === 'building' ? '正在生成中' : '已连接'}
                    </div>
                  </div>

                  <div className="flex-1 space-y-4 overflow-y-auto pr-1">
                    {initializing || activeAgent.status === 'building' ? (
                      <motion.div
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: [0.45, 1, 0.45] }}
                        transition={{
                          repeat: Infinity,
                          duration: shouldReduceMotion ? 0 : 1.8
                        }}
                        className="rounded-3xl border border-white/15 bg-white/8 px-6 py-10 text-center"
                      >
                        <p className="text-lg font-semibold text-white">正在生成智能体</p>
                        <p className="mt-3 text-sm text-blue-100/70">
                          后台正在整理世界书、角色卡、记忆和情感参数，并构建长期系统提示词。
                        </p>
                      </motion.div>
                    ) : activeAgent.messages.length > 0 ? (
                      activeAgent.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
                              message.role === 'user'
                                ? 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 text-white'
                                : 'border border-white/15 bg-white/8 text-blue-50'
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{message.text}</p>
                            {message.options.length > 0 ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {message.options.map((option) => (
                                  <button
                                    key={`${message.id}-${option}`}
                                    type="button"
                                    onClick={() => void handleSend(option)}
                                    className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-blue-50 transition hover:bg-white/20"
                                  >
                                    {option}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-1 items-center justify-center text-center text-blue-100/70">
                        暂无消息，稍后系统会用主动问候开启第一轮剧情。
                      </div>
                    )}
                  </div>

                  {images.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                      {images.map((image, index) => (
                        <div key={`preview-${index}`} className="relative">
                          <img
                            src={image}
                            alt="预览"
                            className="h-20 w-28 rounded-xl object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== index))}
                            className="absolute -right-2 -top-2 rounded-full border border-white/40 bg-white/70 p-0.5"
                            aria-label="移除图片"
                          >
                            <X className="h-3 w-3 text-slate-600" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex items-center gap-3 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      onClick={handlePickImage}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10"
                      aria-label="上传图片"
                      disabled={initializing || sending}
                    >
                      <ImagePlus className="h-4 w-4 text-blue-100" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => void handleFiles(event.target.files)}
                    />
                    <input
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none"
                      placeholder={initializing ? '智能体生成中...' : '输入你想继续推进的故事内容...'}
                      disabled={initializing || sending}
                    />
                    <button
                      type="button"
                      onClick={() => void handleSend()}
                      className="rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={initializing || sending}
                    >
                      {sending ? '发送中...' : '发送'}
                    </button>
                  </div>

                  {latestOptions.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {latestOptions.map((option) => (
                        <button
                          key={`latest-${option}`}
                          type="button"
                          onClick={() => void handleSend(option)}
                          className="rounded-full border border-blue-300/30 bg-blue-400/10 px-3 py-1 text-xs text-blue-100 transition hover:bg-blue-400/20"
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-center text-blue-100/70">
                  未找到该智能体，可能已被删除或尚未完成初始化。
                </div>
              )}
            </section>

            <aside className="glass-card glass-card--dark flex flex-col gap-4 p-5">
              <p className="text-sm text-blue-100/70">人设摘要</p>
              {activeAgent ? (
                <>
                  <div className="rounded-3xl border border-white/15 bg-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-100/50">Persona</p>
                    <p className="mt-3 text-sm leading-relaxed text-blue-50">
                      {activeAgent.personaSummary || '尚未整理出正式人设摘要。'}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/15 bg-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-100/50">世界书</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-blue-50">
                      {activeAgent.worldbookText || '未导入世界书。'}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/15 bg-white/8 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-100/50">角色卡</p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-blue-50">
                      {activeAgent.characterCardText || '未导入角色卡。'}
                    </p>
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center text-sm text-blue-100/70">
                  选择一个智能体后，这里会展示当前持久化的人设与世界设定。
                </div>
              )}
            </aside>
          </section>
        </main>

        {configDraft && isConfigOpen ? (
          <ChatConfigDrawer
            open={isConfigOpen}
            onClose={() => setIsConfigOpen(false)}
            draft={configDraft}
            onSave={handleSaveConfig}
            saving={savingConfig}
          />
        ) : null}
      </div>
    </div>
  );
}

function ChatPageFallback() {
  const navItems = getNavItems();

  return (
    <div className="min-h-screen bg-[#050915] text-white">
      <div className="page-bg activation-bg">
        <GlassNavbar
          brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }}
          items={navItems}
        />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
          <section className="glass-card glass-card--dark flex min-h-[520px] items-center justify-center p-6 text-center">
            <div>
              <p className="text-sm text-blue-100/60">正在准备聊天界面...</p>
              <h1 className="mt-3 text-2xl font-semibold text-white">载入智能体对话中</h1>
              <p className="mt-3 text-sm text-blue-100/70">
                正在同步查询参数与当前会话，请稍候。
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function getNavItems() {
  const items = Array.isArray(homeData.nav) ? homeData.nav : [];
  return items.map((item) => ({
    ...item,
    href: item.href.startsWith('#') ? `/${item.href}` : item.href
  }));
}

function buildAgentPayload(draft: AgentEditorDraft): AgentConfigInput {
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

async function compressImage(file: File, maxWidth = 960, quality = 0.82) {
  try {
    const objectUrl = URL.createObjectURL(file);
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, maxWidth / image.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.width * scale);
    canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext('2d');

    if (!context) {
      return '';
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl);

    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return '';
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
