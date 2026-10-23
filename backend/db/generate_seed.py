#!/usr/bin/env python3
"""產生 backend/db/seed.sql（smartorder 基礎版的假資料）。

    python3 backend/db/generate_seed.py

時間一律寫成「執行 seed.sql 當下的台灣時間 ± N 分鐘」或「今天 ± N 天的幾點」，
所以同一份 seed.sql 哪一天匯入都看得到「現在正在用餐的桌」「30 分鐘內要到的訂位」。
亂數固定種子，重跑結果相同；改資料請改這支程式再重新產生，不要直接改 seed.sql。
"""

import os
import random
import uuid
from decimal import Decimal, ROUND_HALF_UP

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'seed.sql')
rng = random.Random(20261005)

# 員工密碼都是 1234（BCrypt，已用 Spring Security 的 BCryptPasswordEncoder 驗證過）
PASSWORD_1234 = '$2a$10$z6KItWPQbUzACtJJfbNzZeFDJ7N8FvQK9ICGHUrtzkfPKkS12S7pW'

DINING_MINUTES = 100   # reservation.dining-minutes
BUFFER_MINUTES = 15    # reservation.buffer-minutes


# ── SQL 小工具 ───────────────────────────────────────────────────────────────

def q(v):
    if v is None:
        return 'NULL'
    if isinstance(v, bool):
        return '1' if v else '0'
    if isinstance(v, (int, Decimal)):
        return str(v)
    if isinstance(v, Raw):
        return v.sql
    return "'" + str(v).replace('\\', '\\\\').replace("'", "''") + "'"


class Raw:
    def __init__(self, sql):
        self.sql = sql


def now(minutes=0):
    """現在 ± N 分鐘。"""
    if minutes == 0:
        return Raw('@now')
    sign = '+' if minutes > 0 else '-'
    return Raw(f'(@now {sign} INTERVAL {abs(minutes)} MINUTE)')


def now_min(minutes):
    """現在 ± N 分鐘，秒數歸零（訂位時間用）。"""
    return Raw(f"CAST(DATE_FORMAT({now(minutes).sql}, '%Y-%m-%d %H:%i:00') AS DATETIME(3))")


def day(days, hhmm, plus_minutes=0):
    """今天 ± N 天的 HH:MM，再加 N 分鐘。"""
    base = f"TIMESTAMP(@today {'+' if days >= 0 else '-'} INTERVAL {abs(days)} DAY, '{hhmm}:00')"
    if plus_minutes:
        return Raw(f'({base} + INTERVAL {plus_minutes} MINUTE)')
    return Raw(base)


def plus(raw, minutes):
    sign = '+' if minutes >= 0 else '-'
    return Raw(f'({raw.sql} {sign} INTERVAL {abs(minutes)} MINUTE)')


class Table:
    def __init__(self, name, cols):
        self.name, self.cols, self.rows = name, cols, []

    def add(self, **kw):
        self.rows.append([kw.get(c) for c in self.cols])

    def sql(self):
        if not self.rows:
            return ''
        head = f"INSERT INTO {self.name} ({', '.join(self.cols)}) VALUES\n"
        body = ',\n'.join('  (' + ', '.join(q(v) for v in r) + ')' for r in self.rows)
        return head + body + ';\n'


def token():
    return '%064x' % rng.getrandbits(256)


def device():
    return str(uuid.UUID(int=rng.getrandbits(128), version=4))


# ── 帳號 ─────────────────────────────────────────────────────────────────────

staff = Table('staff', ['id', 'username', 'password_hash', 'display_name', 'role', 'active'])
STAFF = [
    (1, 'manager', '王店長', 'MANAGER'),
    (2, 'counter', '小美', 'COUNTER'),
    (3, 'kitchen', '廚房 1 號機', 'KITCHEN'),
    (4, 'kai', '阿凱', 'COUNTER'),
]
for sid, user, name, role in STAFF:
    staff.add(id=sid, username=user, password_hash=PASSWORD_1234, display_name=name, role=role, active=1)

member = Table('member', ['id', 'phone', 'nickname', 'gender', 'birth_date', 'profile_completed', 'status', 'created_at'])
MEMBERS = [
    # (手機, 暱稱, 性別, 生日, 入會幾天前)
    ('0912345678', '陳小美', 'FEMALE', '1998-04-21', 750),
    ('0922111222', '王大明', 'MALE', '1990-08-02', 610),
    ('0933221100', '林雅婷', 'FEMALE', '1995-11-13', 540),
    ('0911876543', '張志豪', 'MALE', '1987-02-27', 500),
    ('0955123987', '黃怡君', 'FEMALE', '2000-06-30', 470),
    ('0966778899', '李承恩', 'MALE', '1979-12-05', 430),
    ('0977345612', '吳佩珊', 'FEMALE', '1983-03-18', 400),
    ('0988456723', '蔡宗翰', 'MALE', '1972-09-09', 380),
    ('0919234567', '鄭欣怡', 'FEMALE', '1996-01-25', 350),
    ('0928765432', '周冠宇', 'MALE', '1992-07-14', 330),
    ('0937654321', '許詩涵', 'FEMALE', '1965-05-03', 300),
    ('0918345678', '謝明哲', 'MALE', '1985-10-21', 280),
    ('0926123456', '劉品妤', 'FEMALE', '2001-02-11', 260),
    ('0936987654', '楊凱文', 'MALE', '1968-04-07', 240),
    ('0958234561', '洪郁婷', 'FEMALE', '1993-12-29', 220),
    ('0968345127', '郭家銘', 'MALE', '1976-08-16', 200),
    ('0978123654', '曾心怡', 'FEMALE', '1999-03-08', 180),
    ('0989654123', '邱建宏', 'MALE', '1981-11-30', 160),
    ('0915678234', '廖婉婷', 'FEMALE', '1988-06-19', 140),
    ('0925876123', '賴俊傑', 'MALE', '1960-01-02', 120),
    ('0935789012', '徐雅雯', 'FEMALE', '1997-09-23', 100),
    ('0957890123', '蕭志明', 'MALE', '1974-02-14', 80),
    ('0967901234', '葉怡萱', 'FEMALE', '2002-05-17', 60),
    ('0979012345', '潘柏翰', 'MALE', '1991-12-12', 45),
    ('0987123450', '簡筱涵', 'FEMALE', '1994-04-04', 30),
    ('0916234098', None, None, None, 20),   # C-13 選「跳過，只留手機」
    ('0927345109', None, None, None, 14),
    ('0938456210', '阿翔', 'OTHER', None, 9),
    ('0959567321', None, None, None, 5),
    ('0969678432', '小芸', 'FEMALE', '2003-07-07', 2),
]
for i, (phone, nick, gender, birth, days_ago) in enumerate(MEMBERS, start=1):
    member.add(id=i, phone=phone, nickname=nick, gender=gender, birth_date=birth,
               profile_completed=1 if nick else 0, status='ACTIVE', created_at=day(-days_ago, '15:20'))


