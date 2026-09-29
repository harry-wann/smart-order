const menuGroups = [
  {
    items: [
      { icon: '', name: '桌況總覽', active: true },
      { icon: '', name: '出菜看板' },
      { icon: '', name: '預約管理' },
      { icon: '', name: '候位管理' },
    ],
  },
  {
    title: '菜 單',
    items: [
      { icon: '', name: '菜單管理' },
      { icon: '', name: '選項群組' },
      { icon: '', name: '庫存管理' },
    ],
  },
  {
    title: '設 定',
    items: [
      { icon: '', name: '座位管理' },
      { icon: '', name: '報表' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="flex min-h-screen w-53 shrink-0 flex-col border-r border-line bg-surface">
      {/* Logo */}
      <div className="px-6 pt-5 pb-4">
        <h1 className="text-[19px] font-bold">鼎沸鍋物</h1>

        <p className="mt-1 text-[11px] text-ink-400">SMART ORDER</p>
      </div>

      {/* 選單 */}
      <nav className="flex-1 px-3">
        {menuGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-4">
            {group.title && <p className="mb-2 px-3 text-[11px] text-ink-400">{group.title}</p>}

            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className={`flex h-11 w-full items-center gap-3 rounded-btn px-4 text-left text-[15px] transition ${
                    item.active
                      ? 'bg-brand-100 font-medium text-brand-600'
                      : 'text-ink-400 hover:bg-white/50'
                  }`}
                >
                  <span className="flex w-5 justify-center type-body">{item.icon}</span>

                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* 使用者 */}
      <div className="flex items-center gap-3 px-7 pb-6 type-body-sm text-ink-400">
        <span className="type-body">♙</span>
        <span>小美・外場</span>
      </div>
    </aside>
  )
}
