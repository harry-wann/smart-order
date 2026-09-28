import DemoPage from './DemoPage'
import Menu from '../customer/order/Menu'
export default function DS02() {
  return (
    <DemoPage code="DS-02" title="按鈕" description="放置主要操作、次要操作與不同互動狀態的按鈕。">
      <div className="flex w-full flex-col gap-2">
        <SOButton
          height="h-9"
          variant="danger"
          content={[
            <div key="param-1" className="flex items-center gap-1">
              <img src={IcShoppingCart} alt="" />
              <span>參數一</span>
            </div>,
            <div key="param-2" className="flex items-center gap-1">
              <span>參數二</span>
              <img src={IcShoppingCart} alt="" />
            </div>,
          ]}
        />
        <SOButton
          variant="ghost"
          content={[
            <div key="param-1" className="flex items-center gap-1">
              <img src={IcShoppingCart} alt="" />
              <span>參數一</span>
            </div>,
            <div key="param-2" className="flex items-center gap-1">
              <span>參數二</span>
              <img src={IcShoppingCart} alt="" />
            </div>,
          ]}
        />
        <SOButton
          variant="secondary"
          content={[
            <div key="param-1" className="flex items-center gap-1">
              <img src={IcShoppingCart} alt="" />
              <span>參數一</span>
            </div>,
            <div key="param-2" className="flex items-center gap-1">
              <span>參數二</span>
              <img src={IcShoppingCart} alt="" />
            </div>,
          ]}
        />
        <SOButton text={['純文字1', '純文字2']} />
        <SOButton type="button" text="開始點餐" disabled />
      </div>
    </DemoPage>
  )
}
