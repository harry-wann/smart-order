#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""為有捲動溢位的顧客端畫面產生整頁展開副本。"""
from copy import deepcopy


FULLPAGE_SUFFIX = '・整頁展開'
CUSTOMER_BATCH = '01-customer-375'
REV_BATCH_PREFIX = 'rev-'          # figma_prep 的修訂稿批次；顧客端那幾張也要有整頁版
CUSTOMER_PAGE = '02 顧客端'
MIN_OVERFLOW = 1.0


def add_fullpage_variants(data):
    """在 layout 資料中，將有溢位的顧客端 scroll 畫面複製成完整高度版本。

    原畫面仍保留固定視窗高度與裁切；副本會延長 scroll/root，並把貼齊
    scroll 底部的固定操作列移到內容下方。flow_i 加 0.5，讓兩版相鄰。
    """
    frames = data['frames']
    base_frames = [f for f in frames if not f['name'].endswith(FULLPAGE_SUFFIX)]
    variants = []

    for source in base_frames:
        batch = source.get('batch', '')
        rev_customer = (batch.startswith(REV_BATCH_PREFIX)
                        and source.get('page') == CUSTOMER_PAGE)
        if batch != CUSTOMER_BATCH and not rev_customer:
            continue

        root = source.get('root', {})
        scrolls = [n for n in root.get('ch', [])
                   if n.get('t') == 'frame' and n.get('n') == 'scroll']
        if len(scrolls) != 1:
            continue

        scroll = scrolls[0]
        content_bottom = max(
            (child.get('y', 0) + child.get('h', 0)
             for child in scroll.get('ch', [])),
            default=0,
        )
        overflow = content_bottom - scroll.get('h', 0)
        if overflow <= MIN_OVERFLOW:
            continue

        full = deepcopy(source)
        full['name'] += FULLPAGE_SUFFIX
        full['flow_i'] = source.get('flow_i', 0) + 0.5
        full_root = full['root']
        full_scroll = next(n for n in full_root['ch'] if n.get('n') == 'scroll')
        old_scroll_bottom = full_scroll['y'] + full_scroll['h']
        full_scroll['h'] += overflow
        full_scroll['clip'] = 0
        full_root['h'] += overflow
        full['h'] += overflow

        for sibling in full_root['ch']:
            if sibling is full_scroll:
                continue
            if sibling.get('y', 0) >= old_scroll_bottom - MIN_OVERFLOW:
                sibling['y'] += overflow

        variants.append(full)

    # Build 一律由原始 layout.json 輸入；先移除舊副本也能讓函式可重複呼叫。
    data['frames'] = base_frames + variants
    return data
