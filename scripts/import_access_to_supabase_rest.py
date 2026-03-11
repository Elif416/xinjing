import json
import os
from datetime import datetime, date
from decimal import Decimal
from pathlib import Path

import pyodbc
import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / '.env.local')

BASE = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '').strip().rstrip('/')
KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip()
ACCESS_DB = os.getenv('ACCESS_DB_PATH', r'E:\accessDB\xinjingDB.accdb')

if not BASE or not KEY:
    raise RuntimeError('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')

HEADERS = {
    'apikey': KEY,
    'Authorization': f'Bearer {KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal,resolution=merge-duplicates',
}

session = requests.Session()
session.mount(
    'https://',
    HTTPAdapter(
        max_retries=Retry(
            total=5,
            connect=5,
            read=5,
            backoff_factor=1.2,
            status_forcelist=[429, 500, 502, 503, 504],
            allowed_methods=False,
        )
    ),
)

TABLES = [
    # restful_table, pk_for_delete, access_table
    ('users', 'userid', 'Users'),
    ('worldbooks', 'worldid', 'WorldBooks'),
    ('charactercards', 'cardid', 'CharacterCards'),
    ('artists', 'artistid', 'Artists'),
    ('products', 'productid', 'Products'),
    ('commissionplans', 'planid', 'CommissionPlans'),
    ('posts', 'postid', 'Posts'),
    ('agents', 'agentid', 'Agents'),
    ('orders', 'orderid', 'Orders'),
    ('postattachments', 'attachmentid', 'PostAttachments'),
    ('postcomments', 'commentid', 'PostComments'),
    ('userfavorites', 'userid', 'UserFavorites'),
    ('userfollows', 'followerid', 'UserFollows'),
    ('chatlogs', 'logid', 'ChatLogs'),
]

DELETE_ORDER = [
    ('chatlogs', 'logid'),
    ('userfollows', 'followerid'),
    ('userfavorites', 'userid'),
    ('postcomments', 'commentid'),
    ('postattachments', 'attachmentid'),
    ('orders', 'orderid'),
    ('agents', 'agentid'),
    ('posts', 'postid'),
    ('commissionplans', 'planid'),
    ('products', 'productid'),
    ('artists', 'artistid'),
    ('charactercards', 'cardid'),
    ('worldbooks', 'worldid'),
    ('users', 'userid'),
]


def to_jsonable(v):
    if v is None:
        return None
    if isinstance(v, (datetime, date)):
        return v.isoformat(sep=' ')
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, bytes):
        return v.decode('utf-8', errors='ignore')
    return v


def fetch_table(table):
    conn = pyodbc.connect(r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};' + f'DBQ={ACCESS_DB};')
    cur = conn.cursor()
    cur.execute(f'SELECT * FROM [{table}]')
    cols = [c[0].lower() for c in cur.description]
    rows = [dict(zip(cols, [to_jsonable(x) for x in row])) for row in cur.fetchall()]
    conn.close()
    return rows


def ensure_table_exists(table):
    r = session.get(f'{BASE}/rest/v1/{table}?select=*&limit=1', headers={k: v for k, v in HEADERS.items() if k != 'Prefer'}, timeout=30)
    if r.status_code == 404:
        raise RuntimeError(f"Table '{table}' not found. Run scripts/init_supabase_schema.sql in Supabase SQL Editor first.")
    r.raise_for_status()


def clear_table(table, pk):
    r = session.delete(f'{BASE}/rest/v1/{table}?{pk}=gte.0', headers=HEADERS, timeout=120)
    r.raise_for_status()


def upsert_batch(table, rows):
    if not rows:
        return
    r = session.post(f'{BASE}/rest/v1/{table}', headers=HEADERS, data=json.dumps(rows, ensure_ascii=False), timeout=120)
    r.raise_for_status()


def upsert_chunks(table, rows, chunk_size=200):
    total = len(rows)
    for i in range(0, total, chunk_size):
        chunk = rows[i:i + chunk_size]
        upsert_batch(table, chunk)
        print(f'{table}: {min(i + chunk_size, total)}/{total}', flush=True)


def main():
    for table, _, _ in TABLES:
        ensure_table_exists(table)

    data = {}
    for _, _, access_name in TABLES:
        rows = fetch_table(access_name)
        data[access_name] = rows
        print(f'loaded {access_name}: {len(rows)}')

    for table, pk in DELETE_ORDER:
        clear_table(table, pk)
        print(f'cleared {table}')

    for table, _, access_name in TABLES:
        upsert_chunks(table, data[access_name])

    print('DONE')
    for _, _, access_name in TABLES:
        print(access_name, len(data[access_name]))


if __name__ == '__main__':
    main()
