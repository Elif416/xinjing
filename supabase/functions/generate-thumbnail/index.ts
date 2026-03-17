import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Image } from 'https://deno.land/x/imagescript@1.3.0/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY')!;
const DEFAULT_BUCKET = Deno.env.get('STORAGE_BUCKET') ?? 'pixiv-images';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function toThumbnailPath(originalPath: string) {
  const normalized = originalPath.replace(/\\/g, '/');
  const extRe = /\.[a-zA-Z0-9]+$/;

  if (normalized.includes('/posts/')) {
    return normalized.replace('/posts/', '/thumbnails/posts/').replace(extRe, '.png');
  }

  if (normalized.includes('/originals/')) {
    return normalized.replace('/originals/', '/thumbnails/').replace(extRe, '.png');
  }

  return normalized.replace(extRe, '.png');
}

async function createThumbnail(bytes: Uint8Array) {
  const image = await Image.decode(bytes);
  const width = 300;
  const height = Math.max(1, Math.round((image.height / image.width) * width));
  image.resize(width, height);
  return await image.encode();
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const { originalPath, bucket, attachmentId } = await req.json();

    if (!originalPath || typeof originalPath !== 'string') {
      return new Response('originalPath is required', { status: 400 });
    }

    const targetBucket = typeof bucket === 'string' && bucket ? bucket : DEFAULT_BUCKET;
    const thumbnailPath = toThumbnailPath(originalPath);

    const { data: originalBlob, error: downloadError } = await supabase
      .storage
      .from(targetBucket)
      .download(originalPath);

    if (downloadError) {
      return new Response(`download failed: ${downloadError.message}`, { status: 500 });
    }

    const originalBytes = new Uint8Array(await originalBlob.arrayBuffer());
    const thumbnailBytes = await createThumbnail(originalBytes);

    const { error: uploadError } = await supabase.storage.from(targetBucket).upload(thumbnailPath, thumbnailBytes, {
      contentType: 'image/png',
      cacheControl: '3600',
      upsert: true
    });

    if (uploadError) {
      return new Response(`upload failed: ${uploadError.message}`, { status: 500 });
    }

    if (typeof attachmentId === 'number') {
      await supabase
        .from('postattachments')
        .update({ thumbnailurl: thumbnailPath })
        .eq('attachmentid', attachmentId);
    }

    return Response.json({ ok: true, thumbnailPath });
  } catch (error) {
    return new Response(`unexpected error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
});
