import mimetypes
import os
import time
from pathlib import Path

import requests
from dotenv import load_dotenv
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / '.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '').strip().rstrip('/')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip()
BUCKET = os.getenv('SUPABASE_STORAGE_BUCKET', 'pixiv-images').strip()
ROOT = Path(os.getenv('PIXIV_IMAGES_PATH', r'E:\accessDB\pixiv_images'))

if not SUPABASE_URL or not SERVICE_KEY:
    raise RuntimeError('Missing Supabase URL or service key')
if not ROOT.exists():
    raise RuntimeError(f'Images folder not found: {ROOT}')

headers = {
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
}

session = requests.Session()
retry = Retry(
    total=5,
    connect=5,
    read=5,
    backoff_factor=1.2,
    status_forcelist=[429, 500, 502, 503, 504],
    allowed_methods=False,
)
session.mount('https://', HTTPAdapter(max_retries=retry))

# ensure bucket
r = session.get(f'{SUPABASE_URL}/storage/v1/bucket', headers=headers, timeout=30)
r.raise_for_status()
if not any(b.get('id') == BUCKET for b in r.json()):
    c = session.post(
        f'{SUPABASE_URL}/storage/v1/bucket',
        headers={**headers, 'Content-Type': 'application/json'},
        json={'id': BUCKET, 'name': BUCKET, 'public': True},
        timeout=30,
    )
    c.raise_for_status()

uploaded = 0
failed = []

for p in ROOT.rglob('*'):
    if not p.is_file():
        continue

    rel = p.relative_to(ROOT).as_posix()
    object_path = f'pixiv_images/{rel}'
    mime = mimetypes.guess_type(str(p))[0] or 'application/octet-stream'

    ok = False
    for attempt in range(1, 6):
        try:
            with open(p, 'rb') as f:
                u = session.post(
                    f'{SUPABASE_URL}/storage/v1/object/{BUCKET}/{object_path}',
                    headers={**headers, 'x-upsert': 'true', 'Content-Type': mime},
                    data=f,
                    timeout=120,
                )
            u.raise_for_status()
            ok = True
            break
        except Exception as e:
            if attempt == 5:
                failed.append((object_path, str(e)))
            else:
                time.sleep(1.5 * attempt)

    if ok:
        uploaded += 1
        if uploaded % 100 == 0:
            print('uploaded', uploaded, flush=True)

print('DONE uploaded=', uploaded, 'failed=', len(failed))
if failed:
    fail_log = Path(__file__).resolve().parents[1] / 'upload_failures.log'
    with open(fail_log, 'w', encoding='utf-8') as fw:
        for path, err in failed:
            fw.write(f'{path}\t{err}\n')
    print('failure_log=', str(fail_log))
