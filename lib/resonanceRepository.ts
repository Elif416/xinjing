import 'server-only';

import { supabaseAdmin } from './supabaseAdmin';
import type { ResonancePost, ResonancePostInput } from './resonanceTypes';

type UserRow = {
  userid: number;
  account: string | null;
  nickname: string | null;
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

export async function listResonancePosts(limit = 200): Promise<ResonancePost[]> {
  const { data, error } = await supabaseAdmin
    .from('resonanceposts')
    .select('postid,userid,title,content,address,township,lng,lat,createdat')
    .order('createdat', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to load resonance posts: ${error.message}`);
  }

  return (data ?? []).map((row) => mapResonancePost(row as ResonancePostRow));
}

export async function createResonancePost(input: ResonancePostInput): Promise<ResonancePost> {
  const normalized = normalizeInput(input);
  const user = await ensureAppUser();
  const postId = await getNextId('resonanceposts', 'postid');

  const { data, error } = await supabaseAdmin
    .from('resonanceposts')
    .insert({
      postid: postId,
      userid: user.userid,
      title: normalized.title || null,
      content: normalized.content,
      address: normalized.address,
      township: normalized.township || null,
      lng: normalized.lng,
      lat: normalized.lat,
      createdat: new Date().toISOString()
    })
    .select('postid,userid,title,content,address,township,lng,lat,createdat')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create resonance post: ${error?.message ?? 'Unknown error'}`);
  }

  return mapResonancePost(data as ResonancePostRow);
}

function normalizeInput(input: ResonancePostInput) {
  const title = input.title?.trim() ?? '';
  const content = input.content?.trim() ?? '';
  const address = input.address?.trim() ?? '';
  const township = input.township?.trim() ?? '';
  const lng = Number(input.lng);
  const lat = Number(input.lat);

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
    lat
  };
}

function mapResonancePost(row: ResonancePostRow): ResonancePost {
  return {
    id: row.postid,
    title: row.title?.trim() || '',
    content: row.content?.trim() || '',
    address: row.address?.trim() || '',
    township: row.township?.trim() || '',
    lng: Number(row.lng) || 0,
    lat: Number(row.lat) || 0,
    createdAt: row.createdat ?? new Date(0).toISOString(),
    userId: row.userid ?? undefined
  };
}

async function ensureAppUser() {
  const account = process.env.AUTH_EMAIL?.trim() || 'heartmirror@app.local';

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('userid,account,nickname')
    .eq('account', account)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load app user: ${error.message}`);
  }

  if (data) {
    return data as UserRow;
  }

  const userId = await getNextId('users', 'userid');
  const nickname = account.split('@')[0] || 'HeartMirror';

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      userid: userId,
      account,
      passwordhash: '',
      nickname,
      userrole: 'User',
      createdat: new Date().toISOString()
    })
    .select('userid,account,nickname')
    .single();

  if (insertError || !inserted) {
    throw new Error(`Failed to create app user: ${insertError?.message ?? 'Unknown error'}`);
  }

  return inserted as UserRow;
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
