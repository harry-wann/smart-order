import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import MenuCategoryTabs from '../../../components/MenuCategoryTabs'
import MenuItemRow from '../../../components/order/MenuItemRow'
export default function Menu() {
  const category = ['推薦', '肉品', '鍋品', '海鮮', '蔬菜']
  return (
    <div>
      <div>123</div>
      <SOFormInput
        type={SOFormInputType.NORMAL}
        // icon={SearchIcon} // 不需要icon的時候這列直接註解掉
        defaultValue=""
        placeholder="請輸入姓名"
        onChange={(e) => console.log(e.target.value)}
      />
      <MenuCategoryTabs category={category} />
      <span>今日推薦</span>
      <span>肉品</span>
      <div className="flex flex-row gap-2">
        <div className="flex flex-1 flex-col gap-1.5">
          <MenuItemRow
            img="img_url"
            title="安格斯霜降牛五花"
            desc="厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。"
            price={380}
          />
          <MenuItemRow
            img="img_url"
            title="安格斯霜降牛五花"
            desc="厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。"
            price={380}
            isSoldOut={true}
          />
          <MenuItemRow
            img="img_url"
            title="安格斯霜降牛五花"
            desc="厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。"
            price={380}
            isPopular={true}
          />
        </div>
      </div>
    </div>
  )
}
