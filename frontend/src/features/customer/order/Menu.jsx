import { useCallback, useEffect, useRef, useState } from "react";
import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import MenuCategoryTabs from '../../../components/MenuCategoryTabs'
import MenuItemRow from '../../../components/order/MenuItemRow'
import Badge from '@/components/Badge'
import { SvgIconMap } from '@/assets/SvgIconMap'
import CustomerTopBar from '@/components/CustomerTopBar'
import SOButton from '@/components/SOButton'
import ServiceBell from '@/features/customer/order/ServiceBell'
import { getCurrentDining } from '@/services/api/dining/diningApi'
import { getCart } from '@/services/api/cart/cartApi'
import useCartWebSocket from '@/services/realtime/useCartWebSocket'
import TableActivityNotice from '@/components/order/TableActivityNotice'

import { Link, useNavigate } from "react-router";

import { customerClient } from '@/services/client/customerClient'

export default function Menu() {
  // 商品類別
  const [category,setCategory]=useState([]);
  // 選取項目 card
  const [items,setItems]=useState([]);
  // 依類別觸發取得 id 拿 list
  const [activeCategoryId,setActiveCategoryId]=useState(null);
  // 搜尋關鍵字拿 list
  const [searchKeyword,setSearchKeyword]=useState('');
  // 
  const [isBellOpen, setIsBellOpen] = useState(false);
  // 購物車路徑要帶用餐場次 id
  const [sessionId, setSessionId] = useState(null);
  const [notices, setNotices] = useState([])
  const seenEvents = useRef(new Set())
  const [cartItems, setCartItems] = useState([])
  const [tableNo, setTableNo] = useState('')
  const refreshCart = useCallback(() => {
    if (!sessionId) return
    getCart(String(sessionId)).then((cart) => setCartItems(cart.items ?? []))
      .catch((error) => console.error('更新購物車失敗', error))
  }, [sessionId])
  const receiveActivity = useCallback((activity) => {
    if (!['ITEM_ADDED', 'ORDER_SUBMITTED'].includes(activity.type) || seenEvents.current.has(activity.eventId)) return
    seenEvents.current.add(activity.eventId)
    setNotices((current) => [...current, activity])
  }, [])
  const dismissNotice = useCallback(() => setNotices((current) => current.slice(1)), [])
  useCartWebSocket(sessionId == null ? undefined : String(sessionId), refreshCart, receiveActivity)
  const cartAmount = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const navigate = useNavigate("");
  const activeCategory = category.find(
    (item) => String(item.id) === String(activeCategoryId),
  );

  useEffect(() => {
    getCurrentDining()
      .then((dining) => { setSessionId(dining.sessionId); setTableNo(dining.tableNo) })
      .catch((error) => console.error(error));
  }, []);

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await customerClient.get('/order/category');
        setCategory(response.data);
        if (response.data.length > 0) {
          setActiveCategoryId(response.data[0].id);
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadCategories();
  }, []);

  useEffect(() => {
    if (activeCategoryId == null) return;
    let isCurrentRequest = true;
    async function loadItems() {
      try {
        const response = await customerClient.get('/order/items', {
          params: searchKeyword.trim()
              ? { keyword: searchKeyword.trim() }
              : { categoryId: activeCategoryId },
        });
        if (isCurrentRequest) {
          setItems(response.data);
        }
      } catch (error) {
        if (isCurrentRequest) {
          console.error(error);
        }
      }
    }
    loadItems();
    
    return () => {
      isCurrentRequest = false;
    };
  }, [activeCategoryId, searchKeyword]);

  return (
      <div className="relative min-h-screen w-full self-start bg-surface-2 pb-24">
        <CustomerTopBar title={tableNo ? `${tableNo} 桌` : '菜單'} showBackButton={false}>
          <button onClick={() => setIsBellOpen(true)} type="button" className="cursor-pointer text-gray-600">
            <SvgIconMap.MenuBell role="img" aria-label="服務鈴" />
          </button>
        </CustomerTopBar>

        <div className="px-4 py-3">
          <SOFormInput
              type={SOFormInputType.NORMAL}
              icon={SvgIconMap.MenuSearch}
              defaultValue=""
              placeholder="搜尋菜色"
              onChange={setSearchKeyword}
          />
        </div>

        <div className="border-b border-line bg-surface">
          <div className="no-scrollbar flex overflow-x-auto border-b border-line px-4 pt-2">
            <MenuCategoryTabs
                category={category}
                activeCategoryId={activeCategoryId}
                onClick={(selectedCategory) => setActiveCategoryId(selectedCategory.id)}
            />
          </div>
        </div>

        <main className="p-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-baseline gap-2 px-1 pb-1">
              <h2 className="type-h3 text-ink-900">
                {searchKeyword.trim() ? '搜尋結果' : activeCategory?.name ?? '菜單'}
              </h2>
              <span className="type-caption text-ink-600">
                {items.length} 款{!searchKeyword.trim() && activeCategory?.name === '肉品' ? '・全部現切' : ''}
              </span>
            </div>
            {items.map((item) => {
              const isSoldOut = Boolean(item.soldOut)

              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={isSoldOut}
                  onClick={() => navigate('/order/itemdetail', { state: { productId: item.id } })}
                  className={`relative w-full text-left ${isSoldOut ? 'cursor-not-allowed [&_h3+span]:hidden' : 'cursor-pointer'} ${item.imageUrl ? '' : '[&_article>div>div]:pl-[6.5rem]'}`}
                  aria-label={isSoldOut ? `${item.name}，售完` : `查看${item.name}詳情`}
                >
                  <MenuItemRow
                    img={item.imageUrl}
                    title={item.name}
                    desc={item.description || ''}
                    price={item.price}
                    isSoldOut={isSoldOut}
                    isPopular={false}
                    onClick={() => {}}
                  />
                  {!item.imageUrl && (
                    <span className="pointer-events-none absolute left-4 top-1/2 flex size-22 -translate-y-1/2 items-center justify-center rounded-card border border-dashed border-line-strong bg-surface-2 type-caption text-ink-400">
                      無圖片
                    </span>
                  )}
                  {isSoldOut && (
                    <span className="absolute right-10 top-3 origin-top-right scale-x-50 scale-y-75">
                      <Badge text="售完" col="sold" p="soldOut" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </main>

        <div className="fixed bottom-0 left-0 h-23.25 w-full border-t border-line bg-surface px-4 py-4">
          <Link
            to={`/order/cart/${sessionId ?? ''}`}
            onClick={(event) => {
              if (!sessionId) event.preventDefault();
            }}
          >
            <SOButton
                height="h-[56px]"
                content={[
                  <div key="cart-info" className="flex items-center gap-2">
                    <SvgIconMap.OrderShoppingCart role="img" aria-label="Cart" className="h-6 w-6" />
                    <span className="text-lg font-medium">購物車 {cartItems.length} 項</span>
                  </div>,
                  <div key="cart-price" className="flex items-center gap-2">
                    <span className="text-lg font-medium">NT$ {cartAmount.toLocaleString('zh-TW')}</span>
                    <SvgIconMap.MenuRight role="img" aria-label="Right" className="h-5 w-5" />
                  </div>,
                ]}
            />
          </Link>
        </div>
        <ServiceBell open={isBellOpen} onclick={() => setIsBellOpen(false)} />
        <TableActivityNotice activity={notices[0]} onDismiss={dismissNotice} />
      </div>
  )
}
