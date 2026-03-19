import fs from 'node:fs';
import path from 'node:path';

import { createClient } from '@supabase/supabase-js';

const DEFAULT_BUCKET = 'pixiv-images';
const DEFAULT_DELAY_MS = 250;
const ARTIST_CHUNK_SIZE = 100;

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limit: Number.POSITIVE_INFINITY,
    delayMs: DEFAULT_DELAY_MS,
    artistId: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (token === '--limit') {
      options.limit = clampPositiveInteger(argv[index + 1], Number.POSITIVE_INFINITY);
      index += 1;
      continue;
    }

    if (token === '--delay') {
      options.delayMs = clampPositiveInteger(argv[index + 1], DEFAULT_DELAY_MS);
      index += 1;
      continue;
    }

    if (token === '--artist') {
      options.artistId = clampPositiveInteger(argv[index + 1], null);
      index += 1;
    }
  }

  return options;
}

function clampPositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const text = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const rawLine of text.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const equalIndex = line.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

function createClients() {
  const env = {
    ...readEnvFile(path.join(process.cwd(), '.env.local')),
    ...process.env,
  };

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const storageBucket = env.SUPABASE_STORAGE_BUCKET?.trim() || DEFAULT_BUCKET;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return {
    supabaseUrl,
    storageBucket,
    admin: createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    }),
  };
}

function chunk(array, size) {
  const result = [];

  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }

  return result;
}

function comparePosts(left, right) {
  const leftCreatedAt = Date.parse(left.createdat ?? '') || 0;
  const rightCreatedAt = Date.parse(right.createdat ?? '') || 0;

  if (leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt - leftCreatedAt;
  }

  return (left.postid ?? 0) - (right.postid ?? 0);
}

function compareAttachments(left, right) {
  const leftOrder = left.sortorder ?? Number.MAX_SAFE_INTEGER;
  const rightOrder = right.sortorder ?? Number.MAX_SAFE_INTEGER;

  if (leftOrder !== rightOrder) {
    return leftOrder - rightOrder;
  }

  return (left.attachmentid ?? 0) - (right.attachmentid ?? 0);
}

function isImageAttachment(attachment) {
  return String(attachment?.mediatype ?? '').toLowerCase() === 'image';
}

function normalizeStoragePath(value) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return '';
  }

  return normalized.replace(/^\/+/u, '');
}

