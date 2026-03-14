import 'server-only';

import { supabaseAdmin } from './supabaseAdmin';
import type {
  ConversationDetail,
  ConversationMessage,
  ConversationPreview,
  ConversationsListPayload,
  MessagesUnreadPayload,
  SendConversationMessageInput
} from './messageTypes';

type UserRow = {
  userid: number;
  account: string | null;
  nickname: string | null;
  userrole: string | null;
};

type ConversationRow = {
  conversationid: number;
  conversationtype: string | null;
  title: string | null;
  directkey: string | null;
  createdby: number | null;
  createdat: string | null;
  updatedat: string | null;
};

type ConversationParticipantRow = {
  conversationid: number;
  userid: number | null;
  joinedat: string | null;
  lastreadmessageid?: number | null;
  lastreadat?: string | null;
  deletedat?: string | null;
};

type ConversationMessageRow = {
  messageid: number;
  conversationid: number | null;
  senderid: number | null;
  content: string | null;
  mediatype: string | null;
  fileurl: string | null;
  replyto: number | null;
  createdat: string | null;
  recalledat?: string | null;
  recalledby?: number | null;
};

type AttachmentRecord = {
  fileurl: string | null;
  sortorder: number | null;
  mediatype: string | null;
};

type ArtistPostRecord = {
  authorid: number | null;
  createdat: string | null;
  postattachments: AttachmentRecord[] | null;
};

type ConversationPreviewData = {
  items: ConversationPreview[];
  unreadTotal: number;
};

const PARTICIPANT_SELECT_BASE = 'conversationid,userid,joinedat';
const PARTICIPANT_READ_SELECT = 'lastreadmessageid,lastreadat';
const MESSAGE_SELECT_BASE =
  'messageid,conversationid,senderid,content,mediatype,fileurl,replyto,createdat';
const MESSAGE_SELECT_WITH_RECALL = `${MESSAGE_SELECT_BASE},recalledat,recalledby`;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? 'pixiv-images';
const PRIMARY_USER_ACCOUNT = process.env.AUTH_EMAIL?.trim() || 'heartmirror@app.local';
const PRIMARY_USER_NAME =
  process.env.AUTH_NICKNAME?.trim() || PRIMARY_USER_ACCOUNT.split('@')[0] || 'HeartMirror';
const MIMO_ACCOUNT = 'mimo@heartmirror.local';
const MIMO_NAME = 'Mimo';
const MESSAGE_IMAGE_LIMIT = 8 * 1024 * 1024;
let deletedAtColumnSupport: boolean | null = null;
let participantReadColumnsSupport: boolean | null = null;
let messageRecallColumnsSupport: boolean | null = null;

export async function listMessageConversations(): Promise<ConversationsListPayload> {
  const currentUser = await ensurePrimaryUser();
  await ensureMimoDemoConversation(currentUser.userid);
  const previewData = await loadConversationPreviews(currentUser.userid);

  return {
    currentUserId: currentUser.userid,
    unreadTotal: previewData.unreadTotal,
    items: previewData.items
  };
}

export async function getMessageUnreadSummary(): Promise<MessagesUnreadPayload> {
  const currentUser = await ensurePrimaryUser();
  await ensureMimoDemoConversation(currentUser.userid);
  const previewData = await loadConversationPreviews(currentUser.userid);

  return {
    unreadTotal: previewData.unreadTotal
  };
}

export async function getMessageConversationDetail(
  conversationId: number
): Promise<ConversationDetail> {
  if (!Number.isFinite(conversationId)) {
    throw new Error('会话不存在。');
  }

  const currentUser = await ensurePrimaryUser();
  await ensureMimoDemoConversation(currentUser.userid);

  const context = await getConversationContext(conversationId, currentUser.userid);
  const messages = await loadConversationMessages(conversationId, currentUser.userid);
  const latestMessageId = messages.at(-1)?.id ?? null;

  if (latestMessageId) {
    await markConversationAsRead(conversationId, currentUser.userid, latestMessageId);
  }

  return {
    id: context.row.conversationid,
    title: context.counterpart.name,
    updatedAt: context.row.updatedat || context.row.createdat || new Date().toISOString(),
    currentUserId: currentUser.userid,
    counterpart: context.counterpart,
    messages
  };
}

export async function startDirectConversation(targetUserId: number) {
  if (!Number.isFinite(targetUserId)) {
    throw new Error('目标用户不存在。');
  }

  const currentUser = await ensurePrimaryUser();
  if (currentUser.userid === targetUserId) {
    throw new Error('不能和自己发起私聊。');
  }

  await assertUserExists(targetUserId);
  const conversationId = await ensureDirectConversation(currentUser.userid, targetUserId);

  if (targetUserId === (await ensureMimoUser()).userid) {
    await ensureMimoGreeting(conversationId);
  }

  return getMessageConversationDetail(conversationId);
}

