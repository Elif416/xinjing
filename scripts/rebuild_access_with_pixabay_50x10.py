import json
import os
import random
import shutil
import time
from collections import Counter
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urljoin, urlparse

import pyodbc
import requests
from playwright.sync_api import sync_playwright

SRC_DB = Path(r"E:\accessDB\xinjingDB.accdb")
TS = datetime.now().strftime("%Y%m%d_%H%M%S")
OUT_DIR = Path(r"E:\accessDB") / f"xinjing_pixabay_50x10_{TS}"
OUT_DB = OUT_DIR / "xinjingDB.accdb"
IMG_DIR = OUT_DIR / "pixabay_images"
META_JSON = OUT_DIR / "pixabay_50x10.json"

SEARCH_URL = "https://pixabay.com/zh/illustrations/search/?order=ec"
CDP_URL = "http://127.0.0.1:18800"
AUTHOR_COUNT = 50
IMAGES_PER_AUTHOR = 10


def ensure_dirs():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    IMG_DIR.mkdir(parents=True, exist_ok=True)


def copy_db():
    shutil.copy2(SRC_DB, OUT_DB)


def norm_url(u: str):
    if not u:
        return u
    return u.split('?')[0]


def pick_low_quality(urls):
    # 优先更小规格
    def score(u):
        p = u.lower()
        if '_340.' in p:
            return 0
        if '_640.' in p:
            return 1
        if '_960.' in p:
            return 2
        if '_1280.' in p:
            return 3
        if '_1920.' in p:
            return 4
        return 5
    urls = [u for u in urls if u]
    if not urls:
        return ''
    return sorted(urls, key=score)[0]


def scrape_authors_and_images():
    all_authors = []

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp(CDP_URL)
        ctx = browser.contexts[0]

        page = None
        for pg in ctx.pages:
            if 'pixabay.com/zh/illustrations/search' in pg.url:
                page = pg
                break
        if page is None:
            page = ctx.new_page()
            page.goto(SEARCH_URL, wait_until='domcontentloaded', timeout=120000)
            page.wait_for_timeout(6000)

        authors = page.evaluate(
            """(authorCount) => {
              const out=[];
              const seen=new Set();
              const links=[...document.querySelectorAll('a[href*="/zh/users/"]')];
              for(const a of links){
                const href=a.href;
                const name=(a.textContent||'').trim();
                if(!href || !name) continue;
                if(seen.has(href)) continue;
                seen.add(href);
                out.push({name, url: href});
                if(out.length>=authorCount) break;
              }
              return out;
            }""",
            AUTHOR_COUNT,
        )

        if len(authors) < AUTHOR_COUNT:
            raise RuntimeError(f'Only found {len(authors)} authors, need {AUTHOR_COUNT}')

        for idx, au in enumerate(authors, 1):
            ap = ctx.new_page()
            try:
                # 尝试插画页 + 最新排序
                target = au['url'].rstrip('/') + '/?tab=illustrations&order=latest'
                ap.goto(target, wait_until='domcontentloaded', timeout=120000)
                ap.wait_for_timeout(2500)
                for _ in range(10):
                    ap.mouse.wheel(0, 3000)
                    ap.wait_for_timeout(900)

                data = ap.evaluate(
                    """(imagesPerAuthor) => {
                      const result = { intro: '', items: [] };

                      // intro：如果拿不到就留空，后续填充
                      const introCand = [
                        document.querySelector('[data-testid="user-description"]'),
                        document.querySelector('meta[name="description"]'),
                        document.querySelector('h1')
                      ];
                      for(const c of introCand){
                        if(!c) continue;
                        let t = '';
                        if(c.tagName === 'META') t = c.getAttribute('content') || '';
                        else t = c.textContent || '';
                        t = t.trim();
                        if(t){ result.intro = t; break; }
                      }

                      const out=[];
                      const seen = new Set();

                      // canva 链接里有稳定的 image-url（可直接下载）
                      const edits=[...document.querySelectorAll('a[href*="canva.com/content-partner"]')];
                      for(const a of edits){
                        const u = new URL(a.href);
                        const img = u.searchParams.get('image-url') || '';
                        const eid = u.searchParams.get('external-id') || '';
                        if(!img || !eid || seen.has(eid)) continue;
                        seen.add(eid);

                        const card = a.closest('figure,article,li,div') || a.parentElement;
                        const alt = (card?.querySelector('img[alt]')?.getAttribute('alt') || '').trim();
                        const pageA = card ? [...card.querySelectorAll('a[href]')].find(x => x.href.includes('-' + eid + '/')) : null;

                        out.push({
                          page_url: pageA ? pageA.href : '',
                          image_candidates: [img],
                          tags: alt
                        });
                        if(out.length >= imagesPerAuthor) break;
                      }

                      result.items = out;
                      return result;
                    }""",
                    IMAGES_PER_AUTHOR,
                )

                items = []
                for it in data.get('items', []):
                    cands = [norm_url(u) for u in it.get('image_candidates', []) if u]
                    cands = [u for u in cands if 'pixabay.com' in u]
                    img = pick_low_quality(cands)
                    if not img:
                        continue
                    if '_1920.' in img:
                        img = img.replace('_1920.', '_640.')
                    items.append({
                        'page_url': it.get('page_url', ''),
                        'image_url': img,
                        'tags': (it.get('tags') or '').strip(),
                    })
                    if len(items) >= IMAGES_PER_AUTHOR:
                        break

                if len(items) < IMAGES_PER_AUTHOR:
                    print(f"[warn] {au['name']} only {len(items)} images, skip")
                    continue

                all_authors.append({
                    'author': au['name'],
                    'author_url': au['url'],
                    'intro': (data.get('intro') or '').strip(),
                    'items': items,
                })

                print(f"author {len(all_authors)}/{AUTHOR_COUNT}: {au['name']} ok")

                if len(all_authors) >= AUTHOR_COUNT:
                    break

                time.sleep(0.6)

            finally:
                ap.close()

        browser.close()

    if len(all_authors) < AUTHOR_COUNT:
        raise RuntimeError(f'Collected {len(all_authors)} authors, need {AUTHOR_COUNT}')

    return all_authors


