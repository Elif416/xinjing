'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bell, ChevronRight, MessageCircleMore, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { GlassCard } from '@/components/GlassCard';
import { GlassNavbar } from '@/components/GlassNavbar';
import { ChatAvatar } from '@/components/messages/ChatAvatar';
import homeData from '@/data/home.json';
import type { ConversationPreview, ConversationsListPayload } from '@/lib/messageTypes';

export const dynamic = 'force-dynamic';

export default function MessagesPage() {
  const router = useRouter();
  const [items, setItems] = useState<ConversationPreview[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const navItems = useMemo(() => {
    const items = Array.isArray(homeData.nav) ? homeData.nav : [];
    return items.map((item) => ({
      ...item,
      href: item.href.startsWith('#') ? `/${item.href}` : item.href
    }));
  }, []);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/messages/conversations', {
        cache: 'no-store'
      });
      const payload = (await response.json()) as Partial<ConversationsListPayload> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error || '消息列表加载失败');
      }

      setItems(payload.items ?? []);
      setUnreadTotal(Math.max(0, Number(payload.unreadTotal ?? 0)));
      window.dispatchEvent(new Event('messages:sync'));
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : '消息列表加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) {
      return items;
    }

    return items.filter((conversation) =>
      [
        conversation.title,
        conversation.counterpart.role,
        conversation.lastMessage?.text ?? '',
        conversation.lastMessage?.senderName ?? ''
      ]
        .join(' ')
        .toLowerCase()
        .includes(keyword)
    );
  }, [items, query]);

  const handleDeleteConversation = async (conversation: ConversationPreview) => {
    const confirmed = window.confirm(`确认删除与“${conversation.title}”的会话吗？`);
    if (!confirmed) {
      return;
    }

    setDeletingId(conversation.id);
    setError('');

    try {
      const response = await fetch(`/api/messages/conversations/${conversation.id}`, {
        method: 'DELETE'
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error || '删除会话失败');
      }

      setItems((prev) => prev.filter((item) => item.id !== conversation.id));
      setUnreadTotal((prev) => Math.max(0, prev - conversation.unreadCount));
      window.dispatchEvent(new Event('messages:sync'));
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除会话失败');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7ff] text-ink">
      <div className="page-bg activation-bg min-h-screen">
        <GlassNavbar brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }} items={navItems} />

        <main className="mx-auto flex w-full max-w-5xl flex-col px-6 py-8 sm:py-10">
          <section className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Messages</p>
              <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-tight text-ink">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 text-white shadow-[0_20px_48px_rgba(79,70,229,0.24)]">
                  <Bell className="h-5 w-5" />
                </span>
                消息
              </h1>
              <p className="mt-3 text-sm text-slate-500">
                这里会展示你与其他用户、画师之间的私聊会话。支持会话搜索、未读红点与消息引用。
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                未读 {unreadTotal}
              </span>
              <button
                type="button"
                onClick={() => void loadConversations()}
                className="glass-button glass-button--ghost"
              >
                <RefreshCw className="h-4 w-4" />
                刷新列表
              </button>
            </div>
          </section>

          {error ? (
            <GlassCard className="mt-6 border-red-300/60 bg-red-50/70 text-red-600">
              {error}
            </GlassCard>
          ) : null}

          <GlassCard className="mt-6 gap-4 p-3 sm:p-4">
            <div className="flex flex-col gap-3 px-2 py-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-ink">
                <MessageCircleMore className="h-4 w-4 text-blue-500" />
                会话列表
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex min-w-[260px] items-center gap-2 rounded-full border border-white/60 bg-white/75 px-4 py-2 text-sm text-slate-500 shadow-sm">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="搜索昵称、身份或最近消息…"
                    className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-slate-400"
                  />
                </label>

                <span className="rounded-full border border-white/60 bg-white/70 px-3 py-2 text-xs text-slate-500">
                  {loading ? '加载中…' : `显示 ${filteredItems.length} / ${items.length} 个会话`}
                </span>
              </div>
            </div>

            <div className="flex flex-col divide-y divide-white/50">
              {loading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div key={`message-skeleton-${index}`} className="flex items-center gap-4 px-3 py-4">
                    <div className="h-12 w-12 animate-pulse rounded-full bg-slate-200/80" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200/80" />
                      <div className="h-3 w-56 animate-pulse rounded-full bg-slate-100/90" />
                    </div>
                  </div>
                ))
              ) : filteredItems.length > 0 ? (
                filteredItems.map((conversation) => (
                  <div
                    key={conversation.id}
                    className={`flex items-center gap-3 rounded-2xl px-3 py-4 transition hover:bg-white/55 ${
                      conversation.unreadCount > 0 ? 'bg-blue-50/45' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => router.push(`/messages/${conversation.id}`)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 text-left"
                    >
                      <div className="relative">
                        <ChatAvatar
                          name={conversation.counterpart.name}
                          imageUrl={conversation.counterpart.avatarUrl}
                        />
                        {conversation.unreadCount > 0 ? (
                          <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white shadow-[0_10px_22px_rgba(244,63,94,0.32)]">
                            {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                          </span>
                        ) : null}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <p
                              className={`truncate text-sm ${
                                conversation.unreadCount > 0
                                  ? 'font-semibold text-slate-950'
                                  : 'font-medium text-ink'
                              }`}
                            >
                              {conversation.title}
                            </p>
                            {conversation.counterpart.isArtist ? (
                              <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] text-blue-600">
                                画师
                              </span>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-xs text-slate-400">
                            {formatConversationTime(conversation.updatedAt)}
                          </span>
                        </div>

                        <div className="mt-1 flex items-center justify-between gap-3">
                          <p
                            className={`truncate text-sm ${
                              conversation.unreadCount > 0 ? 'text-slate-700' : 'text-slate-500'
                            }`}
                          >
                            {conversation.lastMessage
                              ? `${conversation.lastMessage.isSelf ? '你：' : ''}${conversation.lastMessage.text}`
                              : '还没有消息，点进去打个招呼吧。'}
                          </p>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDeleteConversation(conversation)}
                      disabled={deletingId === conversation.id}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/60 bg-white/80 text-slate-400 transition hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
                      aria-label={`删除与 ${conversation.title} 的会话`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="px-3 py-12 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/70 text-blue-500 shadow-[0_18px_40px_rgba(59,130,246,0.16)]">
                    <Bell className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-base font-medium text-ink">
                    {query.trim() ? '没有搜索到相关会话' : '还没有会话'}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {query.trim()
                      ? '试试换个关键词，或清空搜索词查看全部会话。'
                      : '可以先去画师详情页点击“发起私聊”，或等待示例消息出现。'}
                  </p>
                </div>
              )}
            </div>
          </GlassCard>
        </main>
      </div>
    </div>
  );
}

function formatConversationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = new Date();
  const isSameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  return new Intl.DateTimeFormat(
    'zh-CN',
    isSameDay
      ? {
          hour: '2-digit',
          minute: '2-digit'
        }
      : {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }
  ).format(date);
}
