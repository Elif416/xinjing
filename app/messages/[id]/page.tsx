'use client';

import type { ChangeEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  CornerUpLeft,
  ImagePlus,
  RefreshCw,
  RotateCcw,
  SendHorizontal,
  Trash2,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

import { GlassCard } from '@/components/GlassCard';
import { GlassNavbar } from '@/components/GlassNavbar';
import { ChatAvatar } from '@/components/messages/ChatAvatar';
import homeData from '@/data/home.json';
import type { ConversationDetail, ConversationMessage } from '@/lib/messageTypes';

export const dynamic = 'force-dynamic';

type ConversationDetailPayload = ConversationDetail & {
  error?: string;
};

export default function MessageConversationPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<number | null>(null);
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [replyTarget, setReplyTarget] = useState<ConversationMessage | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [recallPendingId, setRecallPendingId] = useState<number | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lightbox, setLightbox] = useState<{ imageUrl: string; senderName: string } | null>(null);

  const navItems = useMemo(() => {
    const items = Array.isArray(homeData.nav) ? homeData.nav : [];
    return items.map((item) => ({
      ...item,
      href: item.href.startsWith('#') ? `/${item.href}` : item.href
    }));
  }, []);

  const loadConversation = useCallback(async () => {
    const conversationId = Number.parseInt(params.id, 10);
    if (!Number.isFinite(conversationId)) {
      setConversation(null);
      setError('会话不存在');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`, {
        cache: 'no-store'
      });
      const payload = (await response.json()) as ConversationDetailPayload;

      if (!response.ok) {
        throw new Error(payload.error || '会话加载失败');
      }

      setConversation(payload);
      window.dispatchEvent(new Event('messages:sync'));
    } catch (fetchError) {
      setConversation(null);
      setError(fetchError instanceof Error ? fetchError.message : '会话加载失败');
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [conversation?.messages.length]);

  useEffect(
    () => () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
    },
    []
  );

  const handleSend = async () => {
    if (!conversation) {
      return;
    }

    if (!input.trim() && !imageFile) {
      setError('请输入消息或添加图片。');
      return;
    }

    setSending(true);
    setError('');

    try {
      const formData = new FormData();
      formData.set('content', input.trim());

      if (replyTarget) {
        formData.set('replyToId', String(replyTarget.id));
      }

      if (imageFile) {
        formData.set('image', imageFile);
      }

      const response = await fetch(`/api/messages/conversations/${conversation.id}/messages`, {
        method: 'POST',
        body: formData
      });
      const payload = (await response.json()) as ConversationMessage & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || '消息发送失败');
      }

      setConversation((prev) =>
        prev
          ? {
              ...prev,
              updatedAt: payload.createdAt,
              messages: [...prev.messages, payload]
            }
          : prev
      );
      setInput('');
      setReplyTarget(null);
      setImageFile(null);
      window.dispatchEvent(new Event('messages:sync'));
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : '消息发送失败');
    } finally {
      setSending(false);
    }
  };

  const handleRecall = async (message: ConversationMessage) => {
    if (!conversation || !message.isSelf || message.isRecalled || recallPendingId) {
      return;
    }

    const confirmed = window.confirm('确认撤回这条消息吗？');
    if (!confirmed) {
      return;
    }

    setRecallPendingId(message.id);
    setError('');

    try {
      const response = await fetch(
        `/api/messages/conversations/${conversation.id}/messages/${message.id}/recall`,
        {
          method: 'POST'
        }
      );
      const payload = (await response.json()) as ConversationMessage & { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || '撤回失败');
      }

      setConversation((prev) =>
        prev
          ? {
              ...prev,
              updatedAt: new Date().toISOString(),
              messages: prev.messages.map((item) => {
                if (item.id === payload.id) {
                  return payload;
                }

                if (item.replyTo?.id === payload.id) {
                  return {
                    ...item,
                    replyTo: {
                      ...item.replyTo,
                      text: '这条消息已撤回',
                      imageUrl: undefined,
                      isRecalled: true
                    }
                  };
                }

                return item;
              })
            }
          : prev
      );

      if (replyTarget?.id === payload.id) {
        setReplyTarget(null);
      }

      window.dispatchEvent(new Event('messages:sync'));
    } catch (recallError) {
      setError(recallError instanceof Error ? recallError.message : '撤回失败');
    } finally {
      setRecallPendingId(null);
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversation || deletePending) {
      return;
    }

    const confirmed = window.confirm(`确认删除与“${conversation.counterpart.name}”的会话吗？`);
    if (!confirmed) {
      return;
    }

    setDeletePending(true);
    setError('');

    try {
      const response = await fetch(`/api/messages/conversations/${conversation.id}`, {
        method: 'DELETE'
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || '删除会话失败');
      }

      window.dispatchEvent(new Event('messages:sync'));
      router.push('/messages');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除会话失败');
    } finally {
      setDeletePending(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    event.target.value = '';

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('目前私聊仅支持发送图片。');
      return;
    }

    setImageFile(file);
  };

  const handleInputChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    const value = event.target.value;
    setInput(value);

    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }

    if (!value.trim()) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    typingTimerRef.current = window.setTimeout(() => {
      setIsTyping(false);
    }, 1400);
  };

  const handleComposerKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    if (event.nativeEvent.isComposing) {
      return;
    }

    event.preventDefault();
    setIsTyping(false);
    void handleSend();
  };

  const pickImage = () => fileInputRef.current?.click();

  return (
    <div className="flex min-h-screen flex-col bg-[#f5f7ff] text-ink">
      <div className="page-bg activation-bg flex min-h-screen flex-1 flex-col">
        <GlassNavbar brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }} items={navItems} />

        <main className="mx-auto flex min-h-[calc(100svh-4.5rem)] w-full max-w-6xl flex-1 flex-col px-6 py-8 sm:py-10">
          <div className="mb-5 flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => router.push('/messages')}
              className="glass-button glass-button--ghost"
            >
              <ArrowLeft className="h-4 w-4" />
              返回消息列表
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void loadConversation()}
                className="glass-button glass-button--ghost"
              >
                <RefreshCw className="h-4 w-4" />
                刷新会话
              </button>

              <button
                type="button"
                onClick={() => void handleDeleteConversation()}
                disabled={deletePending}
                className="glass-button glass-button--ghost"
              >
                <Trash2 className="h-4 w-4" />
                {deletePending ? '删除中…' : '删除会话'}
              </button>
            </div>
          </div>

          <GlassCard className="flex min-h-0 flex-1 flex-col overflow-hidden p-0 [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col">
            {loading ? (
              <div className="flex flex-1 items-center justify-center p-8 text-slate-500">
                正在加载会话…
              </div>
            ) : error && !conversation ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-lg font-medium text-ink">会话暂时打不开</p>
                <p className="max-w-md text-sm text-slate-500">{error}</p>
                <Link href="/messages" className="glass-button glass-button--primary">
                  回到消息列表
                </Link>
              </div>
            ) : conversation ? (
              <>
                <header className="flex items-center justify-between gap-4 border-b border-white/50 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-4">
                    <ChatAvatar
                      name={conversation.counterpart.name}
                      imageUrl={conversation.counterpart.avatarUrl}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-ink">
                        {conversation.counterpart.name}
                      </p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                        <span>{conversation.counterpart.role || '用户'}</span>
                        {conversation.counterpart.isArtist ? (
                          <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-600">
                            画师私聊
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <p className="shrink-0 text-xs text-slate-400">
                    更新于 {formatMessageTime(conversation.updatedAt)}
                  </p>
                </header>

                <div className="flex min-h-0 flex-1 flex-col bg-white/30">
                  <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
                    {conversation.messages.length > 0 ? (
                      conversation.messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.isSelf ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[82%] space-y-2 rounded-[26px] border px-4 py-3 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:max-w-[72%] ${
                              message.isSelf
                                ? 'border-blue-200/70 bg-gradient-to-br from-blue-500 to-indigo-500 text-white'
                                : 'border-white/70 bg-white/85 text-ink'
                            }`}
                          >
                            {message.replyTo ? (
                              <button
                                type="button"
                                onClick={() => {
                                  const target = conversation.messages.find(
                                    (item) => item.id === message.replyTo?.id
                                  );
                                  if (target && !target.isRecalled) {
                                    setReplyTarget(target);
                                  }
                                }}
                                className={`w-full rounded-2xl border px-3 py-2 text-left ${
                                  message.isSelf
                                    ? 'border-white/25 bg-white/10 text-blue-50'
                                    : 'border-slate-200 bg-slate-50 text-slate-500'
                                }`}
                              >
                                <p className="text-[11px] font-medium opacity-80">
                                  回复 {message.replyTo.senderName}
                                </p>
                                <p className="mt-1 truncate text-xs">
                                  {message.replyTo.isRecalled
                                    ? '这条消息已撤回'
                                    : message.replyTo.text || (message.replyTo.imageUrl ? '[图片]' : '消息')}
                                </p>
                              </button>
                            ) : null}

                            {message.isRecalled ? (
                              <p
                                className={`text-sm italic ${
                                  message.isSelf ? 'text-blue-100/90' : 'text-slate-400'
                                }`}
                              >
                                {message.isSelf ? '你撤回了一条消息' : '对方撤回了一条消息'}
                              </p>
                            ) : (
                              <>
                                {message.text ? (
                                  <p className="whitespace-pre-wrap break-words text-sm leading-6">
                                    {message.text}
                                  </p>
                                ) : null}

                                {message.imageUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setLightbox({
                                        imageUrl: message.imageUrl!,
                                        senderName: message.senderName
                                      })
                                    }
                                    className="block w-full overflow-hidden rounded-2xl border border-white/15 text-left"
                                  >
                                    <div
                                      className="h-52 w-full rounded-2xl bg-cover bg-center sm:h-64"
                                      style={{ backgroundImage: `url(${message.imageUrl})` }}
                                    />
                                  </button>
                                ) : null}
                              </>
                            )}

                            <div
                              className={`flex flex-wrap items-center justify-between gap-3 text-[11px] ${
                                message.isSelf ? 'text-blue-100/80' : 'text-slate-400'
                              }`}
                            >
                              <span>{formatMessageTime(message.createdAt)}</span>

                              <div className="flex items-center gap-3">
                                {!message.isRecalled ? (
                                  <button
                                    type="button"
                                    onClick={() => setReplyTarget(message)}
                                    className={`inline-flex cursor-pointer items-center gap-1 transition ${
                                      message.isSelf ? 'hover:text-white' : 'hover:text-slate-600'
                                    }`}
                                  >
                                    <CornerUpLeft className="h-3.5 w-3.5" />
                                    回复
                                  </button>
                                ) : null}

                                {message.isSelf ? (
                                  <button
                                    type="button"
                                    onClick={() => void handleRecall(message)}
                                    disabled={message.isRecalled || recallPendingId === message.id}
                                    className={`inline-flex items-center gap-1 transition ${
                                      message.isSelf ? 'hover:text-white' : 'hover:text-slate-600'
                                    } disabled:cursor-not-allowed disabled:opacity-60`}
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    {recallPendingId === message.id ? '撤回中…' : '撤回'}
                                  </button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 py-14 text-center">
                        <div>
                          <p className="text-base font-medium text-ink">还没有聊天记录</p>
                          <p className="mt-2 text-sm text-slate-500">
                            发一条消息或一张图片，让这段会话真正开始。
                          </p>
                        </div>
                      </div>
                    )}
                    <div ref={bottomRef} />
                  </div>

                  <div className="mt-auto shrink-0 border-t border-white/50 bg-white/80 p-4 backdrop-blur-sm sm:p-5">
                    <div className="mb-3 min-h-5 text-xs text-slate-500">
                      {isTyping ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-blue-600">
                          <span className="flex items-center gap-1">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 [animation-delay:120ms]" />
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 [animation-delay:240ms]" />
                          </span>
                          正在输入中…
                        </span>
                      ) : null}
                    </div>

                    {replyTarget ? (
                      <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-blue-200/70 bg-blue-50/90 px-4 py-3 text-sm text-slate-600">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-blue-500">
                            正在回复
                          </p>
                          <p className="mt-1 truncate text-sm font-medium text-ink">
                            {replyTarget.senderName}
                          </p>
                          <p className="mt-1 truncate text-sm text-slate-500">
                            {replyTarget.isRecalled
                              ? '这条消息已撤回'
                              : replyTarget.text || (replyTarget.imageUrl ? '[图片]' : '消息')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyTarget(null)}
                          className="rounded-full border border-blue-200 bg-white/90 p-1 text-slate-400 transition hover:text-slate-700"
                          aria-label="取消回复"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}

                    {imagePreview ? (
                      <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-white/60 bg-white/80 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="h-16 w-16 rounded-2xl border border-white/50 bg-cover bg-center"
                            style={{ backgroundImage: `url(${imagePreview})` }}
                          />
                          <div>
                            <p className="text-sm font-medium text-ink">{imageFile?.name}</p>
                            <p className="mt-1 text-xs text-slate-500">发送后会作为聊天图片保存</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setImageFile(null)}
                          className="rounded-full border border-white/60 bg-white/90 p-1 text-slate-400 transition hover:text-slate-700"
                          aria-label="移除图片"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : null}

                    {error && conversation ? <p className="mb-3 text-sm text-red-500">{error}</p> : null}

                    <div className="flex items-end gap-3">
                      <button
                        type="button"
                        onClick={pickImage}
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/90 text-slate-500 shadow-sm transition hover:text-blue-600"
                        aria-label="添加图片"
                      >
                        <ImagePlus className="h-5 w-5" />
                      </button>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      <div className="flex flex-1 items-end gap-3 rounded-[28px] border border-white/60 bg-white/90 px-4 py-3 shadow-sm">
                        <textarea
                          value={input}
                          onChange={handleInputChange}
                          onKeyDown={handleComposerKeyDown}
                          rows={1}
                          className="max-h-40 min-h-[28px] flex-1 resize-none bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
                          placeholder="输入消息，支持文字与图片…"
                        />

                        <button
                          type="button"
                          onClick={() => void handleSend()}
                          disabled={sending}
                          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-[0_12px_28px_rgba(59,130,246,0.34)] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-60"
                          aria-label="发送消息"
                        >
                          <SendHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </GlassCard>
        </main>

        {lightbox ? (
          <div
            className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/85 px-6 py-10 backdrop-blur-sm"
            onClick={() => setLightbox(null)}
          >
            <div
              className="relative w-full max-w-5xl"
              onClick={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="absolute right-4 top-4 z-[2] rounded-full border border-white/20 bg-black/35 p-2 text-white transition hover:bg-black/55"
                aria-label="关闭图片预览"
              >
                <X className="h-5 w-5" />
              </button>

              <div
                className="min-h-[50vh] w-full rounded-[28px] border border-white/10 bg-contain bg-center bg-no-repeat shadow-[0_40px_100px_rgba(15,23,42,0.45)]"
                style={{
                  backgroundImage: `url(${lightbox.imageUrl})`,
                  aspectRatio: '16 / 10'
                }}
              />
              <p className="mt-4 text-center text-sm text-white/80">
                来自 {lightbox.senderName} 的图片
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function formatMessageTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}
