import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

import { GlassCard } from './GlassCard';

export type ArtistCardData = {
  id: string;
  name: string;
  specialty: string;
  price: string;
  image: string;
  avatar?: string;
  note?: string;
  href?: string;
};

export type ArtistCardProps = {
  artist: ArtistCardData;
  onOpen?: (artist: ArtistCardData) => void;
  imagePriority?: boolean;
};

// ArtistCard：约稿中心画师卡片
// 复用 GlassCard 玻璃样式，保证与首页风格一致
export function ArtistCard({ artist, onOpen, imagePriority = false }: ArtistCardProps) {
  const avatarText = artist.avatar ?? artist.name.slice(0, 1);

  const handleOpen = () => {
    onOpen?.(artist);
  };

  return (
    <GlassCard
      role="button"
      tabIndex={0}
      aria-label={`查看画师 ${artist.name} 作品集`}
      className="group cursor-pointer transition-transform duration-300 hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/40"
      onClick={handleOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleOpen();
        }
      }}
    >
      <div className="relative h-44 overflow-hidden rounded-2xl border border-white/40 bg-white/70">
        <Image
          src={artist.image}
          alt={artist.name}
          fill
          priority={imagePriority}
          quality={70}
          sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>

      <div className="mt-1 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/70 text-sm font-semibold text-ink">
          {avatarText}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink">{artist.name}</p>
          <p className="text-xs text-slate-500">{artist.specialty}</p>
        </div>
        <p className="text-sm font-semibold text-ink">{artist.price}</p>
      </div>

      {artist.note ? (
        <p className="text-xs leading-relaxed text-slate-500">{artist.note}</p>
      ) : null}

      {artist.href ? (
        <Link
          href={artist.href}
          className="glass-button glass-button--ghost mt-2 w-fit opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          onClick={(event) => event.stopPropagation()}
        >
          查看作品集
        </Link>
      ) : (
        <span className="glass-button glass-button--ghost pointer-events-none mt-2 w-fit opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          查看作品集
        </span>
      )}

      <span className="pointer-events-none absolute inset-0 rounded-3xl border border-white/60 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </GlassCard>
  );
}
