import fitz, sys

doc = fitz.open("Intent_0.6.0.1_Report_AR.pdf")
print("pages:", doc.page_count)
for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=96)
    pix.save(f"build/prev/p{i+1:02d}.png")
print("ok")
