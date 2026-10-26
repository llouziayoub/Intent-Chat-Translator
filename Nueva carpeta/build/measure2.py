from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
url = (root / "mockups.html").as_uri()

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_context(viewport={"width": 1400, "height": 1000}, device_scale_factor=1).new_page()
    pg.goto(url)
    pg.wait_for_timeout(700)
    res = pg.evaluate("""() => {
      const out = [];
      document.querySelectorAll('#s4 .capcard').forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const q = sel => { const e = c.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return [+b.top.toFixed(1), +b.bottom.toFixed(1), e.textContent.trim().slice(0,28)]; };
        const cs = getComputedStyle(c);
        out.push({i, cardH: +r.height.toFixed(1), cardTop: +r.top.toFixed(1), cardBot: +r.bottom.toFixed(1),
                  spk: q('.capspeaker'), line: q('.capline'), trad: q('.capstrad'),
                  padB: cs.paddingBottom, flex: cs.flex, h: cs.height});
      });
      const body = document.querySelector('#s4 .caps-body');
      const br = body.getBoundingClientRect();
      return {cards: out, body: {h: +br.height.toFixed(1), sh: body.scrollHeight}};
    }""")
    print(res["body"])
    for c in res["cards"]:
        print(c)
    b.close()
