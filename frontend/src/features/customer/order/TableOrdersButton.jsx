import { useNavigate } from 'react-router'
import { SvgIconMap } from '@/assets/SvgIconMap'

// 菜單、購物車頂欄共用的「本桌訂單」入口：送單後隨時回來看出餐進度（C-08）
export default function TableOrdersButton() {
  const navigate = useNavigate()

  return (
    <button
      type="button"
      onClick={() => navigate('/order/history')}
      className="flex min-h-11 cursor-pointer items-center gap-1 rounded-btn px-2 type-body-sm font-medium text-ink-900 active:opacity-70"
    >
      <SvgIconMap.MemberLog aria-hidden="true" className="size-5" />
      本桌訂單
    </button>
  )
}
