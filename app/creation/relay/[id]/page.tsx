'use client';

import { useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronLeft, Heart, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { GlassCard } from '@/components/GlassCard';
import { GlassNavbar } from '@/components/GlassNavbar';
import homeData from '@/data/home.json';
import relayData from '@/data/relay.json';

type RelayNode = {
  id: string;
  title: string;
  author: string;
  content: string;
  image: string;
};

type RelayStory = {
  id: string;
  title: string;
  progress: string;
  participants: number;
  summary: string;
  oc: {
    name: string;
    role: string;
    tags: string[];
    description: string;
    image: string;
  };
  nodes: RelayNode[];
};

export default function RelayStoryPage() {
  const params = useParams<{ id: string }>();
  const shouldReduceMotion = useReducedMotion();
  const [isOcOpen, setIsOcOpen] = useState(false);

  // 复用首页导航数据：保持全站信息架构一致，避免硬编码
  const relayNavItems = useMemo(() => {
    const items = Array.isArray(homeData.nav) ? homeData.nav : [];
    return items.map((item) => ({
      ...item,
      // 当导航是锚点时，自动补全为首页路径，避免在本页失效
      href: item.href.startsWith('#') ? `/${item.href}` : item.href
    }));
  }, []);

  // RelayNode 数据结构统一管理，便于未来后端直接输出数组
  const relayStories: RelayStory[] = Array.isArray(relayData.stories)
    ? (relayData.stories as RelayStory[])
    : [];
  const relayStory = relayStories.find((story) => story.id === params.id);

  const revealInitial = shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 };
  const revealWhile = { opacity: 1, y: 0 };
  const revealTransition = shouldReduceMotion ? { duration: 0 } : { duration: 0.6, ease: 'easeOut' };

  if (!relayStory) {
    return (
      <div className="min-h-screen bg-[#060a17] text-white">
        <div className="page-bg relay-bg">
          <GlassNavbar
            brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }}
            items={relayNavItems}
          />
          <main className="mx-auto flex w-full max-w-3xl flex-col items-start gap-6 px-6 py-24">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
              Relay · 接力绘画小说
            </p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              未找到对应的接力故事
            </h1>
            <p className="text-sm text-slate-300">
              该故事可能已结束或尚未发布，请返回灵感创造页面查看其他故事。
            </p>
            <Link href="/creation" className="glass-button glass-button--ghost">
              返回约稿中心
            </Link>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060a17] text-white">
      <div className="page-bg relay-bg">
        <GlassNavbar
          brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }}
          items={relayNavItems}
        />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-28 pt-16">
          {/* 沉浸式标题区：突出主题与接力进度 */}
          <section className="flex flex-col gap-6">
            <Link
              href="/creation"
              className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white"
            >
              <ChevronLeft className="h-4 w-4" />
              返回灵感创造
            </Link>
            <div className="max-w-3xl">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-300">
                Relay · 接力绘画小说
              </p>
              <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                {relayStory.title}
              </h1>
              <p className="mt-4 text-base leading-relaxed text-slate-300">
                {relayStory.summary}
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-200">
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1">
                  {relayStory.progress}
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-1">
                  {relayStory.participants} 位参与者
                </span>
              </div>
            </div>
          </section>

          {/* 接力时间轴：RelayNode 容器居中且宽度受限 */}
          <section className="mx-auto flex w-full max-w-[800px] flex-col gap-10">
            {relayStory.nodes.map((node, index) => {
              const isReverse = index % 2 === 1;
              const showConnector = index < relayStory.nodes.length - 1;
              return (
                <div key={node.id} className="flex flex-col items-center gap-4">
                  <motion.div
                    initial={revealInitial}
                    whileInView={revealWhile}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={revealTransition}
                    style={{ transform: 'translateZ(0)' }}
                    className="w-full"
                  >
                    {/* RelayNode：复用 GlassCard，图文交错，桌面端左右错位 */}
                    <GlassCard className={`flex flex-col gap-6 md:flex-row ${isReverse ? 'md:flex-row-reverse' : ''}`}>
                      <div className="flex-1">
                        <div className="overflow-hidden rounded-2xl border border-white/30 bg-white/70">
                          <img
                            src={node.image}
                            alt={node.title}
                            className="h-48 w-full object-cover md:h-56"
                            loading="lazy"
                            decoding="async"
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                          {node.author} · 接力
                        </p>
                        <h3 className="mt-2 text-2xl font-semibold tracking-tight text-ink">
                          {node.title}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-slate-600">
                          {node.content}
                        </p>
                      </div>
                    </GlassCard>
                  </motion.div>

                  {/* 连接下一棒的细线：保持时间轴连续感 */}
                  {showConnector ? (
                    <div className="flex flex-col items-center">
                      <span className="h-3 w-3 rounded-full border border-white/40 bg-white/80" />
                      <span className="mt-2 h-10 w-px bg-white/40" />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        </main>

        {/* 右侧 OC 浮窗：点击展开详细设定 */}
        <motion.aside
          layout
          className="fixed right-6 top-28 hidden w-64 flex-col gap-4 rounded-3xl border border-white/20 bg-white/10 p-4 text-slate-100 shadow-[0_24px_60px_rgba(0,0,0,0.35)] backdrop-blur-[24px] lg:flex"
        >
          <button
            type="button"
            onClick={() => setIsOcOpen((prev) => !prev)}
            className="flex items-center justify-between text-sm font-semibold"
          >
            <span>OC 档案</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform ${isOcOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/20 text-sm font-semibold">
              {relayStory.oc.name.slice(0, 1)}
            </div>
            <div>
              <p className="text-sm font-semibold">{relayStory.oc.name}</p>
              <p className="text-xs text-slate-300">{relayStory.oc.role}</p>
            </div>
          </div>
          {isOcOpen ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.3 }}
              className="flex flex-col gap-3 text-xs text-slate-200"
            >
              <div className="overflow-hidden rounded-2xl border border-white/20 bg-white/10">
                <img
                  src={relayStory.oc.image}
                  alt={relayStory.oc.name}
                  className="h-28 w-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <p>{relayStory.oc.description}</p>
              <div className="flex flex-wrap gap-2">
                {relayStory.oc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-white/20 bg-white/10 px-2 py-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ) : null}
        </motion.aside>

        {/* 底部交互栏：共鸣统计 + 参与接力 */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-white/10 backdrop-blur-[24px]">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4 text-sm text-slate-200">
              <button
                type="button"
                className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2"
              >
                <Heart className="h-4 w-4 text-blue-300" />
                共鸣 3.4k
              </button>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Users className="h-4 w-4" />
                {relayStory.participants} 人参与
              </div>
            </div>
            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(37,99,235,0.45)]"
            >
              参与接力
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
