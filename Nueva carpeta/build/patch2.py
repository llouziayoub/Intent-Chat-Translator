# -*- coding: utf-8 -*-
import io

p = "build/mockups.html"
s = io.open(p, encoding="utf-8").read()

pairs = [
    # ui4 bidi: explicit dir attribute on caption lines
    ('<div class="capsline">We need to lock the release date before Friday.</div>',
     '<div class="capsline" dir="ltr">We need to lock the release date before Friday.</div>'),
    ('<div class="capsline">The beta build is ready — latency is now under 800&nbsp;ms.</div>',
     '<div class="capsline" dir="ltr">The beta build is ready — latency is now under 800&nbsp;ms.</div>'),
    ('<div class="capsline">…</div>', '<div class="capsline" dir="ltr">…</div>'),
    # ui4 bottom spacing
    ('.caps-foot{flex:none;padding:10px 20px 34px}', '.caps-foot{flex:none;padding:10px 20px 46px}'),
    ('.cbtn.stop{background:#EF4444;border-color:#EF4444;width:56px;height:56px',
     '.cbtn.stop{background:#EF4444;border-color:#EF4444;width:52px;height:52px'),
    # ui6 dimmed background lighter
    ('.dimchat{position:absolute;inset:0;padding:70px 16px 0;opacity:.16;filter:blur(1.4px)}',
     '.dimchat{position:absolute;inset:0;padding:70px 16px 0;opacity:.09;filter:blur(1.6px)}'),
    # progress bar fills from the right in RTL
    ('.bar i{display:block;height:100%;width:74.4%;border-radius:4px;background:linear-gradient(90deg,#2563EB,#7C3AED)}',
     '.bar i{display:block;height:100%;width:74.4%;border-radius:4px;margin-left:auto;background:linear-gradient(90deg,#7C3AED,#2563EB)}'),
    # ui2 long-press menu lower opacity backdrop + spacing
    ('.lpmenu{background:rgba(15,23,42,.96);border-radius:15px;padding:6px;width:196px;align-self:center;',
     '.lpmenu{background:rgba(15,23,42,.97);border-radius:15px;padding:6px;width:196px;align-self:center;margin-top:6px;'),
]
for old, new in pairs:
    if old in s:
        s = s.replace(old, new)
        print("ok:", old[:48])
    else:
        print("MISS:", old[:48])

io.open(p, "w", encoding="utf-8").write(s)