def member_name(mid):
    return MEMBERS[mid - 1][1] or '會員'


def member_phone(mid):
    return MEMBERS[mid - 1][0]


# ── 菜單 ─────────────────────────────────────────────────────────────────────

category = Table('menu_category', ['id', 'name', 'sort_order', 'active'])
CATEGORIES = ['鍋底', '肉品', '海鮮', '蔬菜', '火鍋料', '主食', '飲料', '酒類']
for i, name in enumerate(CATEGORIES, start=1):
    category.add(id=i, name=name, sort_order=i, active=1)
CAT = {n: i for i, n in enumerate(CATEGORIES, start=1)}

# (分類, 名稱, 價格, 說明, 旗標)
#   旗標：soup 鍋底、refill 免費續加、veg 素食、beef 含牛、child 兒童友善、adult 限成人、
#         spicyN 辣度、off 下架、soldout 售完、low 低量
MENU = [
    ('鍋底', '招牌麻辣鍋底', 480, '牛油與 18 種辛香料慢炒，附鴨血豆腐。', 'soup spicy2 beef'),
    ('鍋底', '酸菜白肉鍋底', 420, '自家醃漬兩週的酸白菜，湯頭酸香不嗆。', 'soup'),
    ('鍋底', '昆布鍋底', 380, '北海道昆布熬底，清甜好入口，素食可點。', 'soup veg'),
    ('鍋底', '鴛鴦鍋底', 0, '左右各選一種湯底，價格依所選湯底計算。', 'soup'),
    ('肉品', '安格斯霜降牛五花', 380, '厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。', 'beef'),
    ('肉品', '伊比利豬梅花', 320, '頸肩帶油花的部位，久涮也不柴，小朋友咬得動。', 'child'),
    ('肉品', '紐西蘭小羔羊肩', 340, '無騷味，附自製薄荷沾醬。', 'soldout'),
    ('肉品', '台灣松阪豬', 300, '一頭豬只有兩片的部位，脆度來自筋膜，涮 15 秒剛好。', ''),
    ('肉品', '美國老饕牛小排', 520, '帶筋的牛小排，口感紮實。', 'beef low'),
    ('肉品', '霜降牛舌', 460, '切薄片快涮，口感脆彈。', 'beef off'),
    ('肉品', '雪花牛肋條', 420, '肋條油脂豐富，適合重口味湯底。', 'beef'),
    ('肉品', '澳洲和牛 M9', 880, '每日限量，油花細緻。', 'beef soldout'),
    ('肉品', '梅花豬薄片', 260, '價格親民的經典豬肉片。', 'child'),
    ('肉品', '去骨雞腿肉', 240, '去皮去骨，小朋友也好入口。', 'child'),
    ('肉品', '櫻桃鴨胸', 280, '帶皮鴨胸切片，涮到粉紅最嫩。', ''),
    ('肉品', '伊比利豬五花', 340, '油花多、香氣足，適合麻辣湯底。', ''),
    ('海鮮', '極鮮海陸雙拼', 560, '牛五花與鮮蝦、干貝的雙拼盤。', 'beef'),
    ('海鮮', '海鮮拼盤', 520, '蝦、蛤蜊、透抽、魚片一次吃到。', ''),
    ('海鮮', '活白蝦', 360, '每日現撈，8 尾一份。', ''),
    ('海鮮', '北海道干貝', 380, '生食級干貝，輕涮即可。', 'soldout'),
    ('海鮮', '鮮蚵', 220, '產地直送，涮 30 秒。', ''),
    ('海鮮', '透抽', 240, '切圈處理，脆口。', ''),
    ('海鮮', '鯛魚片', 200, '無刺魚片，小朋友也能吃。', 'child'),
    ('海鮮', '蛤蜊', 180, '吐沙處理過，加進湯底更鮮。', ''),
    ('海鮮', '鮭魚片', 300, '厚切鮭魚，涮到半熟最好吃。', ''),
    ('蔬菜', '時蔬八品', 220, '當季蔬菜八種，份量適合 2–3 人。', 'veg'),
    ('蔬菜', '高麗菜', 160, '高山高麗菜，甜度高。', 'veg'),
    ('蔬菜', '茼蒿', 120, '火鍋必備，香氣足。', 'veg'),
    ('蔬菜', '金針菇', 100, '', 'veg'),
    ('蔬菜', '杏鮑菇', 100, '', 'veg'),
    ('蔬菜', '玉米', 90, '甜玉米切段。', 'veg child'),
    ('蔬菜', '芋頭', 110, '大甲芋頭，煮久更綿。', 'veg'),
    ('蔬菜', '凍豆腐', 80, '吸飽湯汁最好吃。', 'veg'),
    ('蔬菜', '菠菜', 120, '', 'veg'),
    ('蔬菜', '綜合菇菇', 180, '四種菇類一盤。', 'veg'),
    ('火鍋料', '手工丸子', 160, '豬肉丸、香菇丸、貢丸綜合。', ''),
    ('火鍋料', '蛋餃', 120, '', 'child'),
    ('火鍋料', '魚餃', 120, '', ''),
    ('火鍋料', '燕餃', 130, '', ''),
    ('火鍋料', '新竹貢丸', 120, '', 'child'),
    ('火鍋料', '花枝丸', 150, '', ''),
    ('火鍋料', '起司球', 140, '咬下去會爆漿，小心燙口。', 'child'),
    ('火鍋料', '豬血糕', 90, '', ''),
    ('火鍋料', '炸豆皮', 100, '', 'veg'),
    ('火鍋料', '鴨血', 100, '', 'spicy1'),
    ('火鍋料', '甜不辣', 90, '', 'child'),
    ('主食', '白飯', 0, '免費續加，跟服務生說就好。', 'refill'),
    ('主食', '冬粉', 0, '免費續加。', 'refill veg'),
    ('主食', '王子麵', 30, '', ''),
    ('主食', '烏龍麵', 50, '', ''),
    ('主食', '鍋燒意麵', 50, '', ''),
    ('主食', '雞蛋', 20, '', 'child'),
    ('飲料', '酸梅湯', 0, '店內熬煮，免費續杯。', 'refill veg'),
    ('飲料', '古早味紅茶', 60, '', 'veg'),
    ('飲料', '冬瓜檸檬', 70, '', 'veg'),
    ('飲料', '可樂', 50, '', 'veg'),
    ('飲料', '雪碧', 50, '', 'veg'),
    ('飲料', '柳橙汁', 80, '', 'veg child'),
    ('飲料', '烏龍茶', 60, '', 'veg'),
    ('飲料', '礦泉水', 30, '', 'veg'),
    ('酒類', '台灣啤酒', 120, '', 'adult'),
    ('酒類', '金牌啤酒', 130, '', 'adult'),
    ('酒類', '金門高粱', 350, '', 'adult'),
    ('酒類', '梅酒', 180, '', 'adult'),
]

