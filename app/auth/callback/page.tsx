'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import { GlassCard } from '@/components/GlassCard';

export const dynamic = 'force-dynamic';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('正在确认邮箱...');
  const [error, setError] = useState('');

  const nextPath = useMemo(() => {
    const value = searchParams.get('next') || '/';
    return value.startsWith('/') && !value.startsWith('//') ? value : '/';
  }, [searchParams]);

  useEffect(() => {
    async function completeEmailLink() {
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const queryParams = new URLSearchParams(window.location.search);
      const linkError =
        hashParams.get('error_description') ||
        queryParams.get('error_description') ||
        hashParams.get('error') ||
        queryParams.get('error');

      if (linkError) {
        setError(decodeURIComponent(linkError));
        setStatus('邮箱确认失败');
        return;
      }

      const accessToken = hashParams.get('access_token') || queryParams.get('access_token') || '';
      const code = queryParams.get('code') || '';

      if (!accessToken && !code) {
        setError('确认链接中缺少登录凭证，请重新发送验证邮件。');
        setStatus('邮箱确认失败');
        return;
      }

      try {
        const response = await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken, code })
        });
        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || '邮箱确认失败，请重新发送验证邮件。');
        }

        setStatus('邮箱已确认，正在进入心镜...');
        router.replace(nextPath);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : '邮箱确认失败，请重新发送验证邮件。');
        setStatus('邮箱确认失败');
      }
    }

    void completeEmailLink();
  }, [nextPath, router]);

  return (
    <main className="page-bg flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <GlassCard className="gap-5 p-8">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">HeartMirror</p>
          <h1 className="text-2xl font-semibold text-ink">{status}</h1>
          {error ? (
            <>
              <p className="text-sm leading-relaxed text-red-500">{error}</p>
              <Link href="/login" className="glass-button glass-button--primary w-fit">
                返回登录页
              </Link>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-slate-600">
              请稍等，正在为你建立安全会话。
            </p>
          )}
        </GlassCard>
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AuthCallbackContent />
    </Suspense>
  );
}
