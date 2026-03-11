import mimetypes
import os
from pathlib import Path

import psycopg2
import pyodbc
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / '.env.local')

SUPABASE_DB_URL = os.getenv('SUPABASE_DB_URL', '').strip()
SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '').strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip()
SUPABASE_STORAGE_BUCKET = os.getenv('SUPABASE_STORAGE_BUCKET', 'pixiv-images').strip()
ACCESS_DB_PATH = os.getenv('ACCESS_DB_PATH', r'E:\accessDB\xinjingDB.accdb').strip()
PIXIV_IMAGES_PATH = os.getenv('PIXIV_IMAGES_PATH', r'E:\accessDB\pixiv_images').strip()


def must(v: str, name: str):
    if not v:
        raise RuntimeError(f'Missing required env: {name}')


def access_conn(db_path: str):
    return pyodbc.connect(
        r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};'
        + f'DBQ={db_path};'
    )


def pg_conn(db_url: str):
    return psycopg2.connect(db_url)


def fetch_access_rows(cur, table: str):
    cur.execute(f'SELECT * FROM [{table}]')
    cols = [d[0] for d in cur.description]
    rows = cur.fetchall()
    return cols, rows


def ensure_schema(pg):
    sql = """
    create table if not exists users (
      userid integer primary key,
      account text unique,
      passwordhash text,
      nickname text,
      userrole text,
      createdat timestamp
    );

    create table if not exists artists (
      artistid integer primary key references users(userid) on delete cascade,
      intro text,
      keywords text,
      startingprice numeric(10,2),
      completedorders integer,
      rating numeric(3,2),
      activitylevel integer
    );

    create table if not exists posts (
      postid integer primary key,
      authorid integer references users(userid) on delete cascade,
      posttype text,
      title text,
      content text,
      favoritecount integer,
      createdat timestamp
    );

    create table if not exists post_attachments (
      attachmentid integer primary key,
      postid integer references posts(postid) on delete cascade,
      mediatype text,
      fileurl text,
      sortorder integer
    );
    """
    with pg.cursor() as c:
        c.execute(sql)
    pg.commit()


def truncate_all(pg):
    with pg.cursor() as c:
        c.execute('truncate table post_attachments, posts, artists, users restart identity cascade;')
    pg.commit()


def insert_users(pg, rows):
    with pg.cursor() as c:
        c.executemany(
            'insert into users(userid,account,passwordhash,nickname,userrole,createdat) values (%s,%s,%s,%s,%s,%s)',
            rows,
        )
    pg.commit()


def insert_artists(pg, rows):
    with pg.cursor() as c:
        c.executemany(
            'insert into artists(artistid,intro,keywords,startingprice,completedorders,rating,activitylevel) values (%s,%s,%s,%s,%s,%s,%s)',
            rows,
        )
    pg.commit()


def insert_posts(pg, rows):
    with pg.cursor() as c:
        c.executemany(
            'insert into posts(postid,authorid,posttype,title,content,favoritecount,createdat) values (%s,%s,%s,%s,%s,%s,%s)',
            rows,
        )
    pg.commit()


def insert_attachments(pg, rows):
    with pg.cursor() as c:
        c.executemany(
            'insert into post_attachments(attachmentid,postid,mediatype,fileurl,sortorder) values (%s,%s,%s,%s,%s)',
            rows,
        )
    pg.commit()


def storage_headers():
    return {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_ROLE_KEY}',
    }


def ensure_bucket():
    base = SUPABASE_URL.rstrip('/')
    r = requests.get(f'{base}/storage/v1/bucket', headers=storage_headers(), timeout=30)
    r.raise_for_status()
    items = r.json()
    exists = any(b.get('id') == SUPABASE_STORAGE_BUCKET for b in items)
    if exists:
        return
    payload = {'id': SUPABASE_STORAGE_BUCKET, 'name': SUPABASE_STORAGE_BUCKET, 'public': True}
    r = requests.post(f'{base}/storage/v1/bucket', headers={**storage_headers(), 'Content-Type': 'application/json'}, json=payload, timeout=30)
    r.raise_for_status()


def upload_images(root: Path):
    base = SUPABASE_URL.rstrip('/')
    total = 0
    for p in root.rglob('*'):
        if not p.is_file():
            continue
        rel = p.relative_to(root).as_posix()
        object_path = f'pixiv_images/{rel}'
        mime = mimetypes.guess_type(str(p))[0] or 'application/octet-stream'
        with open(p, 'rb') as f:
            r = requests.post(
                f'{base}/storage/v1/object/{SUPABASE_STORAGE_BUCKET}/{object_path}',
                headers={**storage_headers(), 'Content-Type': mime, 'x-upsert': 'true'},
                data=f,
                timeout=120,
            )
        r.raise_for_status()
        total += 1
        if total % 100 == 0:
            print(f'uploaded {total} files...')
    return total


def normalize_rows(rows):
    out = []
    for row in rows:
        out.append(tuple(None if (v == '') else v for v in row))
    return out


def main():
    must(SUPABASE_DB_URL, 'SUPABASE_DB_URL')
    must(SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL')
    must(SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY')

    access = access_conn(ACCESS_DB_PATH)
    ac = access.cursor()

    _, users = fetch_access_rows(ac, 'Users')
    _, artists = fetch_access_rows(ac, 'Artists')
    _, posts = fetch_access_rows(ac, 'Posts')
    _, attachments = fetch_access_rows(ac, 'PostAttachments')

    access.close()

    pg = pg_conn(SUPABASE_DB_URL)
    ensure_schema(pg)
    truncate_all(pg)

    insert_users(pg, normalize_rows(users))
    insert_artists(pg, normalize_rows(artists))
    insert_posts(pg, normalize_rows(posts))
    insert_attachments(pg, normalize_rows(attachments))

    ensure_bucket()
    uploaded = upload_images(Path(PIXIV_IMAGES_PATH))

    pg.close()

    print('DONE')
    print(f'users={len(users)}, artists={len(artists)}, posts={len(posts)}, attachments={len(attachments)}')
    print(f'uploaded_images={uploaded}')
    print(f'bucket={SUPABASE_STORAGE_BUCKET}')


if __name__ == '__main__':
    main()
