import { BentoItem } from '../components/BentoItem';
import { GlassCard } from '../components/GlassCard';
import { GlassNavbar } from '../components/GlassNavbar';
import { CardBody, CardContainer, CardItem } from '../components/ui/3d-card';
import homeData from '../data/home.json';

type HomeLoopSection = {
  id: string;
  title: string;
  description: string;
  image: string;
  align: string;
  href: string;
  tag?: string;
  addon?: {
    title: string;
    description: string;
  };
};

export default function Home() {
  // 统一从 JSON 读取数据，避免硬编码，便于后续替换数据源
  const brand = homeData.brand ?? {
    name: '心镜',
    en: 'HeartMirror',
    tagline: 'Creation · Activation · Resonance'
  };
  const navItems = Array.isArray(homeData.nav) ? homeData.nav : [];
  const hero = homeData.hero ?? {
    title: '心镜：数字情感记忆共创平台',
    subtitle: '',
    primaryCta: '开启心镜',
    secondaryCta: '探索闭环'
  };
  const bento = homeData.bento ?? { title: '', items: [] };

  // 闭环模块命名与后端数据模型保持一致
  const creationSection = homeData.creation;
  const activationSection = homeData.activation;
  const resonanceSection = homeData.resonance;
  const loopSections = [creationSection, activationSection, resonanceSection].filter(
    (section): section is HomeLoopSection => Boolean(section)
  );

  const commerce = homeData.commerce ?? { id: 'workshop', items: [] };
  const footer = homeData.footer ?? { copyright: '' };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-ink">
      <div className="page-bg">
        {/* Apple 风格导航栏：抽离成可复用组件，确保多页面一致 */}
        <GlassNavbar brand={brand} items={navItems} showBackButton={false} />

        <main className="flex flex-col gap-24">
          {/* Hero 视差英雄区：通栏大屏 + 弥散光 */}
          <section className="hero-liquid relative overflow-hidden">
            <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-24 md:py-32">
              <div className="max-w-4xl">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {brand.tagline}
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-ink md:text-6xl lg:text-7xl">
                  {hero.title}
                </h1>
                <p className="mt-5 text-base leading-relaxed text-slate-600 md:text-lg">
                  {hero.subtitle}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <a href="#creation" className="glass-button glass-button--primary">
                    {hero.primaryCta}
                  </a>
                  <a href="#resonance" className="glass-button glass-button--ghost">
                    {hero.secondaryCta}
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* 零基础引流区：Bento Grid 便当盒布局 */}
          <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-ink">{bento.title}</h2>
              <p className="mt-3 text-sm text-slate-600">
                通过轻量工具快速进入心镜闭环，让情感拥有具体的表达载体。
              </p>
            </div>
            {/* Bento Grid 布局说明：移动端单列，桌面端 3 列并通过 col-span 实现大小错位 */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {Array.isArray(bento.items) && bento.items.length > 0 ? (
                bento.items.map((item) => (
                  <BentoItem
                    key={item.id}
                    title={item.title}
                    description={item.description}
                    size={item.size === 'large' ? 'large' : 'small'}
                    href={item.href}
                  >
                    {item.id === 'palette' ? (
                      <div className="mt-6 rounded-[20px] border border-white/40 bg-white/70 p-4">
                        <div className="bento-gradient" />
                      </div>
                    ) : (
                      <div className="mt-6 rounded-[20px] border border-white/40 bg-white/70 p-4">
                        <div className="bento-notes">
                          <span />
                          <span />
                          <span />
                          <span />
                        </div>
                      </div>
                    )}
                  </BentoItem>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
                  暂无引流工具数据，请在 data/home.json 中补充。
                </div>
              )}
            </div>
          </section>

          {/* 核心闭环区：Apple 式交错图文布局 */}
          <section className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-6">
            {loopSections.length > 0 ? (
              loopSections.map((section, index) => {
                const isLeft = section.align === 'left';
                const isCreation = section.id === 'creation';
                const isActivation = section.id === 'activation';
                const sectionContent = (
                  <>
                    <div className={isLeft ? 'order-1' : 'order-2 md:order-2'}>
                      <div className="glass-panel relative h-[280px] overflow-hidden rounded-[28px] border border-white/40 bg-white/60 shadow-[0_24px_70px_rgba(15,23,42,0.12)] md:h-[360px]">
                        <img
                          src={section.image}
                          alt={section.title}
                          className="h-full w-full object-cover"
                          loading={index === 0 ? 'eager' : 'lazy'}
                          fetchPriority={index < 2 ? 'high' : 'auto'}
                          decoding="async"
                        />
                      </div>
                    </div>
                    <div className={isLeft ? 'order-2' : 'order-1 md:order-1'}>
                      <h2 className="text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                        {section.title}
                      </h2>
                      <p className="mt-4 text-base leading-relaxed text-slate-600">
                        {section.description}
                      </p>
                      {isCreation && section.tag ? (
                        <div className="mt-5 inline-flex items-center rounded-full border border-white/50 bg-white/70 px-4 py-1 text-xs text-slate-600 shadow-sm">
                          {section.tag}
                        </div>
                      ) : null}
                      {/* 活化模块的子功能入口：中等尺寸 GlassCard */}
                      {isActivation && section.addon ? (
                        <div className="mt-6 max-w-md">
                          <GlassCard
                            title={section.addon.title}
                            description={section.addon.description}
                          />
                        </div>
                      ) : null}
                    </div>
                  </>
                );

                // 若配置了 href，则整块区域可点击跳转到对应页面
                if (section.href) {
                  return (
                    <a
                      key={section.id}
                      id={section.id}
                      href={section.href}
                      className="clickable-surface group grid items-center gap-10 scroll-mt-24 transition-opacity hover:opacity-95 md:grid-cols-2"
                    >
                      {sectionContent}
                    </a>
                  );
                }

                return (
                  <div
                    key={section.id}
                    id={section.id}
                    className="grid items-center gap-10 scroll-mt-24 md:grid-cols-2"
                  >
                    {sectionContent}
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
                暂无闭环数据，请在 data/home.json 中补充。
              </div>
            )}
          </section>

          {/* 商业化与生态区：双栏 3D 玻璃卡片 */}
          <section id={commerce.id} className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 scroll-mt-24">
            <div className="grid gap-6 md:grid-cols-2">
              {Array.isArray(commerce.items) && commerce.items.length > 0 ? (
                commerce.items.map((item, index) => (
                  <a key={item.title} href={item.href ?? '#'} className="block h-full">
                    {/* 3D 玻璃卡片：整卡可点击跳转，对应后续页面 */}
                    <CardContainer className="h-full" containerClassName="py-0">
                      <CardBody className="glass-card clickable-card group/card relative isolate flex h-full w-full flex-col gap-4 rounded-3xl p-6 cursor-pointer">
                        <CardItem translateZ={18} className="text-lg font-semibold text-ink">
                          {item.title}
                        </CardItem>
                        <CardItem translateZ={22} as="p" className="text-sm leading-relaxed text-slate-600">
                          {item.description}
                        </CardItem>
                        <CardItem translateZ={40} rotateX={8} rotateZ={-3} className="mt-4">
                          <div className="overflow-hidden rounded-2xl border border-white/40 bg-white/70">
                            <img
                              src={item.image}
                              alt={item.title}
                              className="mx-auto h-48 w-full object-cover rounded-2xl transition duration-300 group-hover/card:scale-[1.02] group-hover/card:shadow-xl"
                              loading={index === 0 ? 'eager' : 'lazy'}
                              fetchPriority={index === 0 ? 'high' : 'auto'}
                              decoding="async"
                            />
                          </div>
                        </CardItem>
                        {/* 光影流动层：hover 时显现，提升玻璃质感 */}
                        <span className="glass-card-glow pointer-events-none absolute -inset-12 z-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      </CardBody>
                    </CardContainer>
                  </a>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-sm text-slate-500">
                  暂无商业化数据，请在 data/home.json 中补充。
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <button className="glass-button glass-button--ghost">情感版权集市</button>
              <button className="glass-button glass-button--ghost">企业定制服务</button>
            </div>
          </section>
        </main>

        {/* 苹果风格页脚：细线分隔 */}
        <footer className="border-t border-white/30 bg-white/60 backdrop-blur-[20px]">
          <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 text-xs text-slate-500 md:flex-row md:items-center md:justify-between">
            <p>{footer.copyright}</p>
            <div className="flex items-center gap-6">
              <span>隐私政策</span>
              <span>使用条款</span>
              <span>联系我们</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
