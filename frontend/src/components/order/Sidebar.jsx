const menuGroups = [
  {
    items: [
      { icon: '▦', name: '桌況總覽', active: true },
      { icon: '♧', name: '出菜看板' },
      { icon: '▣', name: '預約管理' },
      { icon: '☷', name: '候位管理' },
    ],
  },
  {
    title: '菜 單',
    items: [
      { icon: '▤', name: '菜單管理' },
      { icon: '☷', name: '選項群組' },
      { icon: '◇', name: '庫存管理' },
    ],
  },
  {
    title: '設 定',
    items: [
      { icon: '▦', name: '座位管理' },
      { icon: '▥', name: '報表' },
    ],
  },
]

export default function Sidebar() {
  return (
    <aside className="flex min-h-screen w-[212px] shrink-0 flex-col border-r border-[#E6DED2] bg-[#F5F0E8]">
      {/* Logo */}
      <div className="px-6 pt-5 pb-4">
        <h1 className="text-[17px] leading-none font-bold">鼎沸鍋物</h1>

        <p className="mt-1 text-[8px] tracking-[3px] text-[#9C8E84]">SMART ORDER</p>
      </div>

      {/* 選單 */}
      <nav className="flex-1 px-3">
        {menuGroups.map((group, groupIndex) => (
          <div key={groupIndex} className="mb-4">
            {group.title && (
              <p className="mb-2 px-3 text-[10px] tracking-[5px] text-[#A99C91]">{group.title}</p>
            )}

            <div className="space-y-1">
              {group.items.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className={`flex h-[44px] w-full items-center gap-3 rounded-lg px-4 text-left text-sm transition ${
                    item.active
                      ? 'bg-[#FBE7E3] font-medium text-[#D74432]'
                      : 'text-[#6F655E] hover:bg-white/50'
                  }`}
                >
                  <span className="flex w-5 justify-center text-lg">{item.icon}</span>

                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* 使用者 */}
      <div className="flex items-center gap-3 px-7 pb-6 text-sm text-[#6F655E]">
        <span className="text-lg">♙</span>
        <span>小美・外場</span>
      </div>
    </aside>
  )
}
