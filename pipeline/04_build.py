#!/usr/bin/env python3
"""
04_build.py · 生成网站页面（pages/ 下的 Markdown）

用法（在仓库根目录运行）：
    python3 pipeline/04_build.py

读取：
    data/sutras.csv            经文清单（01_split.py 生成）
    data/tags_raw.csv          你自己填的标签（经号、标签、备注）
    data/T99_teiHeader.xml     CBETA 文件头（01_split.py 保存）
    pipeline/out/sutras/*.txt  每经正文（01_split.py 生成）

写出：
    data/tags_raw.csv          补全缺的经号（第一次运行时生成；你填的内容原样保留）
    pages/sutras/index.md      经文目录（按卷）
    pages/sutras/T99-xxxx.md   每经一页：标签 + 原文
    pages/about.md             关于页（说明、数据来源、致谢、授权）

标签填写约定（data/tags_raw.csv）：
    一条经的多个标签用顿号「、」隔开，最重要的写在最前面（页面上加粗显示）；
    「备注」栏随便写笔记，页面上显示为「笔记」。
    重新运行前会把旧文件备份到 pipeline/out/tags_raw.backup.csv。

重新运行安全：只重写上述文件，会清掉旧的 pages/sutras/T99-*.md 再重建。
pages/index.md、pages/terms/、pages/graph.md 不动。
注意：pages/about.md 由本脚本整页生成，手改会被覆盖；要改内容请改本脚本里的模板。

只依赖 Python 标准库。
"""

import csv
import re
import sys
import xml.etree.ElementTree as ET
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ROOT / "pages"
SUT = PAGES / "sutras"
TXT = ROOT / "pipeline" / "out" / "sutras"
TEI = "http://www.tei-c.org/ns/1.0"
XML_LANG = "{http://www.w3.org/XML/1998/namespace}lang"

SOURCE_LINE = ("经文来源：CBETA 电子佛典集成（中华电子佛典协会），大正藏 T99《杂阿含经》，"
               "刘宋 求那跋陀罗译，谨此致谢。本站仅供学习，不保证内容正确。"
               "授权 CC BY-NC-SA 4.0，详见[关于](../about.md)。")

TAG_SPLIT = re.compile(r"[、，,；;]+")


