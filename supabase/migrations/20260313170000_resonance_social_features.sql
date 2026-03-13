alter table public.resonanceposts
  add column if not exists visibility text not null default 'public';

update public.resonanceposts
set visibility = 'public'
where visibility is null
   or visibility not in ('public', 'private');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'resonanceposts_visibility_check'
  ) then
    alter table public.resonanceposts
      add constraint resonanceposts_visibility_check
      check (visibility in ('public', 'private'));
  end if;
end $$;

create table if not exists public.resonancepostattachments (
  attachmentid integer primary key,
  postid integer not null references public.resonanceposts(postid) on delete cascade,
  mediatype text not null,
  fileurl text not null,
  sortorder integer not null default 0,
  createdat timestamp default now()
);

create table if not exists public.resonancepostcomments (
  commentid integer primary key,
  postid integer not null references public.resonanceposts(postid) on delete cascade,
  userid integer references public.users(userid) on delete set null,
  content text not null,
  createdat timestamp default now()
);

create table if not exists public.resonancepostfavorites (
  userid integer not null references public.users(userid) on delete cascade,
  postid integer not null references public.resonanceposts(postid) on delete cascade,
  createdat timestamp default now(),
  primary key (userid, postid)
);

create index if not exists resonanceposts_visibility_createdat_idx
  on public.resonanceposts (visibility, createdat desc);

create index if not exists resonancepostattachments_postid_idx
  on public.resonancepostattachments (postid, sortorder);

create index if not exists resonancepostcomments_postid_createdat_idx
  on public.resonancepostcomments (postid, createdat asc);

create index if not exists resonancepostfavorites_postid_idx
  on public.resonancepostfavorites (postid);
