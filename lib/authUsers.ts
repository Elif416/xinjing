import 'server-only';

import { supabaseAdmin } from './supabaseAdmin';

export type RegisteredUser = {
  userid: number;
  account: string;
  nickname: string;
  userrole: string;
};

export async function ensureRegisteredUser(email: string): Promise<RegisteredUser> {
  const account = normalizeEmail(email);
  const existing = await findUserByAccount(account);

  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  const userid = await getNextIntegerId('users', 'userid');
  const nickname = account.split('@')[0] || 'HeartMirror';

  const { data, error } = await supabaseAdmin
    .from('users')
    .insert({
      userid,
      account,
      passwordhash: 'supabase-email-otp',
      nickname,
      userrole: 'User',
      createdat: now
    })
    .select('userid,account,nickname,userrole')
    .single();

  if (error || !data) {
    const retryExisting = await findUserByAccount(account);

    if (retryExisting) {
      return retryExisting;
    }

    throw new Error(`Failed to create user profile: ${error?.message ?? 'Unknown error'}`);
  }

  return normalizeUserRow(data);
}

async function findUserByAccount(account: string) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('userid,account,nickname,userrole')
    .eq('account', account)
    .limit(1);

  if (error) {
    throw new Error(`Failed to query user profile: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : null;

  return row ? normalizeUserRow(row) : null;
}

async function getNextIntegerId(table: string, column: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(column)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to allocate ${table}.${column}: ${error.message}`);
  }

  const current = Number((data as Record<string, unknown> | null)?.[column] ?? 0);

  return Number.isFinite(current) ? current + 1 : 1;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUserRow(row: Record<string, unknown>): RegisteredUser {
  const account = String(row.account ?? '').trim();
  const nickname = String(row.nickname ?? '').trim() || account.split('@')[0] || 'HeartMirror';
  const userrole = String(row.userrole ?? '').trim() || 'User';

  return {
    userid: Number(row.userid),
    account,
    nickname,
    userrole
  };
}
