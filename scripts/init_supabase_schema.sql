-- xinjing full schema (from Access)

create table if not exists public.users (
  userid integer primary key,
  account text,
  passwordhash text,
  nickname text,
  userrole text,
  createdat timestamp
);

create table if not exists public.worldbooks (
  worldid integer primary key,
  worldname text,
  settinglore text,
  rules text
);

create table if not exists public.charactercards (
  cardid integer primary key,
  charname text,
  personality text,
  appearance text,
  dialoguestyle text
);

create table if not exists public.artists (
  artistid integer primary key references public.users(userid) on delete cascade,
  intro text,
  keywords text,
  startingprice numeric(12,2),
  completedorders integer,
  rating double precision,
  activitylevel integer
);

create table if not exists public.posts (
  postid integer primary key,
  authorid integer references public.users(userid) on delete set null,
  posttype text,
  title text,
  content text,
  favoritecount integer,
  createdat timestamp
);

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

create table if not exists public.postattachments (
  attachmentid integer primary key,
  postid integer references public.posts(postid) on delete cascade,
  mediatype text,
  fileurl text,
  sortorder integer
);

create table if not exists public.postcomments (
  commentid integer primary key,
  postid integer references public.posts(postid) on delete cascade,
  userid integer references public.users(userid) on delete set null,
  content text,
  createdat timestamp
);

create table if not exists public.userfavorites (
  userid integer references public.users(userid) on delete cascade,
  postid integer references public.posts(postid) on delete cascade,
  createdat timestamp,
  primary key (userid, postid)
);

create table if not exists public.userfollows (
  followerid integer references public.users(userid) on delete cascade,
  followeeid integer references public.users(userid) on delete cascade,
  createdat timestamp,
  primary key (followerid, followeeid)
);

create table if not exists public.products (
  productid integer primary key,
  merchantid integer references public.users(userid) on delete set null,
  productname text,
  description text,
  price numeric(12,2),
  stock integer
);

create table if not exists public.commissionplans (
  planid integer primary key,
  artistid integer references public.users(userid) on delete set null,
  title text,
  description text,
  price numeric(12,2),
  salesvolume integer
);

create table if not exists public.orders (
  orderid integer primary key,
  buyerid integer references public.users(userid) on delete set null,
  sellerid integer references public.users(userid) on delete set null,
  ordertype text,
  planid integer references public.commissionplans(planid) on delete set null,
  productid integer references public.products(productid) on delete set null,
  totalamount numeric(12,2),
  orderstatus text,
  createdat timestamp
);

create table if not exists public.agents (
  agentid integer primary key,
  creatorid integer references public.users(userid) on delete set null,
  agentname text,
  systemprompt text,
  temperature double precision,
  modeltype text,
  avatarurl text,
  worldid integer references public.worldbooks(worldid) on delete set null,
  cardid integer references public.charactercards(cardid) on delete set null
);

create table if not exists public.chatlogs (
  logid integer primary key,
  agentid integer references public.agents(agentid) on delete set null,
  userid integer references public.users(userid) on delete set null,
  userinput text,
  airesponse text,
  logtimestamp timestamp
);
