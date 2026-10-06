#!/usr/bin/env python3
"""
01_split.py · 把 CBETA 大正藏 T99《杂阿含经》切成一经一条记录

用法（在仓库根目录运行）：
    python3 pipeline/01_split.py
    python3 pipeline/01_split.py --xml 其他路径/T02n0099.xml

输入：raw/T02n0099.xml（CBETA 原始 XML，不提交到 git）
输出：
    data/sutras.csv            经文清单（提交）
    pipeline/out/sutras/*.txt  每经一个文本文件（不提交）

只依赖 Python 标准库，无需安装任何东西。

说明：
  - 经的边界取自 XML 里 <cb:div type="jing">，不用 AI。
  - 重新运行安全：data/sutras.csv 里「所属诵」「会编号」两列是人工填的，
    脚本会按经号保留，不会覆盖。
  - 偈颂的「句中停顿」(caesura) 输出为一个空格，其余不加任何标点。
  - CBETA 的造字（私用区字符，网页上显示为方框）按文件头 charDecl 换成
    对应的标准 Unicode 字；有替换的经在「备注」中标明。
  - 同时把 XML 的 teiHeader 原样存到 data/T99_teiHeader.xml（CBETA 要求保留文件头）。
"""

import argparse
import csv
import random
import re
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANON = "T99"
EXPECTED_BLOCKS = 1355      # XML 中 jing 区块数
EXPECTED_LAST = 1362        # 大正藏经号 1–1362
SHORT_LIMIT = 30            # 字数低于此值，标为「略出」

# 正文提取时整个跳过的元素（元素的尾随文字仍保留）
SKIP = {"head", "mulu", "juan", "lb", "pb", "anchor", "milestone"}

COLUMNS = ["经号", "顺序", "卷", "所属诵", "字数", "会编号", "备注"]
HUMAN_COLUMNS = ["所属诵", "会编号"]


def local(tag):
    return tag.rsplit("}", 1)[-1] if isinstance(tag, str) else ""


def is_pua(c):
    o = ord(c)
    return 0xE000 <= o <= 0xF8FF or 0xF0000 <= o <= 0x10FFFF


def load_gaiji(root):
    """从文件头 charDecl 读出 私用区字符 → 标准 Unicode 字 的对照。"""
    header = next((c for c in root if local(c.tag) == "teiHeader"), None)
    table = {}
    if header is None:
        return table
    for ch in header.iter():
        if local(ch.tag) != "char":
            continue
        maps = {m.get("type"): (m.text or "").strip() for m in ch if local(m.tag) == "mapping"}
        pua = maps.get("PUA")
        rep = maps.get("unicode") or maps.get("normal_unicode")
        if pua and rep:
            table[chr(int(pua.replace("U+", ""), 16))] = chr(int(rep.replace("U+", ""), 16))
    return table


def squeeze(s):
    """去掉源文件里的硬换行与空白（行号换行不是原文换行）。"""
    return re.sub(r"\s+", "", s)


def walk(e, out):
    tag = local(e.tag)
    if tag not in SKIP:
        if e.text:
            out.append(squeeze(e.text))
        for c in e:
            walk(c, out)
        if tag in ("p", "l"):
            out.append("\n")
        elif tag == "caesura":
            out.append("\u0001")
    if e.tail:
        out.append(squeeze(e.tail))


def extract_text(div):
    out = []
    if div.text:
        out.append(squeeze(div.text))
    for c in div:
        walk(c, out)
    s = "".join(out)
    s = re.sub(r"\n+", "\n", s).strip("\n")
    return s.replace("\u0001", " ")


def parse_label(label):
    """'1' → ('1','1')；'140-141' → ('140','141')；'755-7' → ('755','757')。"""
    m = re.fullmatch(r"(\d+)(?:-(\d+))?", label)
    if not m:
        raise ValueError(f"无法解析经号标签：{label!r}")
    a, b = m.group(1), m.group(2)
    if b is None:
        return a, a
    if len(b) < len(a):             # 缩写，如 755-7、772-4
        b = a[: len(a) - len(b)] + b
    if int(b) < int(a):
        raise ValueError(f"经号范围异常：{label!r}")
    return a, b


def make_id(a, b):
    return f"{CANON}-{int(a):04d}" if a == b else f"{CANON}-{int(a):04d}~{int(b):04d}"


