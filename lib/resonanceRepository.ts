import 'server-only';

import path from 'node:path';

import { supabaseAdmin } from './supabaseAdmin';
import { buildWebpThumbnail, toThumbnailPath } from './thumbnail';
import type {
  ResonanceAttachment,
  ResonanceComment,
  ResonanceCommentInput,
  ResonanceFavoriteState,
  ResonanceMediaType,
  ResonancePost,
  ResonancePostInput,
  ResonanceVisibility
} from './resonanceTypes';

type UserRow = {
  userid: number;
  account: string | null;
  nickname: string | null;
};

type AttachmentRow = {
  attachmentid: number;
  postid: number | null;
  fileurl: string | null;
  thumbnailurl?: string | null;
  sortorder: number | null;
  mediatype: string | null;
  createdat?: string | null;
};

type ResonancePostRow = {
  postid: number;
  userid: number | null;
  title: string | null;
  content: string | null;
  address: string | null;
  township: string | null;
  lng: number | null;
  lat: number | null;
  createdat: string | null;
};

type GenericPostRow = {
  postid: number;
  authorid: number | null;
  title: string | null;
  content: string | null;
  favoritecount: number | null;
  createdat: string | null;
  posttype: string | null;
  postattachments?: AttachmentRow[] | null;
};

type ResonanceCommentRow = {
  commentid: number;
  postid: number | null;
  userid: number | null;
  content: string | null;
  createdat: string | null;
};

type ResonanceFavoriteRow = {
  postid: number | null;
  userid: number | null;
};

type ResonanceMeta = {
  socialPostId?: number;
  visibility: ResonanceVisibility;
  attachments: AttachmentRow[];
};

type ListResonancePostsOptions = {
  limit?: number;
  viewerUserId?: number | null;
};

type CreateResonancePostOptions = {
  viewerUserId: number;
  files?: File[];
};

type UploadableFile = {
  file: File;
  mediaType: ResonanceMediaType;
  extension: string;
};

type ResonancePostExtras = {
  favoriteCount: number;
  commentCount: number;
  isFavorite: boolean;
  comments?: ResonanceComment[];
};

export type ResonanceViewer = {
  userId: number;
  account: string;
  nickname: string;
  visitorKey: string;
};

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'pixiv-images';
const RESONANCE_POST_SELECT = 'postid,userid,title,content,address,township,lng,lat,createdat';
const GENERIC_POST_SELECT =
  'postid,authorid,title,content,favoritecount,createdat,posttype,postattachments(attachmentid,postid,fileurl,thumbnailurl,sortorder,mediatype)';
const VISIBILITY_VALUES = new Set<ResonanceVisibility>(['public', 'private']);
const MAX_ATTACHMENTS = 4;
const MAX_IMAGE_SIZE = 12 * 1024 * 1024;
const MAX_VIDEO_SIZE = 40 * 1024 * 1024;
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp', '.avif']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm', '.ogg']);

export async function ensureResonanceViewer(visitorKey: string): Promise<ResonanceViewer> {
  const normalizedKey = normalizeVisitorKey(visitorKey);
  const account = `guest-${normalizedKey}@resonance.local`;
  const nickname = `访客${normalizedKey.slice(0, 6).toUpperCase()}`;

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('userid,account,nickname')
    .eq('account', account)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load resonance viewer: ${error.message}`);
  }

  if (data) {
    const user = data as UserRow;
    return {
      userId: user.userid,
      account: user.account?.trim() || account,
      nickname: user.nickname?.trim() || nickname,
      visitorKey: normalizedKey
    };
  }

  const userId = await getNextId('users', 'userid');
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      userid: userId,
      account,
      passwordhash: '',
      nickname,
      userrole: 'Guest',
      createdat: new Date().toISOString()
    })
    .select('userid,account,nickname')
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to create resonance viewer: ${insertError?.message ?? 'Unknown error'}`);
  }

  const user = inserted as UserRow;
  return {
    userId: user.userid,
    account: user.account?.trim() || account,
    nickname: user.nickname?.trim() || nickname,
    visitorKey: normalizedKey
  };
}