export async function sendConversationMessage(
  conversationId: number,
  input: SendConversationMessageInput,
  file?: File | null
) {
  if (!Number.isFinite(conversationId)) {
    throw new Error('会话不存在。');
  }

  const currentUser = await ensurePrimaryUser();
  await assertConversationMembership(conversationId, currentUser.userid);

  const content = input.content?.trim() || '';
  const replyToId =
    input.replyToId != null && Number.isFinite(Number(input.replyToId))
      ? Number(input.replyToId)
      : null;

  if (!content && !file) {
    throw new Error('请输入消息内容或上传图片。');
  }

  if (file) {
    validateMessageImage(file);
  }

  let uploadedPath = '';

  try {
    if (replyToId) {
      await assertReplyTarget(conversationId, replyToId);
    }

    if (file) {
      uploadedPath = await uploadMessageImage(conversationId, file);
    }

    const messageId = await getNextId('conversationmessages', 'messageid');
    const createdAt = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('conversationmessages')
      .insert(
        await buildMessageInsertRow({
          messageId,
          conversationId,
          senderId: currentUser.userid,
          content,
          mediaType: uploadedPath ? 'image' : null,
          fileUrl: uploadedPath || null,
          replyTo: replyToId,
          createdAt
        })
      );

    if (error) {
      throw new Error(`发送消息失败：${error.message}`);
    }

    await restoreConversationParticipants(conversationId);
    await touchConversation(conversationId, createdAt);
    await markConversationAsRead(conversationId, currentUser.userid, messageId);

    const created = await getConversationMessageById(conversationId, messageId, currentUser.userid);

    if (!created) {
      throw new Error('消息已发送，但读取结果失败。');
    }

    return created;
  } catch (error) {
    if (uploadedPath) {
      await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([uploadedPath]);
    }
    throw error;
  }
}

export async function recallConversationMessage(conversationId: number, messageId: number) {
  if (!Number.isFinite(conversationId) || !Number.isFinite(messageId)) {
    throw new Error('消息不存在。');
  }

  const currentUser = await ensurePrimaryUser();
  await assertConversationMembership(conversationId, currentUser.userid);

  const { data, error } = await supabaseAdmin
    .from('conversationmessages')
    .select(await getMessageSelectColumns())
    .eq('conversationid', conversationId)
    .eq('messageid', messageId)
    .maybeSingle();

  if (error) {
    throw new Error(`读取消息失败：${error.message}`);
  }

  const row = data as ConversationMessageRow | null;
  if (!row?.messageid) {
    throw new Error('消息不存在。');
  }

  if (row.senderid !== currentUser.userid) {
    throw new Error('只能撤回自己发送的消息。');
  }

  if (row.recalledat) {
    throw new Error('这条消息已经撤回了。');
  }

  if (!(await supportsMessageRecallColumns())) {
    throw new Error(
      '当前数据库还没完成消息未读/撤回升级，请先运行 20260313235500_messages_unread_recall.sql。'
    );
  }

  const recalledAt = new Date().toISOString();
  const { error: updateError } = await supabaseAdmin
    .from('conversationmessages')
    .update({
      content: '',
      mediatype: null,
      fileurl: null,
      recalledat: recalledAt,
      recalledby: currentUser.userid
    })
    .eq('conversationid', conversationId)
    .eq('messageid', messageId);

  if (updateError) {
    throw new Error(`撤回消息失败：${updateError.message}`);
  }

  if (row.fileurl) {
    await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([row.fileurl]);
  }

  await touchConversation(conversationId, recalledAt);
  const recalled = await getConversationMessageById(conversationId, messageId, currentUser.userid);

  if (!recalled) {
    throw new Error('消息已撤回，但刷新状态失败。');
  }

  return recalled;
}

export async function deleteConversationForCurrentUser(conversationId: number) {
  if (!Number.isFinite(conversationId)) {
    throw new Error('会话不存在。');
  }

  const currentUser = await ensurePrimaryUser();
  await assertConversationMembership(conversationId, currentUser.userid);

  if (!(await supportsDeletedAtColumn())) {
    throw new Error('当前数据库还没完成消息删除升级，请先运行 20260314002000_messages_delete_visibility.sql。');
  }

  const { error } = await supabaseAdmin
    .from('conversationparticipants')
    .update({
      deletedat: new Date().toISOString()
    })
    .eq('conversationid', conversationId)
    .eq('userid', currentUser.userid);

  if (error) {
    throw new Error(`删除会话失败：${error.message}`);
  }

  return {
    conversationId
  };
}

