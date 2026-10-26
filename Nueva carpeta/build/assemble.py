# -*- coding: utf-8 -*-
import io, re

a = io.open("build/report_a.html", encoding="utf-8").read()
b = io.open("build/report_b.html", encoding="utf-8").read()

s = a + "\n" + b

# the engines page is the second page of section 1 -> anchor s1c
s = s.replace('<section class="page" id="s1b" data-anchor="s1b">',
              '<section class="page" id="s1b" data-anchor="s1c">')

# split into pages
parts = re.split(r'(?=<section class="page)', s)
head = parts[0]
pages = parts[1:]
print("pages found:", len(pages))

total = len(pages)
anchors = {}
for i, p in enumerate(pages, start=1):
    m = re.search(r'data-anchor="([^"]+)"', p)
    if m:
        anchors[m.group(1)] = i
anchors["s1b"] = anchors.get("s1", anchors.get("s1b", 1))
print("anchors:", anchors)

out = [head]
for i, p in enumerate(pages, start=1):
    p = p.replace("{{P}}", str(i)).replace("{{TOTAL}}", str(total))
    # decorative number in footer duplicated -> remove
    p = re.sub(r'<span class="num">\d*</span>', '', p)
    out.append(p)

s = "".join(out)
if "</body>" not in s:
    s += "\n</body>\n</html>\n"

# resolve page refs
def sub(m):
    k = m.group(1)
    if k not in anchors:
        print("MISSING ANCHOR:", k)
        return "—"
    return str(anchors[k])

s = re.sub(r"\{\{PG:([a-zA-Z0-9_-]+)\}\}", sub, s)

leftover = re.findall(r"\{\{[^}]+\}\}", s)
print("leftover tokens:", leftover[:10])

io.open("build/report.html", "w", encoding="utf-8").write(s)
print("written build/report.html", len(s))
