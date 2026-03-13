create table if not exists public.resonanceposts (
  postid integer primary key,
  userid integer references public.users(userid) on delete set null,
  title text,
  content text,
  address text,
  township text,
  lng double precision,
  lat double precision,
  visibility text,
  createdat timestamp
);

create table if not exists public.resonancepostattachments (
  attachmentid integer primary key,
  postid integer references public.resonanceposts(postid) on delete cascade,
  mediatype text,
  fileurl text,
  sortorder integer,
  createdat timestamp
);

create table if not exists public.resonancepostcomments (
  commentid integer primary key,
  postid integer references public.resonanceposts(postid) on delete cascade,
  userid integer references public.users(userid) on delete set null,
  content text,
  createdat timestamp
);

create table if not exists public.resonancepostfavorites (
  userid integer references public.users(userid) on delete cascade,
  postid integer references public.resonanceposts(postid) on delete cascade,
  createdat timestamp,
  primary key (userid, postid)
);
