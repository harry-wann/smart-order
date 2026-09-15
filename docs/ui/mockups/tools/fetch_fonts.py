#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把量測要用的 Noto Sans TC / Noto Serif TC 裝到這台機器上。

設計稿宣告的字型名是 Figma 那邊的名字（Noto Sans TC / Noto Serif TC）。
量測的機器如果沒裝，Chromium 會默默掉到備援字型，量出來的座標就不能用。

用法：
    python3 fetch_fonts.py            # 裝到 ~/.fonts 並更新 fontconfig
    python3 fetch_fonts.py --check    # 只檢查有沒有裝，不下載

需要能連到 raw.githubusercontent.com。
"""
import os, subprocess, sys, urllib.request

FONTS = {
    'NotoSansTC.ttf':  'https://raw.githubusercontent.com/google/fonts/main/ofl/notosanstc/NotoSansTC%5Bwght%5D.ttf',
    'NotoSerifTC.ttf': 'https://raw.githubusercontent.com/google/fonts/main/ofl/notoseriftc/NotoSerifTC%5Bwght%5D.ttf',
}
DEST = os.path.expanduser('~/.fonts')


def installed():
    """fontconfig 看不看得到這兩個家族。"""
    try:
        out = subprocess.run(['fc-list', ':', 'family'], capture_output=True, text=True).stdout
    except FileNotFoundError:
        return set()
    fams = {f.strip() for line in out.splitlines() for f in line.split(',')}
    return {n for n in ('Noto Sans TC', 'Noto Serif TC') if n in fams}


def main():
    have = installed()
    if '--check' in sys.argv:
        missing = {'Noto Sans TC', 'Noto Serif TC'} - have
        print('已安裝：', ', '.join(sorted(have)) or '（無）')
        if missing:
            print('缺少：', ', '.join(sorted(missing)))
            sys.exit(1)
        print('量測字型齊全。')
        return

    os.makedirs(DEST, exist_ok=True)
    for name, url in FONTS.items():
        path = os.path.join(DEST, name)
        if os.path.exists(path) and os.path.getsize(path) > 1_000_000:
            print('已存在，略過：', name)
            continue
        print('下載', name, '…')
        urllib.request.urlretrieve(url, path)
        print('  %.1f MB' % (os.path.getsize(path) / 1e6))
    subprocess.run(['fc-cache', '-f'], capture_output=True)
    have = installed()
    print('fontconfig 現在看得到：', ', '.join(sorted(have)) or '（無）')
    if {'Noto Sans TC', 'Noto Serif TC'} - have:
        sys.exit('字型裝了但 fontconfig 沒認到，檢查 %s' % DEST)


if __name__ == '__main__':
    main()
