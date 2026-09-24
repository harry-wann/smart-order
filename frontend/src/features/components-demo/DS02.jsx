import DemoPage from './DemoPage'
import SMButton from '../../components/SMButton'
import IcShoppingCart from '../../assets/ic_order_shopping_cart.svg'

export default function DS02() {
  return (
    <DemoPage code="DS-02" title="按鈕" description="放置主要操作、次要操作與不同互動狀態的按鈕。">
      <div className="flex w-full flex-col gap-2">
        <SMButton
          type="danger"
          content={[
            <div key="param-1" className="flex">
              <img src={IcShoppingCart}></img>
              <span>參數一</span>
            </div>,
            <div key="param-2" className="flex">
              <span>參數二</span>
              <img src={IcShoppingCart}></img>
            </div>,
          ]}
        />
        <SMButton
          type="ghost"
          content={[
            <div key="param-1" className="flex">
              <img src={IcShoppingCart}></img>
              <span>參數一</span>
            </div>,
            <div key="param-2" className="flex">
              <span>參數二</span>
              <img src={IcShoppingCart}></img>
            </div>,
          ]}
        />
        <SMButton
          type="secondary"
          content={[
            <div key="param-1" className="flex">
              <img src={IcShoppingCart}></img>
              <span>參數一</span>
            </div>,
            <div key="param-2" className="flex">
              <span>參數二</span>
              <img src={IcShoppingCart}></img>
            </div>,
          ]}
        />
        <SMButton text={['純文字1', '純文字2']} />
        <SMButton
          text="開始點餐"
          disabled={true}
          onClick={() => {
            console.log('TEST')
          }}
        />
      </div>
    </DemoPage>
  )
}
