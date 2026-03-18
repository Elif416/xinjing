import 'server-only';

import { supabaseAdmin } from './supabaseAdmin';
import type {
  ArtistActivity,
  ArtistDetailData,
  ArtistGridItem,
  ArtistPortfolioItem,
  ArtistServiceItem,
  ArtistsPageResponse
} from './artistTypes';

type ArtistUserRecord = {
  userid: number;
  account: string | null;
  nickname: string | null;
  userrole: string | null;
};

type ArtistRecord = {
  artistid: number;
  intro: string | null;
  keywords: string | null;
  startingprice: number | null;
  completedorders: number | null;
  rating: number | null;
  activitylevel: number | null;
  users: ArtistUserRecord | ArtistUserRecord[];
};

type AttachmentRecord = {
  attachmentid: number;
  fileurl: string | null;
  thumbnailurl?: string | null;
  sortorder: number | null;
  mediatype: string | null;
};

type PostRecord = {
  postid: number;
  authorid?: number | null;
  title: string | null;
  content: string | null;
  favoritecount: number | null;
  createdat: string | null;
  postattachments: AttachmentRecord[] | null;
};

type CommissionPlanRecord = {
  planid: number;
  title?: string | null;
  description?: string | null;
  price?: number | null;
};

type ArtistQueryOptions = {
  offset?: number;
  limit?: number;
  keyword?: string;
  priceMax?: number;
};

const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'pixiv-images';
const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
const DEFAULT_ARTIST_IMAGE = '/mock-dream.svg';
const ARTIST_GRID_THUMBNAIL = {
  width: 640,
  height: 640,
  quality: 70,
  resize: 'cover' as const
};
const PORTFOLIO_SIZE_PATTERN: ArtistPortfolioItem['size'][] = [
  'large',
  'wide',
  'tall',
  'normal',
  'normal',
  'wide'
];

export async function getArtistsPage({
  offset = 0,
  limit = 12,
  keyword,
  priceMax
}: ArtistQueryOptions = {}): Promise<ArtistsPageResponse> {
  let query = supabaseAdmin
    .from('artists')
    .select(
      'artistid,intro,keywords,startingprice,completedorders,rating,activitylevel,users!inner(userid,account,nickname,userrole)',
      { count: 'exact' }
    )
    .order('rating', { ascending: false, nullsFirst: false })
    .order('completedorders', { ascending: false, nullsFirst: false })
    .order('artistid', { ascending: true })
    .range(offset, offset + limit - 1);

  if (keyword) {
    query = query.ilike('keywords', `%${keyword}%`);
  }

  if (typeof priceMax === 'number' && Number.isFinite(priceMax)) {
    query = query.lte('startingprice', priceMax);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to query artists: ${error.message}`);
  }

  const artists = (data ?? []) as ArtistRecord[];
  const coverByArtistId = await getArtistCoverImages(artists.map((artist) => artist.artistid));

  const items = artists.map((artist) => mapArtistGridItem(artist, coverByArtistId));
  const total = count ?? items.length;

  return {
    items,
    total,
    hasMore: offset + items.length < total,
    nextOffset: offset + items.length < total ? offset + items.length : null,
    limit
  };
}

export async function getArtistDetail(id: string): Promise<ArtistDetailData | null> {
  const artistId = Number.parseInt(id, 10);
  if (!Number.isFinite(artistId)) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from('artists')
    .select(
      'artistid,intro,keywords,startingprice,completedorders,rating,activitylevel,users!inner(userid,account,nickname,userrole)'
    )
    .eq('artistid', artistId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to query artist detail: ${error.message}`);
  }

  const artist = data as ArtistRecord;

  const [{ data: posts, error: postsError }, { data: plans, error: plansError }] = await Promise.all([
    supabaseAdmin
      .from('posts')
      .select('postid,authorid,title,content,favoritecount,createdat,postattachments(attachmentid,fileurl,thumbnailurl,sortorder,mediatype)')
      .eq('authorid', artistId)
      .order('createdat', { ascending: false }),
    supabaseAdmin.from('commissionplans').select('*').eq('artistid', artistId).order('planid')
  ]);

  if (postsError) {
    throw new Error(`Failed to query artist portfolio: ${postsError.message}`);
  }

  if (plansError) {
    throw new Error(`Failed to query commission plans: ${plansError.message}`);
  }

  const portfolio = ((posts ?? []) as PostRecord[])
    .map((post, index) => mapPortfolioItem(post, index))
    .filter((item): item is ArtistPortfolioItem => Boolean(item));

  const services = ((plans ?? []) as CommissionPlanRecord[]).map(mapCommissionPlan);
  const keywords = parseKeywords(artist.keywords);
  const intro = artist.intro?.trim() || buildArtistIntro(keywords);
  const heroImage = portfolio[0]?.image ?? DEFAULT_ARTIST_IMAGE;
  const name = resolveArtistName(artist);

  return {
    id: String(artist.artistid),
    name,
    subtitle: keywords.slice(0, 3).join(' / ') || '暂无关键词标签',
    intro,
    concept: buildArtistConcept(keywords),
    startingPrice: formatPrice(artist.startingprice),
    avatar: heroImage,
    heroImage,
    keywords,
    stats: [
      {
        label: '活跃度',
        value: `${clampPercent(artist.activitylevel)}%`
      },
      {
        label: '完成订单',
        value: String(artist.completedorders ?? 0)
      },
      {
        label: '评分',
        value: formatRating(artist.rating)
      },
      {
        label: '作品数',
        value: String(portfolio.length)
      }
    ],
    activity: buildActivityMeta(artist.activitylevel),
    portfolio,
    services
  };
}

