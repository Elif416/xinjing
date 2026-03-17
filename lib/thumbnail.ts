import sharp from 'sharp';

const THUMB_WIDTH = 300;
const THUMB_QUALITY = 80;

export async function buildWebpThumbnail(input: Buffer) {
  return sharp(input)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
}

export function toThumbnailPath(originalPath: string) {
  const normalized = originalPath.replace(/\\/g, '/');
  const extRe = /\.[a-zA-Z0-9]+$/;

  if (normalized.includes('/posts/')) {
    return normalized.replace('/posts/', '/thumbnails/posts/').replace(extRe, '.webp');
  }

  if (normalized.includes('/originals/')) {
    return normalized.replace('/originals/', '/thumbnails/').replace(extRe, '.webp');
  }

  return normalized.replace(extRe, '.webp');
}
