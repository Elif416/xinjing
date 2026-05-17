'use client';

import { Suspense, useState } from 'react';
import { KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { GlassCard } from '@/components/GlassCard';

export const dynamic = 'force-dynamic';

type AuthMode = 'code' | 'password';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') || '/';
  const redirect = redirectParam.startsWith('/') ? redirectParam : '/';

  const [mode, setMode] = useState<AuthMode>('code');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  function completeLogin() {
    router.replace(redirect);
    router.refresh();
  }

  async function readError(response: Response, fallback: string) {
    try {
      const payload = (await response.json()) as { error?: string };
      return payload.error || fallback;
    } catch {
      return fallback;
    }
  }

  async function handlePasswordSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordSubmitting(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) {
        setError(await readError(response, '账号或密码错误，请重试。'));
        return;
      }

      completeLogin();
    } catch {
      setError('登录失败，请检查网络后重试。');
    } finally {
      setPasswordSubmitting(false);
    }
  }

  async function handleRequestCode(event?: React.FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    setSendingCode(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, redirect })
      });

      if (!response.ok) {
        setError(await readError(response, '验证码发送失败，请稍后重试。'));
        return;
      }

      setCode('');
      setCodeSent(true);
      setNotice('验证码已发送，请查看邮箱并输入 6 位验证码完成注册。');
    } catch {
      setError('验证码发送失败，请检查网络后重试。');
    } finally {
      setSendingCode(false);
    }
  }

  async function handleVerifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVerifyingCode(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      if (!response.ok) {
        setError(await readError(response, '验证码无效或已过期。'));
        return;
      }

      completeLogin();
    } catch {
      setError('验证码验证失败，请检查网络后重试。');
    } finally {
      setVerifyingCode(false);
    }
  }

  const isCodeBusy = sendingCode || verifyingCode;

  return (
    <main className="page-bg flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <GlassCard className="gap-6 p-8">
          <header className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">HeartMirror</p>
            <h1 className="text-2xl font-semibold text-ink">登录或注册心镜</h1>
            <p className="text-sm text-slate-600">
              使用邮箱验证码进入；首次验证成功后会自动创建账号。
            </p>
          </header>

          <div className="grid grid-cols-2 gap-2 rounded-2xl border border-white/50 bg-white/55 p-1 text-xs shadow-sm">
            <button
              type="button"
              aria-pressed={mode === 'code'}
              onClick={() => {
                setMode('code');
                setError('');
                setNotice('');
              }}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 transition ${
                mode === 'code' ? 'bg-white text-ink shadow-sm' : 'text-slate-500 hover:text-ink'
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              邮箱验证码
            </button>
            <button
              type="button"
              aria-pressed={mode === 'password'}
              onClick={() => {
                setMode('password');
                setError('');
                setNotice('');
              }}
              className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 transition ${
                mode === 'password'
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-slate-500 hover:text-ink'
              }`}
            >
              <KeyRound className="h-3.5 w-3.5" />
              密码登录
            </button>
          </div>

          {mode === 'code' ? (
            <form
              onSubmit={codeSent ? handleVerifyCode : handleRequestCode}
              className="space-y-4"
            >
              <label className="flex flex-col gap-2 text-xs text-slate-500">
                邮箱
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 rounded-2xl border border-white/40 bg-white/70 px-4 text-sm text-ink shadow-sm outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-200/50"
                  placeholder="name@example.com"
                  autoComplete="email"
                />
              </label>

              {codeSent ? (
                <label className="flex flex-col gap-2 text-xs text-slate-500">
                  验证码
                  <input
                    inputMode="numeric"
                    required
                    maxLength={6}
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                    className="h-11 rounded-2xl border border-white/40 bg-white/70 px-4 text-sm tracking-[0.35em] text-ink shadow-sm outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-200/50"
                    placeholder="000000"
                    autoComplete="one-time-code"
                  />
                </label>
              ) : null}

              {notice ? (
                <p className="flex items-start gap-2 text-sm text-blue-600">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  {notice}
                </p>
              ) : null}
              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="glass-button glass-button--primary flex-1 justify-center"
                  disabled={isCodeBusy}
                >
                  {codeSent
                    ? verifyingCode
                      ? '验证中...'
                      : '验证并进入'
                    : sendingCode
                      ? '发送中...'
                      : '发送验证码'}
                </button>
                {codeSent ? (
                  <button
                    type="button"
                    className="glass-button glass-button--ghost justify-center"
                    disabled={isCodeBusy}
                    onClick={() => void handleRequestCode()}
                  >
                    重新发送
                  </button>
                ) : null}
              </div>
            </form>
          ) : (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <label className="flex flex-col gap-2 text-xs text-slate-500">
                账号
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-11 rounded-2xl border border-white/40 bg-white/70 px-4 text-sm text-ink shadow-sm outline-none transition focus:border-blue-200 focus:ring-2 focus:ring-blue-200/50"
                  placeholder="name@example.com"
                  autoComplete="email"
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
                  autoComplete="current-password"
                />
              </label>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              <button
                type="submit"
                className="glass-button glass-button--primary w-full justify-center"
                disabled={passwordSubmitting}
              >
                {passwordSubmitting ? '登录中...' : '进入心镜'}
              </button>
            </form>
          )}
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
