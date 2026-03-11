from playwright.sync_api import sync_playwright
sel = 'a[href*="/zh/illustrations/"],a[href*="/zh/vectors/"]'
with sync_playwright() as p:
    b = p.chromium.connect_over_cdp('http://127.0.0.1:18800')
    ctx = b.contexts[0]
    pg = ctx.new_page()
    urls = [
        'https://pixabay.com/zh/users/biancavandijk-9606149/?tab=illustrations&order=latest',
        'https://pixabay.com/zh/users/biancavandijk-9606149/?tab=illustrations&order=latest&pagi=2',
        'https://pixabay.com/zh/users/biancavandijk-9606149/?tab=illustrations&order=latest&pagi=3',
    ]
    for url in urls:
        pg.goto(url, wait_until='domcontentloaded', timeout=120000)
        pg.wait_for_timeout(2500)
        c = pg.evaluate('(s)=>{const arr=[...document.querySelectorAll(s)].map(a=>a.href); return [...new Set(arr)].length}', sel)
        print(c, url)
    pg.close()
    b.close()
