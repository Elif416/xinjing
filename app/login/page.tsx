'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GlassCard } from '@/components/GlassCard';

export const dynamic = 'force-dynamic';

// 鐧诲綍椤甸潰锛氭瀬绠€姣涚幓鐠冮鏍硷紝浣滀负鍏ㄧ珯璁块棶闂ㄦ鍏ュ彛
function LoginContent() {
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
        setError('璐﹀彿鎴栧瘑鐮侀敊璇紝璇烽噸璇曘€?);
        return;
      }

      router.replace(redirect);
    } catch (err) {
      setError('鐧诲綍澶辫触锛岃妫€鏌ョ綉缁滃悗閲嶈瘯銆?);
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
            <h1 className="text-2xl font-semibold text-ink">鐧诲綍蹇冮暅</h1>
            <p className="text-sm text-slate-600">浠呭紑鏀惧彈閭€璐﹀彿璁块棶锛岀櫥褰曞悗鍙繘鍏ユ墍鏈夐〉闈€?/p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-2 text-xs text-slate-500">
              閭璐﹀彿
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
              瀵嗙爜
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 rounded-2xl border border-white/40 bg-white/70 px-4 text-sm text-ink shadow-sm outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-200/50"
                placeholder="璇疯緭鍏ュ瘑鐮?
              />
            </label>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}

            <button
              type="submit"
              className="glass-button glass-button--primary w-full justify-center"
              disabled={submitting}
            >
              {submitting ? '鐧诲綍涓?..' : '杩涘叆蹇冮暅'}
            </button>
          </form>
        </GlassCard>
      </div>
    </main>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}