async function loadConversationPreviews(currentUserId: number): Promise<ConversationPreviewData> {
  const memberResult = await listParticipantsByUser(currentUserId);
  const memberRows = memberResult.data;
  const memberError = memberResult.error;

  if (memberError) {
    throw new Error(`加载会话列表失败：${memberError.message}`);
  }

  const memberships = ((memberRows ?? []) as unknown as ConversationParticipantRow[]).filter(
    (row) => !row.deletedat
  );
  const conversationIds = uniqueNumbers(memberships.map((row) => row.conversationid));

  if (conversationIds.length === 0) {
    return {
      items: [],
      unreadTotal: 0
    };
  }

  const [{ data: rows, error: conversationError }, { data: participantRows, error: participantError }] =
    await Promise.all([
      supabaseAdmin
        .from('conversations')
        .select('conversationid,conversationtype,title,directkey,createdby,createdat,updatedat')
        .in('conversationid', conversationIds)
        .order('updatedat', { ascending: false }),
      listParticipantsByConversationIds(conversationIds)
    ]);

  if (conversationError) {
    throw new Error(`加载会话列表失败：${conversationError.message}`);
  }

  if (participantError) {
    throw new Error(`加载会话成员失败：${participantError.message}`);
  }

  const conversations = (rows ?? []) as ConversationRow[];
  const participants = ((participantRows ?? []) as unknown as ConversationParticipantRow[]).filter(
    (row) => !row.deletedat
  );
  const counterpartIds = uniqueNumbers(
    participants
      .filter((row) => row.userid && row.userid !== currentUserId)
      .map((row) => row.userid)
  );

  const lastReadMessageIdMap = new Map<number, number>();
  for (const membership of memberships) {
    lastReadMessageIdMap.set(membership.conversationid, membership.lastreadmessageid ?? 0);
  }

  const [userMap, profileMap, messageStats] = await Promise.all([
    loadUsersMap([currentUserId, ...counterpartIds]),
    loadUserProfileMap(counterpartIds),
    loadMessageStats(conversationIds, currentUserId, lastReadMessageIdMap)
  ]);

  const items: ConversationPreview[] = [];

  for (const row of conversations) {
    const counterpartId = participants.find(
      (item) => item.conversationid === row.conversationid && item.userid !== currentUserId
    )?.userid;

    if (!counterpartId) {
      continue;
    }

    const counterpart = userMap.get(counterpartId);
    if (!counterpart) {
      continue;
    }

    const latestMessage = messageStats.latestMessageMap.get(row.conversationid) ?? null;
    const profile = profileMap.get(counterpartId);

    items.push({
      id: row.conversationid,
      title: resolveUserName(counterpart, counterpartId),
      updatedAt:
        latestMessage?.createdat || row.updatedat || row.createdat || new Date().toISOString(),
      counterpart: {
        userId: counterpartId,
        name: resolveUserName(counterpart, counterpartId),
        role: counterpart.userrole?.trim() || (profile?.isArtist ? 'Artist' : 'User'),
        avatarUrl: profile?.avatarUrl,
        isArtist: profile?.isArtist ?? isArtistRole(counterpart.userrole)
      },
      lastMessage: latestMessage
        ? {
            text: buildMessageSnippet(latestMessage),
            createdAt: latestMessage.createdat || row.updatedat || new Date().toISOString(),
            senderName: resolveUserName(
              latestMessage.senderid ? userMap.get(latestMessage.senderid) : undefined,
              latestMessage.senderid ?? 0
            ),
            isSelf: latestMessage.senderid === currentUserId,
            isRecalled: Boolean(latestMessage.recalledat)
          }
        : null,
      unreadCount: messageStats.unreadCountMap.get(row.conversationid) ?? 0
    });
  }

  return {
    items,
    unreadTotal: items.reduce((sum, item) => sum + item.unreadCount, 0)
  };
}

async function loadConversationMessages(
  conversationId: number,
  currentUserId: number
): Promise<ConversationMessage[]> {
  const { data, error } = await supabaseAdmin
    .from('conversationmessages')
    .select(await getMessageSelectColumns())
    .eq('conversationid', conversationId)
    .order('createdat', { ascending: true })
    .order('messageid', { ascending: true });

  if (error) {
    throw new Error(`加载消息失败：${error.message}`);
  }

  const rows = (data ?? []) as unknown as ConversationMessageRow[];
  const senderIds = uniqueNumbers(rows.map((row) => row.senderid));
  const userMap = await loadUsersMap(senderIds);
  const rowMap = new Map(rows.map((row) => [row.messageid, row]));

  return rows.map((row) => mapConversationMessage(row, rowMap, userMap, currentUserId));
}

