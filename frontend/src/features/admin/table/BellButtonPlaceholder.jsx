import { SvgIconMap } from '@/assets/SvgIconMap'

// 服務鈴（S-11）由工作包 A 負責，這裡只是佔位，點了沒反應。
// A 的服務鈴合進 develop 後，換成她的元件，再刪掉這個檔案。
function BellButtonPlaceholder({ hasUnread = true }) {
  return (
    <button
      type="button"
      aria-label="服務鈴"
      className="relative flex size-11 items-center justify-center rounded-full hover:bg-surface-2"
    >
      <SvgIconMap.TableOverviewBell className="size-5.5" />
      {hasUnread && (
        <span className="absolute top-1.75 right-1.75 size-2.25 rounded-full bg-brand-600" />
      )}
    </button>
  )
}

export default BellButtonPlaceholder