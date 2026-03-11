import json
import os
import random
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

import pyodbc
import requests
from playwright.sync_api import sync_playwright

SRC_DB = Path(r"E:\accessDB\xinjingDB.accdb")
TS = datetime.now().strftime("%Y%m%d_%H%M%S")
OUT_DIR = Path(r"E:\accessDB") / f"xinjing_pixabay_{TS}"
OUT_DB = OUT_DIR / "xinjingDB.accdb"
IMG_DIR = OUT_DIR / "pixabay_images"
META_JSON = OUT_DIR / "pixabay_100.json"

SEARCH_URL = "https://pixabay.com/zh/illustrations/search/?order=ec"
CDP_URL = "http://127.0.0.1:18800"
TARGET_COUNT = 100


def ensure_dirs():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    IMG_DIR.mkdir(parents=True, exist_ok=True)


def copy_db():
    shutil.copy2(SRC_DB, OUT_DB)


def scrape_from_openclaw_browser():
    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP_URL)
        contexts = browser.contexts
        if not contexts:
            raise RuntimeError("No browser context found on CDP. Ensure OpenClaw browser is running.")
        ctx = contexts[0]
        page = None
        for pg in ctx.pages:
            if "pixabay.com/zh/illustrations/search" in pg.url:
                page = pg
                break
        if page is None:
            page = ctx.new_page()
            page.goto(SEARCH_URL, wait_until="domcontentloaded", timeout=120000)
            page.wait_for_timeout(8000)

        data = page.evaluate(
            """(targetCount) => {
              function findContainer(el){
                let p=el;
                for(let i=0;i<14 && p;i++){
                  if(p.querySelector && p.querySelector('a[href*="/zh/users/"]') && p.querySelector('img[alt]')) return p;
                  p=p.parentElement;
                }
                return el.parentElement;
              }
              const out=[];
              const seen=new Set();
              const edits=[...document.querySelectorAll('a[href*="canva.com/content-partner"]')];
              for(const a of edits){
                const u=new URL(a.href);
                const id=u.searchParams.get('external-id');
                const img=u.searchParams.get('image-url');
                if(!id || !img || seen.has(id)) continue;
                seen.add(id);
                const c=findContainer(a);
                const userA=c?.querySelector('a[href*="/zh/users/"]');
                const imgA=[...c.querySelectorAll('a[href]')].find(x=>x.href.includes('-'+id+'/'));
                const imgEl=c.querySelector('img[alt]');
                out.push({
                  id,
                  image_url: img,
                  author: (userA?.textContent || '').trim() || `artist_${id}`,
                  author_url: userA?.href || '',
                  tags: imgEl?.alt || '',
                  page_url: imgA?.href || ''
                });
                if(out.length>=targetCount) break;
              }
              return out;
            }""",
            TARGET_COUNT,
        )
        browser.close()

    if len(data) < TARGET_COUNT:
        raise RuntimeError(f"Only scraped {len(data)} records, need {TARGET_COUNT}.")
    return data[:TARGET_COUNT]


def _ext_from_url(url: str):
    p = urlparse(url).path.lower()
    if p.endswith('.png'):
        return '.png'
    if p.endswith('.webp'):
        return '.webp'
    return '.jpg'


def download_images(items):
    s = requests.Session()
    ok = 0
    for i, it in enumerate(items, 1):
        ext = _ext_from_url(it['image_url'])
        fn = f"pixabay_{it['id']}{ext}"
        rel = f"pixabay_images/{fn}"
        dst = IMG_DIR / fn

        r = s.get(it['image_url'], timeout=60)
        r.raise_for_status()
        dst.write_bytes(r.content)

        it['local_file'] = fn
        it['file_url'] = rel
        ok += 1
        if ok % 20 == 0:
            print(f"downloaded {ok}/{len(items)}")


def clear_and_insert_access(items):
    conn = pyodbc.connect(r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};' + f'DBQ={OUT_DB};')
    cur = conn.cursor()

    # 清理依赖顺序
    cur.execute('DELETE FROM [PostAttachments]')
    cur.execute('DELETE FROM [Posts]')
    cur.execute('DELETE FROM [Artists]')
    cur.execute('DELETE FROM [Users]')

    base_time = datetime(2026, 3, 1, 9, 0, 0)

    for idx, it in enumerate(items, 1):
        uid = idx
        post_id = idx
        att_id = idx

        author = (it.get('author') or f'artist_{it["id"]}').strip()
        account = f"pixabay_{it['id']}"
        nickname = author[:100]
        created_at = base_time + timedelta(minutes=idx)

        tags = (it.get('tags') or '').strip()
        if not tags:
            tags = '插画,无版权,创意'

        intro = f"来自 Pixabay 的免版税插画作者：{author}"
        title = f"Pixabay 插画 #{idx}"
        content = f"来源: {it.get('page_url') or SEARCH_URL}\n关键词: {tags}\n作者主页: {it.get('author_url') or 'N/A'}"

        cur.execute(
            'INSERT INTO [Users] ([UserID],[Account],[PasswordHash],[Nickname],[UserRole],[CreatedAt]) VALUES (?,?,?,?,?,?)',
            uid, account[:50], 'pixabay_migrated', nickname, 'artist', created_at,
        )

        cur.execute(
            'INSERT INTO [Artists] ([ArtistID],[Intro],[Keywords],[StartingPrice],[CompletedOrders],[Rating],[ActivityLevel]) VALUES (?,?,?,?,?,?,?)',
            uid, intro, tags[:255], 50.0, 0, round(random.uniform(4.2, 5.0), 2), random.randint(60, 99),
        )

        cur.execute(
            'INSERT INTO [Posts] ([PostID],[AuthorID],[PostType],[Title],[Content],[FavoriteCount],[CreatedAt]) VALUES (?,?,?,?,?,?,?)',
            post_id, uid, 'illustration', title[:255], content, random.randint(5, 300), created_at,
        )

        cur.execute(
            'INSERT INTO [PostAttachments] ([AttachmentID],[PostID],[MediaType],[FileURL],[SortOrder]) VALUES (?,?,?,?,?)',
            att_id, post_id, 'image', it['file_url'][:255], 1,
        )

    conn.commit()

    # 验证计数
    counts = {}
    for t in ['Users', 'Artists', 'Posts', 'PostAttachments']:
        cur.execute(f'SELECT COUNT(*) FROM [{t}]')
        counts[t] = cur.fetchone()[0]
    conn.close()
    return counts


def main():
    ensure_dirs()
    copy_db()
    items = scrape_from_openclaw_browser()
    download_images(items)
    counts = clear_and_insert_access(items)

    META_JSON.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding='utf-8')

    print('DONE')
    print('OUT_DIR=', OUT_DIR)
    print('OUT_DB=', OUT_DB)
    print('IMG_DIR=', IMG_DIR)
    print('META_JSON=', META_JSON)
    print('COUNTS=', counts)


if __name__ == '__main__':
    main()
