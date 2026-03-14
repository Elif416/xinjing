import 'server-only';

import { startDirectConversation } from './messageRepository';
import { getMarketProductBySlug } from './marketCatalog';
import { supabaseAdmin } from './supabaseAdmin';

type UserRow = {
  userid: number;
  account: string | null;
  nickname: string | null;
  userrole: string | null;
};

const MARKET_SUPPORT_ACCOUNT = 'market-support@heartmirror.local';
const MARKET_SUPPORT_NAME = '心镜物客服';

export async function startMarketSupportConversation(slug: string) {
  const product = getMarketProductBySlug(slug);

  if (!product) {
    throw new Error('商品不存在。');
  }

  const supportUser = await ensureMarketSupportUser();
  await ensureMarketProductRecord(product.slug, supportUser.userid);

  return startDirectConversation(supportUser.userid);
}

async function ensureMarketSupportUser() {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('userid,account,nickname,userrole')
    .eq('account', MARKET_SUPPORT_ACCOUNT)
    .maybeSingle();

  if (error) {
    throw new Error(`读取客服账号失败：${error.message}`);
  }

  if (data) {
    return data as UserRow;
  }

  const userId = await getNextId('users', 'userid');
  const createdAt = new Date().toISOString();
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      userid: userId,
      account: MARKET_SUPPORT_ACCOUNT,
      passwordhash: '',
      nickname: MARKET_SUPPORT_NAME,
      userrole: 'Merchant',
      createdat: createdAt
    })
    .select('userid,account,nickname,userrole')
    .single();

  if (insertError || !inserted) {
    throw new Error(`创建客服账号失败：${insertError?.message ?? 'Unknown error'}`);
  }

  return inserted as UserRow;
}

async function ensureMarketProductRecord(slug: string, merchantId: number) {
  const product = getMarketProductBySlug(slug);

  if (!product) {
    return;
  }

  const payload = {
    productid: product.productId,
    merchantid: merchantId,
    productname: product.title,
    description: product.description,
    price: product.basePrice,
    stock: product.stock
  };

  const { data, error } = await supabaseAdmin
    .from('products')
    .select('productid')
    .eq('productid', product.productId)
    .maybeSingle();

  if (error) {
    throw new Error(`读取商品记录失败：${error.message}`);
  }

  if (data?.productid) {
    const { error: updateError } = await supabaseAdmin
      .from('products')
      .update(payload)
      .eq('productid', product.productId);

    if (updateError) {
      throw new Error(`更新商品记录失败：${updateError.message}`);
    }

    return;
  }

  const { error: insertError } = await supabaseAdmin.from('products').insert(payload);

  if (insertError) {
    throw new Error(`创建商品记录失败：${insertError.message}`);
  }
}

async function getNextId(table: string, column: string) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(column)
    .order(column, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`分配 ${table} ID 失败：${error.message}`);
  }

  const current =
    data && typeof data === 'object' ? Number((data as Record<string, unknown>)[column]) : 0;

  return Number.isFinite(current) ? current + 1 : 1;
}
