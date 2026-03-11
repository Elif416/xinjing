'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Plus, X } from 'lucide-react';

import { MemoryCard } from '../activation/MemoryCard';
import { PersonalitySlider } from '../activation/PersonalitySlider';
import type { EmotionalTraits, SoulMemory } from '@/lib/useSoulStore';

export type ChatConfigDrawerProps = {
  open: boolean;
  onClose: () => void;
  name: string;
  keywordsInput: string;
  emotionalTraits: EmotionalTraits;
  memories: SoulMemory[];
  onSave: (payload: {
    name: string;
    keywordsInput: string;
    emotionalTraits: EmotionalTraits;
    memories: SoulMemory[];
  }) => void;
};

type ChatConfigDrawerPanelProps = Omit<ChatConfigDrawerProps, 'open'>;

export function ChatConfigDrawer({ open, ...props }: ChatConfigDrawerProps) {
  return <AnimatePresence>{open ? <ChatConfigDrawerPanel {...props} /> : null}</AnimatePresence>;
}

function ChatConfigDrawerPanel({
  onClose,
  name,
  keywordsInput,
  emotionalTraits,
  memories,
  onSave
}: ChatConfigDrawerPanelProps) {
  const shouldReduceMotion = useReducedMotion();
  const [localName, setLocalName] = useState(name);
  const [localKeywords, setLocalKeywords] = useState(keywordsInput);
  const [localTraits, setLocalTraits] = useState<EmotionalTraits>(emotionalTraits);
  const [localMemories, setLocalMemories] = useState<SoulMemory[]>(memories);
  const [memoryText, setMemoryText] = useState('');
  const [memoryImage, setMemoryImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSave = () => {
    onSave({
      name: localName,
      keywordsInput: localKeywords,
      emotionalTraits: localTraits,
      memories: localMemories
    });
    onClose();
  };

  const handlePickImage = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const preview = await compressImage(file);
    if (preview) {
      setMemoryImage(preview);
    }
  };

  const handleAddMemory = () => {
    if (!memoryText.trim()) return;
    const newMemory: SoulMemory = {
      id: `memory-${Date.now()}`,
      text: memoryText.trim(),
      image: memoryImage
    };
    setLocalMemories((prev) => [...prev, newMemory]);
    setMemoryText('');
    setMemoryImage('');
  };

  const handleRemoveMemory = (id: string) => {
    setLocalMemories((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <motion.aside
      className="fixed right-0 top-0 z-[110] flex h-full w-full max-w-md flex-col gap-6 border-l border-white/40 bg-white/70 p-6 text-ink shadow-[0_24px_60px_rgba(15,23,42,0.2)] backdrop-blur-[30px]"
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: 'easeOut' }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">配置面板</p>
          <h3 className="mt-1 text-xl font-semibold text-ink">灵魂参数实时编辑</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-white/40 bg-white/70 p-1 text-slate-500 hover:text-ink"
          aria-label="关闭配置"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-4 overflow-y-auto pr-1">
        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          名字
          <input
            value={localName}
            onChange={(event) => setLocalName(event.target.value)}
            className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm text-ink outline-none"
            placeholder="请输入名字"
          />
        </label>

        <label className="flex flex-col gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
          性格关键词
          <input
            value={localKeywords}
            onChange={(event) => setLocalKeywords(event.target.value)}
            className="rounded-2xl border border-white/40 bg-white/70 px-4 py-3 text-sm text-ink outline-none"
            placeholder="温柔 / 理性 / 细腻"
          />
        </label>

        <div className="rounded-3xl border border-white/40 bg-white/60 p-4">
          <h4 className="text-sm font-semibold text-ink">情感引擎参数</h4>
          <div className="mt-4 flex flex-col gap-4">
            <PersonalitySlider
              label="情感浓度"
              value={localTraits.emotion}
              onChange={(value) => setLocalTraits((prev) => ({ ...prev, emotion: value }))}
              tone="light"
            />
            <PersonalitySlider
              label="逻辑性"
              value={localTraits.logic}
              onChange={(value) => setLocalTraits((prev) => ({ ...prev, logic: value }))}
              tone="light"
            />
            <PersonalitySlider
              label="幽默感"
              value={localTraits.humor}
              onChange={(value) => setLocalTraits((prev) => ({ ...prev, humor: value }))}
              tone="light"
            />
          </div>
        </div>

        <div className="rounded-3xl border border-white/40 bg-white/60 p-4">
          <h4 className="text-sm font-semibold text-ink">记忆碎片</h4>
          <div className="mt-4 flex flex-col gap-3">
            {localMemories.length > 0 ? (
              localMemories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  item={{
                    id: memory.id,
                    type: 'custom',
                    title: '记忆碎片',
                    description: memory.text,
                    image: memory.image
                  }}
                  selected={true}
                  onToggle={() => handleRemoveMemory(memory.id)}
                  className="w-full"
                />
              ))
            ) : (
              <p className="text-sm text-slate-500">暂无记忆碎片，请添加。</p>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <textarea
              value={memoryText}
              onChange={(event) => setMemoryText(event.target.value)}
              className="min-h-[80px] rounded-2xl border border-white/40 bg-white/70 p-3 text-sm text-ink outline-none"
              placeholder="新增记忆描述"
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePickImage}
                className="glass-button glass-button--ghost text-xs"
              >
                <Plus className="h-3 w-3" />
                添加图片
              </button>

              {memoryImage ? (
                <div className="h-10 w-16 overflow-hidden rounded-xl border border-white/40 bg-white/70">
                  <img src={memoryImage} alt="记忆预览" className="h-full w-full object-cover" />
                </div>
              ) : null}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => handleFiles(event.target.files)}
              />
            </div>

            <button
              type="button"
              onClick={handleAddMemory}
              className="rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-4 py-2 text-xs font-semibold text-white"
            >
              新增记忆碎片
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onClose} className="glass-button glass-button--ghost">
          取消
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white"
        >
          保存并更新
        </button>
      </div>
    </motion.aside>
  );
}

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