# ---------- 小工具 ----------
def cn_num(n):
    d = "零一二三四五六七八九"
    if n < 10:
        return d[n]
    if n < 20:
        return "十" + (d[n % 10] if n % 10 else "")
    return d[n // 10] + "十" + (d[n % 10] if n % 10 else "")


def md_escape(s):
    return re.sub(r"([\\`*_\[\]<>|#])", r"\\\1", s)


def title_of(sid):
    nums = [int(x) for x in re.findall(r"\d+", sid.split("-", 1)[1])]
    if len(nums) == 1:
        return f"杂阿含经 第{nums[0]}经"
    return f"杂阿含经 第{nums[0]}～{nums[1]}经"


def render_body(text):
    """段落之间空一行；带空格的行是偈颂句，同组偈颂用硬换行连在一起。"""
    blocks, verse = [], []
    for line in text.split("\n"):
        if not line.strip():
            continue
        if " " in line:
            verse.append(md_escape(line))
        else:
            if verse:
                blocks.append("  \n".join(verse))
                verse = []
            blocks.append(md_escape(line))
    if verse:
        blocks.append("  \n".join(verse))
    return "\n\n".join(blocks)


RAW_HEADER = ["经号", "标签", "备注"]


def read_raw_tags():
    path = ROOT / "data" / "tags_raw.csv"
    data = {}
    if not path.exists():
        return data
    with open(path, encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames or any(h not in reader.fieldnames for h in RAW_HEADER):
            sys.exit(f"data/tags_raw.csv 的表头应包含：{'、'.join(RAW_HEADER)}。"
                     f"文件未做任何改动，请检查表头（可能是表格软件改了列名）。")
        for row in reader:
            sid = (row.get("经号") or "").strip()
            if sid:
                data[sid] = {"标签": (row.get("标签") or "").strip(), "备注": (row.get("备注") or "").strip()}
    return data


def sync_tags_raw(rows):
    """保证 tags_raw.csv 含全部经号；已填内容原样保留；写入前先备份。"""
    path = ROOT / "data" / "tags_raw.csv"
    existing = read_raw_tags()
    if path.exists():
        backup = ROOT / "pipeline" / "out" / "tags_raw.backup.csv"
        backup.parent.mkdir(parents=True, exist_ok=True)
        backup.write_bytes(path.read_bytes())
    ids = [r["经号"] for r in rows]
    known = set(ids)
    extra = [k for k in existing if k not in known]
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(RAW_HEADER)
        for sid in ids + extra:
            e = existing.get(sid, {"标签": "", "备注": ""})
            w.writerow([sid, e["标签"], e["备注"]])
    if extra:
        print(f"提示：tags_raw.csv 里有 {len(extra)} 个经号不在 sutras.csv 中，已保留在文件末尾：{extra[:5]}")
    return read_raw_tags()


def render_tags(entry):
    if not entry or not (entry["标签"] or entry["备注"]):
        return "_尚未标注。_"
    parts = []
    tags = [t.strip() for t in TAG_SPLIT.split(entry["标签"]) if t.strip()]
    if tags:
        shown = ["**" + md_escape(tags[0]) + "**"] + [md_escape(t) for t in tags[1:]]
        parts.append("标签：" + "、".join(shown))
    if entry["备注"]:
        parts.append("笔记：" + md_escape(entry["备注"]))
    return "\n\n".join(parts)


# ---------- 经文页 ----------
def build_sutras():
    csv_path = ROOT / "data" / "sutras.csv"
    if not csv_path.exists():
        sys.exit("找不到 data/sutras.csv，请先运行 01_split.py")
    with open(csv_path, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
    rows.sort(key=lambda r: int(r["顺序"]))
    tags = sync_tags_raw(rows)

    SUT.mkdir(parents=True, exist_ok=True)
    for old in SUT.glob("T99-*.md"):
        old.unlink()

    for i, r in enumerate(rows):
        sid = r["经号"]
        txt_path = TXT / f"{sid}.txt"
        if not txt_path.exists():
            sys.exit(f"缺少正文文件：{txt_path}，请先运行 01_split.py")
        body = render_body(txt_path.read_text(encoding="utf-8"))

        meta = f"{sid} · 卷{cn_num(int(r['卷']))} · {r['字数']}字"
        parts = [f"# {title_of(sid)}", "", meta, ""]
        if r.get("备注"):
            parts += [f"> 备注：{r['备注']}", ""]
        parts += ["## 标签（个人标注）", "", render_tags(tags.get(sid)), "", "## 原文", "", body, "", "---", ""]

        nav = []
        if i > 0:
            nav.append(f"[← 上一经]({rows[i - 1]['经号']}.md)")
        nav.append("[目录](index.md)")
        if i + 1 < len(rows):
            nav.append(f"[下一经 →]({rows[i + 1]['经号']}.md)")
        parts += [" · ".join(nav), "", SOURCE_LINE, ""]
        (SUT / f"{sid}.md").write_text("\n".join(parts), encoding="utf-8")

    # 目录
    by_juan = defaultdict(list)
    for r in rows:
        by_juan[int(r["卷"])].append(r)
    idx = [
        "# 经文", "",
        f"共 {len(rows)} 条记录，对应大正藏 T99 第 1–1362 号（个别经号合并为一条，见备注）。", "",
        "目录按卷排列；「所属诵」尚在核对，暂不分诵。", "",
    ]
    for j in sorted(by_juan):
        idx += [f"## 卷{cn_num(j)}", ""]
        for r in by_juan[j]:
            line = f"- [{r['经号']}]({r['经号']}.md) · {r['字数']}字"
            if r.get("备注"):
                line += f" · {r['备注']}"
            idx.append(line)
        idx.append("")
    (SUT / "index.md").write_text("\n".join(idx), encoding="utf-8")
    return rows


# ---------- 关于页 ----------
def build_about():
    header_path = ROOT / "data" / "T99_teiHeader.xml"
    info = {}
    if header_path.exists():
        raw = header_path.read_text(encoding="utf-8")
        raw = re.sub(r"^<!--.*?-->\s*", "", raw, flags=re.S)
        root = ET.fromstring(f'<root xmlns="{TEI}" xmlns:cb="http://www.cbeta.org/ns/1.0">{raw}</root>')

        def find_text(*names):
            node = root
            for n in names:
                node = node.find(f"{{{TEI}}}{n}") if node is not None else None
            return " ".join("".join(node.itertext()).split()) if node is not None else ""

        info["avail"] = find_text("teiHeader", "fileDesc", "publicationStmt", "availability", "p")
        info["date"] = find_text("teiHeader", "fileDesc", "publicationStmt", "date")
        info["dist"] = find_text("teiHeader", "fileDesc", "publicationStmt", "distributor", "name")
        info["extent"] = find_text("teiHeader", "fileDesc", "extent")
        info["author"] = find_text("teiHeader", "fileDesc", "titleStmt", "author")
        proj = ""
        for p in root.iter(f"{{{TEI}}}p"):
            if p.get(XML_LANG) == "zh-Hant" and p.get("{http://www.cbeta.org/ns/1.0}type") == "ly":
                proj = " ".join("".join(p.itertext()).split())
        info["proj"] = proj
    else:
        print("提示：没有 data/T99_teiHeader.xml，关于页将缺少 CBETA 文件头信息；请先运行 01_split.py")

    L = [
        "# 关于", "",
        "## 说明", "",
        "本站是个人学习阿含经的笔记，**仅供学习使用，不保证内容正确**。"
        "标签、整理和说明都出自学习过程中的个人理解，难免有误；"
        "经文请以 CBETA 及原典为准，引用前务请自行核对。", "",
        "## 致谢", "",
        "衷心感谢中华电子佛典协会（CBETA）。本站的全部经文都来自 CBETA 多年的电子化与校对工作，"
        "并承蒙其开放使用。没有这些工作，就没有这个项目。", "",
        "## 数据来源", "",
    ]
    L.append("- 经典：大正新脩大藏經 No. 99《雜阿含經》" + (f"，{info['author']}" if info.get("author") else "")
             + (f"（{info['extent']}）" if info.get("extent") else ""))
    L.append("- 电子化：" + re.sub(r"\s+（", "（", info.get("dist") or "中華電子佛典協會（CBETA）") + "，XML TEI P5")
    if info.get("date"):
        L.append(f"- CBETA 文件版本日期：{info['date']}")
    if info.get("proj"):
        L.append(f"- 文本提供与校对（取自文件头）：{info['proj']}")
    L += ["", "## 授权", ""]
    if info.get("avail"):
        L += ["CBETA 文件头中的声明：", "", f"> {info['avail']}", ""]
    L += [
        "CBETA 公布的授权为 CC BY-NC-SA 4.0。本站经文按此使用，并保留 CBETA 的文件头"
        "（完整文件头见项目仓库 `data/T99_teiHeader.xml`）。",
        "",
        "本站其余内容（标签、定义、关系、脚本）同样采用 CC BY-NC-SA 4.0：须署名、不得用于商业用途、"
        "衍生作品须以相同方式共享。",
        "",
        "## 本站对原文做的处理",
        "",
        "- 按「经」切分：每个经号一页；大正藏中有 5 处把多个经号合并为一段文字，本站保持合并，页面标题写成经号范围。",
        "- 去掉行号、页码等排版标记，去掉文件中的硬换行，只保留段落与偈颂的分行。",
        "- 偈颂的句中停顿以一个空格表示，不另加标点。",
        "- CBETA 的少数造字（私用区字符）按文件头的对照表换成相近的标准字，有替换的经在备注中注明。",
        "- 经号 T99-0455 在 CBETA 文件中排在 489 与 490 之间，本站按文件中的实际位置排列上下经。",
        "",
        "## 标签",
        "",
        "经文页上的标签是我读经时的个人标注，用词随意，尚未整理。",
        "日后会整理归并，并对应到佛法名相；其他类别的标签放在「其他」或附录。",
        "",
    ]
    (PAGES / "about.md").write_text("\n".join(L), encoding="utf-8")


# ---------- 校验 ----------
def validate(rows):
    print("\n=== 校验 ===")
    problems = 0

    def check(ok, msg):
        nonlocal problems
        if not ok:
            problems += 1
        print(f"[{'通过' if ok else '未通过'}] {msg}")

    pages = [p for p in SUT.glob("T99-*.md")]
    check(len(pages) == len(rows), f"经文页 {len(pages)} 个（应为 {len(rows)}）")

    bad = []
    for p in list(pages) + [SUT / "index.md", PAGES / "about.md"]:
        text = p.read_text(encoding="utf-8")
        for link in re.findall(r"\]\(([^)#]+\.md)\)", text):
            if not (p.parent / link).resolve().exists():
                bad.append((p.name, link))
    check(not bad, "页面内链接都能找到目标" + (f"：{bad[:3]}" if bad else ""))

    pua = [p.name for p in pages if any(0xE000 <= ord(c) <= 0xF8FF or ord(c) >= 0xF0000
                                       for c in p.read_text(encoding="utf-8"))]
    check(not pua, "页面无私用区字符" + (f"：{pua[:3]}" if pua else ""))

    ids = {r["经号"] for r in rows}
    check({p.stem for p in pages} == ids, "页面与 sutras.csv 的经号一一对应")
    check(ids <= set(read_raw_tags()), "tags_raw.csv 含全部经号")
    if problems:
        sys.exit(f"\n有 {problems} 项校验未通过。")


def main():
    rows = build_sutras()
    build_about()
    print(f"已生成：{len(rows)} 个经文页、经文目录、关于页 → pages/")
    validate(rows)
    print("\n预览：pip install mkdocs-material 后运行 mkdocs serve，浏览器打开提示的本地地址。")


if __name__ == "__main__":
    main()