async function getConversationMessageById(
  conversationId: number,
  messageId: number,
  currentUserId: number
) {
  const messages = await loadConversationMessages(conversationId, currentUserId);
  return messages.find((message) => message.id === messageId) ?? null;
}

async function getConversationContext(conversationId: number, currentUserId: number) {
  await assertConversationMembership(conversationId, currentUserId);

  const [{ data: row, error: rowError }, { data: participantRows, error: participantError }] =
    await Promise.all([
      supabaseAdmin
        .from('conversations')
        .select('conversationid,conversationtype,title,directkey,createdby,createdat,updatedat')
        .eq('conversationid', conversationId)
        .maybeSingle(),
      listParticipantsByConversationIds([conversationId])
    ]);

  if (rowError) {
    throw new Error(`加载会话失败：${rowError.message}`);
  }

  const conversation = row as ConversationRow | null;
  if (!conversation) {
    throw new Error('会话不存在。');
  }

  if (participantError) {
    throw new Error(`加载会话成员失败：${participantError.message}`);
  }

  const participants = ((participantRows ?? []) as unknown as ConversationParticipantRow[]).filter(
    (item) => !item.deletedat
  );
  const counterpartId = participants.find(
    (item) => item.userid && item.userid !== currentUserId
  )?.userid;

  if (!counterpartId) {
    throw new Error('会话缺少对方成员。');
  }

  const [userMap, profileMap] = await Promise.all([
    loadUsersMap([counterpartId]),
    loadUserProfileMap([counterpartId])
  ]);

  const counterpart = userMap.get(counterpartId);
  if (!counterpart) {
    throw new Error('对方用户不存在。');
  }

  const profile = profileMap.get(counterpartId);

  return {
    row: conversation,
    counterpart: {
      userId: counterpartId,
      name: resolveUserName(counterpart, counterpartId),
      role: counterpart.userrole?.trim() || (profile?.isArtist ? 'Artist' : 'User'),
      avatarUrl: profile?.avatarUrl,
      isArtist: profile?.isArtist ?? isArtistRole(counterpart.userrole)
    }
  };
}

async function ensureDirectConversation(leftUserId: number, rightUserId: number) {
  const directKey = buildDirectKey(leftUserId, rightUserId);
  const { data, error } = await findDirectConversationByKey(directKey);

  if (error) {
    throw new Error(`创建会话失败：${error.message}`);
  }

  if (data?.conversationid) {
    await ensureConversationParticipant(data.conversationid, leftUserId);
    await ensureConversationParticipant(data.conversationid, rightUserId);
    return data.conversationid;
  }

  const conversationId = await getNextId('conversations', 'conversationid');
  const createdAt = new Date().toISOString();

  const { error: insertConversationError } = await supabaseAdmin.from('conversations').insert({
    conversationid: conversationId,
    conversationtype: 'direct',
    title: null,
    directkey: directKey,
    createdby: leftUserId,
    createdat: createdAt,
    updatedat: createdAt
  });

  if (insertConversationError) {
    if (isDirectConversationConflictError(insertConversationError)) {
      const { data: existing, error: existingError } = await findDirectConversationByKey(directKey);

      if (existingError) {
        throw new Error(`创建会话失败：${existingError.message}`);
      }

      if (existing?.conversationid) {
        await ensureConversationParticipant(existing.conversationid, leftUserId);
        await ensureConversationParticipant(existing.conversationid, rightUserId);
        return existing.conversationid;
      }
    }

    throw new Error(`创建会话失败：${insertConversationError.message}`);
  }

  const { error: insertParticipantsError } = await supabaseAdmin
    .from('conversationparticipants')
    .insert([
      await buildParticipantInsertRow(conversationId, leftUserId, createdAt),
      await buildParticipantInsertRow(conversationId, rightUserId, createdAt)
    ]);

  if (insertParticipantsError) {
    await supabaseAdmin.from('conversations').delete().eq('conversationid', conversationId);
    throw new Error(`创建会话成员失败：${insertParticipantsError.message}`);
  }

  return conversationId;
}

async function ensureConversationParticipant(conversationId: number, userId: number) {
  const { data, error } = await getParticipantMembership(conversationId, userId);

  if (error) {
    throw new Error(`读取会话成员失败：${error.message}`);
  }

  if (data?.conversationid && !(data as { deletedat?: string | null }).deletedat) {
    return;
  }

  if (data?.conversationid) {
    const { error: restoreError } = await restoreDeletedParticipant(conversationId, userId);

    if (restoreError) {
      throw new Error(`恢复会话失败：${restoreError.message}`);
    }

    return;
  }

  const { error: insertError } = await supabaseAdmin
    .from('conversationparticipants')
    .insert(await buildParticipantInsertRow(conversationId, userId, new Date().toISOString()));

  if (insertError) {
    throw new Error(`补充会话成员失败：${insertError.message}`);
  }
}

