'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/GlassCard';

// 登录页面：极简毛玻璃风格，作为全站访问门槛入口
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        setError('账号或密码错误，请重试。');
        return;
      }

      router.replace(redirect);
    } catch (err) {
      setError('登录失败，请检查网络后重试。');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page-bg flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <GlassCard className="gap-6 p-8">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">HeartMirror</p>
            <h1 className="text-2xl font-semibold text-ink">登录心镜</h1>
            <p className="text-sm text-slate-600">仅开放受邀账号访问，登录后可进入所有页面。</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-2 text-xs text-slate-500">
              邮箱账号
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-11 rounded-2xl border border-white/40 bg-white/70 px-4 text-sm text-ink shadow-sm outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-200/50"
                placeholder="name@example.com"
              />
            </label>

            <label className="flex flex-col gap-2 text-xs text-slate-500">
              密码
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-2xl border border-white/40 bg-white/70 px-4 text-sm text-ink shadow-sm outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-200/50"
                placeholder="请输入密码"
              />
            </label>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <button
              type="submit"
              className="glass-button glass-button--primary w-full justify-center"
              disabled={submitting}
            >
              {submitting ? '登录中...' : '进入心镜'}
            </button>
          </form>
        </GlassCard>
      </div>
    </main>
  );
}