menu_item = Table('menu_item', ['id', 'category_id', 'name', 'description', 'price', 'image_url', 'is_soup_base',
                                'track_inventory', 'is_refill', 'suitable_for', 'spicy_level', 'is_vegetarian',
                                'contains_beef', 'sold_out', 'sort_order', 'active'])
ITEM = {}          # 名稱 → (id, 價格, 旗標)
sort_in_cat = {}
for i, (cat, name, price, desc, flags) in enumerate(MENU, start=1):
    f = set(flags.split())
    sort_in_cat[cat] = sort_in_cat.get(cat, 0) + 1
    spicy = next((int(x[-1]) for x in f if x.startswith('spicy')), 0)
    suitable = 'CHILD' if 'child' in f else 'ADULT' if 'adult' in f else 'ALL'
    menu_item.add(id=i, category_id=CAT[cat], name=name, description=desc or None, price=Decimal(price),
                  image_url=None, is_soup_base=int('soup' in f), track_inventory=int('refill' not in f),
                  is_refill=int('refill' in f), suitable_for=suitable, spicy_level=spicy,
                  is_vegetarian=int('veg' in f), contains_beef=int('beef' in f),
                  sold_out=int('soldout' in f), sort_order=sort_in_cat[cat], active=int('off' not in f))
    ITEM[name] = (i, Decimal(price), f)

# 選項群組
option_group = Table('option_group', ['id', 'name', 'min_select', 'max_select', 'sort_order'])
option_value = Table('option_value', ['id', 'option_group_id', 'name', 'price_delta', 'sort_order', 'active'])
GROUPS = [
    # (名稱, min, max, [(選項, 價差, 啟用)])
    ('份量', 1, 1, [('半份 約 120g', 0, 1), ('全份 約 220g', 80, 1), ('加大 約 320g', 160, 0)]),
    ('辣度', 0, 1, [('不辣', 0, 1), ('小辣', 0, 1), ('中辣', 0, 1), ('大辣', 0, 1)]),
    ('加點配料', 0, 5, [('加蔥花', 10, 1), ('加蒜泥', 10, 1), ('加辣油', 10, 1), ('加沙茶', 15, 1),
                       ('加蛋黃', 15, 1), ('加香菜', 10, 1)]),
    ('左鍋湯底', 1, 1, [('麻辣', 260, 1), ('酸菜白肉', 230, 1), ('昆布', 210, 1)]),
    ('右鍋湯底', 1, 1, [('麻辣', 260, 1), ('酸菜白肉', 230, 1), ('昆布', 210, 1)]),
    ('冰塊', 1, 1, [('正常冰', 0, 1), ('少冰', 0, 1), ('去冰', 0, 1), ('常溫', 0, 1)]),
]
GROUP = {}         # 群組名 → (id, [(value_id, 名稱, 價差, 啟用)])
vid = 0
for gi, (gname, mn, mx, values) in enumerate(GROUPS, start=1):
    option_group.add(id=gi, name=gname, min_select=mn, max_select=mx, sort_order=gi)
    vals = []
    for si, (vname, delta, active) in enumerate(values, start=1):
        vid += 1
        option_value.add(id=vid, option_group_id=gi, name=vname, price_delta=Decimal(delta), sort_order=si, active=active)
        vals.append((vid, vname, Decimal(delta), active))
    GROUP[gname] = (gi, vals)

miog = Table('menu_item_option_group', ['menu_item_id', 'option_group_id', 'sort_order'])
ITEM_GROUPS = {}   # item id → [群組名]


def attach(item_name, *groups):
    iid = ITEM[item_name][0]
    for g in groups:
        ITEM_GROUPS.setdefault(iid, []).append(g)
        miog.add(menu_item_id=iid, option_group_id=GROUP[g][0], sort_order=len(ITEM_GROUPS[iid]))


for cat, name, *_ in MENU:
    if cat in ('肉品', '海鮮') and name not in ('極鮮海陸雙拼', '海鮮拼盤'):
        attach(name, '份量')
for name in ('招牌麻辣鍋底', '鴛鴦鍋底'):
    attach(name, '辣度')
for cat, name, *_ in MENU:
    if cat in ('火鍋料', '海鮮'):
        attach(name, '辣度')
for cat, name, *_ in MENU:
    if cat in ('肉品', '海鮮') or name in ('時蔬八品', '高麗菜', '綜合菇菇', '金針菇', '杏鮑菇'):
        attach(name, '加點配料')
attach('鴛鴦鍋底', '左鍋湯底', '右鍋湯底')
for cat, name, *_ in MENU:
    if cat == '飲料' and name != '礦泉水':
        attach(name, '冰塊')

# 庫存（續加品不計庫存）
inventory = Table('inventory_item', ['id', 'menu_item_id', 'quantity', 'low_threshold'])
inv_id = 0
for cat, name, *_ in MENU:
    iid, _, f = ITEM[name]
    if 'refill' in f:
        continue
    inv_id += 1
    qty = 0 if 'soldout' in f else 6 if 'low' in f else rng.randint(20, 100)
    if 'soup' in f:
        qty = rng.randint(60, 100)
    inventory.add(id=inv_id, menu_item_id=iid, quantity=qty, low_threshold=10)

