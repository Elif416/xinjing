import json
import os
import re
from datetime import datetime
from pathlib import Path

import psycopg2
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / '.env.local')

DB_URL = os.getenv('SUPABASE_DB_URL', '').strip()
API_KEY = os.getenv('DEEPSEEK_API_KEY', '').strip()
BASE_URL = os.getenv('DEEPSEEK_BASE_URL', 'https://api.deepseek.com').strip().rstrip('/')
MODEL = os.getenv('DEEPSEEK_MODEL', 'deepseek-chat').strip()

if not DB_URL:
    raise RuntimeError('Missing SUPABASE_DB_URL')
if not API_KEY:
    raise RuntimeError('Missing DEEPSEEK_API_KEY')

BANNED = [
    '淫荡','色气','乳','尻','巨乳','美乳','露出','性爱','性欲','下着','内裤','胸','屁股',
    'エロ','セックス','おっぱい','尻','乳首','パンツ','下着'
]

BANNED_RE = re.compile('|'.join(re.escape(w) for w in sorted(BANNED, key=len, reverse=True)), re.IGNORECASE)
KATAKANA_RE = re.compile(r'[\u30A0-\u30FF]')
JAPANESE_RE = re.compile(r'[\u3040-\u30FF\u4E00-\u9FFF]')


def clean_text(s: str) -> str:
    if s is None:
        return ''
    s = BANNED_RE.sub('', s)
    s = re.sub(r'\s{2,}', ' ', s)
    s = re.sub(r'[、,]{2,}', '，', s)
    s = re.sub(r'[。\.]{2,}', '。', s)
    s = s.strip(' ,，。;；/|')
    return s


def call_llm(batch):
    system = (
        '你是文本清洗与翻译助手。把日文翻译为中文；若片假名/专有词不自然，则翻译为英文。'
        '删除所有带性暗示或性相关词语。只返回JSON数组，不要解释。'
    )
    user = {
        'task': 'translate_and_sanitize',
        'rules': [
            '字段: nickname, keywords, intro',
            '尽量保留原意，简洁自然',
            '删除性暗示词，不要替换为同义词',
            '输出与输入同样数量与artistid'
        ],
        'items': batch
    }
    r = requests.post(
        f'{BASE_URL}/chat/completions',
        headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'},
        json={
            'model': MODEL,
            'temperature': 0.2,
            'messages': [
                {'role': 'system', 'content': system},
                {'role': 'user', 'content': json.dumps(user, ensure_ascii=False)}
            ],
            'response_format': {'type': 'json_object'}
        },
        timeout=120,
    )
    r.raise_for_status()
    content = r.json()['choices'][0]['message']['content']
    data = json.loads(content)
    if isinstance(data, dict) and 'items' in data:
        return data['items']
    if isinstance(data, list):
        return data
    raise ValueError(f'Unexpected LLM output: {content[:300]}')


def fallback_translate_for_katakana(items):
    # If still mostly katakana after translation, ask for English fallback.
    need = []
    for it in items:
        combined = ' '.join([(it.get('nickname') or ''), (it.get('keywords') or ''), (it.get('intro') or '')])
        if combined and len(KATAKANA_RE.findall(combined)) >= 3:
            need.append(it)
    if not need:
        return items

    system = '将以下文本改写为自然英文并删除性暗示词。仅返回JSON数组。'
    r = requests.post(
        f'{BASE_URL}/chat/completions',
        headers={'Authorization': f'Bearer {API_KEY}', 'Content-Type': 'application/json'},
        json={
            'model': MODEL,
            'temperature': 0.2,
            'messages': [
                {'role': 'system', 'content': system},
                {'role': 'user', 'content': json.dumps({'items': need}, ensure_ascii=False)}
            ],
            'response_format': {'type': 'json_object'}
        },
        timeout=120,
    )
    r.raise_for_status()
    content = r.json()['choices'][0]['message']['content']
    data = json.loads(content)
    repl = data['items'] if isinstance(data, dict) and 'items' in data else data
    repl_map = {x['artistid']: x for x in repl if 'artistid' in x}
    out = []
    for it in items:
        out.append(repl_map.get(it['artistid'], it))
    return out


def main():
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    with psycopg2.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            cur.execute('''
                create table if not exists artists_text_backup (
                  backup_ts text not null,
                  artistid integer not null,
                  nickname text,
                  keywords text,
                  intro text,
                  primary key (backup_ts, artistid)
                );
            ''')
            cur.execute('''
                select a.artistid, coalesce(u.nickname,''), coalesce(a.keywords,''), coalesce(a.intro,'')
                from artists a
                join users u on u.userid = a.artistid
                order by a.artistid
            ''')
            rows = cur.fetchall()

            cur.executemany(
                'insert into artists_text_backup(backup_ts, artistid, nickname, keywords, intro) values (%s,%s,%s,%s,%s)',
                [(ts, r[0], r[1], r[2], r[3]) for r in rows]
            )
            conn.commit()

            print(f'backup_ts={ts}, total={len(rows)}')

            batch_size = 20
            updates = []
            for i in range(0, len(rows), batch_size):
                batch_rows = rows[i:i+batch_size]
                batch = [
                    {
                        'artistid': r[0],
                        'nickname': r[1],
                        'keywords': r[2],
                        'intro': r[3],
                    }
                    for r in batch_rows
                ]
                translated = call_llm(batch)
                translated = fallback_translate_for_katakana(translated)
                by_id = {x['artistid']: x for x in translated if 'artistid' in x}

                for r in batch_rows:
                    artistid = r[0]
                    x = by_id.get(artistid, {})
                    nn = clean_text((x.get('nickname') or r[1] or '').strip())
                    kw = clean_text((x.get('keywords') or r[2] or '').strip())
                    intro = clean_text((x.get('intro') or r[3] or '').strip())
                    updates.append((nn, kw, intro, artistid, artistid))

                print(f'processed {min(i+batch_size, len(rows))}/{len(rows)}')

            # apply updates to users/artists
            cur.executemany('update users set nickname=%s where userid=%s', [(u[0], u[3]) for u in updates])
            cur.executemany('update artists set keywords=%s, intro=%s where artistid=%s', [(u[1], u[2], u[4]) for u in updates])
            conn.commit()

            print('DONE updated=', len(updates))
            print('backup_ts=', ts)


if __name__ == '__main__':
    main()
