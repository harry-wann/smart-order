#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 layout.json 注入 code.template.js，產生 Figma 外掛要吃的 code.js。

用法：python3 build_plugin.py [layout.json]
"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent))
from figma_fullpage import add_fullpage_variants
sys.dont_write_bytecode = True
from figma_prep import load_packages

HERE = pathlib.Path(__file__).resolve().parent
data_path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'layout.json'
tpl = (HERE / 'code.template.js').read_text(encoding='utf-8')
raw = data_path.read_text(encoding='utf-8')
data = json.loads(raw)
add_fullpage_variants(data)
# 工作包（主題、識別色、認領人）以 spec/05 §1.4.2 當下為準，不用 layout.json 量測當時存的那份：
# 改認領人只要重建外掛，不必重量
_, pkgs = load_packages()
data['pkgs'] = pkgs
for f in data['frames']:
    if f.get('pkg') and f['pkg']['id'] in pkgs:
        f['pkg'] = pkgs[f['pkg']['id']]

header = (
    '// 自動產生，請勿手改。改 code.template.js 後重跑 build_plugin.py。\n'
    '// 畫框 %d 個\n' % len(data['frames'])
)
out = header + 'const DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n\n' + tpl
(HERE / 'code.js').write_text(out, encoding='utf-8')
print('code.js 已產生：%.2f MB，畫框 %d 個' % (len(out.encode()) / 1e6, len(data['frames'])))