async function ensureMimoDemoConversation(currentUserId: number) {
  const mimo = await ensureMimoUser();

  if (mimo.userid === currentUserId) {
    return;
  }

  const conversationId = await ensureDirectConversation(currentUserId, mimo.userid);
  await ensureMimoGreeting(conversationId);
}

async function ensureMimoGreeting(conversationId: number) {
  const mimo = await ensureMimoUser();
  const { data, error } = await supabaseAdmin
    .from('conversationmessages')
    .select('messageid')
    .eq('conversationid', conversationId)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`初始化示例消息失败：${error.message}`);
  }

  if (data?.messageid) {
    return;
  }

  const messageId = await getNextId('conversationmessages', 'messageid');
  const createdAt = new Date().toISOString();

  const { error: insertError } = await supabaseAdmin
    .from('conversationmessages')
    .insert(
      await buildMessageInsertRow({
        messageId,
        conversationId,
        senderId: mimo.userid,
        content: '嗨！欢迎来到心镜平台！',
        mediaType: null,
        fileUrl: null,
        replyTo: null,
        createdAt
      })
    );

  if (insertError) {
    throw new Error(`初始化示例消息失败：${insertError.message}`);
  }

  await touchConversation(conversationId, createdAt);
  await markConversationAsRead(conversationId, mimo.userid, messageId);
}

async function ensurePrimaryUser() {
  return ensureUser({
    account: PRIMARY_USER_ACCOUNT,
    nickname: PRIMARY_USER_NAME,
    userrole: 'User'
  });
}

async function ensureMimoUser() {
  return ensureUser({
    account: MIMO_ACCOUNT,
    nickname: MIMO_NAME,
    userrole: 'User'
  });
}

async function ensureUser(input: { account: string; nickname: string; userrole: string }) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('userid,account,nickname,userrole')
    .eq('account', input.account)
    .maybeSingle();

  if (error) {
    throw new Error(`加载用户失败：${error.message}`);
  }

  if (data) {
    return data as UserRow;
  }

  const userId = await getNextId('users', 'userid');
  const now = new Date().toISOString();
  const { data: inserted, error: insertError } = await supabaseAdmin
    .from('users')
    .insert({
      userid: userId,
      account: input.account,
      passwordhash: '',
      nickname: input.nickname,
      userrole: input.userrole,
      createdat: now
    })
    .select('userid,account,nickname,userrole')
    .single();

  if (insertError || !inserted) {
    throw new Error(`创建用户失败：${insertError?.message ?? 'Unknown error'}`);
  }

  return inserted as UserRow;
}

async function assertUserExists(userId: number) {
  const { data, error } = await supabaseAdmin
    .from('users')
    .select('userid')
    .eq('userid', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`加载用户失败：${error.message}`);
  }

  if (!data?.userid) {
    throw new Error('目标用户不存在。');
  }
}

async function assertConversationMembership(conversationId: number, userId: number) {
  const { data, error } = await getActiveParticipantMembership(conversationId, userId);

  if (error) {
    throw new Error(`校验会话权限失败：${error.message}`);
  }

  if (!data?.conversationid) {
    throw new Error('你无权访问这个会话。');
  }
}

async function assertReplyTarget(conversationId: number, replyToId: number) {
  const { data, error } = await supabaseAdmin
    .from('conversationmessages')
    .select('messageid,conversationid')
    .eq('conversationid', conversationId)
    .eq('messageid', replyToId)
    .maybeSingle();

  if (error) {
    throw new Error(`读取引用消息失败：${error.message}`);
  }

  if (!data?.messageid) {
    throw new Error('引用的消息不存在。');
  }
}

async function loadMessageStats(
  conversationIds: number[],
  currentUserId: number,
  lastReadMessageIdMap: Map<number, number>
) {
  const latestMessageMap = new Map<number, ConversationMessageRow>();
  const unreadCountMap = new Map<number, number>();
  const supportsReadState = await supportsParticipantReadColumns();

  if (conversationIds.length === 0) {
    return { latestMessageMap, unreadCountMap };
  }

  const { data, error } = await supabaseAdmin
    .from('conversationmessages')
    .select(await getMessageSelectColumns())
    .in('conversationid', conversationIds)
    .order('createdat', { ascending: false })
    .order('messageid', { ascending: false });

  if (error) {
    throw new Error(`加载消息统计失败：${error.message}`);
  }

  for (const row of (data ?? []) as unknown as ConversationMessageRow[]) {
    const conversationId = Number(row.conversationid);

    if (!Number.isFinite(conversationId)) {
      continue;
    }

    if (!latestMessageMap.has(conversationId)) {
      latestMessageMap.set(conversationId, row);
    }

    if (
      supportsReadState &&
      row.senderid !== currentUserId &&
      !row.recalledat &&
      row.messageid > (lastReadMessageIdMap.get(conversationId) ?? 0)
    ) {
      unreadCountMap.set(conversationId, (unreadCountMap.get(conversationId) ?? 0) + 1);
    }
  }

  return { latestMessageMap, unreadCountMap };
}