# ── 桌位 ─────────────────────────────────────────────────────────────────────

dining_table = Table('dining_table', ['id', 'table_no', 'seats', 'area', 'status', 'reservable', 'active'])
TABLES = [
    ('A01', 2, 'A 區・窗邊', 1), ('A02', 2, 'A 區・窗邊', 1), ('A03', 4, 'A 區・窗邊', 1),
    ('A04', 4, 'A 區・窗邊', 1), ('A05', 4, 'A 區・走道', 0), ('A06', 6, 'A 區・走道', 1),
    ('A07', 4, 'A 區・走道', 0), ('A08', 4, 'A 區・窗邊', 1),
    ('B01', 4, 'B 區', 1), ('B02', 2, 'B 區', 1), ('B03', 4, 'B 區', 1),
    ('B04', 4, 'B 區', 1), ('B05', 2, 'B 區', 0), ('B06', 4, 'B 區', 0),
    ('C01', 8, 'C 包廂', 1), ('C02', 8, 'C 包廂', 1), ('C03', 6, 'C 包廂', 1), ('C04', 4, 'C 包廂', 0),
]
TID = {t[0]: i for i, t in enumerate(TABLES, start=1)}
SEATS = {t[0]: t[1] for t in TABLES}
RESERVABLE = [t[0] for t in TABLES if t[3]]
TABLE_STATUS = {t[0]: 'AVAILABLE' for t in TABLES}
TABLE_STATUS.update({'A02': 'OCCUPIED', 'A03': 'OCCUPIED', 'B01': 'OCCUPIED', 'B03': 'OCCUPIED',
                     'C01': 'OCCUPIED', 'A05': 'CLEANING', 'A07': 'CLEANING'})
for i, (no, seats, area, reservable) in enumerate(TABLES, start=1):
    dining_table.add(id=i, table_no=no, seats=seats, area=area, status=TABLE_STATUS[no],
                     reservable=reservable, active=1)

# ── 訂位、用餐、點餐 ─────────────────────────────────────────────────────────

reservation = Table('reservation', ['id', 'member_id', 'contact_name', 'contact_phone', 'contact_email', 'start_time',
                                    'end_time', 'adult_count', 'child_count', 'party_size', 'table_id', 'status',
                                    'access_token', 'cancelled_at', 'cancelled_by_staff_id', 'cancel_source',
                                    'created_at'])
waitlist = Table('waitlist', ['id', 'ticket_no', 'contact_name', 'contact_phone', 'adult_count', 'child_count',
                              'party_size', 'status', 'called_at', 'seated_at', 'dining_session_id', 'created_at'])
session = Table('dining_session', ['id', 'table_id', 'member_id', 'reservation_id', 'waitlist_id', 'session_token',
                                   'adult_count', 'child_count', 'status', 'subtotal', 'service_fee', 'total',
                                   'cart_version', 'opened_at', 'closed_at', 'created_at'])
guest = Table('dining_session_guest', ['id', 'dining_session_id', 'device_id', 'display_name', 'member_id', 'joined_at',
                                       'created_at'])
cart_item = Table('cart_item', ['id', 'dining_session_id', 'menu_item_id', 'quantity', 'note', 'unit_price',
                                'added_by_guest_id', 'created_at'])
cart_item_option = Table('cart_item_option', ['cart_item_id', 'option_value_id'])
ticket = Table('order_ticket', ['id', 'dining_session_id', 'sequence_no', 'status', 'source', 'submitted_by_guest_id',
                                'placed_at', 'cancel_reason', 'created_at'])
order_item = Table('order_item', ['id', 'order_ticket_id', 'menu_item_id', 'item_name_snapshot', 'unit_price_snapshot',
                                  'options_price', 'quantity', 'line_total', 'note', 'status', 'cancel_reason',
                                  'served_at', 'created_at'])
order_item_option = Table('order_item_option', ['id', 'order_item_id', 'group_name_snapshot', 'value_name_snapshot',
                                                'price_delta', 'created_at'])
payment = Table('payment', ['id', 'dining_session_id', 'method', 'amount', 'status', 'paid_at', 'created_at'])

ids = {k: 0 for k in ('res', 'wait', 'sess', 'guest', 'cart', 'ticket', 'item', 'opt', 'pay')}


def nid(k):
    ids[k] += 1
    return ids[k]


def add_reservation(start, table, party, status='CONFIRMED', mid=None, name=None, phone=None, email=None,
                    child=0, created=None, cancelled_at=None, cancel_source=None, staff_id=None):
    rid = nid('res')
    reservation.add(id=rid, member_id=mid, contact_name=name or member_name(mid), contact_phone=phone or member_phone(mid),
                    contact_email=email, start_time=start, end_time=plus(start, DINING_MINUTES + BUFFER_MINUTES),
                    adult_count=party - child, child_count=child, party_size=party,
                    table_id=None if status == 'CANCELLED' else (TID[table] if table else None), status=status,
                    access_token=token(), cancelled_at=cancelled_at, cancelled_by_staff_id=staff_id,
                    cancel_source=cancel_source, created_at=created or plus(start, -60 * 24 * 3))
    return rid


def pick_options(iid):
    """依品項掛的群組挑選項，回傳 [(value_id, 群組名, 選項名, 價差)]。"""
    chosen = []
    for g in ITEM_GROUPS.get(iid, []):
        gid, vals = GROUP[g]
        active = [v for v in vals if v[3]]
        if g == '份量':
            v = active[rng.choice([0, 1, 1])]
            chosen.append((v[0], g, v[1], v[2]))
        elif g in ('辣度', '冰塊'):
            if g == '冰塊' or rng.random() < 0.5:
                v = rng.choice(active)
                chosen.append((v[0], g, v[1], v[2]))
        elif g == '加點配料':
            for v in rng.sample(active, rng.choice([0, 0, 0, 1, 2])):
                chosen.append((v[0], g, v[1], v[2]))
        else:  # 左／右鍋湯底
            v = rng.choice(active)
            chosen.append((v[0], g, v[1], v[2]))
    return chosen


class Sess:
    def __init__(self, sid):
        self.sid, self.subtotal, self.seq = sid, Decimal(0), 0


