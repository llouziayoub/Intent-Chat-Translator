# -*- coding: utf-8 -*-
import io, re, sys

p = "build/mockups.html"
s = io.open(p, encoding="utf-8").read()

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n == 0:
        print("MISS:", old[:70].replace("\n", " "))
        return
    s = s.replace(old, new, count if count else n)
    print("ok x%d:" % n, old[:50].replace("\n", " "))

# ---------- CSS ----------
rep(""".pic .flag{position:absolute;bottom:-3px;left:-3px;width:19px;height:19px;border-radius:50%;background:#fff;display:grid;place-items:center;font-size:10px;box-shadow:0 2px 5px rgba(0,0,0,.15)}""",
    """.pic .flag{position:absolute;bottom:-4px;left:-4px;min-width:23px;height:19px;padding:0 3px;border-radius:9px;background:#fff;display:grid;place-items:center;font-size:8px;font-weight:800;letter-spacing:.3px;font-family:'Segoe UI',sans-serif;box-shadow:0 2px 5px rgba(0,0,0,.16);border:1px solid #E6EAF2}""")

rep(""".brand h1{font-size:21px;font-weight:800;color:var(--navy);letter-spacing:-.3px}""",
    """.brand h1{font-size:21px;font-weight:800;color:var(--navy);letter-spacing:-.3px;direction:ltr}""")

rep(""".orig{font-size:13.5px;line-height:1.55;color:#8A97A8}""",
    """.orig{font-size:13.5px;line-height:1.55;color:#8A97A8;unicode-bidi:plaintext}""")

rep(""".capline{font-size:16.5px;line-height:1.55;font-weight:700;direction:ltr;text-align:left;color:#F1F5F9}""",
    """.capline{font-size:16.5px;line-height:1.55;font-weight:700;direction:ltr;unicode-bidi:plaintext;text-align:left;color:#F1F5F9}""")

rep(""".caps-foot{flex:none;padding:14px 16px 24px}""",
    """.caps-foot{flex:none;padding:10px 20px 34px}""")

rep(""".waveline i{flex:1;border-radius:2px;background:linear-gradient(180deg,#60A5FA,#3B82F6)}""",
    """.waveline i{flex:1;max-width:7px;border-radius:2px;background:linear-gradient(180deg,#60A5FA,#3B82F6)}""")

rep(""".waveline{display:flex;align-items:center;gap:2px;height:34px;margin-bottom:12px;opacity:.85}""",
    """.waveline{display:flex;align-items:center;justify-content:center;gap:3px;height:30px;margin-bottom:14px;opacity:.85}""")

rep(""".flagdot{width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.14);display:grid;place-items:center;font-size:10px}""",
    """.flagdot{min-width:22px;height:18px;padding:0 4px;border-radius:9px;background:rgba(255,255,255,.16);display:grid;place-items:center;font-size:8px;font-weight:800;letter-spacing:.3px;font-family:'Segoe UI',sans-serif}""")

# extra css before closing style
rep("""</style>""",
    """
.dimchat{position:absolute;inset:0;padding:70px 16px 0;opacity:.16;filter:blur(1.4px)}
.dimchat .r{display:flex;gap:10px;align-items:center;padding:9px 8px;margin-bottom:8px;background:#fff;border-radius:14px}
.dimchat .c{width:38px;height:38px;border-radius:12px;flex:none}
.dimchat .l{flex:1;height:8px;border-radius:4px;background:#64748B}
.previewclone{margin-top:2px}
.previewclone .ttl{font-size:10.5px;font-weight:800;color:#94A3B8;letter-spacing:.4px;margin-bottom:7px}
.pc-row{display:flex;align-items:center;gap:9px;background:#fff;border:1px solid var(--line);border-radius:13px;padding:8px 10px;box-shadow:0 4px 12px rgba(15,23,42,.04)}
.pc-row+.pc-row{margin-top:7px}
.pc-row .lg2{font-size:9px;font-weight:800;color:#1D4ED8;background:#EAF1FF;border-radius:5px;padding:2px 6px;letter-spacing:.4px;font-family:'Segoe UI'}
.pc-row .txt{flex:1;font-size:11.5px;font-weight:700;color:#334155;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pc-row .pl{width:24px;height:24px;border-radius:50%;background:#EFF4FF;color:var(--blue);display:grid;place-items:center;flex:none}
</style>""")

# ---------- ui1 brand ----------
rep("""<h1>Intent<span>.</span></h1>""", """<h1 dir="ltr">Intent<span>.</span></h1>""")

# ---------- flags -> code chips ----------
flags = {"🇫🇷": ("FR", "#EEF4FF", "#1D4ED8"), "🇮🇹": ("IT", "#ECFDF5", "#047857"),
         "🇨🇳": ("ZH", "#FEF2F2", "#B91C1C"), "🇵🇹": ("PT", "#F0FDFA", "#0F766E"),
         "🇩🇪": ("DE", "#F8FAFC", "#334155")}
for emo, (code, bg, fg) in flags.items():
    s = s.replace('<span class="flag">%s</span>' % emo,
                  '<span class="flag" style="color:%s;background:%s">%s</span>' % (fg, bg, code))
print("flags replaced")

# ui3 flag dots
s = s.replace('<span class="flagdot">🇫🇷</span>', '<span class="flagdot" style="color:#BFD3F7">FR</span>')
s = s.replace('<span class="flagdot">🇸🇦</span>', '<span class="flagdot" style="color:#C7D2FE">AR</span>')