export async function listResonancePosts({
  limit = 200,
  viewerUserId
}: ListResonancePostsOptions = {}): Promise<ResonancePost[]> {
  const { data, error } = await supabaseAdmin
    .from('resonanceposts')
    .select(RESONANCE_POST_SELECT)
    .order('createdat', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load resonance posts: ${error.message}`);
  }

  const rows = (data ?? []) as ResonancePostRow[];
  const postIds = rows.map((row) => row.postid);
  const authorMap = await loadUsersMap(rows.map((row) => row.userid));
  const metaMap = await loadResonanceMetaMap(postIds);
  const socialPostIds = [...metaMap.values()]
    .map((meta) => meta.socialPostId)
    .filter((value): value is number => Number.isFinite(value));

  const [favoriteRows, commentRows] = await Promise.all([
    loadFavoriteRows(socialPostIds),
    loadCommentRows(socialPostIds)
  ]);

  const favoriteCountMap = countRowsByPostId(favoriteRows);
  const commentCountMap = countRowsByPostId(commentRows);
  const favoriteState = new Set<number>();

  if (viewerUserId) {
    favoriteRows.forEach((row) => {
      if (row.postid && row.userid === viewerUserId) {
        favoriteState.add(row.postid);
      }
    });
  }

  return rows
    .filter((row) => {
      const meta = metaMap.get(row.postid);
      const visibility = meta?.visibility ?? 'public';
      return visibility === 'public' || Boolean(viewerUserId && row.userid === viewerUserId);
    })
    .map((row) => {
      const meta = metaMap.get(row.postid);
      const socialPostId = meta?.socialPostId;

      return mapResonancePost(row, authorMap.get(row.userid ?? -1), meta, {
        favoriteCount: socialPostId ? favoriteCountMap.get(socialPostId) ?? 0 : 0,
        commentCount: socialPostId ? commentCountMap.get(socialPostId) ?? 0 : 0,
        isFavorite: Boolean(socialPostId && favoriteState.has(socialPostId))
      });
    });
}

export async function getResonancePostDetail(
  id: number | string,
  viewerUserId?: number | null
): Promise<ResonancePost | null> {
  const postId = parseResonancePostId(id);
  if (postId === null) {
    return null;
  }

  const row = await getResonancePostRow(postId);
  if (!row) {
    return null;
  }

  const meta = await resolveMetaForResonanceId(postId);
  const visibility = meta?.visibility ?? 'public';
  if (visibility !== 'public' && (!viewerUserId || row.userid !== viewerUserId)) {
    return null;
  }

  const socialPostId = meta?.socialPostId;
  const [favoriteRows, commentRows] = await Promise.all([
    socialPostId ? loadFavoriteRows([socialPostId]) : Promise.resolve([] as ResonanceFavoriteRow[]),
    socialPostId ? loadCommentRows([socialPostId]) : Promise.resolve([] as ResonanceCommentRow[])
  ]);

  const authorMap = await loadUsersMap([
    row.userid,
    ...commentRows.map((commentRow) => commentRow.userid)
  ]);

  const comments = commentRows.map((commentRow) =>
    mapComment(commentRow, authorMap.get(commentRow.userid ?? -1))
  );
  const favoriteCount = favoriteRows.length;
  const isFavorite = Boolean(
    viewerUserId && favoriteRows.some((rowItem) => rowItem.userid === viewerUserId)
  );

  return mapResonancePost(row, authorMap.get(row.userid ?? -1), meta, {
    favoriteCount,
    commentCount: comments.length,
    isFavorite,
    comments
  });
}

export async function createResonancePost(
  input: ResonancePostInput,
  { viewerUserId, files = [] }: CreateResonancePostOptions
): Promise<ResonancePost> {
  const normalized = normalizePostInput(input);
  const preparedFiles = validateFiles(files);
  const resonancePostId = await getNextId('resonanceposts', 'postid');
  const socialPostId = await getNextId('posts', 'postid');
  const createdAt = new Date().toISOString();

  const { error } = await supabaseAdmin.from('resonanceposts').insert({
    postid: resonancePostId,
    userid: viewerUserId,
    title: normalized.title || null,
    content: normalized.content,
    address: normalized.address,
    township: normalized.township || null,
    lng: normalized.lng,
    lat: normalized.lat,
    createdat: createdAt
  });

  if (error) {
    throw new Error(`Failed to create resonance post: ${error.message}`);
  }

  try {
    const { error: postError } = await supabaseAdmin.from('posts').insert({
      postid: socialPostId,
      authorid: viewerUserId,
      posttype: buildResonancePostType(resonancePostId, normalized.visibility),
      title: normalized.title || null,
      content: normalized.content,
      favoritecount: 0,
      createdat: createdAt
    });

    if (postError) {
      throw new Error(`Failed to create resonance post mirror: ${postError.message}`);
    }

    if (preparedFiles.length > 0) {
      await uploadResonanceAttachments(socialPostId, preparedFiles);
    }

    const created = await getResonancePostDetail(resonancePostId, viewerUserId);
    if (!created) {
      throw new Error('Failed to load created resonance post');
    }

    return created;
  } catch (error) {
    await supabaseAdmin.from('posts').delete().eq('postid', socialPostId);
    await supabaseAdmin.from('resonanceposts').delete().eq('postid', resonancePostId);
    throw error;
  }
}

export async function addResonanceComment(
  postIdValue: number | string,
  input: ResonanceCommentInput,
  viewerUserId: number
): Promise<ResonancePost> {
  const postId = parseResonancePostId(postIdValue);
  if (postId === null) {
    throw new Error('贴文不存在。');
  }

  const { row, socialPostId } = await assertVisiblePost(postId, viewerUserId);

  const content = input.content?.trim() ?? '';
  if (!content) {
    throw new Error('请输入评论内容。');
  }

  const commentId = await getNextId('postcomments', 'commentid');
  const { error } = await supabaseAdmin.from('postcomments').insert({
    commentid: commentId,
    postid: socialPostId,
    userid: viewerUserId,
    content,
    createdat: new Date().toISOString()
  });

  if (error) {
    throw new Error(`Failed to create resonance comment: ${error.message}`);
  }

  const post = await getResonancePostDetail(row.postid, viewerUserId);
  if (!post) {
    throw new Error('贴文当前不可见。');
  }

  return post;
}

export async function toggleResonanceFavorite(
  postIdValue: number | string,
  viewerUserId: number
): Promise<ResonanceFavoriteState> {
  const postId = parseResonancePostId(postIdValue);
  if (postId === null) {
    throw new Error('贴文不存在。');
  }

  const { socialPostId } = await assertVisiblePost(postId, viewerUserId);

  const { data: existing, error: existingError } = await supabaseAdmin
    .from('userfavorites')
    .select('postid,userid')
    .eq('postid', socialPostId)
    .eq('userid', viewerUserId)
    .maybeSingle();

  if (existingError) {
    throw new Error(`Failed to inspect resonance favorite state: ${existingError.message}`);
  }

  if (existing) {
    const { error } = await supabaseAdmin
      .from('userfavorites')
      .delete()
      .eq('postid', socialPostId)
      .eq('userid', viewerUserId);

    if (error) {
      throw new Error(`Failed to remove resonance favorite: ${error.message}`);
    }
  } else {
    const { error } = await supabaseAdmin.from('userfavorites').insert({
      postid: socialPostId,
      userid: viewerUserId,
      createdat: new Date().toISOString()
    });

    if (error) {
      throw new Error(`Failed to add resonance favorite: ${error.message}`);
    }
  }

  const favoriteRows = await loadFavoriteRows([socialPostId]);
  await syncFavoriteCount(socialPostId, favoriteRows.length);

  return {
    postId,
    favoriteCount: favoriteRows.length,
    isFavorite: !existing
  };
}

async function assertVisiblePost(postId: number, viewerUserId?: number | null) {
  const post = await getResonancePostRow(postId);
  if (!post) {
    throw new Error('贴文当前不可见。');
  }

  const meta = await ensureResonanceMetaPost(post);
  if (meta.visibility !== 'public' && (!viewerUserId || post.userid !== viewerUserId)) {
    throw new Error('贴文当前不可见。');
  }

  if (!meta.socialPostId) {
    throw new Error('贴文互动通道尚未建立。');
  }

  return {
    row: post,
    socialPostId: meta.socialPostId
  };
}

async function getResonancePostRow(postId: number) {
  const { data, error } = await supabaseAdmin
    .from('resonanceposts')
    .select(RESONANCE_POST_SELECT)
    .eq('postid', postId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load resonance post detail: ${error.message}`);
  }

  return (data as ResonancePostRow | null) ?? null;
}