def add_ticket(s, placed, lines, status, guest_id=None, source='CUSTOMER', served_after=6):
    """lines：[(品名, 數量, 狀態, 選項或 None, 備註, 取消原因)]，選項 None 表示隨機挑。"""
    s.seq += 1
    tid = nid('ticket')
    ticket.add(id=tid, dining_session_id=s.sid, sequence_no=s.seq, status=status, source=source,
               submitted_by_guest_id=guest_id, placed_at=placed, cancel_reason=None, created_at=placed)
    for n, (name, qty, st, opts, note, reason) in enumerate(lines):
        iid, price, _ = ITEM[name]
        if opts is None:
            opts = pick_options(iid)
        else:
            resolved = []
            for g, vname in opts:
                v = next(v for v in GROUP[g][1] if v[1] == vname)
                resolved.append((v[0], g, v[1], v[2]))
            opts = resolved
        options_price = sum((o[3] for o in opts), Decimal(0))
        line_total = (price + options_price) * qty
        oid = nid('item')
        order_item.add(id=oid, order_ticket_id=tid, menu_item_id=iid, item_name_snapshot=name,
                       unit_price_snapshot=price, options_price=options_price, quantity=qty, line_total=line_total,
                       note=note, status=st, cancel_reason=reason,
                       served_at=plus(placed, served_after + n * 2) if st == 'SERVED' else None, created_at=placed)
        for vid_, g, vname, delta in opts:
            order_item_option.add(id=nid('opt'), order_item_id=oid, group_name_snapshot=g,
                                  value_name_snapshot=vname, price_delta=delta, created_at=placed)
        if st != 'CANCELLED':
            s.subtotal += line_total
    return tid


def add_session(table, opened, adults, children, status='OPEN', closed=None, rid=None, wid=None, cart_version=0):
    sid = nid('sess')
    s = Sess(sid)
    s.row = dict(id=sid, table_id=TID[table], member_id=None, reservation_id=rid, waitlist_id=wid,
                 session_token=token(), adult_count=adults, child_count=children, status=status,
                 cart_version=cart_version, opened_at=opened, closed_at=closed, created_at=opened)
    return s


def add_guest(s, joined, name, mid=None):
    # guest_token_hash 不寫，維持 NULL：X-Guest-Token 只在 join 時由後端簽發，假資料的 guest 沒有人拿得到原始值；
    # device_id 只是顯示用的提示。要操作購物車請用手機掃碼加入，會建立新的 guest。
    gid = nid('guest')
    guest.add(id=gid, dining_session_id=s.sid, device_id=device(), display_name=name, member_id=mid, joined_at=joined,
              created_at=joined)
    return gid


def finish_session(s, pay_method=None, paid_at=None):
    fee = (s.subtotal * Decimal('0.10')).quantize(Decimal('0.01'), ROUND_HALF_UP)  # M6：setScale(2, HALF_UP)
    s.row.update(subtotal=s.subtotal, service_fee=fee, total=s.subtotal + fee)
    session.add(**s.row)
    if pay_method:
        payment.add(id=nid('pay'), dining_session_id=s.sid, method=pay_method, amount=s.subtotal + fee,
                    status='SUCCESS', paid_at=paid_at, created_at=paid_at)


SOUPS = ['招牌麻辣鍋底', '酸菜白肉鍋底', '昆布鍋底', '鴛鴦鍋底']
MAINS = [n for c, n, *_ in MENU if c in ('肉品', '海鮮') and 'soldout' not in ITEM[n][2] and 'off' not in ITEM[n][2]]
SIDES = [n for c, n, *_ in MENU if c in ('蔬菜', '火鍋料', '主食', '飲料')]


def random_child(party):
    return rng.choice([0, 0, 0, 1, 2]) if party >= 3 else 0


def random_history_session(table, opened, party, child, rid=None, mid=None):
    """過去已結帳的一場用餐：1–3 張單、全部已出餐、櫃檯結清。人數與訂位一致。"""
    s = add_session(table, opened, party - child, child, status='PAID')
    s.row['reservation_id'] = rid
    guests = [add_guest(s, plus(opened, 1), member_name(mid) if mid else '客人 1', mid)]
    if party >= 2:
        guests.append(add_guest(s, plus(opened, 2), '客人 2'))
    placed = plus(opened, 3)
    first = [(rng.choice(SOUPS), 1, 'SERVED', None, None, None)]
    first += [(n, 1, 'SERVED', None, None, None) for n in rng.sample(MAINS, min(party, 4))]
    first += [(n, rng.randint(1, 2), 'SERVED', None, None, None) for n in rng.sample(SIDES, 3)]
    add_ticket(s, placed, first, 'SERVED', guest_id=rng.choice(guests))
    for k in range(rng.choice([0, 1, 2])):
        lines = [(n, 1, 'SERVED', None, None, None) for n in rng.sample(MAINS + SIDES, rng.randint(1, 3))]
        add_ticket(s, plus(opened, 25 + k * 20), lines, 'SERVED', guest_id=rng.choice(guests))
    closed = plus(opened, rng.randint(80, 110))
    s.row['closed_at'] = closed
    finish_session(s, rng.choice(['CASH', 'CASH', 'CARD', 'CARD', 'BARCODE']), closed)
    return s.sid


# 1) 過去的訂位與用餐（近 60 天）
#    陳小美（會員 1）：已完成 8 筆、已取消 1 筆、逾時未到 1 筆 → C-19「已完成 8／已取消 2」
busy = {}   # (天, 桌號) → [(開始分鐘, 結束分鐘)]


def free(d, table, start_min, length=DINING_MINUTES + BUFFER_MINUTES):
    for a, b in busy.get((d, table), []):
        if start_min < b and a < start_min + length:
            return False
    return True


def book(d, table, start_min, length=DINING_MINUTES + BUFFER_MINUTES):
    busy.setdefault((d, table), []).append((start_min, start_min + length))


def hhmm(m):
    return f'{m // 60:02d}:{m % 60:02d}'


def best_table(d, party, start_min, reservable_only=True):
    pool = RESERVABLE if reservable_only else [t[0] for t in TABLES]
    for t in sorted(pool, key=lambda t: (SEATS[t], t)):
        if SEATS[t] >= party and free(d, t, start_min):
            return t
    return None


SLOTS = [17 * 60, 17 * 60 + 30, 18 * 60, 18 * 60 + 30, 19 * 60]

