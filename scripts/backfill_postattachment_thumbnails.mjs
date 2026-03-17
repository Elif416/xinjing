import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { createClient } from '@supabase/supabase-js';

const ROOT = process.cwd();
const ENV_PATH = path.join(ROOT, '.env.local');
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 100);
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'pixiv-images';

loadEnvLocal(ENV_PATH);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

function loadEnvLocal(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const cleaned = line.trim();
    if (!cleaned || cleaned.startsWith('#')) continue;
    const idx = cleaned.indexOf('=');
    if (idx < 0) continue;
    const key = cleaned.slice(0, idx).trim();
    let value = cleaned.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function toThumbnailPath(originalPath) {
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

async function makeThumb(buffer) {
  return sharp(buffer)
    .rotate()
    .resize({ width: 300, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
}

let done = 0;
let failed = 0;

while (true) {
  const { data, error } = await supabase
    .from('postattachments')
    .select('attachmentid,fileurl,thumbnailurl,mediatype')
    .eq('mediatype', 'image')
    .is('thumbnailurl', null)
    .not('fileurl', 'is', null)
    .order('attachmentid', { ascending: true })
    .range(0, BATCH_SIZE - 1);

  if (error) throw new Error(`Query failed: ${error.message}`);
  if (!data || data.length === 0) break;

  for (const row of data) {
    try {
      const originalPath = row.fileurl;
      const thumbPath = toThumbnailPath(originalPath);

      const { data: blob, error: dlError } = await supabase.storage.from(STORAGE_BUCKET).download(originalPath);
      if (dlError) throw new Error(`download ${originalPath} failed: ${dlError.message}`);

      const originalBuffer = Buffer.from(await blob.arrayBuffer());
      const thumbBuffer = await makeThumb(originalBuffer);

      const { error: upError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(thumbPath, thumbBuffer, { contentType: 'image/webp', upsert: true });
      if (upError) throw new Error(`upload ${thumbPath} failed: ${upError.message}`);

      const { error: updateError } = await supabase
        .from('postattachments')
        .update({ thumbnailurl: thumbPath })
        .eq('attachmentid', row.attachmentid);
      if (updateError) throw new Error(`update attachment ${row.attachmentid} failed: ${updateError.message}`);

      done += 1;
      if (done % 50 === 0) console.log(`[ok] ${done} thumbnails generated`);
    } catch (err) {
      failed += 1;
      console.error(`[fail] attachment ${row.attachmentid}:`, err.message);
    }
  }

}

console.log(`Backfill done. success=${done} failed=${failed}`);