async function loadFavoriteRows(postIds: number[]) {
  if (postIds.length === 0) {
    return [] as ResonanceFavoriteRow[];
  }

  const { data, error } = await supabaseAdmin
    .from('userfavorites')
    .select('postid,userid')
    .in('postid', postIds);

  if (error) {
    throw new Error(`Failed to load resonance favorites: ${error.message}`);
  }

  return (data ?? []) as ResonanceFavoriteRow[];
}

async function loadCommentRows(postIds: number[]) {
  if (postIds.length === 0) {
    return [] as ResonanceCommentRow[];
  }

  const { data, error } = await supabaseAdmin
    .from('postcomments')
    .select('commentid,postid,userid,content,createdat')
    .in('postid', postIds)
    .order('createdat', { ascending: true });

  if (error) {
    throw new Error(`Failed to load resonance comments: ${error.message}`);
  }

  return (data ?? []) as ResonanceCommentRow[];
}

async function uploadResonanceAttachments(postId: number, files: UploadableFile[]) {
  const uploadedPaths: string[] = [];
  const nextAttachmentId = await getNextId('postattachments', 'attachmentid');
  const timestamp = Date.now();

  try {
    const rows: Array<{
      attachmentid: number;
      postid: number;
      fileurl: string;
      thumbnailurl: string | null;
      sortorder: number;
      mediatype: ResonanceMediaType;
    }> = [];

    for (const [index, item] of files.entries()) {
      const filePath = `resonance/posts/${postId}/${timestamp}-${index}-${crypto.randomUUID()}${item.extension}`;
      const buffer = Buffer.from(await item.file.arrayBuffer());

      const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(filePath, buffer, {
        contentType: item.file.type || undefined,
        cacheControl: '3600',
        upsert: false
      });

      if (error) {
        throw new Error(`Failed to upload resonance media: ${error.message}`);
      }

      uploadedPaths.push(filePath);

      let thumbnailPath: string | null = null;
      if (item.mediaType === 'image') {
        thumbnailPath = toThumbnailPath(filePath);
        const thumbnailBuffer = await buildWebpThumbnail(buffer);
        const { error: thumbError } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .upload(thumbnailPath, thumbnailBuffer, {
            contentType: 'image/webp',
            cacheControl: '3600',
            upsert: true
          });

        if (thumbError) {
          throw new Error(`Failed to upload resonance thumbnail: ${thumbError.message}`);
        }

        uploadedPaths.push(thumbnailPath);
      }

      rows.push({
        attachmentid: nextAttachmentId + index,
        postid: postId,
        fileurl: filePath,
        thumbnailurl: thumbnailPath,
        sortorder: index,
        mediatype: item.mediaType
      });
    }

    const { error } = await supabaseAdmin.from('postattachments').insert(rows);

    if (error) {
      throw new Error(`Failed to save resonance media records: ${error.message}`);
    }
  } catch (error) {
    if (uploadedPaths.length > 0) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove(uploadedPaths);
    }
    throw error;
  }
}

