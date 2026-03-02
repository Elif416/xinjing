'use client';

import { useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ImagePlus, Settings, X } from 'lucide-react';

import { ChatConfigDrawer } from '@/components/chat/ChatConfigDrawer';
import { GlassNavbar } from '@/components/GlassNavbar';
import { sendCharacterSetup } from '@/lib/activationApi';
import { generateCharacterBundle } from '@/lib/characterBundle';
import { sendMessage, type ChatMessage } from '@/lib/sendMessage';
import { useSoulStore } from '@/lib/useSoulStore';
import homeData from '@/data/home.json';

export default function ChatPage() {
  const shouldReduceMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [input, setInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [activeSessionId, setActiveSessionId] = useState('session-current');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const {
    name,
    keywords,
    emotionalTraits,
    memories,
    characterBundle,
    setName,
    setKeywords,
    setEmotionalTraits,
    setMemories,
    setCharacterBundle
  } = useSoulStore();

  const keywordsInput = useMemo(() => keywords.join(' / '), [keywords]);

  const bundle = useMemo(() => {
    return (
      characterBundle ??
      generateCharacterBundle({
        name,
        keywords,
        emotionalTraits,
        memories
      })
    );
  }, [characterBundle, name, keywords, emotionalTraits, memories]);

  // 模拟已建立的智能体对话列表，后续可替换为后端数据
  const mockSessions = useMemo(() => {
    const mockOne = generateCharacterBundle({
      name: '夜航',
      keywords: ['守夜', '星港', '冷静'],
      emotionalTraits: { emotion: 72, logic: 64, humor: 38 },
      memories: []
    });
    const mockTwo = generateCharacterBundle({
      name: '澜珂',
      keywords: ['山海', '守望', '克制'],
      emotionalTraits: { emotion: 58, logic: 70, humor: 40 },
      memories: []
    });
    return [
      {
        id: 'session-current',
        title: bundle.characterCard.name,
        subtitle: '当前激活',
        summary: bundle.systemPrompt,
        bundle,
        source: 'store'
      },
      {
        id: 'session-neon',
        title: mockOne.characterCard.name,
        subtitle: '霓虹航线',
        summary: mockOne.systemPrompt,
        bundle: mockOne,
        source: 'mock'
      },
      {
        id: 'session-mountain',
        title: mockTwo.characterCard.name,
        subtitle: '山海回声',
        summary: mockTwo.systemPrompt,
        bundle: mockTwo,
        source: 'mock'
      }
    ];
  }, [bundle]);

  const [sessionMessages, setSessionMessages] = useState<Record<string, ChatMessage[]>>({
    'session-current': [],
    'session-neon': [
      {
        role: 'assistant',
        content: [{ type: 'text', text: '航线已建立，等待你的记忆碎片。' }]
      }
    ],
    'session-mountain': [
      {
        role: 'assistant',
        content: [{ type: 'text', text: '山海回声已连接，愿意听你分享。' }]
      }
    ]
  });

  const activeSession = mockSessions.find((session) => session.id === activeSessionId) ?? mockSessions[0];
  const activeBundle = activeSession.bundle;
  const activeMessages = sessionMessages[activeSession.id] ?? [];

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const preview = await compressImage(files[0]);
    if (preview) {
      setImages((prev) => [...prev, preview]);
    }
  };

  const handleSend = async () => {
    if (!input.trim() && images.length === 0) return;

    const userContent: ChatMessage = {
      role: 'user',
      content: [
        ...(input.trim() ? [{ type: 'text' as const, text: input.trim() }] : []),
        ...images.map((image) => ({
          type: 'image_url' as const,
          image_url: { url: image }
        }))
      ]
    };

    const nextHistory = [...activeMessages, userContent];
    setSessionMessages((prev) => ({
      ...prev,
      [activeSession.id]: nextHistory
    }));
    setInput('');
    setImages([]);

    const response = await sendMessage({
      text: input,
      images,
      history: activeMessages,
      bundle: activeBundle
    });

    setSessionMessages((prev) => ({
      ...prev,
      [activeSession.id]: [
        ...(prev[activeSession.id] ?? []),
        { role: 'assistant', content: [{ type: 'text', text: response.reply }] }
      ]
    }));
  };

  const handleSaveConfig = (payload: {
    name: string;
    keywordsInput: string;
    emotionalTraits: typeof emotionalTraits;
    memories: typeof memories;
  }) => {
    setName(payload.name);
    setKeywords(parseKeywords(payload.keywordsInput));
    setEmotionalTraits(payload.emotionalTraits);
    setMemories(payload.memories);
    const updatedBundle = generateCharacterBundle({
      name: payload.name,
      keywords: parseKeywords(payload.keywordsInput),
      emotionalTraits: payload.emotionalTraits,
      memories: payload.memories
    });
    setCharacterBundle(updatedBundle);
    // 预集成 API：保存并更新后同步角色设定
    void sendCharacterSetup(updatedBundle).catch(() => null);
  };

  return (
    <div className="min-h-screen bg-[#050915] text-white">
      <div className="page-bg activation-bg">
        <GlassNavbar
          brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }}
          items={homeData.nav.map((item) => ({
            ...item,
            href: item.href.startsWith('#') ? `/${item.href}` : item.href
          }))}
        />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-blue-100/60">Chat · 灵魂对话</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {activeBundle.characterCard.name || '心镜对话'}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => setIsConfigOpen(true)}
              className="glass-button glass-button--ghost text-sm disabled:cursor-not-allowed disabled:opacity-50"
              disabled={activeSession.source !== 'store'}
            >
              <Settings className="h-4 w-4" />
              配置面板
            </button>
          </div>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,2fr)_minmax(0,1fr)]">
            {/* 左侧：已建立的智能体对话列表 */}
            <aside className="glass-card glass-card--dark flex flex-col gap-4 p-5">
              <p className="text-sm text-blue-100/70">对话窗口</p>
              <div className="flex flex-col gap-3">
                {mockSessions.map((session) => {
                  const isActive = session.id === activeSession.id;
                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => {
                        setActiveSessionId(session.id);
                        setInput('');
                        setImages([]);
                      }}
                      className={`rounded-2xl border px-4 py-3 text-left transition ${
                        isActive
                          ? 'border-blue-300/70 bg-blue-500/20 text-white'
                          : 'border-white/20 bg-white/10 text-blue-100/80 hover:text-white'
                      }`}
                    >
                      <p className="text-sm font-semibold">{session.title}</p>
                      <p className="mt-1 text-xs text-blue-100/60">{session.subtitle}</p>
                    </button>
                  );
                })}
              </div>
            </aside>

            {/* 中间：对话记录 */}
            <div className="glass-card glass-card--dark flex flex-col gap-4 p-6">
              <p className="text-sm text-blue-100/70">对话记录</p>
              <div className="flex h-[380px] flex-col gap-3 overflow-y-auto">
                {activeMessages.length === 0 ? (
                  <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-6 text-sm text-blue-100/70">
                    暂无消息，尝试向灵魂发出第一条对话。
                  </div>
                ) : (
                  activeMessages.map((message, index) => (
                    <div
                      key={`msg-${index}`}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl border px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'border-blue-200/50 bg-blue-500/20 text-white'
                            : 'border-white/40 bg-white/10 text-blue-100'
                        }`}
                      >
                        {message.content.map((content, idx) =>
                          content.type === 'text' ? (
                            <p key={`text-${idx}`}>{content.text}</p>
                          ) : (
                            <img
                              key={`img-${idx}`}
                              src={content.image_url.url}
                              alt="上传图片"
                              className="mt-2 h-40 w-full rounded-xl object-cover"
                            />
                          )
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* 右侧：System Prompt */}
            <aside className="glass-card glass-card--dark flex flex-col gap-4 p-6">
              <p className="text-sm text-blue-100/70">System Prompt 预览</p>
              <p className="text-sm text-blue-100/90 whitespace-pre-line">{activeBundle.systemPrompt}</p>
              <div className="mt-auto rounded-2xl border border-white/20 bg-white/10 p-4 text-xs text-blue-100/70">
                记忆条目：{activeBundle.lorebook.entries.length} 条
              </div>
            </aside>
          </section>

          <motion.section
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
            className="glass-card glass-card--dark flex flex-col gap-4 p-5"
          >
            {images.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {images.map((img, index) => (
                  <div key={`preview-${index}`} className="relative">
                    <img
                      src={img}
                      alt="预览"
                      className="h-20 w-28 rounded-xl object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setImages((prev) => prev.filter((_, idx) => idx !== index))
                      }
                      className="absolute -right-2 -top-2 rounded-full border border-white/40 bg-white/70 p-0.5"
                      aria-label="移除图片"
                    >
                      <X className="h-3 w-3 text-slate-600" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePickImage}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/10"
                aria-label="上传图片"
              >
                <ImagePlus className="h-4 w-4 text-blue-100" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                className="flex-1 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm text-white outline-none"
                placeholder="输入你的共创需求..."
              />
              <button
                type="button"
                onClick={handleSend}
                className="rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white"
              >
                发送
              </button>
            </div>
          </motion.section>
        </main>

        <ChatConfigDrawer
          open={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          name={name}
          keywordsInput={keywordsInput}
          emotionalTraits={emotionalTraits}
          memories={memories}
          onSave={handleSaveConfig}
        />
      </div>
    </div>
  );
}

// 解析关键词输入：支持 / 、 , 空格分隔
function parseKeywords(value: string) {
  return value
    .split(/[,，/\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

// 前端压缩展示：控制聊天图片预览体积
async function compressImage(file: File, maxWidth = 960, quality = 0.8) {
  try {
    const objectUrl = URL.createObjectURL(file);
    const img = await loadImage(objectUrl);
    const scale = Math.min(1, maxWidth / img.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl);
    return canvas.toDataURL('image/jpeg', quality);
  } catch {
    return '';
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
