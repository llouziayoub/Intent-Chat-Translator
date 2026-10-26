import urllib.request, os

os.makedirs(os.path.join("build", "fonts"), exist_ok=True)
files = {
    "Cairo-VF.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/cairo/Cairo%5Bslnt%2Cwght%5D.ttf",
    "Tajawal-Regular.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Regular.ttf",
    "Tajawal-Bold.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/tajawal/Tajawal-Bold.ttf",
}
for name, url in files.items():
    dst = os.path.join("build", "fonts", name)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(req, timeout=90).read()
        with open(dst, "wb") as f:
            f.write(data)
        print("OK", name, len(data))
    except Exception as e:
        print("FAIL", name, repr(e))