function normalizePostInput(input: ResonancePostInput) {
  const title = input.title?.trim() ?? '';
  const content = input.content?.trim() ?? '';
  const address = input.address?.trim() ?? '';
  const township = input.township?.trim() ?? '';
  const lng = Number(input.lng);
  const lat = Number(input.lat);
  const visibility = normalizeVisibility(input.visibility);

  if (!content) {
    throw new Error('请填写要发布的记忆内容。');
  }

  if (!address) {
    throw new Error('请先完成地址定位。');
  }

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    throw new Error('地址定位坐标无效。');
  }

  return {
    title,
    content,
    address,
    township,
    lng,
    lat,
    visibility
  };
}

function validateFiles(files: File[]) {
  if (files.length > MAX_ATTACHMENTS) {
    throw new Error(`最多上传 ${MAX_ATTACHMENTS} 个图片或视频文件。`);
  }

  return files.map((file) => {
    const mediaType = resolveMediaType(file);
    const maxSize = mediaType === 'image' ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;

    if (file.size > maxSize) {
      throw new Error(
        mediaType === 'image'
          ? '单张图片不能超过 12MB。'
          : '单个视频不能超过 40MB。'
      );
    }

    return {
      file,
      mediaType,
      extension: resolveExtension(file.name, mediaType)
    } satisfies UploadableFile;
  });
}

