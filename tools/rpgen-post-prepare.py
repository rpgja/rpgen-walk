"""rpgen-post.js に渡す post/ フォルダを作る。

使い方: python tools/rpgen-post-prepare.py <バッチのフォルダ>
<バッチ>/posts.json（file はバッチからの相対パス）を読み、PNG の大きさを確かめてから
<バッチ>/post/ に PNG と posts.json（file はファイル名だけ）をまとめる。

posts.json の例:
{"label": "ずんだもん関連キャラ", "frame": [16, 16], "thumb": [0, 32],
 "items": [{"title": "ずんだもん", "file": "out/zundamon.png", "site": "https://..."}]}
site（作者のサイト）は省略可。投稿後にそのアニメーションのページへ設定する。
"""
import json
import shutil
import struct
import sys
from pathlib import Path


def png_size(path):
    head = path.read_bytes()[:24]
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"PNG ではありません: {path}")
    return struct.unpack(">II", head[16:24])


def main():
    batch = Path(sys.argv[1])
    man = json.loads((batch / "posts.json").read_text(encoding="utf-8"))
    fw, fh = man.get("frame", [16, 16])
    tx, ty = man.get("thumb", [0, 0])
    out = batch / "post"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir()
    names = set()
    items = []
    for it in man["items"]:
        src = batch / it["file"]
        w, h = png_size(src)
        if w % fw or h % fh or tx + fw > w or ty + fh > h:
            raise SystemExit(f"{src} の大きさ {w}x{h} が frame {fw}x{fh} / thumb {tx},{ty} と合いません")
        if src.name in names:
            raise SystemExit(f"ファイル名が重なっています: {src.name}")
        names.add(src.name)
        shutil.copyfile(src, out / src.name)
        items.append({**it, "file": src.name})   # site（作者のサイト）なども そのまま渡す
        print(f"{it['title']}\t{src.name}\t{w}x{h}")
    man = {**man, "items": items}
    (out / "posts.json").write_text(json.dumps(man, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(items)}体 → {out}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
