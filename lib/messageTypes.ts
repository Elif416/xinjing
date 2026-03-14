export type ConversationCounterpart = {
  userId: number;
  name: string;
  role: string;
  avatarUrl?: string;
  isArtist: boolean;
};

export type ConversationSnippet = {
  text: string;
  createdAt: string;
  senderName: string;
  isSelf: boolean;
  isRecalled: boolean;
};

export type ConversationPreview = {
  id: number;
  title: string;
  updatedAt: string;
  counterpart: ConversationCounterpart;
  lastMessage: ConversationSnippet | null;
  unreadCount: number;
};

export type ConversationReplyReference = {
  id: number;
  senderName: string;
  text: string;
  imageUrl?: string;
  isRecalled: boolean;
};

export type ConversationMessage = {
  id: number;
  conversationId: number;
  senderId: number;
  senderName: string;
  isSelf: boolean;
  text: string;
  imageUrl?: string;
  createdAt: string;
  isRecalled: boolean;
  recalledAt?: string;
  replyTo?: ConversationReplyReference;
};

export type ConversationDetail = {
  id: number;
  title: string;
  updatedAt: string;
  currentUserId: number;
  counterpart: ConversationCounterpart;
  messages: ConversationMessage[];
};

export type ConversationsListPayload = {
  currentUserId: number;
  unreadTotal: number;
  items: ConversationPreview[];
};

export type MessagesUnreadPayload = {
  unreadTotal: number;
};

export type SendConversationMessageInput = {
  content?: string;
  replyToId?: number | null;
};
