<<<<<<< HEAD
import DemoPage from './DemoPage';

export default function DS02() {
  return (
    <DemoPage
      code="DS-02"
      title="按鈕"
      description="放置主要操作、次要操作與不同互動狀態的按鈕。"
    />
  );
=======
import DemoPage from './DemoPage'
import SOButton from '../../components/SOButton'
import IcShoppingCart from '../../assets/ic_order_shopping_cart.svg'

export default function DS02() {
  return (
    <DemoPage code="DS-02" title="按鈕" description="放置主要操作、次要操作與不同互動狀態的按鈕。">
      <div className="flex w-full flex-col gap-2">
        <SOButton
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
        <SOButton
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
        <SOButton
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
        <SOButton text={['純文字1', '純文字2']} />
        <SOButton
          text="開始點餐"
          disabled={true}
          onClick={() => {
            console.log('TEST')
          }}
        />
      </div>
    </DemoPage>
  )
>>>>>>> ea3cfb64300495f13929adbe7fe67e714a15cb6a
}