for d in (-2, -5, -9, -15, -22, -30, -41, -55):
    party = rng.choice([2, 2, 3, 4])
    m = rng.choice(SLOTS)
    t = best_table(d, party, m)
    book(d, t, m)
    start = day(d, hhmm(m))
    child = random_child(party)
    rid = add_reservation(start, t, party, 'SEATED', mid=1, child=child, created=day(d - 3, '21:10'))
    random_history_session(t, plus(start, rng.randint(-5, 8)), party, child, rid=rid, mid=1)

rid_cancel = add_reservation(day(-12, '18:30'), None, 2, 'CANCELLED', mid=1, created=day(-16, '20:00'),
                             cancelled_at=day(-13, '12:05'), cancel_source='CUSTOMER')
t = best_table(-19, 4, 18 * 60)
book(-19, t, 18 * 60)
add_reservation(day(-19, '18:00'), t, 4, 'NO_SHOW', mid=1, created=day(-22, '10:30'))

#    其他人過去 7 天：訂位報到、逾時未到、取消，加上現場客
OTHERS = list(range(2, 26))
for d in range(-7, 0):
    for _ in range(3):
        mid = rng.choice(OTHERS)
        party = rng.choice([2, 2, 3, 4, 4, 5, 6])
        m = rng.choice(SLOTS)
        t = best_table(d, party, m)
        if not t:
            continue
        book(d, t, m)
        start = day(d, hhmm(m))
        roll = rng.random()
        if roll < 0.75:
            child = random_child(party)
            rid = add_reservation(start, t, party, 'SEATED', mid=mid, child=child, created=day(d - 4, '13:00'))
            random_history_session(t, plus(start, rng.randint(-5, 9)), party, child, rid=rid, mid=mid)
        elif roll < 0.88:
            add_reservation(start, t, party, 'NO_SHOW', mid=mid, created=day(d - 4, '13:00'))
        else:
            add_reservation(start, None, party, 'CANCELLED', mid=mid, created=day(d - 4, '13:00'),
                            cancelled_at=day(d - 1, '19:40'), cancel_source='CUSTOMER')
    for _ in range(4):   # 現場客（午餐與晚餐）
        party = rng.choice([1, 2, 2, 3, 4, 4, 6])
        m = rng.choice([11 * 60 + 40, 12 * 60 + 10, 12 * 60 + 30, 18 * 60 + 15, 19 * 60 + 20, 20 * 60])
        t = best_table(d, party, m, reservable_only=False)
        if not t:
            continue
        book(d, t, m)
        random_history_session(t, day(d, hhmm(m)), party, random_child(party))

# 2) 今天：以「現在」為準
#    稍後要到的訂位（預約保留、報到、代客取消、太早、逾時的 demo 都在這裡）
R_HOLD_A08 = add_reservation(now_min(20), 'A08', 4, name='陳怡君', phone='0933123210', created=day(-4, '20:15'))
R_HOLD_B02 = add_reservation(now_min(25), 'B02', 2, name='林家豪', phone='0935456806', created=day(-2, '09:40'))
R_HOLD_B04 = add_reservation(now_min(15), 'B04', 4, mid=9, child=1, created=day(-1, '22:05'))
R_TOO_EARLY = add_reservation(now_min(65), 'A06', 5, name='吳美玲', phone='0987654553', child=2,
                              email='meiling@example.com', created=day(-6, '11:30'))
R_LATE = add_reservation(now_min(-15), 'A01', 2, name='鄭文彬', phone='0916222728', created=day(-3, '18:00'))
R_LATER_A04 = add_reservation(now_min(120), 'A04', 4, name='黃先生', phone='0955888192', created=day(-1, '16:45'))
R_LATER_C02 = add_reservation(now_min(90), 'C02', 8, mid=6, child=3, created=day(-8, '12:00'))
add_reservation(now_min(90), None, 2, 'CANCELLED', name='張小雯', phone='0921555037', created=day(-5, '19:20'),
                cancelled_at=now(-60), cancel_source='STAFF', staff_id=2)
add_reservation(now_min(150), None, 4, 'CANCELLED', mid=13, created=day(-7, '08:50'),
                cancelled_at=day(-1, '21:30'), cancel_source='CUSTOMER')
R_SEATED_A02 = add_reservation(now_min(-40), 'A02', 2, 'SEATED', name='王志明', phone='0912777678',
                               created=day(-2, '14:00'))
R_SEATED_C01 = add_reservation(now_min(-66), 'C01', 8, 'SEATED', mid=7, child=2, created=day(-9, '10:10'))

#    候位：A10 過號、A11 已入座（B03）、A12／A13 已叫號、A14 等待中
W_A11 = None
WAIT = [
    ('A10', '蔡先生', '4471', 4, 0, 'EXPIRED', -50, -24, None),
    ('A11', '周小姐', '9106', 2, 2, 'SEATED', -35, -25, -21),
    ('A12', '王先生', '0338', 3, 0, 'CALLED', -18, -4, None),
    ('A13', '李小姐', '5210', 3, 1, 'CALLED', -3, -2, None),
    ('A14', '張先生', '7724', 6, 0, 'WAITING', -2, None, None),
]
WAIT_ROWS = {}
for no, name, last4, adults, children, st, created, called, seated in WAIT:
    wid = nid('wait')
    WAIT_ROWS[no] = dict(id=wid, ticket_no=no, contact_name=name, contact_phone=last4, adult_count=adults,
                         child_count=children, party_size=adults + children, status=st,
                         called_at=now(called) if called is not None else None,
                         seated_at=now(seated) if seated is not None else None, dining_session_id=None,
                         created_at=now(created))

