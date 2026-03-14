alter table if exists public.conversationparticipants
  add column if not exists deletedat timestamp;
