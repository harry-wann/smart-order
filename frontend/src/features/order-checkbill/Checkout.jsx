import blackpeople from '../../assets/ic_Checkout_blackpeople.svg'
import SOButton from '../../components/SOButton'

export default function Checkout({ onCreditCard, onCash }) {
  return (
    <div className="w-full rounded-btn border border-line bg-surface p-5 shadow-sm">
      {/*  標題  */}
      <div className="flex items-center justify-between">
        <h2 className="type-h3">結帳</h2>

        <span className="type-caption text-ink-600">客人到櫃檯付款</span>
      </div>

      {/*  金額  */}
      <div className="mt-4 space-y-4 type-body">
        <div className="flex justify-between">
          <span>小計 6 項</span>

          <span className="type-body">NT$ 1,420</span>
        </div>

        <div className="flex justify-between">
          <span>服務費 10%</span>

          <span className="type-body">NT$ 142</span>
        </div>
      </div>

      {/* 分隔線 */}
      <div className="my-4 border-t border-line" />

      {/*  合計  */}
      <div className="flex items-center justify-between">
        <span className="type-body font-bold">合計</span>

        <span className="type-h2 text-brand-600">NT$ 1,562</span>
      </div>

      {/*  人數  */}
      <div className="mt-4 flex h-9 items-center justify-between rounded-btn bg-surface-2 px-3">
        <div className="flex items-center gap-2 type-body-sm text-ink-600">
          <span>
            <img src={blackpeople} />
          </span>
          <span>2 大 1 小</span>
        </div>

        <span className="type-caption text-ink-600">均分每人約 NT$ 521</span>
      </div>

      {/*  會員  */}

      {/* 會員資料 */}

      {/*  收款方式  */}
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="type-body-sm text-ink-600">收款方式</span>

          <span className="type-caption text-ink-600">按下後倒數 5 秒才送出</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <SOButton variant="danger" height="h-9" onClick={onCash} type="button" text="現金" />
          <SOButton
            variant="danger"
            height="h-9"
            onClick={onCreditCard}
            type="button"
            text="信用卡"
          />

          <SOButton variant="danger" height="h-9" type="button" text="條碼" />
        </div>
      </div>
    </div>
  )
}
