from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
url = (root / "mockups.html").as_uri()

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_context(viewport={"width": 1500, "height": 1200}, device_scale_factor=3).new_page()
    pg.goto(url)
    pg.wait_for_timeout(800)
    info = pg.evaluate("""() => {
      const c = document.querySelector('#s4 .capcard');
      const t = c.querySelector('.capstrad');
      const cr = c.getBoundingClientRect(), tr = t.getBoundingClientRect();
      const cs = getComputedStyle(c), ts = getComputedStyle(t);
      return {cardTop: cr.top, cardBot: cr.bottom, textTop: tr.top, textBot: tr.bottom,
              padB: cs.paddingBottom, lh: ts.lineHeight, ff: ts.fontFamily, fs: ts.fontSize,
              overflowAnc: (() => { let e = c, out=[]; while (e && out.length < 6) { out.push(e.className + ':' + getComputedStyle(e).overflow); e = e.parentElement; } return out; })()};
    }""")
    for k, v in info.items():
        print(k, "=", v)
    c = pg.query_selector("#s4 .capcard")
    c.screenshot(path=str(root / "img" / "_cardtest.png"))
    b.close()
