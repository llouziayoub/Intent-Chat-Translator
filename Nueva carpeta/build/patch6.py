# -*- coding: utf-8 -*-
import io

p = "build/mockups.html"
s = io.open(p, encoding="utf-8").read()

a = ".capcard{flex:none;background:linear-gradient(160deg,rgba(255,255,255,.085),rgba(255,255,255,.045));border:1px solid rgba(255,255,255,.11);border-radius:18px;padding:12px 14px 12px}"
b = ".capcard{flex:none;background:linear-gradient(160deg,rgba(255,255,255,.085),rgba(255,255,255,.045));border:1px solid rgba(255,255,255,.11);border-radius:18px;padding:12px 14px 16px}"
print("card", a in s)
s = s.replace(a, b)

a2 = ".capstrad{font-size:14.5px;line-height:1.6;font-weight:700;color:#BFD3F7;margin-top:7px;padding-top:7px;"
b2 = ".capstrad{font-size:14.5px;line-height:1.75;font-weight:700;color:#BFD3F7;margin-top:8px;padding-top:8px;"
print("trad", a2 in s)
s = s.replace(a2, b2)

io.open(p, "w", encoding="utf-8").write(s)
