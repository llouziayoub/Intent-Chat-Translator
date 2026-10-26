# -*- coding: utf-8 -*-
import io

p = "build/mockups.html"
s = io.open(p, encoding="utf-8").read()

pairs = [
    # --- ui2: fit the long-press menu inside the chat body ---
    ('.chatbody{flex:1;padding:16px 14px;display:flex;flex-direction:column;gap:12px;overflow:hidden;background:',
     '.chatbody{flex:1;padding:12px 13px;display:flex;flex-direction:column;gap:9px;overflow:hidden;background:'),
    ('.bub{background:#fff;border-radius:16px;padding:9px 12px 8px;',
     '.bub{background:#fff;border-radius:16px;padding:8px 11px 7px;'),
    ('.lpmenu div{display:flex;align-items:center;gap:9px;color:#E6EDF9;font-size:12px;font-weight:600;padding:7px 9px;border-radius:9px}',
     '.lpmenu div{display:flex;align-items:center;gap:9px;color:#E6EDF9;font-size:11.5px;font-weight:600;padding:5px 8px;border-radius:9px}'),
    ('.trans{font-size:13.5px;line-height:1.6;color:var(--navy);font-weight:700;margin-top:4px;padding-top:6px;',
     '.trans{font-size:13.5px;line-height:1.55;color:var(--navy);font-weight:700;margin-top:3px;padding-top:5px;'),
    # --- ui4: keep footer inside the screen ---
    ('.capcard{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:16px 16px 14px;backdrop-filter:blur(8px)}',
     '.capcard{background:rgba(255,255,255,.055);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:12px 14px 11px;backdrop-filter:blur(8px)}'),
    ('.caps-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 16px;gap:12px}',
     '.caps-body{flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 15px;gap:9px;min-height:0}'),
    ('.capline{font-size:16.5px;line-height:1.55;', '.capline{font-size:15.5px;line-height:1.5;'),
    ('.capstrad{font-size:15.5px;line-height:1.65;font-weight:700;color:#BFD3F7;margin-top:9px;padding-top:9px;',
     '.capstrad{font-size:14.5px;line-height:1.6;font-weight:700;color:#BFD3F7;margin-top:7px;padding-top:7px;'),
    ('.caps-title h3{font-size:17px;font-weight:800}', '.caps-title h3{font-size:16.5px;font-weight:800}'),
    ('.caps-head{display:flex;align-items:center;justify-content:space-between;padding:4px 18px 0;flex:none}',
     '.caps-head{display:flex;align-items:center;justify-content:space-between;padding:2px 18px 0;flex:none}'),
    ('.caps-title{padding:14px 18px 0;flex:none}', '.caps-title{padding:12px 18px 0;flex:none}'),
    ('.speakers{display:flex;gap:-6px;margin-top:0;padding:12px 18px 0;flex:none}',
     '.speakers{display:flex;gap:-6px;margin-top:0;padding:9px 18px 0;flex:none}'),
    ('.caps-foot{flex:none;padding:10px 20px 46px}', '.caps-foot{flex:none;padding:8px 20px 42px}'),
]
for old, new in pairs:
    if old in s:
        s = s.replace(old, new)
        print("ok:", old[:46])
    else:
        print("MISS:", old[:46])

io.open(p, "w", encoding="utf-8").write(s)
