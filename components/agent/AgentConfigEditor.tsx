'use client';

import { useMemo, useRef, useState } from 'react';
import { FileText, ImagePlus, Plus, Trash2 } from 'lucide-react';

import type { AgentMemory, EmotionalTraits } from '@/lib/agentTypes';
import { PersonalitySlider } from '@/components/activation/PersonalitySlider';

export type AgentEditorDraft = {
  name: string;
  keywordsInput: string;
  emotionalTraits: EmotionalTraits;
  memories: AgentMemory[];
  worldbookText: string;
  worldbookFileName: string;
  characterCardText: string;
  characterCardFileName: string;
};

export type AgentConfigEditorProps = {
  draft: AgentEditorDraft;
  onChange: (next: AgentEditorDraft) => void;
  tone?: 'dark' | 'light';
};

export function AgentConfigEditor({
  draft,
  onChange,
  tone = 'dark'
}: AgentConfigEditorProps) {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const memoryFileInputRef = useRef<HTMLInputElement | null>(null);
  const worldbookInputRef = useRef<HTMLInputElement | null>(null);
  const characterCardInputRef = useRef<HTMLInputElement | null>(null);

  const [manualMemoryTitle, setManualMemoryTitle] = useState('');
  const [manualMemoryText, setManualMemoryText] = useState('');

  const styles = useMemo(() => getToneStyles(tone), [tone]);

  const updateDraft = (patch: Partial<AgentEditorDraft>) => {
    onChange({
      ...draft,
      ...patch
    });
  };

  const handleAddManualMemory = () => {
    if (!manualMemoryText.trim()) {
      return;
    }

    updateDraft({
      memories: [
        ...draft.memories,
        {
          id: `memory-${Date.now()}`,
          kind: 'text',
          title: manualMemoryTitle.trim() || '手动输入记忆',
          text: manualMemoryText.trim()
        }
      ]
    });
    setManualMemoryTitle('');
    setManualMemoryText('');
  };

  const handleRemoveMemory = (id: string) => {
    updateDraft({
      memories: draft.memories.filter((item) => item.id !== id)
    });
  };

  const handleAddImageMemory = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    const imageUrl = await compressImage(file);
    if (!imageUrl) {
      return;
    }

    updateDraft({
      memories: [
        ...draft.memories,
        {
          id: `memory-${Date.now()}`,
          kind: 'image',
          title: stripExtension(file.name) || '图片记忆',
          text: `来自图片文件 ${file.name}`,
          imageUrl,
          fileName: file.name
        }
      ]
    });

    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  const handleAddTextMemoryFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    const text = await file.text();
    updateDraft({
      memories: [
        ...draft.memories,
        {
          id: `memory-${Date.now()}`,
          kind: 'text',
          title: stripExtension(file.name) || '文本记忆',
          text: text.trim(),
          fileName: file.name
        }
      ]
    });

    if (memoryFileInputRef.current) {
      memoryFileInputRef.current.value = '';
    }
  };

  const handleLoadWorldbook = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    updateDraft({
      worldbookText: (await file.text()).trim(),
      worldbookFileName: file.name
    });

    if (worldbookInputRef.current) {
      worldbookInputRef.current.value = '';
    }
  };

  const handleLoadCharacterCard = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) {
      return;
    }

    updateDraft({
      characterCardText: (await file.text()).trim(),
      characterCardFileName: file.name
    });

    if (characterCardInputRef.current) {
      characterCardInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <section className={styles.panel}>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <div>
              <p className={styles.eyebrow}>基础设定</p>
              <h3 className={styles.heading}>为数字生命命名并定义性格关键词</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={styles.label}>
                名字
                <input
                  value={draft.name}
                  onChange={(event) => updateDraft({ name: event.target.value })}
                  className={styles.input}
                  placeholder="请输入名字"
                />
              </label>
              <label className={styles.label}>
                性格关键词
                <input
                  value={draft.keywordsInput}
                  onChange={(event) => updateDraft({ keywordsInput: event.target.value })}
                  className={styles.input}
                  placeholder="温柔 / 理性 / 细腻"
                />
              </label>
            </div>
          </div>

          <div className={styles.subPanel}>
            <div>
              <p className={styles.eyebrow}>情感引擎参数</p>
              <p className={styles.helper}>调节情绪权重，形成独特的陪伴方式。</p>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              <PersonalitySlider
                label="感性程度"
                value={draft.emotionalTraits.emotion}
                onChange={(value) =>
                  updateDraft({
                    emotionalTraits: {
                      ...draft.emotionalTraits,
                      emotion: value
                    }
                  })
                }
                tone={tone}
              />
              <PersonalitySlider
                label="逻辑性"
                value={draft.emotionalTraits.logic}
                onChange={(value) =>
                  updateDraft({
                    emotionalTraits: {
                      ...draft.emotionalTraits,
                      logic: value
                    }
                  })
                }
                tone={tone}
              />
              <PersonalitySlider
                label="幽默感"
                value={draft.emotionalTraits.humor}
                onChange={(value) =>
                  updateDraft({
                    emotionalTraits: {
                      ...draft.emotionalTraits,
                      humor: value
                    }
                  })
                }
                tone={tone}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className={styles.sectionTitle}>注入记忆碎片以驱动灵魂</h3>
          <p className={styles.helper}>支持图片上传、txt/md 文本导入和手动输入；已移除音频。</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className={styles.actionCard}
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-base font-semibold">上传图片记忆</span>
            <span className={styles.helper}>压缩后以内嵌图片形式保存。</span>
          </button>

          <button
            type="button"
            onClick={() => memoryFileInputRef.current?.click()}
            className={styles.actionCard}
          >
            <FileText className="h-5 w-5" />
            <span className="text-base font-semibold">导入 txt / md 记忆</span>
            <span className={styles.helper}>文本文件会直接转为可编辑记忆内容。</span>
          </button>

          <div className={styles.actionCard}>
            <Plus className="h-5 w-5" />
            <span className="text-base font-semibold">手动输入记忆</span>
            <div className="mt-3 flex w-full flex-col gap-3">
              <input
                value={manualMemoryTitle}
                onChange={(event) => setManualMemoryTitle(event.target.value)}
                className={styles.input}
                placeholder="标题（可选）"
              />
              <textarea
                value={manualMemoryText}
                onChange={(event) => setManualMemoryText(event.target.value)}
                className={styles.textarea}
                placeholder="写下一段你希望智能体记住的文字。"
              />
              <button type="button" onClick={handleAddManualMemory} className={styles.primaryButton}>
                添加这段记忆
              </button>
            </div>
          </div>
        </div>

        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => handleAddImageMemory(event.target.files)}
        />
        <input
          ref={memoryFileInputRef}
          type="file"
          accept=".txt,.md,text/plain,text/markdown"
          className="hidden"
          onChange={(event) => handleAddTextMemoryFile(event.target.files)}
        />

        {draft.memories.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {draft.memories.map((memory) => (
              <article key={memory.id} className={styles.memoryCard}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={styles.eyebrow}>
                      {memory.kind === 'image' ? '图片记忆' : '文本记忆'}
                    </p>
                    <h4 className={styles.memoryTitle}>{memory.title}</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMemory(memory.id)}
                    className={styles.iconButton}
                    aria-label="移除记忆"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {memory.imageUrl ? (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/15">
                    <img
                      src={memory.imageUrl}
                      alt={memory.title}
                      className="h-36 w-full object-cover"
                    />
                  </div>
                ) : null}
                <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{memory.text || '暂无文字说明'}</p>
                {memory.fileName ? (
                  <p className="mt-3 text-xs opacity-70">来源文件：{memory.fileName}</p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>还没有注入任何记忆碎片。</div>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className={styles.panel}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={styles.eyebrow}>世界书</p>
              <h3 className={styles.heading}>导入 txt / md 世界书</h3>
              <p className={styles.helper}>用于补充世界背景、规则和长期设定。</p>
            </div>
            <button
              type="button"
              onClick={() => worldbookInputRef.current?.click()}
              className={styles.secondaryButton}
            >
              导入文件
            </button>
          </div>
          {draft.worldbookFileName ? (
            <p className="mt-3 text-xs opacity-70">当前文件：{draft.worldbookFileName}</p>
          ) : null}
          <textarea
            value={draft.worldbookText}
            onChange={(event) => updateDraft({ worldbookText: event.target.value })}
            className={`${styles.textarea} mt-4 min-h-[220px]`}
            placeholder="在这里粘贴或导入世界书内容。"
          />
          <input
            ref={worldbookInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(event) => handleLoadWorldbook(event.target.files)}
          />
        </article>

        <article className={styles.panel}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className={styles.eyebrow}>角色卡</p>
              <h3 className={styles.heading}>导入 txt / md 角色卡</h3>
              <p className={styles.helper}>可粘贴已有角色卡文本，后续会整理进人设。</p>
            </div>
            <button
              type="button"
              onClick={() => characterCardInputRef.current?.click()}
              className={styles.secondaryButton}
            >
              导入文件
            </button>
          </div>
          {draft.characterCardFileName ? (
            <p className="mt-3 text-xs opacity-70">当前文件：{draft.characterCardFileName}</p>
          ) : null}
          <textarea
            value={draft.characterCardText}
            onChange={(event) => updateDraft({ characterCardText: event.target.value })}
            className={`${styles.textarea} mt-4 min-h-[220px]`}
            placeholder="在这里粘贴或导入角色卡内容。"
          />
          <input
            ref={characterCardInputRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(event) => handleLoadCharacterCard(event.target.files)}
          />
        </article>
      </section>
    </div>
  );
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

function stripExtension(name: string) {
  return name.replace(/\.[^.]+$/, '');
}

function getToneStyles(tone: 'dark' | 'light') {
  if (tone === 'light') {
    return {
      panel: 'rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)]',
      subPanel: 'rounded-3xl border border-slate-200 bg-slate-50 p-5',
      label: 'flex flex-col gap-2 text-xs uppercase tracking-[0.18em] text-slate-500',
      input:
        'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none',
      textarea:
        'rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none',
      eyebrow: 'text-xs uppercase tracking-[0.2em] text-slate-400',
      heading: 'mt-2 text-xl font-semibold text-slate-900',
      helper: 'mt-2 text-sm text-slate-500',
      sectionTitle: 'text-2xl font-semibold tracking-tight text-slate-900',
      actionCard:
        'rounded-3xl border border-slate-200 bg-white p-5 text-left text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5',
      memoryCard:
        'rounded-3xl border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.08)]',
      memoryTitle: 'mt-2 text-lg font-semibold text-slate-900',
      iconButton:
        'rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:text-slate-900',
      primaryButton:
        'rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white',
      secondaryButton:
        'rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700',
      emptyState:
        'rounded-3xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500'
    };
  }

  return {
    panel: 'rounded-3xl border border-white/15 bg-white/8 p-5 backdrop-blur-[20px]',
    subPanel: 'rounded-3xl border border-white/10 bg-black/10 p-5',
    label: 'flex flex-col gap-2 text-xs uppercase tracking-[0.18em] text-blue-100/60',
    input:
      'rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none',
    textarea:
      'rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none',
    eyebrow: 'text-xs uppercase tracking-[0.2em] text-blue-100/60',
    heading: 'mt-2 text-xl font-semibold text-white',
    helper: 'mt-2 text-sm text-blue-100/70',
    sectionTitle: 'text-2xl font-semibold tracking-tight text-white',
    actionCard:
      'rounded-3xl border border-white/15 bg-white/8 p-5 text-left text-white backdrop-blur-[20px] transition hover:-translate-y-0.5',
    memoryCard:
      'rounded-3xl border border-white/15 bg-white/8 p-5 text-blue-50 backdrop-blur-[20px]',
    memoryTitle: 'mt-2 text-lg font-semibold text-white',
    iconButton:
      'rounded-full border border-white/15 bg-white/10 p-2 text-blue-100 transition hover:text-white',
    primaryButton:
      'rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-4 py-2 text-sm font-semibold text-white',
    secondaryButton:
      'rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white',
    emptyState:
      'rounded-3xl border border-dashed border-white/15 bg-white/8 px-5 py-8 text-center text-sm text-blue-100/70'
  };
}
