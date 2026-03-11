'use client';

import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

import { AgentConfigEditor, type AgentEditorDraft } from '@/components/agent/AgentConfigEditor';

export type ChatConfigDrawerProps = {
  open: boolean;
  onClose: () => void;
  draft: AgentEditorDraft;
  onSave: (draft: AgentEditorDraft) => Promise<void> | void;
  saving?: boolean;
};

export function ChatConfigDrawer({
  open,
  onClose,
  draft,
  onSave,
  saving = false
}: ChatConfigDrawerProps) {
  const shouldReduceMotion = useReducedMotion();
  const [localDraft, setLocalDraft] = useState<AgentEditorDraft>(() => draft);

  const handleSave = async () => {
    await onSave(localDraft);
    onClose();
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          className="fixed right-0 top-0 z-[110] flex h-full w-full max-w-[720px] flex-col gap-6 border-l border-white/40 bg-[#f8fafc] p-6 text-ink shadow-[0_24px_60px_rgba(15,23,42,0.2)] backdrop-blur-[30px]"
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.35, ease: 'easeOut' }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">配置面板</p>
              <h3 className="mt-1 text-xl font-semibold text-ink">人设、世界书与记忆同步编辑</h3>
              <p className="mt-2 text-sm text-slate-500">保存后会重新整理人设，并同步后续 DeepSeek 对话。</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:text-ink"
              aria-label="关闭配置"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <AgentConfigEditor draft={localDraft} onChange={setLocalDraft} tone="light" />
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              className="glass-button glass-button--ghost"
              disabled={saving}
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
            >
              {saving ? '同步中...' : '保存并同步'}
            </button>
          </div>
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
