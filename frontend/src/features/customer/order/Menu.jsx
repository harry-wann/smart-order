import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import MenuCategoryTabs from '../../../components/MenuCategoryTabs'
import MenuItemRow from '../../../components/order/MenuItemRow'
import SearchIcon from '@/assets/ic_menu_search.svg'
import SOButton from '@/components/SOButton'
import CartIcon from '@/assets/ic_order_shopping_cart.svg'
import RightIcon from '@/assets/ic_menu_right.svg'
export default function Menu() {
  const category = ['推薦', '鍋底', '肉品', '海鮮', '蔬菜', '火鍋料', '麵食']
  return (
    <div>
      <div>A03 桌 2大1小 18:32</div>
      <SOFormInput
        type={SOFormInputType.NORMAL}
        icon={SearchIcon}
        defaultValue=""
        placeholder="搜尋菜色"
        onChange={(e) => console.log(e.target.value)}
      />

      {category.length > 5 && (
        <div className="flex overflow-x-auto scroll-smooth whitespace-nowrap [&::-webkit-scrollbar]:hidden">
          <MenuCategoryTabs category={category} />
        </div>
      )}

      <div className="flex flex-row gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <MenuItemRow
            img="img_url"
            title="安格斯霜降牛五花"
            desc="厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。"
            price={380}
          />
        </div>
      </div>
      <div>
        <SOButton
          content={[
            <div className="flex flex-1">
              <img src={CartIcon}></img>
              <span>購物車6項</span>
            </div>,
            <div className="flex flex-1">
              <span>NT$ 1,420</span>
              <img src={RightIcon}></img>
            </div>,
          ]}
        />
      </div>
    </div>
  )
}