async function getArtistCoverImages(artistIds: number[]) {
  const coverByArtistId = new Map<number, string>();

  if (artistIds.length === 0) {
    return coverByArtistId;
  }

  const { data, error } = await supabaseAdmin
    .from('posts')
    .select('postid,authorid,createdat,postattachments(attachmentid,fileurl,thumbnailurl,sortorder,mediatype)')
    .in('authorid', artistIds)
    .order('createdat', { ascending: false });

  if (error) {
    throw new Error(`Failed to query artist cover images: ${error.message}`);
  }

  for (const post of (data ?? []) as PostRecord[]) {
    const authorId = Number(post.authorid);
    if (!Number.isFinite(authorId) || coverByArtistId.has(authorId)) {
      continue;
    }

    const attachment = pickPrimaryAttachment(post.postattachments);
    const coverImage = getAttachmentThumbnailPublicUrl(attachment);

    if (!coverImage) {
      continue;
    }

    coverByArtistId.set(authorId, coverImage);
  }

  return coverByArtistId;
}

function mapArtistGridItem(artist: ArtistRecord, coverByArtistId: Map<number, string>): ArtistGridItem {
  const keywords = parseKeywords(artist.keywords);
  const name = resolveArtistName(artist);

  return {
    id: String(artist.artistid),
    name,
    keywords,
    keywordSummary: keywords.slice(0, 3).join(' / ') || '暂无关键词',
    intro: artist.intro?.trim() || buildArtistIntro(keywords),
    image: coverByArtistId.get(artist.artistid) ?? DEFAULT_ARTIST_IMAGE,
    price: formatPrice(artist.startingprice),
    avatar: name.slice(0, 1).toUpperCase(),
    href: `/creation/artist/${artist.artistid}`
  };
}

function mapPortfolioItem(post: PostRecord, index: number): ArtistPortfolioItem | null {
  const attachment = pickPrimaryAttachment(post.postattachments);
  const image = getAttachmentOriginalPublicUrl(attachment);

  if (!image) {
    return null;
  }

  return {
    id: `post-${post.postid}`,
    postId: post.postid,
    title: post.title?.trim() || `作品 #${post.postid}`,
    image,
    size: PORTFOLIO_SIZE_PATTERN[index % PORTFOLIO_SIZE_PATTERN.length],
    favoriteCount: post.favoritecount ?? 0,
    createdAt: post.createdat ?? ''
  };
}

function mapCommissionPlan(plan: CommissionPlanRecord): ArtistServiceItem {
  return {
    id: `plan-${plan.planid}`,
    title: plan.title?.trim() || `约稿方案 #${plan.planid}`,
    description: plan.description?.trim() || '数据库当前未提供方案描述。',
    price: formatPrice(plan.price)
  };
}