function resolveMediaType(file: File): ResonanceMediaType {
  if (file.type.startsWith('image/')) {
    return 'image';
  }

  if (file.type.startsWith('video/')) {
    return 'video';
  }

  const extension = path.extname(file.name).toLowerCase();

  if (IMAGE_EXTENSIONS.has(extension)) {
    return 'image';
  }

  if (VIDEO_EXTENSIONS.has(extension)) {
    return 'video';
  }

  throw new Error('仅支持上传图片或视频文件。');
}

function resolveExtension(fileName: string, mediaType: ResonanceMediaType) {
  const extension = path.extname(fileName).toLowerCase().replace(/[^.\w-]/g, '');

  if (extension) {
    return extension;
  }

  return mediaType === 'image' ? '.jpg' : '.mp4';
}

function mapResonancePost(
  row: ResonancePostRow,
  author: UserRow | undefined,
  meta: ResonanceMeta | undefined,
  extras: ResonancePostExtras
): ResonancePost {
  return {
    id: row.postid,
    title: row.title?.trim() || '',
    content: row.content?.trim() || '',
    address: row.address?.trim() || '',
    township: row.township?.trim() || '',
    lng: Number(row.lng) || 0,
    lat: Number(row.lat) || 0,
    createdAt: row.createdat ?? new Date(0).toISOString(),
    userId: row.userid ?? undefined,
    authorName: resolveUserName(author, row.userid),
    visibility: meta?.visibility ?? 'public',
    attachments: mapAttachments(meta?.attachments),
    commentCount: extras.commentCount,
    favoriteCount: extras.favoriteCount,
    isFavorite: extras.isFavorite,
    comments: extras.comments
  };
}

function mapAttachments(rows: AttachmentRow[] | null | undefined): ResonanceAttachment[] {
  if (!rows || rows.length === 0) {
    return [];
  }

  return rows
    .filter((row) => row.fileurl)
    .sort(
      (left, right) =>
        (left.sortorder ?? Number.MAX_SAFE_INTEGER) - (right.sortorder ?? Number.MAX_SAFE_INTEGER)
    )
    .map((row) => {
      const mediaType = row.mediatype === 'video' ? 'video' : 'image';
      const originalUrl = getPublicMediaUrl(row.fileurl?.trim() || '');
      const thumbnailUrl = row.thumbnailurl ? getPublicMediaUrl(row.thumbnailurl.trim()) : '';

      return {
        id: row.attachmentid,
        url: mediaType === 'image' && thumbnailUrl ? thumbnailUrl : originalUrl,
        thumbnailUrl: mediaType === 'image' ? thumbnailUrl || undefined : undefined,
        mediaType,
        sortOrder: row.sortorder ?? 0
      };
    });
}

function mapComment(row: ResonanceCommentRow, author: UserRow | undefined): ResonanceComment {
  return {
    id: row.commentid,
    content: row.content?.trim() || '',
    createdAt: row.createdat ?? new Date(0).toISOString(),
    userId: row.userid ?? undefined,
    authorName: resolveUserName(author, row.userid)
  };
}

function resolveUserName(row: UserRow | null | undefined, userId?: number | null) {
  const nickname = row?.nickname?.trim();
  if (nickname) {
    return nickname;
  }

  const accountPrefix = row?.account?.trim().split('@')[0];
  if (accountPrefix) {
    return accountPrefix;
  }

  if (userId) {
    return `访客${String(userId).padStart(4, '0')}`;
  }

  return '匿名访客';
}

