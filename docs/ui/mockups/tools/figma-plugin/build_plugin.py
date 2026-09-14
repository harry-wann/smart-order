#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把 layout.json 注入 code.template.js，產生 Figma 外掛要吃的 code.js。

用法：python3 build_plugin.py [layout.json]
"""
import json, pathlib, sys

HERE = pathlib.Path(__file__).resolve().parent
data_path = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'layout.json'
tpl = (HERE / 'code.template.js').read_text(encoding='utf-8')
raw = data_path.read_text(encoding='utf-8')
data = json.loads(raw)

header = (
    '// 自動產生，請勿手改。改 code.template.js 後重跑 build_plugin.py。\n'
    '// 畫框 %d 個\n' % len(data['frames'])
)
out = header + 'const DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n\n' + tpl
(HERE / 'code.js').write_text(out, encoding='utf-8')
print('code.js 已產生：%.2f MB，畫框 %d 個' % (len(out.encode()) / 1e6, len(data['frames'])))
