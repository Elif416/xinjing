import React from 'react';

export type ActivationTriggerProps = {
  progressLabel: string;
  progress: number;
  buttonLabel: string;
  awakened?: boolean;
  onActivate: () => void;
};

// ActivationTrigger：唤醒交互区，底部进度条 + 按钮
// 预留 onActivate 回调，未来可接入真实 AI 唤醒接口
export function ActivationTrigger({
  progressLabel,
  progress,
  buttonLabel,
  awakened = false,
  onActivate
}: ActivationTriggerProps) {
  return (
    <section className="flex flex-col items-center gap-6 pb-8">
      <div className="w-full max-w-3xl">
        <div className="flex items-center justify-between text-xs text-blue-100/70">
          <span>{progressLabel}</span>
          <span>{progress}%</span>
        </div>
        <div className="mt-2 h-[2px] w-full rounded-full bg-white/20">
          <span
            className="block h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onActivate}
        className={`rounded-full px-10 py-4 text-base font-semibold text-white shadow-[0_18px_45px_rgba(37,99,235,0.45)] transition ${
          awakened
            ? 'bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600'
            : 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700'
        }`}
      >
        {buttonLabel}
      </button>
    </section>
  );
}