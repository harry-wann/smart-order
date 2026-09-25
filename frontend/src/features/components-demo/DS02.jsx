import DemoPage from './DemoPage'
<<<<<<< HEAD
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
=======
import MenuCategoryTabs from '../../components/MenuCategoryTabs'
const category = ['推薦', '肉品', '鍋品', '海鮮', '蔬菜']
export default function DS02() {
  return (
    <DemoPage code="DS-02" title="按鈕" description="放置主要操作、次要操作與不同互動狀態的按鈕。">
      <MenuCategoryTabs category={category} />
>>>>>>> bd5ddfa (feat: menu-category-tabs)
    </DemoPage>
  )
}
