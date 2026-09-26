import DemoPage from './DemoPage'
import ToastItem, { ToastType } from '@/components/toast/ToastItem.tsx'
import { useToast } from '@/components/toast/ToastManager'

export default function DS06() {
  const { showToast } = useToast()

  return (
    <DemoPage
      code="DS-06"
      title="品項列與通知"
      description="放置品項列、數量操作、價格資訊與通知提示。"
    >
      <div className="flex flex-col gap-1.5">
        <ToastItem type={ToastType.INFO} title="已通知櫃檯，服務生馬上過來" />
        <ToastItem
          type={ToastType.ERROR}
          title="網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去網路不穩，這一單沒送出去"
        />
        <ToastItem type={ToastType.SYSTEM} title="已複製訂單編號" />
      </div>
      <button
        type="button"
        onClick={() =>
          showToast({
            type: ToastType.INFO,
            title: '已通知櫃檯，服務生馬上過來',
          })
        }
        className="mt-4 rounded-btn bg-brand-600 px-4 py-2 text-surface hover:bg-brand-700"
      >
        顯示底部浮動 Toast
      </button>
    </DemoPage>
  )
}
