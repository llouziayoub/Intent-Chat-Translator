from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
url = (root / "mockups.html").as_uri()

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1500, "height": 1200}, device_scale_factor=1)
    pg = ctx.new_page()
    pg.goto(url)
    pg.wait_for_timeout(800)
    info = pg.evaluate("""() => {
      const out = [];
      for (let i=1;i<=6;i++){
        const el = document.querySelector('#s'+i);
        const r = el.querySelector('.chatbody, .vc-body, .caps-body, .f2f-wrap, .rows');
        out.push({id:i, h:el.clientHeight, sh:el.scrollHeight, inner: r ? {cls:r.className, h:r.clientHeight, sh:r.scrollHeight} : null});
      }
      return out;
    }""")
    for i in info:
        print(i)
    b.close()