function pickPrimaryAttachment(attachments: AttachmentRecord[] | null | undefined) {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const [firstAttachment] = [...attachments].sort(
    (left, right) => (left.sortorder ?? Number.MAX_SAFE_INTEGER) - (right.sortorder ?? Number.MAX_SAFE_INTEGER)
  );

  return firstAttachment ?? null;
}

function getAttachmentThumbnailPublicUrl(attachment: AttachmentRecord | null | undefined) {
  const thumbnailPath = normalizeStoragePath(attachment?.thumbnailurl);

  if (thumbnailPath) {
    return getPublicImageUrl(thumbnailPath);
  }

  const originalPath = normalizeStoragePath(attachment?.fileurl);

  return originalPath ? getTransformedImageUrl(originalPath, ARTIST_GRID_THUMBNAIL) : '';
}

function getAttachmentOriginalPublicUrl(attachment: AttachmentRecord | null | undefined) {
  const preferredPath =
    normalizeStoragePath(attachment?.fileurl) || normalizeStoragePath(attachment?.thumbnailurl);

  return preferredPath ? getPublicImageUrl(preferredPath) : '';
}

function resolveArtistName(artist: ArtistRecord) {
  const user = Array.isArray(artist.users) ? artist.users[0] : artist.users;
  return user?.nickname?.trim() || user?.account?.trim() || `Artist ${artist.artistid}`;
}

function parseKeywords(raw: string | null | undefined) {
  if (!raw) {
    return [];
  }

  const unique = new Set<string>();

  raw
    .split(/[，,]+/g)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      if (!unique.has(item)) {
        unique.add(item);
      }
    });

  return [...unique];
}

function buildArtistIntro(keywords: string[]) {
  if (keywords.length === 0) {
    return '数据库暂无独立简介，当前以作品集内容为主。';
  }

  return `关注 ${keywords.slice(0, 4).join('、')} 等主题创作。`;
}

function buildArtistConcept(keywords: string[]) {
  if (keywords.length === 0) {
    return '当前数据库暂无更完整的风格描述，可通过作品集进一步了解画师表达方向。';
  }

  return `围绕 ${keywords.slice(0, 6).join('、')} 等关键词持续创作，作品集可作为风格参考。`;
}

function buildActivityMeta(value: number | null): ArtistActivity {
  const progress = clampPercent(value);

  if (progress >= 70) {
    return {
      progress,
      label: `创作活跃度 ${progress}%`,
      eta: '近期活跃，可优先沟通'
    };
  }

  if (progress >= 40) {
    return {
      progress,
      label: `创作活跃度 ${progress}%`,
      eta: '状态稳定，建议先私聊沟通'
    };
  }

  return {
    progress,
    label: `创作活跃度 ${progress}%`,
    eta: '近期活跃较低，建议先收藏关注'
  };
}

function clampPercent(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(Number(value))));
}

function formatPrice(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return '价格待沟通';
  }

  const amount = Number(value);
  const hasDecimals = !Number.isInteger(amount);

  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatRating(value: number | null | undefined) {
  if (!Number.isFinite(value)) {
    return '—';
  }

  return Number(value).toFixed(2);
}

function getPublicImageUrl(fileUrl: string) {
  if (/^https?:\/\//i.test(fileUrl)) {
    return fileUrl;
  }

  return supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(fileUrl).data.publicUrl;
}

function getTransformedImageUrl(
  fileUrl: string,
  options: { width: number; height?: number; quality?: number; resize?: 'cover' | 'contain' | 'fill' }
) {
  if (!SUPABASE_PUBLIC_URL || /^https?:\/\//i.test(fileUrl)) {
    return getPublicImageUrl(fileUrl);
  }

  const url = new URL(
    `/storage/v1/render/image/public/${STORAGE_BUCKET}/${fileUrl}`,
    SUPABASE_PUBLIC_URL
  );

  url.searchParams.set('width', String(options.width));

  if (options.height) {
    url.searchParams.set('height', String(options.height));
  }

  if (options.quality) {
    url.searchParams.set('quality', String(options.quality));
  }

  if (options.resize) {
    url.searchParams.set('resize', options.resize);
  }

  return url.toString();
}

function normalizeStoragePath(value: string | null | undefined) {
  const normalized = value?.trim() ?? '';

  if (!normalized) {
    return '';
  }

  return normalized.replace(/^\/+/, '');
}
