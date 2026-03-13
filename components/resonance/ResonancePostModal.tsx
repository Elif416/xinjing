'use client';

import { AnimatePresence, motion, type Transition } from 'framer-motion';
import { Film, Globe2, Heart, LoaderCircle, Lock, MessageCircle, Send, X } from 'lucide-react';

import type { ResonancePost } from '@/lib/resonanceTypes';

type ResonancePostModalProps = {
  post: ResonancePost | null;
  detailLoading: boolean;
  detailError: string;
  favoritePending: boolean;
  commentPending: boolean;
  commentInput: string;
  transition: Transition;
  onClose: () => void;
  onToggleFavorite: () => void;
  onCommentChange: (value: string) => void;
  onSubmitComment: () => void;
  formatDisplayTime: (value: string) => string;
};

export function ResonancePostModal({
  post,
  detailLoading,
  detailError,
  favoritePending,
  commentPending,
  commentInput,
  transition,
  onClose,
  onToggleFavorite,
  onCommentChange,
  onSubmitComment,
  formatDisplayTime
}: ResonancePostModalProps) {
  return (
    <AnimatePresence>
      {post ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050712]/74 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          onClick={onClose}
          style={{ transform: 'translateZ(0)' }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={post.title || post.address}
            className="glass-card glass-card--dark relative mx-4 w-full max-w-5xl rounded-[32px] p-6 text-blue-50 lg:p-8"
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={transition}
            onClick={(event) => event.stopPropagation()}
            style={{ transform: 'translateZ(0)' }}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-1 text-blue-100/70 transition hover:text-white"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[11px] font-medium ${
                      post.visibility === 'private'
                        ? 'border-fuchsia-300/30 bg-fuchsia-400/10 text-fuchsia-100'
                        : 'border-emerald-300/30 bg-emerald-400/10 text-emerald-100'
                    }`}
                  >
                    {post.visibility === 'private' ? (
                      <Lock className="h-3 w-3" />
                    ) : (
                      <Globe2 className="h-3 w-3" />
                    )}
                    {post.visibility === 'private' ? '仅自己可见' : '公开贴文'}
                  </span>

                  <span className="text-xs text-blue-100/55">{formatDisplayTime(post.createdAt)}</span>
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-blue-100/70">
                    {post.title || '共鸣记忆'}
                  </p>
                  <p className="mt-3 text-xl font-semibold text-white sm:text-2xl">
                    {post.title || post.address}
                  </p>
                  <p className="mt-2 text-sm text-blue-100/70">
                    {post.address}
                    {post.township ? ` · ${post.township}` : ''}
                  </p>
                  <p className="mt-2 text-xs text-blue-100/55">发布者：{post.authorName}</p>
                </div>

                <div className="rounded-[28px] border border-white/12 bg-white/5 p-5">
                  <p className="text-sm leading-relaxed text-blue-100/85">{post.content}</p>
                </div>

                {post.attachments.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-blue-100/55">
                      <Film className="h-3.5 w-3.5" />
                      媒体附件
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {post.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="overflow-hidden rounded-[26px] border border-white/12 bg-[#081122]"
                        >
                          {attachment.mediaType === 'video' ? (
                            <video
                              src={attachment.url}
                              controls
                              playsInline
                              className="h-full min-h-52 w-full bg-black object-cover"
                            />
                          ) : (
                            <img
                              src={attachment.url}
                              alt={post.title || post.address}
                              className="h-full min-h-52 w-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={onToggleFavorite}
                    disabled={favoritePending}
                    className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      post.isFavorite
                        ? 'border-rose-300/40 bg-rose-400/10 text-rose-100'
                        : 'border-white/12 bg-white/5 text-blue-50 hover:border-white/25'
                    } disabled:opacity-60`}
                  >
                    {favoritePending ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <Heart className={`h-4 w-4 ${post.isFavorite ? 'fill-current' : ''}`} />
                    )}
                    收藏 {post.favoriteCount}
                  </button>

                  <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm text-blue-100/80">
                    <MessageCircle className="h-4 w-4" />
                    评论 {post.commentCount}
                  </div>
                </div>

                <div className="rounded-[28px] border border-white/12 bg-[#081122]/80 p-5">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-blue-100/55">
                    <MessageCircle className="h-3.5 w-3.5" />
                    评论区
                  </div>

                  {detailLoading ? (
                    <div className="mt-4 flex items-center gap-2 text-sm text-blue-100/60">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      正在加载贴文详情…
                    </div>
                  ) : null}

                  {detailError ? (
                    <p className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                      {detailError}
                    </p>
                  ) : null}

                  <div className="mt-4 max-h-[340px] space-y-3 overflow-y-auto pr-1">
                    {(post.comments ?? []).length > 0 ? (
                      post.comments?.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-medium text-white">{comment.authorName}</p>
                            <p className="text-[11px] text-blue-100/45">
                              {formatDisplayTime(comment.createdAt)}
                            </p>
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-blue-100/78">
                            {comment.content}
                          </p>
                        </div>
                      ))
                    ) : !detailLoading ? (
                      <div className="rounded-2xl border border-dashed border-white/10 px-4 py-5 text-sm text-blue-100/55">
                        还没有评论，留下第一条回应吧。
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    <textarea
                      value={commentInput}
                      onChange={(event) => onCommentChange(event.target.value)}
                      placeholder="写下你的回声、补充记忆或想说的话…"
                      rows={3}
                      className="w-full resize-none bg-transparent text-sm text-blue-50 placeholder:text-blue-100/35 focus:outline-none"
                    />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-xs text-blue-100/45">支持持续评论与收藏，贴文详情会实时刷新。</p>
                      <button
                        type="button"
                        onClick={onSubmitComment}
                        disabled={commentPending}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-gradient-to-r from-blue-500 via-blue-400 to-indigo-400 px-4 py-2 text-xs font-semibold text-white transition hover:scale-[1.01] disabled:opacity-60"
                      >
                        {commentPending ? (
                          <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        发送评论
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
