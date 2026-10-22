import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import MenuCategoryTabs from '../../../components/MenuCategoryTabs'
import MenuItemRow from '../../../components/order/MenuItemRow'
import { SvgIconMap } from '@/assets/SvgIconMap'
import CustomerTopBar from '@/components/CustomerTopBar'
import SOButton from '@/components/SOButton'
import ServiceBell from '@/features/customer/order/ServiceBell'
import { getCurrentDining } from '@/services/api/dining/diningApi'
import { getCart } from '@/services/api/cart/cartApi'
import useCartWebSocket from '@/services/realtime/useCartWebSocket'
import useMenuWebSocket from '@/services/realtime/useMenuWebSocket'
import TableActivityNotice from '@/components/order/TableActivityNotice'

import { Link, useLocation, useNavigate } from "react-router";

import { customerClient } from '@/services/client/customerClient'
import { leaveTable } from '@/services/client/auth'

export default function Menu() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialClosedSession = location.state?.closedSession ?? null;
  const [closedSession, setClosedSession] = useState(initialClosedSession);
  const sessionEnded = useRef(Boolean(initialClosedSession));
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const activeSessionId = useRef(null);
  const sessionGeneration = useRef(0);
  const mountedRef = useRef(false);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [notices, setNotices] = useState([]);
  const [cartItems, setCartItems] = useState([]);
  const [isCartSocketConnected, setIsCartSocketConnected] = useState(false);
  useLayoutEffect(() => {
    mountedRef.current = true;
    activeSessionId.current = sessionId;
    const generation = sessionGeneration.current + 1;
    sessionGeneration.current = generation;
    setSessionEpoch(generation);
    return () => {
      mountedRef.current = false;
      if (sessionGeneration.current === generation) sessionGeneration.current += 1;
    };
  }, [sessionId]);
  const isCurrentMenuSession = useCallback((expectedSessionId, expectedGeneration) => (
    mountedRef.current &&
    sessionGeneration.current === expectedGeneration &&
    activeSessionId.current === expectedSessionId
  ), []);
  const handleClosedSessionEvent = useCallback((event, expectedSessionId = sessionId, expectedGeneration = sessionEpoch) => {
    if (
      !isCurrentMenuSession(expectedSessionId, expectedGeneration) ||
      sessionEnded.current ||
      (event?.sessionId != null && expectedSessionId != null && String(event.sessionId) !== String(expectedSessionId))
    ) return false;
    sessionEnded.current = true;
    leaveTable();
    setSessionId(null);
    if (event?.reason === 'PAID') {
      setCartItems([]);
      setNotices([]);
      setIsBellOpen(false);
      setClosedSession(event);
    } else {
      navigate('/', { replace: true });
    }
    return true;
  }, [isCurrentMenuSession, navigate, sessionEpoch, sessionId]);
  const handleSessionApiError = useCallback((error, expectedSessionId = sessionId, expectedGeneration = sessionEpoch) => {
    if (error?.status !== 401) return false;
    return handleClosedSessionEvent({
      type: 'SESSION_CLOSED',
      sessionId: expectedSessionId,
      reason: error.reason,
    }, expectedSessionId, expectedGeneration);
  }, [handleClosedSessionEvent, sessionEpoch, sessionId]);
  // 商品類別
  const [category,setCategory]=useState([]);
  // 選取項目 card
  const [items,setItems]=useState([]);
  // 依類別觸發取得 id 拿 list
  const [activeCategoryId,setActiveCategoryId]=useState(null);
  // 搜尋關鍵字拿 list
  const [searchKeyword,setSearchKeyword]=useState('');
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');
  const [searchInputKey, setSearchInputKey] = useState(0);
  const [categoryStatus, setCategoryStatus] = useState('loading');
  const [itemStatus, setItemStatus] = useState('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [categoryRetryCount, setCategoryRetryCount] = useState(0);
  const isLoading = categoryStatus === 'loading' || (categoryStatus === 'success' && activeCategoryId != null && itemStatus === 'loading');
  const hasError = categoryStatus === 'error' || (categoryStatus === 'success' && activeCategoryId != null && itemStatus === 'error');
  const clearSearch = () => {
    setSearchKeyword('');
    setDebouncedSearchKeyword('');
    setSearchInputKey((key) => key + 1);
  };
  const retryMenu = () => {
    if (categoryStatus === 'error' || category.length === 0) {
      setCategoryStatus('loading');
      setCategoryRetryCount((count) => count + 1);
    } else {
      setItemStatus('loading');
      setRetryCount((count) => count + 1);
    }
  };
  // 
  // 購物車路徑要帶用餐場次 id
  const menuStatusOverrides = useRef(new Map());
  const unlistedMenuItems = useRef(new Set());
  const receiveMenuStatus = useCallback((itemId, soldOut, type) => {
    if (type === 'MENU_UNLISTED') {
      unlistedMenuItems.current.add(String(itemId));
      setItems((current) => current.filter((item) => String(item.id) !== String(itemId)));
      return;
    }
    if (type === 'MENU_LISTED') {
      unlistedMenuItems.current.delete(String(itemId));
      menuStatusOverrides.current.delete(String(itemId));
      setRetryCount((count) => count + 1);
      return;
    }
    menuStatusOverrides.current.set(String(itemId), soldOut);
    setItems((current) => current.map((item) => String(item.id) === String(itemId) ? { ...item, soldOut } : item));
  }, []);
  const refreshMenu = useCallback(() => {
    menuStatusOverrides.current.clear();
    unlistedMenuItems.current.clear();
    setRetryCount((count) => count + 1);
  }, []);
  useMenuWebSocket(sessionId, receiveMenuStatus, refreshMenu, handleClosedSessionEvent, handleSessionApiError);
  const seenEvents = useRef(new Set())
  const [tableNo, setTableNo] = useState(location.state?.tableNo ?? '')
  const [diningInfo, setDiningInfo] = useState(null)
  const [diningStatus, setDiningStatus] = useState('loading')
  const [diningRetryCount, setDiningRetryCount] = useState(0)
  const retryDining = () => {
    setDiningStatus('loading')
    setDiningRetryCount((count) => count + 1)
  }
  const diningSubtitle = diningInfo ? [
    diningInfo.adultCount != null || diningInfo.childCount != null
      ? `${diningInfo.adultCount ?? 0} 大 ${diningInfo.childCount ?? 0} 小` : '',
    diningInfo.openedAt?.match(/T(\d{2}:\d{2})/)?.[1]
      ? `${diningInfo.openedAt.match(/T(\d{2}:\d{2})/)[1]} 入座` : '',
  ].filter(Boolean).join('　') : ''
  const refreshCart = useCallback(() => {
    if (!sessionId || !isCurrentMenuSession(sessionId, sessionEpoch) || sessionEnded.current) return
    const expectedSessionId = sessionId
    const expectedGeneration = sessionEpoch
    getCart(String(expectedSessionId)).then((cart) => {
      if (!isCurrentMenuSession(expectedSessionId, expectedGeneration) || sessionEnded.current) return
      setCartItems(cart.items ?? [])
    })
      .catch((error) => {
        if (!isCurrentMenuSession(expectedSessionId, expectedGeneration) || sessionEnded.current) return;
        if (handleSessionApiError(error, expectedSessionId, expectedGeneration)) return;
        else console.error('更新購物車失敗', error);
      })
  }, [handleSessionApiError, isCurrentMenuSession, sessionEpoch, sessionId])
  const receiveActivity = useCallback((activity) => {
    if (!['ITEM_ADDED', 'ORDER_SUBMITTED'].includes(activity.type) || seenEvents.current.has(activity.eventId)) return
    seenEvents.current.add(activity.eventId)
    setNotices((current) => [...current, activity])
  }, [])
  const dismissNotice = useCallback(() => setNotices((current) => current.slice(1)), [])
  useCartWebSocket(
    sessionId == null ? undefined : String(sessionId),
    refreshCart,
    receiveActivity,
    setIsCartSocketConnected,
    handleClosedSessionEvent,
  )
  useEffect(() => {
    if (!sessionId || isCartSocketConnected) return;

    refreshCart();
    const intervalId = window.setInterval(refreshCart, 5000);
    return () => window.clearInterval(intervalId);
  }, [sessionId, isCartSocketConnected, refreshCart]);
  const cartItemCount = cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  const cartAmount = cartItems.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0)
  const activeCategory = category.find(
    (item) => String(item.id) === String(activeCategoryId),
  );

  useEffect(() => {
    if (sessionEnded.current) return undefined
    let isCurrentRequest = true
    const expectedSessionId = sessionId
    const expectedGeneration = sessionEpoch
    getCurrentDining()
      .then((dining) => {
        if (
          !isCurrentRequest ||
          sessionEnded.current ||
          !isCurrentMenuSession(expectedSessionId, expectedGeneration)
        ) return
        setSessionId(dining.sessionId)
        setTableNo(dining.tableNo)
        setDiningInfo(dining)
        setDiningStatus('success')
      })
      .catch((error) => {
        if (!isCurrentRequest || !isCurrentMenuSession(expectedSessionId, expectedGeneration)) return
        if (handleSessionApiError(error, expectedSessionId, expectedGeneration)) return
        else {
          setDiningStatus('error')
          console.error(error)
        }
      });
    return () => { isCurrentRequest = false }
  }, [handleSessionApiError, isCurrentMenuSession, sessionEpoch, sessionId, diningRetryCount]);

  useEffect(() => {
    let isCurrentRequest = true;
    async function loadCategories() {
      try {
        const response = await customerClient.get('/order/category');
        const visibleCategories = response.data.filter((item) => {
          const name = String(item.name ?? '').replace(/\s/g, '')
          return name !== '推薦' && name !== '今日推薦'
        })
        if (!isCurrentRequest) return;
        setCategory(visibleCategories);
        setActiveCategoryId(visibleCategories[0]?.id ?? null);
        setCategoryStatus('success');
      } catch (error) {
        if (isCurrentRequest) {
          setCategoryStatus('error');
          console.error(error);
        }
      }
    }

    loadCategories();
    return () => { isCurrentRequest = false; };
  }, [categoryRetryCount]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedSearchKeyword(searchKeyword), 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchKeyword]);

  useEffect(() => {
    if (activeCategoryId == null) return;
    let isCurrentRequest = true;
    setItems([]);
    setItemStatus('loading');
    async function loadItems() {
      try {
        const response = await customerClient.get('/order/items', {
          params: debouncedSearchKeyword.trim()
              ? { keyword: debouncedSearchKeyword.trim() }
              : { categoryId: activeCategoryId },
        });
        if (isCurrentRequest) {
          setItems(response.data.filter((item) => !unlistedMenuItems.current.has(String(item.id))).map((item) => menuStatusOverrides.current.has(String(item.id))
            ? { ...item, soldOut: menuStatusOverrides.current.get(String(item.id)) }
            : item));
          setItemStatus('success');
        }
      } catch (error) {
        if (isCurrentRequest) {
          setItems([]);
          setItemStatus('error');
          console.error(error);
        }
      }
    }
    loadItems();
    
    return () => {
      isCurrentRequest = false;
    };
  }, [activeCategoryId, debouncedSearchKeyword, retryCount]);

  if (closedSession) {
    return (
      <div data-menu-page className="flex min-h-full w-full flex-col bg-paper">
        <CustomerTopBar title={tableNo ? `${tableNo} 桌` : '菜單'} showBackButton={false} />
        <section role="status" className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
          <span aria-hidden="true" className="mb-6 flex size-20 items-center justify-center rounded-full bg-surface text-4xl text-brand-600">✓</span>
          <h1 className="type-h1 text-ink-900">這桌已經結帳完成</h1>
          <p className="mt-3 type-body-sm text-ink-600">謝謝光臨，歡迎再來</p>
          <button type="button" onClick={() => navigate('/', { replace: true })} className="mt-8 min-h-11 w-full cursor-pointer rounded-btn bg-brand-600 px-6 py-3 font-medium text-white">回到首頁</button>
        </section>
      </div>
    );
  }

  return (
      <div data-menu-page className="relative min-h-screen w-full self-start bg-paper pb-24">
        <CustomerTopBar title={tableNo ? `${tableNo} 桌` : '菜單'} subTitle={diningSubtitle} showBackButton={false}>
          <button onClick={() => setIsBellOpen(true)} type="button" className="cursor-pointer text-gray-600">
            <SvgIconMap.MenuBell role="img" aria-label="服務鈴" />
          </button>
        </CustomerTopBar>

        {diningStatus === 'error' && (
          <div role="alert" className="mx-4 mt-3 flex items-center justify-between gap-3 rounded-card border border-danger/30 bg-surface px-4 py-3">
            <p className="type-body-sm text-ink-700">無法載入桌次資訊，請確認網路後重試。</p>
            <button type="button" onClick={retryDining} className="shrink-0 cursor-pointer font-medium text-brand-600 underline">
              重新載入
            </button>
          </div>
        )}

        <div className="px-4 py-3 [&>div]:h-11 [&>div]:rounded-btn [&>div]:bg-surface">
          <SOFormInput
              key={searchInputKey}
              type={SOFormInputType.NORMAL}
              icon={SvgIconMap.MenuSearch}
              defaultValue=""
              placeholder="搜尋菜色"
              onChange={setSearchKeyword}
          />
        </div>

        <div className="no-scrollbar overflow-x-auto border-b border-line bg-surface">
          <div className="w-max px-4">
            <MenuCategoryTabs
                category={category}
                activeCategoryId={searchKeyword.trim() ? null : activeCategoryId}
                onClick={(selectedCategory) => {
                  clearSearch();
                  setActiveCategoryId(selectedCategory.id);
                }}
            />
          </div>
        </div>

        <main className="px-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2 px-1 pb-1 pt-4">
              <h2 className="type-h2 text-ink-900">
                {searchKeyword.trim() ? '搜尋結果' : activeCategory?.name ?? '菜單'}
              </h2>
              {!isLoading && !hasError && <span className="type-caption text-ink-600">
                {items.length} 款{!searchKeyword.trim() && activeCategory?.name === '肉品' ? '・全部現切' : ''}
              </span>}
            </div>
            {isLoading ? (
              <p role="status" className="py-16 text-center type-body-sm text-ink-600">正在準備今天的菜單…</p>
            ) : hasError ? (
              <MenuState
                error
                title="菜單沒有載入成功"
                description="連線可能不穩，請重新載入；如果還是不行，可以按服務鈴請店員幫忙。"
                action="重新載入"
                onAction={retryMenu}
              >
                <button type="button" onClick={() => setIsBellOpen(true)} className="mt-3 cursor-pointer rounded-btn px-4 py-3 text-ink-600 underline">按服務鈴找店員</button>
              </MenuState>
            ) : items.length === 0 ? (
              <MenuState
                title={category.length === 0 ? '目前沒有上架的菜單' : searchKeyword.trim() ? '找不到符合的菜色' : `${activeCategory?.name ?? '這個分類'}目前沒有上架的菜色`}
                description={category.length === 0 ? '請稍後重新載入，或按右上角的服務鈴詢問店員。' : searchKeyword.trim() ? '試試其他關鍵字，或清除搜尋看看其他菜色。' : '可以先看看其他分類的菜色。'}
                action={category.length === 0 ? '重新載入' : searchKeyword.trim() ? '清除搜尋' : category.some((entry) => entry.id !== activeCategoryId) ? '看看其他分類' : '重新載入'}
                onAction={category.length === 0 ? retryMenu : searchKeyword.trim() ? clearSearch : () => {
                  const nextCategory = category.find((entry) => entry.id !== activeCategoryId);
                  if (nextCategory) setActiveCategoryId(nextCategory.id);
                  else retryMenu();
                }}
              />
            ) : items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onOpen={() => navigate('/order/itemdetail', { state: { productId: item.id, sessionId } })}
              />
            ))}
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
                    <span className="text-lg font-medium">本桌餐點 {cartItemCount} 份</span>
                  </div>,
                  <div key="cart-price" className="flex items-center gap-2">
                    <span className="text-lg font-medium">全桌 NT$ {cartAmount.toLocaleString('zh-TW')}</span>
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

