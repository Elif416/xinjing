'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Image as ImageIcon, Plus, X } from 'lucide-react';

export type ChatMessage = {
  id: string;
  role: 'user' | 'artist';
  text?: string;
  image?: string;
};

export type ArtistChatDrawerProps = {
  open: boolean;
  onClose: () => void;
  artist: {
    name: string;
    avatar: string;
    contextLabel: string;
  };
};

// ArtistChatDrawer：侧边私聊弹窗，可复用到其他画师详情页
// 通过 Props 控制开关，保持组件解耦，便于后续替换为真实 IM 服务
export function ArtistChatDrawer({ open, onClose, artist }: ArtistChatDrawerProps) {
  const shouldReduceMotion = useReducedMotion();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      role: 'artist',
      text: '你好，我可以帮你把情绪整理成视觉方案。'
    },
    {
      id: 'msg-2',
      role: 'user',
      text: '想预约一个情感场景插画。'
    }
  ]);
  const [input, setInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, role: 'user', text: input.trim() }
    ]);
    setInput('');
  };

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const preview = await compressImage(file);
    if (!preview) return;
    setMessages((prev) => [
      ...prev,
      { id: `msg-${Date.now()}`, role: 'user', image: preview }
    ]);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          className="fixed right-0 top-0 z-[90] flex h-full w-full max-w-sm flex-col gap-4 border-l border-white/40 bg-white/70 p-6 text-ink shadow-[0_24px_60px_rgba(15,23,42,0.2)] backdrop-blur-[30px]"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.4, ease: 'easeOut' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/40 bg-white/70">
                <img
                  src={artist.avatar}
                  alt={artist.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{artist.name}</p>
                <p className="text-xs text-slate-500">当前正在沟通：{artist.contextLabel}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/40 bg-white/70 p-1 text-slate-500 hover:text-ink"
              aria-label="关闭私聊"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-auto rounded-2xl border border-white/40 bg-white/60 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl border px-3 py-2 text-sm shadow-sm ${
                    message.role === 'user'
                      ? 'border-blue-200/70 bg-blue-500/20 text-ink'
                      : 'border-white/60 bg-white/80 text-ink'
                  }`}
                >
                  {message.text ? <p>{message.text}</p> : null}
                  {message.image ? (
                    <div className="mt-2 overflow-hidden rounded-xl border border-white/40 bg-white/70">
                      <img
                        src={message.image}
                        alt="图片预览"
                        className="h-28 w-full object-cover"
                      />
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-3 py-2">
            <button
              type="button"
              onClick={handlePickFile}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/70"
              aria-label="发送文件"
            >
              <Plus className="h-4 w-4 text-slate-500" />
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
              className="w-full bg-transparent text-sm text-slate-600 outline-none"
              placeholder="输入消息..."
            />
            <button
              type="button"
              onClick={handleSend}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/40 bg-white/70"
              aria-label="发送"
            >
              <ImageIcon className="h-4 w-4 text-slate-500" />
            </button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}

// 前端压缩展示：将图片缩放到最大 720px，减少预览开销
async function compressImage(file: File, maxWidth = 720, quality = 0.8) {
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