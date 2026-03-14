create table if not exists public.conversations (
  conversationid integer primary key,
  conversationtype text,
  title text,
  directkey text,
  createdby integer references public.users(userid) on delete set null,
  createdat timestamp,
  updatedat timestamp
);

create unique index if not exists conversations_directkey_unique
  on public.conversations(directkey)
  where directkey is not null;

create table if not exists public.conversationparticipants (
  conversationid integer references public.conversations(conversationid) on delete cascade,
  userid integer references public.users(userid) on delete cascade,
  joinedat timestamp,
  primary key (conversationid, userid)
);

create index if not exists conversationparticipants_userid_idx
  on public.conversationparticipants(userid);

create table if not exists public.conversationmessages (
  messageid integer primary key,
  conversationid integer references public.conversations(conversationid) on delete cascade,
  senderid integer references public.users(userid) on delete set null,
  content text,
  mediatype text,
  fileurl text,
  replyto integer references public.conversationmessages(messageid) on delete set null,
  createdat timestamp
);

create index if not exists conversationmessages_conversationid_createdat_idx
  on public.conversationmessages(conversationid, createdat desc);
