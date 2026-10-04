import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import MenuCategoryTabs from '../../../components/MenuCategoryTabs'
import MenuItemRow from '../../../components/order/MenuItemRow'
import SearchIcon from '@/assets/ic_menu_search.svg'
import CustomerTopBar from '@/components/CustomerTopBar'
import SOButton from '@/components/SOButton'
import CartIcon from '@/assets/ic_order_shopping_cart.svg'
import RightIcon from '@/assets/ic_menu_right.svg'
import Bell from '@/assets/ic_menu_bell.svg'

export default function Menu() {
  const category = ['推薦', '鍋底', '肉品', '海鮮', '蔬菜', '火鍋料', '麵食']

  const items = [
    {
      id: '01',
      img_url: 'img_url',
      title: '安格斯霜降牛五花',
      desc: '厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。',
      price: '380',
      quantity: '10',
      sell: '30',
    },
    {
      id: '02',
      img_url: 'img_url',
      title: '安格斯霜降牛五花',
      desc: '厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。',
      price: '380',
    },
    {
      id: '03',
      img_url: 'img_url',
      title: '安格斯霜降牛五花',
      desc: '厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。',
      price: '380',
    },
    {
      id: '04',
      img_url: 'img_url',
      title: '安格斯霜降牛五花',
      desc: '厚切 3mm，涮 8 秒最好吃。油花分布均勻，是我們賣最好的一款。',
      price: '380',
    },
  ]

  const checkIsSoldOut = (item) => {
    return Number(item.quantity || 0) <= 0
  }

  const checkIsPopular = (item) => {
    return Number(item.sell || 0) > 15
  }

  return (
    <div className="relative min-h-screen w-full self-start bg-surface-2 pb-24">
      <CustomerTopBar title="A03 桌" subTitle="2 大 1 小 18:32 入座" showBackButton={false}>
        <button type="button" className="cursor-pointer text-gray-600">
          <img src={Bell} alt="服務鈴" />
        </button>
      </CustomerTopBar>

      <div className="px-4 py-3">
        <SOFormInput
          type={SOFormInputType.NORMAL}
          icon={SearchIcon}
          defaultValue=""
          placeholder="搜尋菜色"
          onChange={(e) => console.log(e.target.value)}
        />
      </div>

      <div className="border-b border-line bg-surface">
        <div className="no-scrollbar flex overflow-x-auto border-b border-line px-4 pt-2">
          <MenuCategoryTabs category={category} />
        </div>
      </div>

      <main className="p-4">
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <button key={item.id} className="cursor-pointer text-left">
              <MenuItemRow
                img={item.img_url}
                title={item.title}
                desc={item.desc}
                price={item.price}
                isSoldOut={checkIsSoldOut(item)}
                isPopular={checkIsPopular(item)}
              />
            </button>
          ))}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 h-23.25 w-full border-t border-line bg-surface px-4 py-4">
        <SOButton
          height="h-[56px]"
          content={[
            <div key="cart-info" className="flex items-center gap-2">
              <img src={CartIcon} alt="Cart" className="h-6 w-6" />
              <span className="text-lg font-medium">購物車 6 項</span>
            </div>,
            <div key="cart-price" className="flex items-center gap-2">
              <span className="text-lg font-medium">NT$ 1,420</span>
              <img src={RightIcon} alt="Right" className="h-5 w-5" />
            </div>,
          ]}
        />
      </div>
    </div>
  )
}
