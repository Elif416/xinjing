import React from 'react';

export type EntityContainerProps = {
  image: string;
  title: string;
  description?: string;
  awakened?: boolean;
};

// EntityContainer：数字生命承载容器
// 保持玻璃质感与圆角边框，未来可替换为真实的智能体渲染画面
export function EntityContainer({ image, title, description, awakened = false }: EntityContainerProps) {
  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/30 bg-white/10 p-10 shadow-[0_30px_80px_rgba(2,12,32,0.35)] backdrop-blur-[24px]">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-full max-w-3xl overflow-hidden rounded-[28px] border border-white/20 bg-white/10">
          <img
            src={image}
            alt={title}
            className={`h-[320px] w-full object-cover transition duration-700 md:h-[420px] ${
              awakened ? 'grayscale-0 entity-breathe' : 'grayscale'
            }`}
            loading="lazy"
            decoding="async"
          />
        </div>
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-blue-200/80">
            {title}
          </span>
          {description ? (
            <p className="text-sm text-slate-200/80">{description}</p>
          ) : null}
        </div>
        {/* 呼吸光环：唤醒状态指示 */}
        <div className="relative flex h-12 w-12 items-center justify-center">
          <span className={`absolute inset-0 rounded-full border border-blue-300/40 ${
            awakened ? 'opacity-70' : 'opacity-40'
          } animate-pulse`} />
          <span className="h-3 w-3 rounded-full bg-blue-300/80 shadow-[0_0_14px_rgba(96,165,250,0.7)]" />
        </div>
      </div>
    </section>
  );
}
