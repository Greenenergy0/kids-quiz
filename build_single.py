# 앱 전체를 파일 하나로 합친다.
# 만들어진 dist/kidsplay.html 은 서버도 인터넷도 없이 그냥 열면 바로 돌아간다.
# (폰에 카톡/메일/에어드롭으로 보내서 저장해 두고 쓰는 용도)
#
#   python build_single.py
#
import base64
import pathlib
import re

ROOT = pathlib.Path(__file__).parent
OUT = ROOT / "dist" / "kidsplay.html"

CSS = ["css/style.css"]
JS = [
    "js/store.js",
    "js/quiz.js",
    "js/questions.js",
    "js/stories.js",
    "js/english.js",
    "js/words.js",
    "js/listen.js",
    "js/mic.js",
    "js/speech.js",
    "js/app.js",
]


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def data_uri(path):
    raw = (ROOT / path).read_bytes()
    return "data:image/png;base64," + base64.b64encode(raw).decode("ascii")


html = read("index.html")

# 외부 파일들을 본문에 그대로 밀어 넣는다
style = "\n".join(read(p) for p in CSS)
# 치환문에 정규식 이스케이프 해석이 끼어들지 않도록 람다로 넣는다 (\u{...} 같은 게 들어 있음)
html = re.sub(
    r'<link rel="stylesheet" href="css/style\.css">',
    lambda _m: f"<style>\n{style}\n</style>",
    html,
)

scripts = "\n".join(f"// ---- {p} ----\n{read(p)}" for p in JS)
html = re.sub(
    r'(?s)<script src="js/store\.js"></script>.*?<script src="js/app\.js"></script>',
    lambda _m: f"<script>\n{scripts}\n</script>",
    html,
)

# 서버가 없으니 서비스워커와 manifest는 뺀다
html = re.sub(r'(?s)<script>\s*// 오프라인 사용을 위한.*?</script>', "", html)
html = re.sub(r'\s*<link rel="manifest"[^>]*>', "", html)
html = html.replace('href="icons/icon-180.png"', f'href="{data_uri("icons/icon-180.png")}"')
html = html.replace('href="icons/icon-192.png"', f'href="{data_uri("icons/icon-192.png")}"')

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(html, encoding="utf-8")
print(f"{OUT}  ({OUT.stat().st_size / 1024:.0f} KB)")