# ---------- ui2 back chevron ----------
rep("""<path d="m15 6-6 6 6 6"/>""", """<path d="m9 6 6 6-6 6"/>""")

# ---------- ui2 remove trailing "typing" bubble ----------
rep("""    <div class="msg in" style="opacity:.55">
      <div class="bub"><div class="trans" style="border:0;margin:0;padding:0;color:#94A3B8;font-weight:600">يكتب الآن…</div></div>
    </div>
""", "")

# ---------- ui4 language chips line ----------
rep("""<p><span class="pill" style="background:rgba(37,99,235,.2);color:#BFD3F7">EN</span> ⇄ <span class="pill" style="background:rgba(124,58,237,.2);color:#DDD6FE">AR</span> · 6 مشاركين · Google Meet</p>""",
    """<p><span style="display:flex;gap:5px;align-items:center"><span class="pill" style="background:rgba(37,99,235,.22);color:#BFD3F7">EN</span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2.2" stroke-linecap="round"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg><span class="pill" style="background:rgba(124,58,237,.22);color:#DDD6FE">AR</span></span> · 6 مشاركين · Google Meet</p>""")

# ---------- ui5 CTA shorten + preview card ----------
rep("""    <div class="hintrow">سيتم استنساخ النبرة والتواتر والانفعال الصوتي فقط، دون تخزين محتوى المحادثات.</div>""",
    """    <div class="previewclone">
      <div class="ttl">معاينة البصمة قبل الحفظ</div>
      <div class="pc-row"><span class="lg2">ES</span><span class="txt" dir="ltr" style="text-align:left">Hola, encantado de conocerte.</span><span class="pl"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span></div>
      <div class="pc-row"><span class="lg2">EN</span><span class="txt" dir="ltr" style="text-align:left">Nice to meet you, see you soon.</span><span class="pl"><svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></span></div>
    </div>
    <div class="hintrow">سيتم استنساخ النبرة والتواتر والانفعال الصوتي فقط، دون تخزين محتوى المحادثات.</div>""")

rep("""    <div class="btn primary">إنهاء التسجيل وتحليل البصمة</div>""",
    """    <div class="btn primary" style="font-size:12.5px;white-space:nowrap">إنهاء التسجيل وتحليل البصمة</div>""")

rep(""".vc-actions{display:flex;gap:9px;flex:none;padding:0 18px 26px}""",
    """.vc-actions{display:flex;gap:9px;flex:none;padding:0 18px 26px}
.vc-actions .btn.ghost{flex:0 0 96px}""")

# ---------- ui6 header + numbers ----------
rep("""      <div><h3>Intent Turbo</h3><p>ترجمة غير محدودة · صوت مستنسخ · بلا إعلانات</p></div>
      <div class="badge" style="margin-right:auto">الأكثر اختياراً</div>""",
    """      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:7px"><h3>Intent Turbo</h3><span class="badge">الأكثر اختياراً</span></div>
        <p style="white-space:nowrap">ترجمة غير محدودة · صوت مستنسخ · بلا إعلانات</p>
      </div>""")

rep("""<div class="top"><span>الحصة المجانية اليوم</span><b>128 / 500 كلمة</b></div>""",
    """<div class="top"><span>الحصة المجانية اليوم</span><b><span dir="ltr">128 / 500</span> كلمة</b></div>""")

rep("""<div class="top" style="margin-top:7px;font-size:9.5px;color:#94A3B8"><span>تُعاد الحصة الساعة 00:00</span><span>دقائق الصوت: 4 / 10</span></div>""",
    """<div class="top" style="margin-top:7px;font-size:9.5px;color:#94A3B8"><span>تُعاد الحصة الساعة <span dir="ltr">00:00</span></span><span>دقائق الصوت: <span dir="ltr">4 / 10</span></span></div>""")

# dimmed chat behind billing sheet
rep("""  <div class="dim"></div>""",
    """  <div class="dim"></div>
  <div class="dimchat">
    <div class="r"><div class="c" style="background:#60A5FA"></div><div style="flex:1"><div class="l" style="width:52%"></div><div class="l" style="width:78%;margin-top:6px;opacity:.55"></div></div></div>
    <div class="r"><div class="c" style="background:#F472B6"></div><div style="flex:1"><div class="l" style="width:44%"></div><div class="l" style="width:66%;margin-top:6px;opacity:.55"></div></div></div>
    <div class="r"><div class="c" style="background:#34D399"></div><div style="flex:1"><div class="l" style="width:58%"></div><div class="l" style="width:72%;margin-top:6px;opacity:.55"></div></div></div>
    <div class="r"><div class="c" style="background:#A78BFA"></div><div style="flex:1"><div class="l" style="width:48%"></div><div class="l" style="width:70%;margin-top:6px;opacity:.55"></div></div></div>
  </div>""")

# ---------- diagram: reverse column order so 1 is on the right ----------
cols = re.findall(r'<div class="dg-col">.*?</div>\n    </div>', s, flags=re.S)
print("diagram cols found:", len(cols))
if len(cols) == 5:
    for c in cols:
        s = s.replace(c, "@@COL@@", 1)
    for c in reversed(cols):
        s = s.replace("@@COL@@", c, 1)

io.open(p, "w", encoding="utf-8").write(s)
print("written", len(s))