async function loadUsersMap(userIds: number[]) {
  const map = new Map<number, UserRow>();
  const uniqueIds = uniqueNumbers(userIds);

  if (uniqueIds.length === 0) {
    return map;
  }

  const { data, error } = await supabaseAdmin
    .from('users')
    .select('userid,account,nickname,userrole')
    .in('userid', uniqueIds);

  if (error) {
    throw new Error(`加载用户失败：${error.message}`);
  }

  for (const row of (data ?? []) as UserRow[]) {
    map.set(row.userid, row);
  }

  return map;
}

async function loadUserProfileMap(userIds: number[]) {
  const map = new Map<number, { isArtist: boolean; avatarUrl?: string }>();
  const uniqueIds = uniqueNumbers(userIds);

  if (uniqueIds.length === 0) {
    return map;
  }

  const { data: artistRows, error: artistError } = await supabaseAdmin
    .from('artists')
    .select('artistid')
    .in('artistid', uniqueIds);

  if (artistError) {
    throw new Error(`加载画师资料失败：${artistError.message}`);
  }

  const artistIds = uniqueNumbers(
    (artistRows ?? []).map((row) => Number((row as { artistid: number }).artistid))
  );

  for (const artistId of artistIds) {
    map.set(artistId, { isArtist: true });
  }

  if (artistIds.length === 0) {
    return map;
  }

  const { data: posts, error: postError } = await supabaseAdmin
    .from('posts')
    .select('authorid,createdat,postattachments(fileurl,sortorder,mediatype)')
    .in('authorid', artistIds)
    .order('createdat', { ascending: false });

  if (postError) {
    throw new Error(`加载画师头像失败：${postError.message}`);
  }

  for (const row of (posts ?? []) as ArtistPostRecord[]) {
    const artistId = Number(row.authorid);
    if (!Number.isFinite(artistId)) {
      continue;
    }

    const current = map.get(artistId);
    if (!current || current.avatarUrl) {
      continue;
    }

    const attachment = pickPrimaryAttachment(row.postattachments);
    if (!attachment?.fileurl) {
      continue;
    }

    map.set(artistId, {
      isArtist: true,
      avatarUrl: getPublicFileUrl(attachment.fileurl)
    });
  }

  return map;
}