async function fetchArtistIds(admin, specificArtistId) {
  if (specificArtistId) {
    return [specificArtistId];
  }

  let from = 0;
  const pageSize = 1000;
  const artistIds = [];

  while (true) {
    const { data, error } = await admin
      .from('artists')
      .select('artistid')
      .order('artistid', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      throw new Error(`Failed to query artists: ${error.message}`);
    }

    const rows = data ?? [];
    if (rows.length === 0) {
      break;
    }

    for (const row of rows) {
      const artistId = Number(row.artistid);
      if (Number.isFinite(artistId)) {
        artistIds.push(artistId);
      }
    }

    if (rows.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return artistIds;
}

async function fetchArtistPosts(admin, artistIds) {
  const posts = [];

  for (const group of chunk(artistIds, ARTIST_CHUNK_SIZE)) {
    const { data, error } = await admin
      .from('posts')
      .select(
        'postid,authorid,createdat,postattachments(attachmentid,fileurl,thumbnailurl,sortorder,mediatype)'
      )
      .in('authorid', group)
      .order('createdat', { ascending: false });

    if (error) {
      throw new Error(`Failed to query artist posts: ${error.message}`);
    }

    posts.push(...(data ?? []));
  }

  return posts;
}

function buildAttachmentPlan(posts) {
  const postsByArtist = new Map();

  for (const post of posts) {
    const artistId = Number(post.authorid);
    if (!Number.isFinite(artistId)) {
      continue;
    }

    const current = postsByArtist.get(artistId) ?? [];
    current.push(post);
    postsByArtist.set(artistId, current);
  }

  const plan = [];

  for (const [artistId, artistPosts] of postsByArtist.entries()) {
    artistPosts.sort(comparePosts);
    let preservedAttachmentId = null;

    for (const post of artistPosts) {
      const attachments = Array.isArray(post.postattachments)
        ? [...post.postattachments].sort(compareAttachments)
        : [];

      for (const attachment of attachments) {
        if (!isImageAttachment(attachment)) {
          continue;
        }

        const fileurl = normalizeStoragePath(attachment.fileurl);
        const thumbnailurl = normalizeStoragePath(attachment.thumbnailurl);
        if (!fileurl && !thumbnailurl) {
          continue;
        }

        if (preservedAttachmentId == null) {
          preservedAttachmentId = attachment.attachmentid;
        }

        plan.push({
          artistId,
          postId: post.postid,
          attachmentId: attachment.attachmentid,
          fileurl,
          thumbnailurl,
          preserveOriginal: attachment.attachmentid === preservedAttachmentId,
        });
      }
    }
  }

  return plan;
}

async function ensureThumbnail({
  admin,
  supabaseUrl,
  fileurl,
  attachmentId,
  storageBucket,
}) {
  const normalizedOriginalPath = normalizeStoragePath(fileurl);
  const renderUrl = new URL(
    `/storage/v1/render/image/public/${storageBucket}/${normalizedOriginalPath}`,
    supabaseUrl
  );

  renderUrl.searchParams.set('width', '300');
  renderUrl.searchParams.set('quality', '70');
  renderUrl.searchParams.set('resize', 'contain');
  renderUrl.searchParams.set('format', 'origin');

  const response = await fetch(renderUrl, {
    headers: {
      Accept: 'image/png,image/jpeg,image/webp,*/*',
    },
  });

  if (!response.ok) {
    const bodyText = await response.text();
    const body = bodyText ? safeJsonParse(bodyText) : null;
    throw new Error(body?.message || bodyText || `render/image failed with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const thumbnailPath = toCompactThumbnailPath(normalizedOriginalPath, contentType);
  const bytes = Buffer.from(await response.arrayBuffer());

  const { error: uploadError } = await admin.storage.from(storageBucket).upload(thumbnailPath, bytes, {
    contentType,
    cacheControl: '3600',
    upsert: true,
  });

  if (uploadError) {
    throw new Error(`Failed to upload thumbnail: ${uploadError.message}`);
  }

  const { error: updateError } = await admin
    .from('postattachments')
    .update({ thumbnailurl: thumbnailPath })
    .eq('attachmentid', attachmentId);

  if (updateError) {
    throw new Error(`Failed to persist thumbnail path: ${updateError.message}`);
  }

  return { thumbnailPath };
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function toCompactThumbnailPath(originalPath, contentType) {
  const extension = resolveExtensionFromContentType(contentType);
  const normalized = normalizeStoragePath(originalPath);

  return normalized.replace(/\.[a-zA-Z0-9]+$/u, `.thumb${extension}`);
}

function resolveExtensionFromContentType(contentType) {
  const normalized = String(contentType ?? '').toLowerCase();

  if (normalized.includes('png')) {
    return '.png';
  }

  if (normalized.includes('webp')) {
    return '.webp';
  }

  if (normalized.includes('gif')) {
    return '.gif';
  }

  return '.jpg';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const { admin, supabaseUrl, storageBucket } = createClients();

  const artistIds = await fetchArtistIds(admin, options.artistId);
  const posts = await fetchArtistPosts(admin, artistIds);
  const plan = buildAttachmentPlan(posts);

  const summary = {
    artistCount: new Set(plan.map((item) => item.artistId)).size,
    totalImageAttachments: plan.length,
    preservedOriginals: plan.filter((item) => item.preserveOriginal).length,
    compactTargets: plan.filter((item) => !item.preserveOriginal).length,
    compactTargetsWithoutThumbnail: plan.filter(
      (item) => !item.preserveOriginal && !item.thumbnailurl
    ).length,
  };

  console.log(JSON.stringify({ mode: options.dryRun ? 'dry-run' : 'apply', summary }, null, 2));

  if (options.dryRun) {
    return;
  }

  const results = {
    generatedThumbnails: 0,
    preservedPrimaryThumbnails: 0,
    compactedAttachments: 0,
    skippedAlreadyCompacted: 0,
    failures: 0,
  };

  let processedTargets = 0;

  for (const item of plan) {
    const needsCompaction = !item.preserveOriginal && Boolean(item.fileurl);

    if (needsCompaction && processedTargets >= options.limit) {
      break;
    }

    let thumbnailPath = item.thumbnailurl;

    try {
      if (!thumbnailPath && item.fileurl) {
        const generated = await ensureThumbnail({
          admin,
          supabaseUrl,
          fileurl: item.fileurl,
          attachmentId: item.attachmentId,
          storageBucket,
        });

        thumbnailPath = normalizeStoragePath(generated?.thumbnailPath);
        results.generatedThumbnails += 1;

        if (options.delayMs > 0) {
          await sleep(options.delayMs);
        }
      }

      if (item.preserveOriginal) {
        if (thumbnailPath) {
          results.preservedPrimaryThumbnails += 1;
        }
        continue;
      }

      if (!item.fileurl) {
        results.skippedAlreadyCompacted += 1;
        continue;
      }

      processedTargets += 1;

      if (!thumbnailPath) {
        throw new Error('Missing thumbnail after generation');
      }

      const { error: removeError } = await admin.storage.from(storageBucket).remove([item.fileurl]);
      if (removeError) {
        throw new Error(`Failed to remove original file: ${removeError.message}`);
      }

      const { error: updateError } = await admin
        .from('postattachments')
        .update({ fileurl: null, thumbnailurl: thumbnailPath })
        .eq('attachmentid', item.attachmentId);

      if (updateError) {
        throw new Error(`Failed to update attachment row: ${updateError.message}`);
      }

      results.compactedAttachments += 1;
      console.log(
        `[compact] artist=${item.artistId} post=${item.postId} attachment=${item.attachmentId} thumbnail=${thumbnailPath}`
      );

      if (options.delayMs > 0) {
        await sleep(options.delayMs);
      }
    } catch (error) {
      results.failures += 1;
      console.error(
        `[failed] artist=${item.artistId} post=${item.postId} attachment=${item.attachmentId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