#    正在用餐的五桌
# A03：C-04／C-06／C-08／S-03 的示範桌（陳小美、客人 2、王大明，購物車裡還有東西）
s = add_session('A03', now(-47), 2, 1, cart_version=9)
g_mei = add_guest(s, now(-46), '陳小美', 1)
g_two = add_guest(s, now(-45), '客人 2')
g_ming = add_guest(s, now(-30), '王大明', 2)
add_ticket(s, now(-44), [
    ('招牌麻辣鍋底', 1, 'SERVED', [('辣度', '中辣')], None, None),
    ('伊比利豬梅花', 1, 'SERVED', [('份量', '半份 約 120g')], None, None),
    ('高麗菜', 1, 'PENDING', [], None, None),
], 'PREPARING', guest_id=g_mei)
add_ticket(s, now(-4), [
    ('安格斯霜降牛五花', 1, 'PENDING', [('份量', '全份 約 220g'), ('加點配料', '加蔥花')], '不要太生', None),
    ('白飯', 2, 'PENDING', [], None, None),
], 'PENDING', guest_id=g_ming)
for name, qty, gid, opts, note, added in [
    ('時蔬八品', 1, g_two, [], None, -3),
    ('台灣松阪豬', 1, g_mei, [('份量', '全份 約 220g')], '切薄一點', -2),
    ('冬瓜檸檬', 2, g_two, [('冰塊', '少冰')], None, -1),
]:
    iid, price, _ = ITEM[name]
    vals = [next(v for v in GROUP[g][1] if v[1] == vn) for g, vn in opts]
    cid = nid('cart')
    cart_item.add(id=cid, dining_session_id=s.sid, menu_item_id=iid, quantity=qty, note=note,
                  unit_price=price + sum((v[2] for v in vals), Decimal(0)), added_by_guest_id=gid, created_at=now(added))
    for v in vals:
        cart_item_option.add(cart_item_id=cid, option_value_id=v[0])
finish_session(s)

# A02：訂位報到（王志明）
s = add_session('A02', now(-38), 2, 0, rid=R_SEATED_A02, cart_version=4)
g = add_guest(s, now(-37), '客人 1')
add_ticket(s, now(-36), [('酸菜白肉鍋底', 1, 'SERVED', None, None, None),
                         ('梅花豬薄片', 2, 'SERVED', None, None, None),
                         ('金針菇', 1, 'SERVED', None, None, None)], 'SERVED', guest_id=g)
add_ticket(s, now(-9), [('鮮蚵', 1, 'PENDING', None, None, None),
                        ('烏龍麵', 1, 'PENDING', None, None, None)], 'PENDING', guest_id=g)
finish_session(s)

# B01：已用餐 112 分鐘（超過 100 分鐘轉紅），有一道退掉的菜
s = add_session('B01', now(-112), 4, 0, cart_version=7)
g1 = add_guest(s, now(-111), '客人 1')
g2 = add_guest(s, now(-110), '客人 2')
add_ticket(s, now(-108), [('鴛鴦鍋底', 1, 'SERVED', [('左鍋湯底', '麻辣'), ('右鍋湯底', '昆布')], None, None),
                          ('安格斯霜降牛五花', 2, 'SERVED', [('份量', '全份 約 220g')], None, None),
                          ('海鮮拼盤', 1, 'SERVED', None, None, None),
                          ('時蔬八品', 1, 'SERVED', [], None, None)], 'SERVED', guest_id=g1)
add_ticket(s, now(-70), [('雪花牛肋條', 1, 'SERVED', None, None, None),
                         ('手工丸子', 1, 'CANCELLED', None, None, '客人說點錯了'),
                         ('台灣啤酒', 4, 'SERVED', [], None, None)], 'SERVED', guest_id=g2)
finish_session(s)

# B03：候位 A11 入座；第 1 單已等 16 分鐘（KDS 久候）
s = add_session('B03', now(-21), 2, 2, wid=WAIT_ROWS['A11']['id'], cart_version=2)
WAIT_ROWS['A11']['dining_session_id'] = s.sid
g = add_guest(s, now(-20), '客人 1')
add_ticket(s, now(-16), [('昆布鍋底', 1, 'PENDING', [], None, None),
                         ('伊比利豬梅花', 2, 'PENDING', [('份量', '全份 約 220g')], None, None),
                         ('高麗菜', 1, 'PENDING', [], None, None)], 'PENDING', guest_id=g)
finish_session(s)

# C01：訂位報到（吳佩珊 8 位），含一張櫃檯代客加點
s = add_session('C01', now(-64), 6, 2, rid=R_SEATED_C01, cart_version=11)
g1 = add_guest(s, now(-63), '吳佩珊', 7)
g2 = add_guest(s, now(-62), '客人 2')
g3 = add_guest(s, now(-60), '客人 3')
add_ticket(s, now(-62), [('招牌麻辣鍋底', 1, 'SERVED', [('辣度', '大辣')], None, None),
                         ('酸菜白肉鍋底', 1, 'SERVED', None, None, None),
                         ('美國老饕牛小排', 2, 'SERVED', [('份量', '全份 約 220g')], None, None),
                         ('伊比利豬五花', 2, 'SERVED', None, None, None),
                         ('綜合菇菇', 1, 'SERVED', [], None, None)], 'SERVED', guest_id=g1)
add_ticket(s, now(-40), [('活白蝦', 1, 'SERVED', None, None, None),
                         ('起司球', 2, 'PENDING', None, None, None),
                         ('柳橙汁', 2, 'SERVED', [('冰塊', '去冰')], None, None)], 'PREPARING', guest_id=g2)
add_ticket(s, now(-20), [('蛋餃', 1, 'PENDING', None, None, None),
                         ('白飯', 3, 'PENDING', [], None, None)], 'PENDING', source='STAFF')
add_ticket(s, now(-1), [('台灣松阪豬', 3, 'PENDING', [('份量', '全份 約 220g')], None, None),
                        ('烏龍茶', 2, 'PENDING', [('冰塊', '正常冰')], None, None)], 'PENDING', guest_id=g3)
finish_session(s)

#    剛結帳、待清理的兩桌
for table, opened, closed, method, party in (('A05', -120, -12, 'CASH', 4), ('A07', -95, -5, 'CARD', 3)):
    s = add_session(table, now(opened), party, 0, status='PAID', closed=now(closed), cart_version=5)
    g = add_guest(s, now(opened + 1), '客人 1')
    add_ticket(s, now(opened + 3), [(rng.choice(SOUPS[:3]), 1, 'SERVED', None, None, None)] +
               [(n, 1, 'SERVED', None, None, None) for n in rng.sample(MAINS, 3)] +
               [(n, 1, 'SERVED', None, None, None) for n in rng.sample(SIDES, 2)], 'SERVED', guest_id=g)
    finish_session(s, method, now(closed))

#    稍早取消的一次用餐（客人沒點餐就離開，店長取消）
s = add_session('B05', now(-200), 2, 0, status='CANCELLED', closed=now(-195))
add_guest(s, now(-199), '客人 1')
finish_session(s)

for row in WAIT_ROWS.values():
    waitlist.add(**row)