function getPublicMediaUrl(fileUrl: string) {
  if (!fileUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  return supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(fileUrl).data.publicUrl;
}

function countRowsByPostId(rows: Array<{ postid: number | null }>) {
  const counts = new Map<number, number>();

  rows.forEach((row) => {
    if (!row.postid) {
      return;
    }

    counts.set(row.postid, (counts.get(row.postid) ?? 0) + 1);
  });

  return counts;
}

async function loadUsersMap(userIds: Array<number | null | undefined>) {
  const uniqueIds = [...new Set(userIds.filter((value): value is number => Number.isFinite(value)))];
  const map = new Map<number, UserRow>();

  if (uniqueIds.length === 0) {
    return map;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('userid,account,nickname')
    .in('userid', uniqueIds);

  if (error) {
    throw new Error(`Failed to load resonance authors: ${error.message}`);
  }

  ((data ?? []) as UserRow[]).forEach((row) => {
    map.set(row.userid, row);
  });

  return map;
}

function parseResonancePostId(value: number | string) {
  const parsed =
    typeof value === 'number' ? value : Number.parseInt(String(value).trim(), 10);

  return Number.isFinite(parsed) ? parsed : null;
}

function buildResonancePostType(postId: number, visibility: ResonanceVisibility) {
  return `resonance:${postId}:${visibility}`;
}

function parseResonancePostType(value: string | null | undefined) {
  if (!value?.startsWith('resonance:')) {
    return null;
  }

  const [, postId, visibility] = value.split(':');
  const parsedId = Number.parseInt(postId, 10);
  if (!Number.isFinite(parsedId)) {
    return null;
  }

  return {
    resonancePostId: parsedId,
    visibility: normalizeVisibility(visibility)
  };
}

function normalizeVisibility(value: string | null | undefined): ResonanceVisibility {
  return VISIBILITY_VALUES.has(value as ResonanceVisibility)
    ? (value as ResonanceVisibility)
    : 'public';
}

async function loadResonanceMetaMap(resonancePostIds: number[]) {
  const map = new Map<number, ResonanceMeta>();
  if (resonancePostIds.length === 0) {
    return map;
  }

  const { data, error } = await supabaseAdmin
    .from('posts')
    .select(GENERIC_POST_SELECT)
    .like('posttype', 'resonance:%');

  if (error) {
    throw new Error(`Failed to load resonance post metadata: ${error.message}`);
  }

  const resonanceIdSet = new Set(resonancePostIds);

  ((data ?? []) as GenericPostRow[]).forEach((row) => {
    const parsed = parseResonancePostType(row.posttype);
    if (!parsed || !resonanceIdSet.has(parsed.resonancePostId)) {
      return;
    }

    map.set(parsed.resonancePostId, {
      socialPostId: row.postid,
      visibility: parsed.visibility,
      attachments: row.postattachments ?? []
    });
  });

  return map;
}

async function resolveMetaForResonanceId(resonancePostId: number) {
  const map = await loadResonanceMetaMap([resonancePostId]);
  return map.get(resonancePostId);
}

async function ensureResonanceMetaPost(row: ResonancePostRow) {
  const existing = await resolveMetaForResonanceId(row.postid);
  if (existing) {
    return existing;
  }

  const socialPostId = await getNextId('posts', 'postid');
  const createdAt = row.createdat ?? new Date().toISOString();
  const { error } = await supabaseAdmin.from('posts').insert({
    postid: socialPostId,
    authorid: row.userid,
    posttype: buildResonancePostType(row.postid, 'public'),
    title: row.title || null,
    content: row.content || null,
    favoritecount: 0,
    createdat: createdAt
  });

  if (error) {
    throw new Error(`Failed to create resonance metadata mirror: ${error.message}`);
  }

  return {
    socialPostId,
    visibility: 'public' as ResonanceVisibility,
    attachments: []
  };
}

async function syncFavoriteCount(postId: number, favoriteCount: number) {
  const { error } = await supabaseAdmin
    .from('posts')
    .update({ favoritecount: favoriteCount })
    .eq('postid', postId);

  if (error) {
    throw new Error(`Failed to sync resonance favorite count: ${error.message}`);
  }
}
function normalizeVisitorKey(value: string) {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48);
  return normalized || crypto.randomUUID();
}

async function getNextId(table: string, column: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(column)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to allocate id for ${table}: ${error.message}`);
  }

  const current = Number(
    data && typeof data === 'object' ? (data as Record<string, unknown>)[column] : 0
  );

  return Number.isFinite(current) ? current + 1 : 1;
}

