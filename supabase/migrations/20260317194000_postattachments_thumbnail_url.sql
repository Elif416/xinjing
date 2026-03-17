alter table if exists public.postattachments
  add column if not exists thumbnailurl text;

create index if not exists postattachments_thumbnail_missing_idx
  on public.postattachments (attachmentid)
  where mediatype = 'image' and thumbnailurl is null;
