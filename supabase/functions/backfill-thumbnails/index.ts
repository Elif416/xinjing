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
    const { bucket, limit } = await req.json().catch(() => ({}));
    const targetBucket = typeof bucket === 'string' && bucket ? bucket : DEFAULT_BUCKET;
    const batchLimit = Number.isFinite(limit) ? Math.min(Math.max(Number(limit), 1), 200) : 100;

    const { data: rows, error: queryError } = await supabase
      .from('postattachments')
      .select('attachmentid,fileurl,mediatype,thumbnailurl')
      .eq('mediatype', 'image')
      .is('thumbnailurl', null)
      .not('fileurl', 'is', null)
      .order('attachmentid', { ascending: true })
      .limit(batchLimit);

    if (queryError) {
      return new Response(`query failed: ${queryError.message}`, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      return Response.json({ ok: true, processed: 0, done: 0, failed: 0, message: 'nothing to backfill' });
    }

    let done = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const originalPath = String(row.fileurl);
        const thumbnailPath = toThumbnailPath(originalPath);

        const { data: originalBlob, error: downloadError } = await supabase
          .storage
          .from(targetBucket)
          .download(originalPath);

        if (downloadError) throw downloadError;

        const originalBytes = new Uint8Array(await originalBlob.arrayBuffer());
        const thumbnailBytes = await createThumbnail(originalBytes);

        const { error: uploadError } = await supabase.storage.from(targetBucket).upload(thumbnailPath, thumbnailBytes, {
          contentType: 'image/png',
          cacheControl: '3600',
          upsert: true
        });

        if (uploadError) throw uploadError;

        const { error: updateError } = await supabase
          .from('postattachments')
          .update({ thumbnailurl: thumbnailPath })
          .eq('attachmentid', row.attachmentid);

        if (updateError) throw updateError;

        done += 1;
      } catch {
        failed += 1;
      }
    }

    return Response.json({ ok: true, processed: rows.length, done, failed });
  } catch (error) {
    return new Response(`unexpected error: ${error instanceof Error ? error.message : String(error)}`, { status: 500 });
  }
});