def collect(root, gaiji):
    """按文档顺序收集所有 jing 区块，并记录起始卷。"""
    results = []
    state = {"juan": None}

    def visit(e):
        tag = local(e.tag)
        if tag == "milestone" and e.get("unit") == "juan":
            state["juan"] = e.get("n")
        if tag == "div" and e.get("type") == "jing":
            mulu = next((c for c in e if local(c.tag) == "mulu" and c.get("type") == "經"), None)
            if mulu is None:
                raise ValueError("发现没有目录标签的 jing 区块")
            label = "".join(mulu.itertext()).strip()
            inner_juan = [x.get("n") for x in e.iter() if local(x.tag) == "milestone" and x.get("unit") == "juan"]
            text = extract_text(e)
            replaced = any(ch in gaiji for ch in text)
            if replaced:
                text = text.translate(str.maketrans(gaiji))
            results.append({
                "label": label,
                "juan": state["juan"],
                "inner_juan": inner_juan,
                "text": text,
                "gaiji": replaced,
            })
            return
        for c in e:
            visit(c)

    visit(root)
    return results


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xml", default=str(ROOT / "raw" / "T02n0099.xml"))
    args = ap.parse_args()

    xml_path = Path(args.xml)
    if not xml_path.exists():
        sys.exit(f"找不到 {xml_path}\n请先把 T02n0099.xml 放到 raw/ 目录。")

    print(f"读取 {xml_path} ...")
    root = ET.parse(xml_path).getroot()
    gaiji = load_gaiji(root)
    blocks = collect(root, gaiji)

    # 原样保存文件头（CBETA 要求保留）
    raw = xml_path.read_text(encoding="utf-8")
    i, j = raw.find("<teiHeader"), raw.find("</teiHeader>")
    if i >= 0 and j > i:
        header_path = ROOT / "data" / "T99_teiHeader.xml"
        header_path.parent.mkdir(parents=True, exist_ok=True)
        header_path.write_text(
            "<!-- 摘自 CBETA T02n0099.xml 的 teiHeader，原样保留 -->\n" + raw[i:j + len("</teiHeader>")] + "\n",
            encoding="utf-8")

    # --- 组装记录 ---
    rows = []
    prev_max = 0
    for i, b in enumerate(blocks, start=1):
        a, z = parse_label(b["label"])
        rec = {
            "id": make_id(a, z),
            "start": int(a),
            "end": int(z),
            "order": i,
            "juan": int(b["juan"]) if b["juan"] else "",
            "text": b["text"],
            "notes": [],
        }
        rec["chars"] = len(re.sub(r"[\n ]", "", rec["text"]))
        if a != z:
            rec["notes"].append("合并区块，多个经号共用一段文字")
        if rec["chars"] < SHORT_LIMIT:
            rec["notes"].append(f"略出（不足{SHORT_LIMIT}字，疑为前经省略）")
        if b["inner_juan"]:
            rec["notes"].append("区块内含卷界标记，请核对是否跨卷")
        if b["gaiji"]:
            rec["notes"].append("含造字，已用相近的标准字替代")
        rows.append(rec)

    # 错位检测：经号应随文件顺序递增
    for i, r in enumerate(rows):
        if i > 0 and r["start"] <= max(x["end"] for x in rows[:i]):
            before = rows[i - 1]["id"]
            after = rows[i + 1]["id"] if i + 1 < len(rows) else "末尾"
            r["notes"].append(f"顺序错位：文件中位于 {before} 与 {after} 之间")

    # --- 读取已有 CSV 中的人工填写列 ---
    csv_path = ROOT / "data" / "sutras.csv"
    human = {}
    if csv_path.exists():
        with open(csv_path, encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                human[row.get("经号", "")] = {k: row.get(k, "") for k in HUMAN_COLUMNS}

    # --- 写 CSV ---
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    kept = 0
    with open(csv_path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(COLUMNS)
        for r in rows:
            h = human.get(r["id"], {})
            if any(h.values()):
                kept += 1
            w.writerow([
                r["id"], r["order"], r["juan"],
                h.get("所属诵", ""), r["chars"], h.get("会编号", ""),
                "；".join(r["notes"]),
            ])

    # --- 写每经文本 ---
    out_dir = ROOT / "pipeline" / "out" / "sutras"
    out_dir.mkdir(parents=True, exist_ok=True)
    for r in rows:
        (out_dir / f"{r['id']}.txt").write_text(r["text"] + "\n", encoding="utf-8")

    # --- 校验 ---
    print("\n=== 校验 ===")
    problems = 0

    def check(ok, msg):
        nonlocal problems
        mark = "通过" if ok else "未通过"
        if not ok:
            problems += 1
        print(f"[{mark}] {msg}")

    check(len(rows) == EXPECTED_BLOCKS, f"区块数 {len(rows)}（预期 {EXPECTED_BLOCKS}）")
    covered = set()
    for r in rows:
        covered.update(range(r["start"], r["end"] + 1))
    missing = [n for n in range(1, EXPECTED_LAST + 1) if n not in covered]
    check(not missing, f"经号覆盖 1–{EXPECTED_LAST}" + (f"，缺 {missing}" if missing else ""))
    ids = [r["id"] for r in rows]
    check(len(ids) == len(set(ids)), "经号无重复")
    dirty = [r["id"] for r in rows if re.search(r"[<>&]", r["text"])]
    check(not dirty, "正文无残留标签字符" + (f"：{dirty[:5]}" if dirty else ""))
    pua_left = [r["id"] for r in rows if any(is_pua(c) for c in r["text"])]
    check(not pua_left, "无残留造字（私用区字符）" + (f"：{pua_left[:5]}" if pua_left else ""))
    empty = [r["id"] for r in rows if r["chars"] == 0]
    check(not empty, "无空经文" + (f"：{empty[:5]}" if empty else ""))

    print("\n=== 统计 ===")
    print(f"生成 {len(rows)} 条记录；保留已有人工填写 {kept} 条")
    for key, label in (("合并", "合并区块"), ("略出", "略出"), ("错位", "顺序错位"), ("跨卷", "卷界标记"), ("造字", "含造字替换")):
        hit = [r["id"] for r in rows if any(key in n for n in r["notes"])]
        print(f"{label}：{len(hit)} 条 {hit[:6]}{' ...' if len(hit) > 6 else ''}")

    print("\n=== 抽样 5 条（请对照 CBETA 阅读器核对）===")
    for r in random.sample(rows, 5):
        one_line = r["text"].replace("\n", "｜")
        print(f"{r['id']}（卷{r['juan']}，{r['chars']}字）：{one_line[:50]}……{one_line[-20:]}")

    print(f"\n已写入：{csv_path.relative_to(ROOT)}，{out_dir.relative_to(ROOT)}/")
    if problems:
        sys.exit(f"\n有 {problems} 项校验未通过，请先检查再继续。")


if __name__ == "__main__":
    main()
