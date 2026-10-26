from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parent
url = (root / "mockups.html").as_uri()
out = root / "img"
out.mkdir(exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch()

    # phones at 3x
    ctx = browser.new_context(viewport={"width": 1500, "height": 1200}, device_scale_factor=3)
    page = ctx.new_page()
    page.goto(url)
    page.evaluate("document.fonts.ready.then(()=>true)")
    page.wait_for_timeout(1200)
    for i in range(1, 7):
        el = page.query_selector(f"#s{i}")
        el.scroll_into_view_if_needed()
        page.wait_for_timeout(150)
        el.screenshot(path=str(out / f"ui{i}.png"), omit_background=True)
        print("shot ui%d" % i)
    ctx.close()

    # diagram at 2x
    ctx2 = browser.new_context(viewport={"width": 1400, "height": 1000}, device_scale_factor=2)
    page2 = ctx2.new_page()
    page2.goto(url)
    page2.evaluate("document.fonts.ready.then(()=>true)")
    page2.wait_for_timeout(900)
    dg = page2.query_selector("#diagram")
    dg.scroll_into_view_if_needed()
    page2.wait_for_timeout(200)
    dg.screenshot(path=str(out / "diagram.png"))
    print("shot diagram")
    ctx2.close()
    browser.close()