# 3) 未來的訂位（明天起 14 天內）
#    陳小美：明天、6 天後、13 天後各一筆 → C-19「即將到來 3」
for d, m, party in ((1, 18 * 60 + 30, 2), (6, 18 * 60, 4), (13, 19 * 60, 6)):
    t = best_table(d, party, m)
    book(d, t, m)
    add_reservation(day(d, hhmm(m)), t, party, mid=1, created=day(-1, '22:30'))
for d in range(1, 8):
    for _ in range(rng.randint(2, 5)):
        party = rng.choice([2, 2, 3, 4, 4, 5, 6, 8])
        m = rng.choice(SLOTS)
        t = best_table(d, party, m)
        if not t:
            continue
        book(d, t, m)
        if rng.random() < 0.6:
            add_reservation(day(d, hhmm(m)), t, party, mid=rng.choice(OTHERS), created=now(-rng.randint(60, 6 * 24 * 60)))
        else:
            nm = rng.choice(['蘇先生', '羅小姐', '高先生', '江小姐', '范先生', '方小姐', '宋先生', '石小姐'])
            add_reservation(day(d, hhmm(m)), t, party, name=nm, phone='09' + ''.join(rng.choice('0123456789') for _ in range(8)),
                            email=rng.choice([None, None, 'guest@example.com']), created=now(-rng.randint(60, 6 * 24 * 60)))
add_reservation(day(3, '19:00'), None, 4, 'CANCELLED', mid=10, created=day(-3, '19:00'),
                cancelled_at=day(-1, '08:15'), cancel_source='CUSTOMER')


# ── 輸出 ─────────────────────────────────────────────────────────────────────

DELETE_ORDER = ['payment', 'inventory_item', 'order_item_option', 'order_item', 'order_ticket', 'cart_item_option',
                  'cart_item', 'dining_session_guest', 'dining_session', 'waitlist', 'reservation', 'dining_table',
                  'menu_item_option_group', 'option_value', 'option_group', 'menu_item', 'menu_category', 'staff',
                  'verification_code', 'member']

parts = [f"""-- ============================================================================
-- smartorder 假資料（基礎版）
--
-- 由 backend/db/generate_seed.py 產生，請不要直接改這份檔案。
-- 先執行 schema.sql 建表，再執行這份；也可以單獨重跑這份，把資料重置成初始狀態。
--
-- 時間都以「執行當下的台灣時間」為準：
--   ・現在有 5 桌在用餐（A02、A03、B01、B03、C01），2 桌待清理（A05、A07）
--   ・A08、B02、B04 有 30 分鐘內要到的訂位（預約保留）；A06 約 1 小時後有訂位
--   ・A01 有一筆已過時間 15 分鐘還沒報到的訂位
--   ・候位 A10 過號、A11 已入座、A12／A13 已叫號、A14 等待中
--   ・過去 60 天的訂位與用餐紀錄、未來 14 天的訂位
--
-- 員工帳號（密碼都是 1234）：manager（店長）、counter（小美，外場）、kai（阿凱，外場）、kitchen（廚房）
-- 會員：陳小美 0912345678（我的預約：即將到來 3、已完成 8、已取消 2）
-- ============================================================================

SET NAMES utf8mb4;

-- 清空舊資料：依外鍵順序從子表刪到父表，不靠關閉外鍵檢查
-- （phpMyAdmin 匯入預設開著外鍵檢查，TRUNCATE 與 SET FOREIGN_KEY_CHECKS = 0 都會失敗）
UPDATE waitlist SET dining_session_id = NULL;
""" + ''.join(f'DELETE FROM {t};\n' for t in DELETE_ORDER) + """

-- 以台灣時間為準，不受資料庫伺服器時區影響（沒寫到的 created_at／updated_at 預設值也跟著用台灣時間）
SET time_zone = '+08:00';
SET @now = CONVERT_TZ(UTC_TIMESTAMP(3), '+00:00', '+08:00');
SET @today = DATE(@now);
"""]

for tbl in (staff, member, category, menu_item, option_group, option_value, miog, inventory, dining_table,
            reservation):
    parts.append(f'\n-- {tbl.name}（{len(tbl.rows)} 筆）\n' + tbl.sql())
# 候位與用餐互相參照：先寫候位（dining_session_id 先空著），用餐寫完再補
seated = {r[0]: r[10] for r in waitlist.rows}   # id → dining_session_id
for row in waitlist.rows:
    row[10] = None
parts.append(f'\n-- waitlist（{len(waitlist.rows)} 筆）\n' + waitlist.sql())
parts.append("""
-- The seeded expired ticket was marked by the simulated scheduler at its deadline.
UPDATE waitlist SET expired_at = called_at + INTERVAL 10 MINUTE WHERE status = 'EXPIRED';

-- Seed may be rerun without rebuilding schema; keep the ticket counter after the highest A number.
UPDATE waitlist_ticket_counter SET next_no = (
  SELECT GREATEST(1, COALESCE(MAX(CAST(SUBSTRING(ticket_no, 2) AS UNSIGNED)), 0) + 1)
  FROM waitlist WHERE ticket_no REGEXP '^[Aa][0-9]+$'
) WHERE id = 1;
""")
for tbl in (session, guest, cart_item, cart_item_option, ticket, order_item, order_item_option, payment):
    parts.append(f'\n-- {tbl.name}（{len(tbl.rows)} 筆）\n' + tbl.sql())
for wid, sid in seated.items():
    if sid:
        parts.append(f'\nUPDATE waitlist SET dining_session_id = {sid} WHERE id = {wid};\n')

parts.append("""
-- 編號：預約編號 R-用餐日期-id 補零到 4 位；交易編號 MOCK-付款日期-id 補零到 6 位
UPDATE reservation SET reservation_no = CONCAT('R-', DATE_FORMAT(start_time, '%y%m%d'), '-', LPAD(id, 4, '0'));
UPDATE payment SET transaction_no = CONCAT('MOCK-', DATE_FORMAT(paid_at, '%Y%m%d'), '-', LPAD(id, 6, '0'));
""")

with open(OUT, 'w', encoding='utf-8') as fp:
    fp.write(''.join(parts))

print(f'wrote {OUT}')
for tbl in (staff, member, category, menu_item, option_group, option_value, miog, inventory, dining_table, reservation,
            waitlist, session, guest, cart_item, cart_item_option, ticket, order_item, order_item_option, payment):
    print(f'  {tbl.name:24s} {len(tbl.rows):5d}')