def ext_from_url(url: str):
    p = urlparse(url).path.lower()
    if p.endswith('.png'):
        return '.png'
    if p.endswith('.webp'):
        return '.webp'
    return '.jpg'


def download_all(authors):
    s = requests.Session()
    total = AUTHOR_COUNT * IMAGES_PER_AUTHOR
    n = 0

    for ai, au in enumerate(authors, 1):
        for pi, it in enumerate(au['items'], 1):
            ext = ext_from_url(it['image_url'])
            fn = f"a{ai:03d}_p{pi:02d}{ext}"
            dst = IMG_DIR / fn
            rel = f"pixabay_images/{fn}"

            r = s.get(it['image_url'], timeout=60)
            r.raise_for_status()
            dst.write_bytes(r.content)

            it['local_file'] = fn
            it['file_url'] = rel
            n += 1
            if n % 50 == 0:
                print(f"downloaded {n}/{total}")


def top_keywords(items, fallback='插画,无版权,创意'):
    words = []
    for it in items:
        tags = (it.get('tags') or '').replace('，', ',')
        for w in tags.split(','):
            w = w.strip()
            if w:
                words.append(w)
    if not words:
        return fallback
    c = Counter(words)
    return ','.join([w for w, _ in c.most_common(8)])[:255]


def rebuild_access(authors):
    conn = pyodbc.connect(r'DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};' + f'DBQ={OUT_DB};')
    cur = conn.cursor()

    cur.execute('DELETE FROM [PostAttachments]')
    cur.execute('DELETE FROM [Posts]')
    cur.execute('DELETE FROM [Artists]')
    cur.execute('DELETE FROM [Users]')

    base_time = datetime(2026, 3, 1, 9, 0, 0)
    post_id = 1
    att_id = 1

    for i, au in enumerate(authors, 1):
        uid = i
        author = (au.get('author') or f'pixabay_author_{i}').strip()
        account = f"pixabay_u{i:03d}"
        nickname = author[:100]
        created_at = base_time + timedelta(minutes=i)

        intro = (au.get('intro') or '').strip()
        if not intro:
            intro = f"来自 Pixabay 的免版税插画作者：{author}"

        keywords = top_keywords(au['items'])

        cur.execute(
            'INSERT INTO [Users] ([UserID],[Account],[PasswordHash],[Nickname],[UserRole],[CreatedAt]) VALUES (?,?,?,?,?,?)',
            uid, account, 'pixabay_migrated', nickname, 'artist', created_at,
        )

        cur.execute(
            'INSERT INTO [Artists] ([ArtistID],[Intro],[Keywords],[StartingPrice],[CompletedOrders],[Rating],[ActivityLevel]) VALUES (?,?,?,?,?,?,?)',
            uid, intro, keywords, 50.0, 0, round(random.uniform(4.2, 5.0), 2), random.randint(60, 99),
        )

        for j, it in enumerate(au['items'], 1):
            title = f"{author} - 最新插画 #{j}"
            content = f"来源: {it.get('page_url','')}\n关键词: {it.get('tags','') or keywords}\n作者主页: {au.get('author_url','')}"
            fav = random.randint(5, 300)
            ctime = created_at + timedelta(minutes=j)

            cur.execute(
                'INSERT INTO [Posts] ([PostID],[AuthorID],[PostType],[Title],[Content],[FavoriteCount],[CreatedAt]) VALUES (?,?,?,?,?,?,?)',
                post_id, uid, 'illustration', title[:255], content, fav, ctime,
            )

            cur.execute(
                'INSERT INTO [PostAttachments] ([AttachmentID],[PostID],[MediaType],[FileURL],[SortOrder]) VALUES (?,?,?,?,?)',
                att_id, post_id, 'image', it['file_url'][:255], 1,
            )

            post_id += 1
            att_id += 1

    conn.commit()

    counts = {}
    for t in ['Users', 'Artists', 'Posts', 'PostAttachments']:
        cur.execute(f'SELECT COUNT(*) FROM [{t}]')
        counts[t] = cur.fetchone()[0]

    conn.close()
    return counts


def main():
    ensure_dirs()
    copy_db()
    authors = scrape_authors_and_images()
    download_all(authors)
    counts = rebuild_access(authors)

    META_JSON.write_text(json.dumps(authors, ensure_ascii=False, indent=2), encoding='utf-8')

    print('DONE')
    print('OUT_DIR=', OUT_DIR)
    print('OUT_DB=', OUT_DB)
    print('IMG_DIR=', IMG_DIR)
    print('META_JSON=', META_JSON)
    print('COUNTS=', counts)


if __name__ == '__main__':
    main()
