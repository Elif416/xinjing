'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export type BackButtonProps = {
  className?: string;
};

// BackButton：全站返回按钮，统一放置在左上角
export function BackButton({ className }: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    router.push('/');
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className={className ?? 'glass-button glass-button--ghost glass-button--icon'}
      aria-label="返回"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}