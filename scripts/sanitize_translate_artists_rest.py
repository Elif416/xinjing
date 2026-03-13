import json
import os
import re
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / '.env.local')

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL', '').strip().rstrip('/')
SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '').strip()
API_KEY = os.getenv('DEEPSEEK_API_KEY', '').strip()
BASE_URL = os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com').strip().rstrip('/')
MODEL = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat').strip()

if not SUPABASE_URL or not SERVICE_KEY:
    raise RuntimeError('Missing Supabase URL or service key')
if not API_KEY:
    raise RuntimeError('Missing DEEPSEEK_API_KEY')

BANNED = [
    '淫荡','色气','乳','尻','巨乳','美乳','露出','性爱','性欲','下着','内裤','胸','屁股',
    'エロ','セックス','おっぱい','尻','乳首','パンツ','下着'
]
BANNED_RE = re.compile('|'.join(re.escape(w) for w in sorted(BANNED, key=len, reverse=True)), re.IGNORECASE)
KATAKANA_RE = re.compile(r'[\u30A0-\u30FF]')

s = requests.Session()
s.headers.update({
    'apikey': SERVICE_KEY,
    'Authorization': f'Bearer {SERVICE_KEY}',
})


def clean_text(v: str) -> str:
    v = v or ''
    v = BANNED_RE.sub('', v)
    v = re.sub(r'\s{2,}', ' ', v).strip(' ,，。;；/|')
    return v


def list_artists_with_user(page_size=1000):
    url = f"{SUPABASE_URL}/rest/v1/artists"
    params = {
        'select': 'artistid,keywords,intro,users!inner(userid,nickname)',
        'order': 'artistid.asc',
        'limit': str(page_size),
    }
    r = s.get(url, params=params, timeout=60)
    r.raise_for_status()
    return r.json()


def call_llm(batch):
    system = (
        '你是文本清洗与翻译助手。把日文翻译为中文；若片假名/专有词不自然，则翻译为英文。'
        '删除所有带性暗示或性相关词语。只返回JSON对象，结构为{"items":[...]}。'
    )
    payload = {
        'task': 'translate_and_sanitize',
        'items': batch,
    }
    r = requests.post(
        f'{BASE_URL}/chat/completions',
        headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'},
        json={
            'model': MODEL,
            'temperature': 0.2,
            'messages': [
                {'role': 'system', 'content': system},
                {'role': 'user', 'content': json.dumps(payload, ensure_ascii=False)}
            ],
            'response_format': {'type': 'json_object'}
        },
        timeout=120,
    )
    r.raise_for_status()
    content = r.json()['choices'][0]['message']['content']
    obj = json.loads(content)
    items = obj['items'] if isinstance(obj, dict) and 'items' in obj else obj
    if not isinstance(items, list):
        raise ValueError('bad llm output')
    return items


def fallback_english(items):
    need = []
    for it in items:
        txt = ' '.join([it.get('nickname',''), it.get('keywords',''), it.get('intro','')])
        if len(KATAKANA_RE.findall(txt)) >= 3:
            need.append(it)
    if not need:
        return items
    r = requests.post(
        f'{BASE_URL}/chat/completions',
        headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'},
        json={
            'model': MODEL,
            'temperature': 0.2,
            'messages': [
                {'role': 'system', 'content': '将输入中的nickname/keywords/intro改写为自然英文并删除性暗示词，仅返回{"items":[...]} JSON。'},
                {'role': 'user', 'content': json.dumps({'items': need}, ensure_ascii=False)}
            ],
            'response_format': {'type': 'json_object'}
        },
        timeout=120,
    )
    r.raise_for_status()
    obj = json.loads(r.json()['choices'][0]['message']['content'])
    repl = obj['items'] if isinstance(obj, dict) and 'items' in obj else obj
    repl_map = {x['artistid']: x for x in repl if 'artistid' in x}
    out = []
    for it in items:
        out.append(repl_map.get(it['artistid'], it))
    return out


def patch_user(userid: int, nickname: str):
    r = s.patch(
        f'{SUPABASE_URL}/rest/v1/users',
        params={'userid': f'eq.{userid}'},
        headers={'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
        data=json.dumps({'nickname': nickname}, ensure_ascii=False).encode('utf-8'),
        timeout=30,
    )
    r.raise_for_status()


def patch_artist(artistid: int, keywords: str, intro: str):
    r = s.patch(
        f'{SUPABASE_URL}/rest/v1/artists',
        params={'artistid': f'eq.{artistid}'},
        headers={'Content-Type': 'application/json', 'Prefer': 'return=minimal'},
        data=json.dumps({'keywords': keywords, 'intro': intro}, ensure_ascii=False).encode('utf-8'),
        timeout=30,
    )
    r.raise_for_status()


def main():
    rows = list_artists_with_user()
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = Path(__file__).resolve().parents[1] / f'artist_text_backup_{ts}.json'
    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(rows, f, ensure_ascii=False, indent=2)
    print('backup_file=', backup_path)

    batch_size = 20
    updates = []
    for i in range(0, len(rows), batch_size):
        part = rows[i:i+batch_size]
        batch = []
        for r in part:
            u = (r.get('users') or {})
            batch.append({
                'artistid': r['artistid'],
                'nickname': u.get('nickname') or '',
                'keywords': r.get('keywords') or '',
                'intro': r.get('intro') or '',
            })
        trans = call_llm(batch)
        trans = fallback_english(trans)
        tmap = {x['artistid']: x for x in trans if 'artistid' in x}
        for b in batch:
            x = tmap.get(b['artistid'], b)
            updates.append({
                'artistid': b['artistid'],
                'nickname': clean_text(x.get('nickname', b['nickname'])),
                'keywords': clean_text(x.get('keywords', b['keywords'])),
                'intro': clean_text(x.get('intro', b['intro'])),
            })
        print(f'processed {min(i+batch_size, len(rows))}/{len(rows)}')

    for u in updates:
        patch_user(u['artistid'], u['nickname'])
        patch_artist(u['artistid'], u['keywords'], u['intro'])

    print('DONE updated=', len(updates))


if __name__ == '__main__':
    main()
