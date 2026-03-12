create table if not exists public.resonanceposts (
  postid integer primary key,
  userid integer references public.users(userid) on delete set null,
  title text,
  content text,
  address text,
  township text,
  lng double precision,
  lat double precision,
  createdat timestamp
);
