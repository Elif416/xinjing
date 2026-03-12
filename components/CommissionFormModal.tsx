'use client';

import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Transition } from 'framer-motion';
import { Calendar, ChevronLeft, ChevronRight, UploadCloud, X } from 'lucide-react';

export type CommissionFormValue = {
  emotion: string;
  uploads: string[];
  budget: string;
  deadline: string;
};

export type CommissionFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit?: (value: CommissionFormValue) => void;
};

const emotionOptions = ['忧郁', '治愈', '热烈', '宁静', '温柔', '神秘'];

// 约稿需求弹窗：复用玻璃质感，同时通过 Props 控制开关，便于复用与维护
export function CommissionFormModal({ open, onClose, onSubmit }: CommissionFormModalProps) {
  const shouldReduceMotion = useReducedMotion();
  const [step, setStep] = useState(1);
  const [emotion, setEmotion] = useState('治愈');
  const [uploads, setUploads] = useState<string[]>([]);
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const modalTransition: Transition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring', damping: 26, stiffness: 260 };

  const currentStepLabel = useMemo(() => {
    if (step === 1) return '定义情感';
    if (step === 2) return '上传记忆';
    return '商务细节';
  }, [step]);

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const nextUploads: string[] = [];

    for (const file of Array.from(files)) {
      const dataUrl = await compressImage(file);
      if (dataUrl) {
        nextUploads.push(dataUrl);
      }
    }

    setUploads((prev) => [...prev, ...nextUploads]);
  };

  const handleSubmit = () => {
    const payload: CommissionFormValue = {
      emotion,
      uploads,
      budget,
      deadline
    };
    onSubmit?.(payload);
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/30 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={modalTransition}
          onClick={handleClose}
        >
          <motion.div
            className="relative mx-6 w-full max-w-2xl rounded-3xl border border-white/40 bg-white/70 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.2)] backdrop-blur-[30px]"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={modalTransition}
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-4 top-4 rounded-full border border-white/40 bg-white/70 p-1 text-slate-500 hover:text-ink"
              aria-label="关闭"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">约稿需求</p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                  {currentStepLabel}
                </h2>
              </div>
              <span className="rounded-full border border-white/40 bg-white/70 px-3 py-1 text-xs text-slate-500">
                第 {step} / 3 步
              </span>
            </div>

            {/* 分步内容：通过 step 控制渲染，方便未来扩展 */}
            <div className="mt-6">
              {step === 1 ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-500">
                    选择你想表达的情绪基调，系统将自动匹配合适的视觉语言。
                  </p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {emotionOptions.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setEmotion(item)}
                        className={`rounded-2xl border px-4 py-3 text-sm transition ${
                          emotion === item
                            ? 'border-blue-400/70 bg-white text-ink shadow-sm'
                            : 'border-white/40 bg-white/60 text-slate-500 hover:text-ink'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl border border-white/40 bg-white/70 p-4 text-sm text-slate-500">
                    当前选择：<span className="text-ink">{emotion}</span>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-500">
                    上传你的生活照片或记忆碎片，作为创作灵感。
                  </p>
                  <button
                    type="button"
                    onClick={handlePickFile}
                    className="flex h-40 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-white/60 bg-white/60 text-sm text-slate-500"
                  >
                    <UploadCloud className="h-6 w-6" />
                    拖拽或点击上传文件
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => handleFiles(event.target.files)}
                  />
                  {uploads.length > 0 ? (
                    <div className="grid grid-cols-3 gap-3">
                      {uploads.map((item, index) => (
                        <div
                          key={`${item}-${index}`}
                          className="overflow-hidden rounded-2xl border border-white/40 bg-white/70"
                        >
                          <img
                            src={item}
                            alt="上传预览"
                            className="h-20 w-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step === 3 ? (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-slate-500">
                    填写预算与截稿日期，便于系统匹配排期与画师档期。
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="flex flex-col gap-2 text-sm text-slate-500">
                      预算（￥）
                      <div className="flex items-center gap-2 rounded-2xl border border-white/40 bg-white/70 px-4 py-3">
                        <span className="text-slate-400">￥</span>
                        <input
                          value={budget}
                          onChange={(event) => setBudget(event.target.value)}
                          className="w-full bg-transparent text-ink outline-none"
                          placeholder="例如 500"
                        />
                      </div>
                    </label>
                    <label className="flex flex-col gap-2 text-sm text-slate-500">
                      截稿日期
                      <div className="flex items-center gap-2 rounded-2xl border border-white/40 bg-white/70 px-4 py-3">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <input
                          type="date"
                          value={deadline}
                          onChange={(event) => setDeadline(event.target.value)}
                          className="w-full bg-transparent text-ink outline-none"
                        />
                      </div>
                    </label>
                  </div>
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStep((prev) => Math.max(1, prev - 1))}
                disabled={step === 1}
                className="glass-button glass-button--ghost"
              >
                <ChevronLeft className="h-4 w-4" />
                上一步
              </button>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => setStep((prev) => Math.min(3, prev + 1))}
                  className="glass-button glass-button--primary"
                >
                  下一步
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(37,99,235,0.45)]"
                >
                  发起共创请求
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

// 前端压缩展示：将图片缩放到最大 960px，减少预览开销
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
