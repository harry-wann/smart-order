import TopBar from '@/components/dashboard/TopBar'
import Kitchen from '@/features/admin/kitchen/Kitchen'

function KitchenOverview() {
  return (
    <>
      <TopBar
        childrenLeft={
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4 text-sm font-medium">
              <span className="rounded-full bg-[#4a3a31] px-4 py-1 text-[#F3EAE0]">進行中單</span>
              <span className="text-(--kds-ink-3)">最近完成 23</span>
            </div>
          </div>
        }
        childrenRight={
          <div className="flex items-center gap-6 text-sm font-medium">
            <span className="text-(--kds-late)">最久等待 分</span>

            <span className="text-(--kds-ink-3)">目前無等待中訂單</span>

            <span className="text-(--kds-ink-2)">鼎沸鍋物 廚房 1 號機</span>
            <span className="text-2xl font-bold tracking-wider text-[#F3EAE0]"></span>
          </div>
        }
      />
      <Kitchen />
    </>
  )
}

export default KitchenOverview
