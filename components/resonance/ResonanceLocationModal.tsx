'use client';

import { AnimatePresence, motion, type Transition } from 'framer-motion';
import { Globe2, Lock, MapPin, MessageCircle, X } from 'lucide-react';
import { memo } from 'react';

import type { ResonancePost } from '@/lib/resonanceTypes';

type ResonanceLocationModalProps = {
  open: boolean;
  title: string;
  posts: ResonancePost[];
  transition: Transition;
  formatDisplayTime: (value: string) => string;
  onClose: () => void;
  onSelectPost: (post: ResonancePost) => void;
};

export const ResonanceLocationModal = memo(function ResonanceLocationModal({
  open,
  title,
  posts,
  transition,
  formatDisplayTime,
  onClose,
  onSelectPost
}: ResonanceLocationModalProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#050712]/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="glass-card glass-card--dark relative mx-4 w-full max-w-3xl rounded-[32px] p-6 text-blue-50 lg:p-8"
            initial={{ y: 20, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.98 }}
            transition={transition}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full border border-white/20 bg-white/10 p-1 text-blue-100/70 transition hover:text-white"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-blue-100/55">
              <MapPin className="h-3.5 w-3.5" />
              同一地点的记忆贴文
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm text-blue-100/65">这里共有 {posts.length} 条贴文，点击卡片可查看完整内容。</p>

            <div className="mt-6 max-h-[65vh] space-y-3 overflow-y-auto pr-1">
              {posts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onSelectPost(post)}
                  className="flex w-full cursor-pointer flex-col gap-3 rounded-[26px] border border-white/12 bg-white/[0.04] p-4 text-left transition hover:border-white/24 hover:bg-white/[0.06]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-medium text-white">
                        {post.title || post.address}
                      </p>
                      <p className="mt-1 text-xs text-blue-100/55">
                        {post.authorName} · {formatDisplayTime(post.createdAt)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] ${
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
                        {post.visibility === 'private' ? '私密' : '公开'}
                      </span>
                    </div>
                  </div>

                  <p className="line-clamp-2 text-sm leading-relaxed text-blue-100/78">
                    {post.content}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-blue-100/55">
                    <span>{post.address}</span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3.5 w-3.5" />
                      {post.commentCount}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
});
