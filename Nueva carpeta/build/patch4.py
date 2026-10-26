# -*- coding: utf-8 -*-
import io

p = "build/mockups.html"
s = io.open(p, encoding="utf-8").read()

a = '.caps-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 15px;gap:9px;min-height:0}'
b = '.caps-body{flex:1;display:flex;flex-direction:column;justify-content:flex-start;padding:6px 15px 0;gap:9px;min-height:0}'
print("A", a in s)
s = s.replace(a, b)

c = '<div class="capcard ghost" style="opacity:.3">'
d = '<div class="capcard ghost" style="opacity:.3;flex:1 1 auto">'
print("B", c in s)
s = s.replace(c, d)

io.open(p, "w", encoding="utf-8").write(s)
