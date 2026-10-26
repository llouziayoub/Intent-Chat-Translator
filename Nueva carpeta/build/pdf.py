from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
html = root / "report.html"
out = root.parent / "Intent_0.6.0.1_Report_AR.pdf"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1000, "height": 1400}, device_scale_factor=2)
    pg = ctx.new_page()
    pg.goto(html.as_uri())
    pg.wait_for_timeout(500)
    pg.evaluate("document.fonts.ready.then(()=>true)")
    pg.wait_for_timeout(1200)

    report = pg.evaluate("""() => {
      const out = [];
      document.querySelectorAll('.page').forEach((p, i) => {
        const pr = p.getBoundingClientRect();
        const over = p.scrollHeight - p.clientHeight;
        let deepest = 0, deepEl = '';
        p.querySelectorAll('*').forEach(el => {
          const r = el.getBoundingClientRect();
          const d = r.bottom - pr.bottom;
          if (d > deepest) { deepest = d; deepEl = (el.tagName + '.' + el.className).slice(0, 60); }
        });
        out.push({pg: i + 1, h: Math.round(pr.height), over, deepest: Math.round(deepest), el: deepEl,
                  imgs: p.querySelectorAll('img').length});
      });
      return {pages: out, imgs: [...document.images].map(i => ({src: i.currentSrc.split('/').pop(), ok: i.complete && i.naturalWidth > 0}))};
    }""")

    for r in report["pages"]:
        flag = "  <-- OVERFLOW" if r["over"] > 1 or r["deepest"] > 1 else ""
        print(f"page {r['pg']:>2}  h={r['h']}  overflow={r['over']}  deepest={r['deepest']} {r['el']}{flag}")

    bad = [i for i in report["imgs"] if not i["ok"]]
    print("images:", len(report["imgs"]), "broken:", bad)

    pg.pdf(path=str(out), format="A4", print_background=True, margin={"top": "0", "right": "0", "bottom": "0", "left": "0"}, prefer_css_page_size=True)
    b.close()

print("PDF:", out, out.stat().st_size, "bytes")