function MenuState({ error = false, title, description, action, onAction, children }) {
  return (
    <section role={error ? 'alert' : 'status'} className="flex min-h-80 flex-col items-center justify-center px-4 py-10 text-center">
      <svg aria-hidden="true" viewBox="0 0 96 96" className={`mb-4 size-20 ${error ? 'text-danger' : 'text-ink-400'}`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        {error ? <><path d="M43 15 9 75a6 6 0 0 0 5 9h68a6 6 0 0 0 5-9L53 15a6 6 0 0 0-10 0Z" /><path d="M48 35v22m0 12v1" /></> : <><path d="M13 41v7a30 30 0 0 0 30 30h10a30 30 0 0 0 30-30v-7M8 41h80M13 47H7a5 5 0 0 0 0 10h4m72-10h6a5 5 0 0 1 0 10h-4" /><path d="M36 60h24" strokeDasharray="3 6" /></>}
      </svg>
      <h3 className="type-h3 text-ink-900">{title}</h3>
      <p className="mt-2 type-body-sm text-ink-600">{description}</p>
      <button type="button" onClick={onAction} className="mt-6 min-h-11 cursor-pointer rounded-btn bg-brand-600 px-6 py-3 font-medium text-white">{action}</button>
      {children}
    </section>
  );
}

function MenuItemCard({ item, onOpen }) {
  const isSoldOut = Boolean(item.soldOut)
  const hasImage = Boolean(item.imageUrl)

  return (
    <button
      type="button"
      disabled={isSoldOut}
      onClick={onOpen}
      className={`relative w-full text-left ${isSoldOut ? 'cursor-not-allowed' : 'cursor-pointer'} ${hasImage ? '[&_article>div>div:first-child]:!size-20 [&_article>div>div:first-child>img]:!size-full' : '[&_article>div>div]:pl-24'}`}
      aria-label={isSoldOut ? `${item.name}，售完` : `查看${item.name}詳情`}
    >
      <MenuItemRow
        img={item.imageUrl}
        title={item.name}
        desc={item.description || ''}
        price={item.price}
        isSoldOut={isSoldOut}
        isPopular={false}
        isVegetarian={item.isVegetarian}
        containsBeef={item.containsBeef}
        spicyLevel={item.spicyLevel}
        onClick={() => {}}
      />
      {!hasImage && (
        <span className="pointer-events-none absolute left-4 top-1/2 flex size-20 -translate-y-1/2 items-center justify-center rounded-card border border-dashed border-line-strong bg-surface-2 type-caption text-ink-400">
          無圖片
        </span>
      )}
    </button>
  )
}
