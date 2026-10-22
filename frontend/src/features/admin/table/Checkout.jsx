import SOButton from '@/components/SOButton'

export default function Checkout({
                                   orders = [],
                                   subtotal = 0,
                                   serviceFee = 0,
                                   total = 0,
                                   adultCount = 0,
                                   childCount = 0,
                                   onCash,
                                   onCreditCard,
                                   onBarcode,
                                   canSettle = true,
                                   isBusy = false,
                                   showCancelSession = false,
                                   onCancelSession,
                                 }) {
  // 商品總數量
  const itemCount = orders.reduce(
    (sum, order) =>
      sum +
      order.items.reduce(
        (count, item) => count + item.quantity,
        0
      ),
    0
  )

  // 總人數
  const peopleCount = adultCount + childCount

  // 平均金額
  const average =
    peopleCount > 0 ? Math.round(total / peopleCount) : 0

  return (
    <div className="rounded-btn border border-line bg-surface p-6 shadow-sm">
      <h2 className="type-h3 font-semibold">結帳</h2>

      {/* 金額 */}
      <div className="mt-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="type-body text-ink-600">
            小計 {itemCount} 項
          </span>

          <span className="type-body">
            NT$ {Number(subtotal).toLocaleString()}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="type-body text-ink-600">
            服務費 10%
          </span>

          <span className="type-body">
            NT$ {Number(serviceFee).toLocaleString()}
          </span>
        </div>

        <div className="border-t border-line pt-4">
          <div className="flex items-center justify-between">
            <span className="type-h3 font-semibold">
              總計
            </span>

            <span className="type-h2 font-bold text-brand-600">
              NT$ {Number(total).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* 用餐人數 */}
      <div className="mt-6 rounded-btn bg-surface-2 p-4">
        <div className="flex items-center justify-between">
          <span className="type-body text-ink-600">
            用餐人數
          </span>

          <span className="type-body">
            {adultCount} 大 {childCount} 小
          </span>
        </div>

        <p className="mt-2 text-right type-caption text-ink-600">
          均分每人約 NT$ {average.toLocaleString()}
        </p>
      </div>

      {/* 付款方式 */}
      <div className="mt-6">
        <h3 className="type-body font-semibold">
          收款方式
        </h3>

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <SOButton variant="default" height="h-11" onClick={onCash} type="button" text="現金" disabled={!canSettle || isBusy} />

          <SOButton variant="secondary" height="h-11" onClick={onCreditCard} type="button" text="信用卡" disabled={!canSettle || isBusy} />

          <SOButton variant="secondary" height="h-11" onClick={onBarcode} type="button" text="條碼" disabled={!canSettle || isBusy} />
        </div>
      </div>

      {!canSettle && (
        <p role="status" className="mt-3 rounded-btn bg-warning-bg px-3 py-2 type-caption text-hold-ink">
          此用餐場次已關閉，無法開始付款。
        </p>
      )}

      {showCancelSession && (
        <div className="mt-4 border-t border-line pt-4">
          <p className="mb-2 type-caption text-ink-600">只有尚未送出任何訂單的用餐場次可以取消。</p>
          <SOButton
            variant="ghost"
            height="h-11"
            onClick={onCancelSession}
            disabled={isBusy}
            type="button"
            text="取消這次用餐"
          />
        </div>
      )}
    </div>
  )
}
