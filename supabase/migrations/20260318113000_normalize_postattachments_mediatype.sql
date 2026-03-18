update public.postattachments
set mediatype = lower(mediatype)
where mediatype is not null
  and mediatype <> lower(mediatype);

drop index if exists public.postattachments_thumbnail_missing_idx;

create index if not exists postattachments_thumbnail_missing_idx
  on public.postattachments (attachmentid)
  where lower(coalesce(mediatype, '')) = 'image' and thumbnailurl is null;
