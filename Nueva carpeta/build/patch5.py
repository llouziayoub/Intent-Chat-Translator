# -*- coding: utf-8 -*-
import io

p = "build/mockups.html"
s = io.open(p, encoding="utf-8").read()

# backdrop-filter clips the card's own content in Chromium -> replace with solid translucent bg
a = ".capcard{flex:none;background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:12px 14px 11px;backdrop-filter:blur(8px)}"
b = ".capcard{flex:none;background:linear-gradient(160deg,rgba(255,255,255,.085),rgba(255,255,255,.045));border:1px solid rgba(255,255,255,.11);border-radius:18px;padding:12px 14px 12px}"
print("capcard", a in s)
s = s.replace(a, b)

io.open(p, "w", encoding="utf-8").write(s)
