'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

import { GlassNavbar } from '@/components/GlassNavbar';
import homeData from '@/data/home.json';

type EmotionKey = 'joy' | 'melancholy' | 'serenity';

const EMOTION_META: Record<
  EmotionKey,
  {
    label: string;
    low: string;
    high: string;
    track: string;
  }
> = {
  joy: {
    label: '欢愉',
    low: '#FFE5F1',
    high: '#FF7CB5',
    track: '#FF9CC9'
  },
  melancholy: {
    label: '忧郁',
    low: '#E1E7FF',
    high: '#6B7CFF',
    track: '#8C9BFF'
  },
  serenity: {
    label: '宁静',
    low: '#E2FAF6',
    high: '#63D8C7',
    track: '#7BE7D8'
  }
};

const EMOTION_LINES: Record<EmotionKey, string> = {
  joy: '欢愉成为主频，像晨光穿透薄雾，轻轻照亮内心的纹理。',
  melancholy: '忧郁停驻在高处，让记忆有了更柔软的影子与层次。',
  serenity: '宁静稳定地回响，情绪被温柔安放，呼吸也更缓慢。'
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const int = Number.parseInt(value, 16);
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (channel: number) => channel.toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function mixHex(low: string, high: string, ratio: number) {
  const clamped = clamp(ratio, 0, 1);
  const lowRgb = hexToRgb(low);
  const highRgb = hexToRgb(high);
  const mix = (start: number, end: number) =>
    Math.round(start + (end - start) * clamped);
  return rgbToHex(
    mix(lowRgb.r, highRgb.r),
    mix(lowRgb.g, highRgb.g),
    mix(lowRgb.b, highRgb.b)
  );
}

function rgbaFromHex(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
}

type EmotionSliderProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  track: string;
};

function EmotionSlider({ label, value, onChange, track }: EmotionSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm text-slate-700">
        <span>{label}</span>
        <span className="text-xs text-slate-500">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="emotion-slider"
        style={{ '--value': `${value}%`, '--track-color': track } as CSSProperties}
        aria-label={label}
      />
    </div>
  );
}

export default function EmotionColorMixerPage() {
  const brand = homeData.brand ?? { name: '心镜', en: 'HeartMirror' };
  const shouldReduceMotion = useReducedMotion();

  const [joy, setJoy] = useState(72);
  const [melancholy, setMelancholy] = useState(38);
  const [serenity, setSerenity] = useState(64);

  const swatches = useMemo(() => {
    return {
      joy: mixHex(EMOTION_META.joy.low, EMOTION_META.joy.high, joy / 100),
      melancholy: mixHex(
        EMOTION_META.melancholy.low,
        EMOTION_META.melancholy.high,
        melancholy / 100
      ),
      serenity: mixHex(
        EMOTION_META.serenity.low,
        EMOTION_META.serenity.high,
        serenity / 100
      )
    };
  }, [joy, melancholy, serenity]);

  const gradientVars = useMemo(() => {
    const joyAlpha = 0.18 + (joy / 100) * 0.52;
    const melancholyAlpha = 0.18 + (melancholy / 100) * 0.52;
    const serenityAlpha = 0.18 + (serenity / 100) * 0.52;

    return {
      '--joy-x': `${18 + joy * 0.28}%`,
      '--joy-y': `${22 + joy * 0.12}%`,
      '--joy-size': `${48 + joy * 0.32}%`,
      '--joy-color': rgbaFromHex(swatches.joy, joyAlpha),
      '--mel-x': `${78 - melancholy * 0.26}%`,
      '--mel-y': `${28 + melancholy * 0.3}%`,
      '--mel-size': `${50 + melancholy * 0.3}%`,
      '--mel-color': rgbaFromHex(swatches.melancholy, melancholyAlpha),
      '--ser-x': `${40 + serenity * 0.25}%`,
      '--ser-y': `${76 - serenity * 0.22}%`,
      '--ser-size': `${50 + serenity * 0.28}%`,
      '--ser-color': rgbaFromHex(swatches.serenity, serenityAlpha)
    } as CSSProperties;
  }, [joy, melancholy, serenity, swatches]);

  const dominantEmotion = useMemo<EmotionKey>(() => {
    const entries: Array<[EmotionKey, number]> = [
      ['joy', joy],
      ['melancholy', melancholy],
      ['serenity', serenity]
    ];
    entries.sort((a, b) => b[1] - a[1]);
    return entries[0][0];
  }, [joy, melancholy, serenity]);

  const gradientTransition = shouldReduceMotion
    ? { duration: 0 }
    : { type: 'spring', stiffness: 120, damping: 22 };

  return (
    <div className="min-h-screen bg-white text-ink">
      <GlassNavbar brand={brand} items={homeData.nav} />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-20 pt-16">
        <header className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
            Emotion Color Mixer
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            调谐你的情感频率
          </h1>
          <p className="mt-4 text-base leading-relaxed text-slate-600 md:text-lg">
            每一次滑动，都是灵魂的具象表达。
          </p>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-[32px] border border-white/40 bg-white/55 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-[32px] md:p-10">
            <motion.div
              className="fluid-canvas"
              animate={gradientVars}
              transition={gradientTransition}
              initial={false}
            />
            <div className="relative z-10 flex h-[320px] flex-col justify-end md:h-[420px]">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/50 bg-white/70 px-4 py-1 text-xs text-slate-600 shadow-sm backdrop-blur-[12px]">
                液态情绪场
              </div>
            </div>
          </div>

          <div className="flex h-full flex-col gap-8 rounded-[32px] border border-white/40 bg-white/65 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.1)] backdrop-blur-[28px] md:p-8">
            <div className="space-y-5">
              <EmotionSlider
                label={EMOTION_META.joy.label}
                value={joy}
                onChange={setJoy}
                track={EMOTION_META.joy.track}
              />
              <EmotionSlider
                label={EMOTION_META.melancholy.label}
                value={melancholy}
                onChange={setMelancholy}
                track={EMOTION_META.melancholy.track}
              />
              <EmotionSlider
                label={EMOTION_META.serenity.label}
                value={serenity}
                onChange={setSerenity}
                track={EMOTION_META.serenity.track}
              />
            </div>

            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Palette</p>
              <div className="flex flex-wrap gap-3">
                {(Object.keys(swatches) as EmotionKey[]).map((key) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-full border border-white/50 bg-white/70 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur-[12px]"
                  >
                    <span
                      className="h-4 w-4 rounded-full shadow-[0_4px_12px_rgba(15,23,42,0.18)]"
                      style={{ backgroundColor: swatches[key] }}
                    />
                    {swatches[key]}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-auto space-y-4">
              <p className="text-sm leading-relaxed text-slate-600">
                {EMOTION_LINES[dominantEmotion]}
              </p>
              <div className="flex flex-wrap gap-3">
                <button type="button" className="emotion-button emotion-button--ghost">
                  保存情感切片 (Share)
                </button>
                <button type="button" className="emotion-button emotion-button--primary">
                  以此色调寻找画师 (Create)
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
