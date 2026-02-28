'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useRouter } from 'next/navigation';

import { ActivationTrigger } from '@/components/activation/ActivationTrigger';
import { EntityContainer } from '@/components/activation/EntityContainer';
import { MemoryInfusionPanel, MemoryItem } from '@/components/activation/MemoryInfusionPanel';
import { PersonalityMatrix } from '@/components/activation/PersonalityMatrix';
import { GlassNavbar } from '@/components/GlassNavbar';
import activationData from '@/data/activation.json';
import homeData from '@/data/home.json';
import { sendCharacterSetup } from '@/lib/activationApi';
import { generateCharacterBundle } from '@/lib/characterBundle';
import { SoulMemory, useSoulStore } from '@/lib/useSoulStore';

export default function ActivationPage() {
  const router = useRouter();
  const shouldReduceMotion = useReducedMotion();
  const [isAwakened, setIsAwakened] = useState(false);

  // Zustand 持久化状态：统一管理灵魂配置
  const {
    name,
    keywords,
    emotionalTraits,
    memories,
    setName,
    setKeywords,
    setEmotionalTraits,
    setMemories,
    setCharacterBundle
  } = useSoulStore();

  const [keywordsInput, setKeywordsInput] = useState(keywords.join(' / '));

  useEffect(() => {
    setKeywordsInput(keywords.join(' / '));
  }, [keywords]);

  // 复用首页导航数据：保持全站信息结构一致，避免硬编码
  const activationNavItems = useMemo(() => {
    const items = Array.isArray(homeData.nav) ? homeData.nav : [];
    return items.map((item) => ({
      ...item,
      href: item.href.startsWith('#') ? `/${item.href}` : item.href
    }));
  }, []);

  const memoryItems: MemoryItem[] = activationData.memory.items as MemoryItem[];
  const selectedMemoryIds = useMemo(
    () => new Set(memories.map((memory) => memory.id)),
    [memories]
  );

  const handleToggleMemory = (id: string) => {
    if (selectedMemoryIds.has(id)) {
      setMemories(memories.filter((memory) => memory.id !== id));
      return;
    }
    const target = memoryItems.find((item) => item.id === id);
    if (!target) return;
    const payload: SoulMemory = {
      id: target.id,
      text: `${target.title}：${target.description}`,
      image: target.image ?? ''
    };
    setMemories([...memories, payload]);
  };

  // 共鸣程度：根据记忆注入与人格参数估算，后续可接入 AI 服务真实数值
  const resonanceScore = useMemo(() => {
    const memoryWeight = memoryItems.length
      ? (memories.length / memoryItems.length) * 40
      : 0;
    const personalityAvg =
      (emotionalTraits.emotion + emotionalTraits.logic + emotionalTraits.humor) / 3;
    const personalityWeight = (personalityAvg / 100) * 60;
    return Math.min(100, Math.round(memoryWeight + personalityWeight));
  }, [memories.length, memoryItems.length, emotionalTraits]);

  const handleActivate = () => {
    setIsAwakened(true);
    // 生成 SillyTavern 风格角色卡，并持久化到 Store
    const bundle = generateCharacterBundle({
      name,
      keywords,
      emotionalTraits,
      memories
    });
    setCharacterBundle(bundle);
    // 预集成 API：将角色设定发送到后端 / 大模型
    void sendCharacterSetup(bundle).catch(() => null);
    const delay = shouldReduceMotion ? 0 : 450;
    window.setTimeout(() => {
      router.push('/chat');
    }, delay);
  };

  return (
    <div className="min-h-screen bg-[#050915] text-white">
      <div className={`page-bg activation-bg ${isAwakened ? 'activation-awakened' : ''}`}>
        <GlassNavbar
          brand={homeData.brand ?? { name: '心镜', en: 'HeartMirror' }}
          items={activationNavItems}
        />

        <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16">
          {/* 数字生命容器：主视觉区域，承载智能体艺术图 */}
          <EntityContainer
            image={activationData.entity.image}
            title={activationData.entity.title}
            description={activationData.entity.description}
            awakened={isAwakened}
          />

          {/* 人格特征配置区：Bento Grid 玻璃卡片 */}
          <PersonalityMatrix
            name={name}
            traits={keywordsInput}
            nameLabel={activationData.personality.fields.name}
            traitsLabel={activationData.personality.fields.traits}
            onNameChange={setName}
            onTraitsChange={(value) => {
              setKeywordsInput(value);
              setKeywords(parseKeywords(value));
            }}
            sliders={[
              {
                id: 'emotion',
                label: activationData.personality.sliders[0].label,
                value: emotionalTraits.emotion,
                onChange: (value) =>
                  setEmotionalTraits({ ...emotionalTraits, emotion: value })
              },
              {
                id: 'logic',
                label: activationData.personality.sliders[1].label,
                value: emotionalTraits.logic,
                onChange: (value) =>
                  setEmotionalTraits({ ...emotionalTraits, logic: value })
              },
              {
                id: 'humor',
                label: activationData.personality.sliders[2].label,
                value: emotionalTraits.humor,
                onChange: (value) =>
                  setEmotionalTraits({ ...emotionalTraits, humor: value })
              }
            ]}
          />

          {/* 记忆注入面板：横向滚动卡片组 */}
          <MemoryInfusionPanel
            title={activationData.memory.title}
            items={memoryItems}
            selected={Array.from(selectedMemoryIds)}
            onToggle={handleToggleMemory}
          />

          {/* 唤醒交互区：进度条 + 唤醒按钮 */}
          <motion.div
            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.6, ease: 'easeOut' }}
          >
            <ActivationTrigger
              progressLabel={activationData.trigger.progressLabel}
              progress={resonanceScore}
              buttonLabel={activationData.trigger.buttonLabel}
              awakened={isAwakened}
              onActivate={handleActivate}
            />
          </motion.div>
        </main>
      </div>
    </div>
  );
}

// 解析关键词输入：支持 / 、 , 空格分隔
function parseKeywords(value: string) {
  return value
    .split(/[,，/\\s]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}