async function uploadMessageImage(conversationId: number, file: File) {
  const extension = resolveFileExtension(file);
  const filePath = `messages/${conversationId}/${Date.now()}-${crypto.randomUUID()}${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).upload(filePath, buffer, {
    contentType: file.type || 'image/jpeg',
    upsert: false
  });

  if (error) {
    throw new Error(`上传图片失败：${error.message}`);
  }

  return filePath;
}

async function markConversationAsRead(
  conversationId: number,
  userId: number,
  lastMessageId: number
) {
  if (!(await supportsParticipantReadColumns())) {
    return;
  }

  const { error } = await supabaseAdmin
    .from('conversationparticipants')
    .update({
      lastreadmessageid: lastMessageId,
      lastreadat: new Date().toISOString()
    })
    .eq('conversationid', conversationId)
    .eq('userid', userId);

  if (error) {
    throw new Error(`更新已读状态失败：${error.message}`);
  }
}

async function supportsParticipantReadColumns() {
  if (participantReadColumnsSupport !== null) {
    return participantReadColumnsSupport;
  }

  const { error } = await supabaseAdmin
    .from('conversationparticipants')
    .select(PARTICIPANT_READ_SELECT)
    .limit(1);

  if (error && isMissingParticipantReadColumnError(error.message)) {
    participantReadColumnsSupport = false;
    return false;
  }

  participantReadColumnsSupport = true;
  return true;
}

async function supportsDeletedAtColumn() {
  if (deletedAtColumnSupport !== null) {
    return deletedAtColumnSupport;
  }

  const { error } = await supabaseAdmin
    .from('conversationparticipants')
    .select('deletedat')
    .limit(1);

  if (error && isMissingDeletedAtError(error.message)) {
    deletedAtColumnSupport = false;
    return false;
  }

  deletedAtColumnSupport = true;
  return true;
}

async function supportsMessageRecallColumns() {
  if (messageRecallColumnsSupport !== null) {
    return messageRecallColumnsSupport;
  }

  const { error } = await supabaseAdmin
    .from('conversationmessages')
    .select('recalledat,recalledby')
    .limit(1);

  if (error && isMissingMessageRecallColumnError(error.message)) {
    messageRecallColumnsSupport = false;
    return false;
  }

  messageRecallColumnsSupport = true;
  return true;
}

async function getParticipantSelectColumns() {
  const columns = [PARTICIPANT_SELECT_BASE];

  if (await supportsParticipantReadColumns()) {
    columns.push(PARTICIPANT_READ_SELECT);
  }

  if (await supportsDeletedAtColumn()) {
    columns.push('deletedat');
  }

  return columns.join(',');
}

async function getMessageSelectColumns() {
  return (await supportsMessageRecallColumns()) ? MESSAGE_SELECT_WITH_RECALL : MESSAGE_SELECT_BASE;
}

async function listParticipantsByUser(userId: number) {
  return supabaseAdmin
    .from('conversationparticipants')
    .select(await getParticipantSelectColumns())
    .eq('userid', userId);
}

async function listParticipantsByConversationIds(conversationIds: number[]) {
  return supabaseAdmin
    .from('conversationparticipants')
    .select(await getParticipantSelectColumns())
    .in('conversationid', conversationIds);
}

async function getParticipantMembership(conversationId: number, userId: number) {
  if (await supportsDeletedAtColumn()) {
    return supabaseAdmin
      .from('conversationparticipants')
      .select('conversationid,userid,deletedat')
      .eq('conversationid', conversationId)
      .eq('userid', userId)
      .maybeSingle();
  }

  return supabaseAdmin
    .from('conversationparticipants')
    .select('conversationid,userid')
    .eq('conversationid', conversationId)
    .eq('userid', userId)
    .maybeSingle();
}

async function getActiveParticipantMembership(conversationId: number, userId: number) {
  if (await supportsDeletedAtColumn()) {
    return supabaseAdmin
      .from('conversationparticipants')
      .select('conversationid,userid')
      .eq('conversationid', conversationId)
      .eq('userid', userId)
      .is('deletedat', null)
      .maybeSingle();
  }

  return supabaseAdmin
    .from('conversationparticipants')
    .select('conversationid,userid')
    .eq('conversationid', conversationId)
    .eq('userid', userId)
    .maybeSingle();
}

async function restoreDeletedParticipant(conversationId: number, userId: number) {
  if (!(await supportsDeletedAtColumn())) {
    return { error: null };
  }

  return supabaseAdmin
    .from('conversationparticipants')
    .update({ deletedat: null })
    .eq('conversationid', conversationId)
    .eq('userid', userId);
}

async function restoreDeletedParticipantsForConversation(conversationId: number) {
  if (!(await supportsDeletedAtColumn())) {
    return { error: null };
  }

  return supabaseAdmin
    .from('conversationparticipants')
    .update({ deletedat: null })
    .eq('conversationid', conversationId);
}

async function buildParticipantInsertRow(conversationId: number, userId: number, joinedAt: string) {
  const row: {
    conversationid: number;
    userid: number;
    joinedat: string;
    lastreadmessageid?: null;
    lastreadat?: null;
    deletedat?: null;
  } = {
    conversationid: conversationId,
    userid: userId,
    joinedat: joinedAt
  };

  if (await supportsParticipantReadColumns()) {
    row.lastreadmessageid = null;
    row.lastreadat = null;
  }

  if (await supportsDeletedAtColumn()) {
    row.deletedat = null;
  }

  return row;
}

async function buildMessageInsertRow(input: {
  messageId: number;
  conversationId: number;
  senderId: number;
  content: string;
  mediaType: string | null;
  fileUrl: string | null;
  replyTo: number | null;
  createdAt: string;
}) {
  const row: {
    messageid: number;
    conversationid: number;
    senderid: number;
    content: string;
    mediatype: string | null;
    fileurl: string | null;
    replyto: number | null;
    createdat: string;
    recalledat?: null;
    recalledby?: null;
  } = {
    messageid: input.messageId,
    conversationid: input.conversationId,
    senderid: input.senderId,
    content: input.content,
    mediatype: input.mediaType,
    fileurl: input.fileUrl,
    replyto: input.replyTo,
    createdat: input.createdAt
  };

  if (await supportsMessageRecallColumns()) {
    row.recalledat = null;
    row.recalledby = null;
  }

  return row;
}

async function restoreConversationParticipants(conversationId: number) {
  const { error } = await restoreDeletedParticipantsForConversation(conversationId);

  if (error) {
    throw new Error(`恢复会话显示失败：${error.message}`);
  }
}

async function touchConversation(conversationId: number, updatedAt: string) {
  const { error } = await supabaseAdmin
    .from('conversations')
    .update({ updatedat: updatedAt })
    .eq('conversationid', conversationId);

  if (error) {
    throw new Error(`刷新会话时间失败：${error.message}`);
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

function mapConversationMessage(
  row: ConversationMessageRow,
  rowMap: Map<number, ConversationMessageRow>,
  userMap: Map<number, UserRow>,
  currentUserId: number
): ConversationMessage {
  const sender = userMap.get(row.senderid ?? -1);
  const replyRow = row.replyto ? rowMap.get(row.replyto) : undefined;
  const replySender = replyRow?.senderid ? userMap.get(replyRow.senderid) : undefined;
  const isRecalled = Boolean(row.recalledat);

  return {
    id: row.messageid,
    conversationId: row.conversationid ?? 0,
    senderId: row.senderid ?? 0,
    senderName: resolveUserName(sender, row.senderid ?? 0),
    isSelf: row.senderid === currentUserId,
    text: isRecalled ? '' : row.content?.trim() || '',
    imageUrl: !isRecalled && row.fileurl ? getPublicFileUrl(row.fileurl) : undefined,
    createdAt: row.createdat || new Date().toISOString(),
    isRecalled,
    recalledAt: row.recalledat || undefined,
    replyTo: replyRow
      ? {
          id: replyRow.messageid,
          senderName: resolveUserName(replySender, replyRow.senderid ?? 0),
          text: replyRow.recalledat ? '这条消息已撤回' : replyRow.content?.trim() || '',
          imageUrl: !replyRow.recalledat && replyRow.fileurl ? getPublicFileUrl(replyRow.fileurl) : undefined,
          isRecalled: Boolean(replyRow.recalledat)
        }
      : undefined
  };
}

async function findDirectConversationByKey(directKey: string) {
  return supabaseAdmin
    .from('conversations')
    .select('conversationid')
    .eq('directkey', directKey)
    .maybeSingle();
}

function isDirectConversationConflictError(error: { code?: string | null; message?: string | null }) {
  return error.code === '23505' || /conversations_directkey_unique|duplicate key value/i.test(error.message ?? '');
}

function buildDirectKey(leftUserId: number, rightUserId: number) {
  const [smaller, larger] = [leftUserId, rightUserId].sort((left, right) => left - right);
  return `direct:${smaller}:${larger}`;
}

function buildMessageSnippet(message: ConversationMessageRow) {
  if (message.recalledat) {
    return '已撤回';
  }

  const text = message.content?.trim();
  if (text) {
    return text.length > 42 ? `${text.slice(0, 42)}…` : text;
  }

  if (message.fileurl) {
    return '[图片]';
  }

  return '新消息';
}

function resolveUserName(user: UserRow | undefined, userId: number) {
  return user?.nickname?.trim() || user?.account?.split('@')[0] || `用户${userId}`;
}

function resolveFileExtension(file: File) {
  const match = file.name.match(/(\.[a-zA-Z0-9]+)$/);
  if (match) {
    return match[1].toLowerCase();
  }

  if (file.type === 'image/png') {
    return '.png';
  }

  if (file.type === 'image/webp') {
    return '.webp';
  }

  return '.jpg';
}

function validateMessageImage(file: File) {
  if (!file.type.startsWith('image/')) {
    throw new Error('目前私聊仅支持发送图片。');
  }

  if (file.size > MESSAGE_IMAGE_LIMIT) {
    throw new Error('图片不能超过 8MB。');
  }
}

function getPublicFileUrl(fileUrl: string) {
  return supabaseAdmin.storage.from(STORAGE_BUCKET).getPublicUrl(fileUrl).data.publicUrl;
}

function pickPrimaryAttachment(items: AttachmentRecord[] | null | undefined) {
  return (items ?? [])
    .filter((item) => item.fileurl)
    .sort((left, right) => {
      const leftOrder = left.sortorder ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = right.sortorder ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    })[0];
}

function uniqueNumbers(values: Array<number | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value))
    )
  );
}

function isArtistRole(value: string | null | undefined) {
  return value?.trim().toLowerCase() === 'artist';
}

function isMissingDeletedAtError(message: string | undefined) {
  return typeof message === 'string' && /conversationparticipants\.deletedat/.test(message);
}

function isMissingParticipantReadColumnError(message: string | undefined) {
  return (
    typeof message === 'string' &&
    /conversationparticipants\.(lastreadmessageid|lastreadat)/.test(message)
  );
}

function isMissingMessageRecallColumnError(message: string | undefined) {
  return (
    typeof message === 'string' &&
    /conversationmessages\.(recalledat|recalledby)/.test(message)
  );
}
