import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import MenuCategoryTabs from '../../../components/MenuCategoryTabs'
import MenuItemRow from '../../../components/order/MenuItemRow'
import { SvgIconMap } from '@/assets/SvgIconMap'
import CustomerTopBar from '@/components/CustomerTopBar'
import SOButton from '@/components/SOButton'
import ServiceBell from '@/features/customer/order/ServiceBell'
import { getCurrentDining } from '@/services/api/dining/diningApi'
import { getCart } from '@/services/api/cart/cartApi'
import { addMenuItemToCart } from '@/services/api/order/orderApi'
import useCartWebSocket from '@/services/realtime/useCartWebSocket'
import useMenuWebSocket from '@/services/realtime/useMenuWebSocket'
import TableActivityNotice from '@/components/order/TableActivityNotice'

import { Link, useLocation, useNavigate } from "react-router";

import { customerClient } from '@/services/client/customerClient'
import { leaveTable } from '@/services/client/auth'

// 「閱讀線」離頁籤列下緣的距離：分類標題捲過這條線，就把那個分類當成目前分類
const ACTIVE_LINE_OFFSET = 8
// 快速加入成功後，[+] 變成勾勾的時間
const QUICK_ADD_DONE_MS = 1200

// 往上找最近一層會捲動的外框（顧客端版面把整頁放在一個 overflow-y-auto 的容器裡，捲動的不是 window）
function findScrollParent(element) {
  for (let node = element?.parentElement; node; node = node.parentElement) {
    const { overflowY } = window.getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
  }
  return null
}

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// 搜尋比對跟後端一致：品名或描述包含關鍵字，不分大小寫
function matchesKeyword(item, keyword) {
  return [item.name, item.description].some((text) => String(text ?? '').toLowerCase().includes(keyword))
}

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
  // 全部上架品項（一次抓回來，畫面上依分類分段）
  const [items,setItems]=useState([]);
  // 目前高亮的分類頁籤：捲動時由畫面位置決定，點頁籤時直接設定
  const [activeCategoryId,setActiveCategoryId]=useState(null);
  // 搜尋關鍵字：跨全部分類篩選
  const [searchKeyword,setSearchKeyword]=useState('');
  const [debouncedSearchKeyword, setDebouncedSearchKeyword] = useState('');
  const [searchInputKey, setSearchInputKey] = useState(0);
  const [categoryStatus, setCategoryStatus] = useState('loading');
  const [itemStatus, setItemStatus] = useState('loading');
  const [retryCount, setRetryCount] = useState(0);
  const [categoryRetryCount, setCategoryRetryCount] = useState(0);
  const isLoading = categoryStatus === 'loading' || itemStatus === 'loading';
  const hasError = categoryStatus === 'error' || itemStatus === 'error';
  const clearSearch = () => {
    setSearchKeyword('');
    setDebouncedSearchKeyword('');
    setSearchInputKey((key) => key + 1);
  };
  const retryMenu = () => {
    setCategoryStatus('loading');
    setItemStatus('loading');
    setCategoryRetryCount((count) => count + 1);
    setRetryCount((count) => count + 1);
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
    // 分類也要重抓：重新連線、店長停用／啟用分類後，分類頁籤可能已經不一樣
    setCategoryRetryCount((count) => count + 1);
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
        // 重抓分類時（例如店長停用了某個分類）高亮停在原本的分類；它不見了才回到第一個
        setActiveCategoryId((current) => visibleCategories.some((item) => item.id === current)
          ? current
          : visibleCategories[0]?.id ?? null);
        setCategoryStatus('success');
      } catch (error) {
        if (isCurrentRequest) {
          // 背景重抓失敗時保留畫面上已有的分類，只有一開始就沒資料才顯示錯誤
          setCategoryStatus((status) => status === 'success' ? status : 'error');
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

  // 一次抓全部上架品項（不帶 categoryId），依分類分段在前端做。
  // 即時更新或重連造成的重抓不清空畫面：清空會讓整份清單消失、捲動位置跳回最上面。
  useEffect(() => {
    let isCurrentRequest = true;
    async function loadItems() {
      try {
        const response = await customerClient.get('/order/items');
        if (isCurrentRequest) {
          setItems(response.data.filter((item) => !unlistedMenuItems.current.has(String(item.id))).map((item) => menuStatusOverrides.current.has(String(item.id))
            ? { ...item, soldOut: menuStatusOverrides.current.get(String(item.id)) }
            : item));
          setItemStatus('success');
        }
      } catch (error) {
        if (isCurrentRequest) {
          // 背景重抓失敗時保留畫面上已有的菜單，只有一開始就沒資料才顯示錯誤
          setItemStatus((status) => status === 'success' ? status : 'error');
          console.error(error);
        }
      }
    }
    loadItems();

    return () => {
      isCurrentRequest = false;
    };
  }, [retryCount]);

  // ---- 菜單內容：全部品項依分類分段，搜尋時跨分類篩選 ----
  const keyword = debouncedSearchKeyword.trim().toLowerCase();
  const isSearching = keyword !== '';
  // 分類本身已依 sort_order 排好；搜尋時沒有符合品項的分類整段不顯示
  const sections = useMemo(() => {
    const itemsByCategory = new Map();
    for (const item of items) {
      if (isSearching && !matchesKeyword(item, keyword)) continue;
      const key = String(item.categoryId);
      if (!itemsByCategory.has(key)) itemsByCategory.set(key, []);
      itemsByCategory.get(key).push(item);
    }
    return category
      .map((entry) => ({ category: entry, items: itemsByCategory.get(String(entry.id)) ?? [] }))
      .filter((section) => !isSearching || section.items.length > 0);
  }, [category, items, isSearching, keyword]);
  const visibleItemCount = sections.reduce((sum, section) => sum + section.items.length, 0);

  // ---- 捲動清單＋自動高亮 ----
  const rootRef = useRef(null);
  const headerRef = useRef(null);
  const tabBarRef = useRef(null);
  const scrollerRef = useRef(null);
  const sectionRefs = useRef(new Map());
  const sectionIdsRef = useRef([]);
  // 點頁籤後平滑捲動的這段時間，高亮由點的那個頁籤決定，不跟著途中經過的分類跳
  const isProgrammaticScroll = useRef(false);
  const releaseScrollTimer = useRef(0);
  // 搜尋中點頁籤：先清掉搜尋，等完整清單長出來再捲過去
  const pendingScrollCategoryId = useRef(null);

  // 目前分類 = 標題已經捲過「閱讀線」的最後一段（頁籤列正下方一點點）。
  // 用位置算而不是記錄誰進出畫面，不管是手滑、點頁籤、清單變長變短，結果都一樣
  const syncActiveCategory = useCallback(() => {
    const header = headerRef.current;
    const scroller = scrollerRef.current;
    // 只看真的畫在畫面上的分段（載入中、出錯時沒有分段，高亮維持原樣）
    const renderedIds = sectionIdsRef.current.filter((id) => sectionRefs.current.has(String(id)));
    if (!header || !scroller || renderedIds.length === 0) return;

    const lineY = header.getBoundingClientRect().bottom + ACTIVE_LINE_OFFSET;
    let currentId = renderedIds[0];
    for (const id of renderedIds) {
      if (sectionRefs.current.get(String(id)).getBoundingClientRect().top <= lineY) currentId = id;
    }
    // 捲到最底時，最後一段就算矮到碰不到閱讀線也算目前分類
    const isScrollable = scroller.scrollHeight > scroller.clientHeight + 2;
    if (isScrollable && scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 2) {
      currentId = renderedIds[renderedIds.length - 1];
    }
    setActiveCategoryId(currentId);
  }, []);
  const releaseProgrammaticScroll = useCallback(() => {
    isProgrammaticScroll.current = false;
    syncActiveCategory();
  }, [syncActiveCategory]);
  const scrollToCategory = useCallback((categoryId) => {
    const target = sectionRefs.current.get(String(categoryId));
    if (!target) return;
    isProgrammaticScroll.current = true;
    // 捲動期間每次 scroll 事件都會把放開的時間往後推；萬一根本沒有捲動（已經在那裡），這個計時器負責放開
    window.clearTimeout(releaseScrollTimer.current);
    releaseScrollTimer.current = window.setTimeout(releaseProgrammaticScroll, 300);
    setActiveCategoryId(categoryId);
    // 標題要停在固定頂欄的下面，由每段的 scroll-margin-top（= 頂欄高度）負責
    target.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
  }, [releaseProgrammaticScroll]);
  const handleCategoryClick = (selectedCategory) => {
    // 輸入框已經清空、但 debounce 還沒到時，畫面上仍是篩選後的清單（isSearching 還是 true），所以兩個條件都要看
    if (searchKeyword.trim() || isSearching) {
      clearSearch();
      if (isSearching) {
        // 篩選結果還掛在畫面上，等清單換回完整版再捲
        pendingScrollCategoryId.current = selectedCategory.id;
        setActiveCategoryId(selectedCategory.id);
        return;
      }
    }
    scrollToCategory(selectedCategory.id);
  };

  // 固定頂欄（桌號、搜尋、頁籤）的高度寫成 CSS 變數，給每段的 scroll-margin-top 與最後一段的最小高度用
  useLayoutEffect(() => {
    const root = rootRef.current;
    const header = headerRef.current;
    if (!root || !header) return undefined;

    const updateHeaderHeight = () => {
      root.style.setProperty('--menu-header-h', `${header.getBoundingClientRect().height}px`);
    };
    updateHeaderHeight();
    const resizeObserver = new ResizeObserver(updateHeaderHeight);
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, [closedSession]);

  // 分段有變（載入完成、搜尋、分類停用…）就重新算一次高亮；搜尋中點的頁籤在這裡補捲
  useLayoutEffect(() => {
    sectionIdsRef.current = sections.map((section) => section.category.id);
    const pendingId = pendingScrollCategoryId.current;
    if (pendingId != null && sectionRefs.current.has(String(pendingId))) {
      pendingScrollCategoryId.current = null;
      scrollToCategory(pendingId);
      return;
    }
    if (!isProgrammaticScroll.current) syncActiveCategory();
  }, [sections, scrollToCategory, syncActiveCategory]);

  // 監聽捲動。每一幀最多算一次；點頁籤的平滑捲動結束（捲動事件停 120ms）才放開高亮
  useEffect(() => {
    const scroller = findScrollParent(rootRef.current);
    scrollerRef.current = scroller;
    if (!scroller) return undefined;

    let frame = 0;
    const handleScroll = () => {
      if (isProgrammaticScroll.current) {
        window.clearTimeout(releaseScrollTimer.current);
        releaseScrollTimer.current = window.setTimeout(releaseProgrammaticScroll, 120);
        return;
      }
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        syncActiveCategory();
      });
    };
    scroller.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    return () => {
      scroller.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
      window.cancelAnimationFrame(frame);
      window.clearTimeout(releaseScrollTimer.current);
    };
  }, [closedSession, releaseProgrammaticScroll, syncActiveCategory]);

  // 高亮換分類時，頁籤列自己橫向捲動，讓高亮的頁籤保持在可見範圍
  useEffect(() => {
    const tabBar = tabBarRef.current;
    if (!tabBar || activeCategoryId == null) return;
    const tab = Array.from(tabBar.querySelectorAll('[data-category-id]'))
      .find((element) => element.dataset.categoryId === String(activeCategoryId));
    if (!tab) return;

    const barRect = tabBar.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const margin = 16;
    let delta = 0;
    if (tabRect.left < barRect.left + margin) delta = tabRect.left - barRect.left - margin;
    else if (tabRect.right > barRect.right - margin) delta = tabRect.right - barRect.right + margin;
    // 只動頁籤列自己的 scrollLeft，不用 scrollIntoView，免得連整頁一起被拉動
    if (delta !== 0) tabBar.scrollBy({ left: delta, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }, [activeCategoryId, category, closedSession]);

  // ---- [+] 快速加入 ----
  // 沒有必選群組的品項按 [+] 直接加 1 份（不帶選項）；有必選群組的進詳情頁選規格。
  // hasRequiredOptions 由後端的品項列表一次帶回來；後端沒給這個欄位時當成要選規格，寧可多點一次也不亂加
  const [quickAddStatus, setQuickAddStatus] = useState({});
  const [menuFeedback, setMenuFeedback] = useState(null);
  const feedbackTimer = useRef(0);
  const quickAddDoneTimers = useRef(new Map());
  useEffect(() => {
    const doneTimers = quickAddDoneTimers.current;
    return () => {
      window.clearTimeout(feedbackTimer.current);
      doneTimers.forEach((timer) => window.clearTimeout(timer));
      doneTimers.clear();
    };
  }, []);
  const showFeedback = useCallback((type, text) => {
    window.clearTimeout(feedbackTimer.current);
    setMenuFeedback({ type, text });
    feedbackTimer.current = window.setTimeout(() => setMenuFeedback(null), type === 'error' ? 4000 : 2000);
  }, []);
  const setItemQuickAdd = useCallback((itemId, status) => {
    setQuickAddStatus((current) => {
      const next = { ...current };
      if (status) next[itemId] = status;
      else delete next[itemId];
      return next;
    });
  }, []);
  const openItemDetail = (item) => navigate('/order/itemdetail', { state: { productId: item.id, sessionId } });
  const handleQuickAdd = async (item) => {
    const itemKey = String(item.id);
    if (quickAddStatus[itemKey]) return;
    if (item.hasRequiredOptions !== false) {
      openItemDetail(item);
      return;
    }
    if (!sessionId) {
      showFeedback('error', '桌次資訊還在載入，請稍後再試');
      return;
    }

    const expectedSessionId = sessionId;
    const expectedGeneration = sessionEpoch;
    setItemQuickAdd(itemKey, 'adding');
    try {
      // 跟品項詳情頁的「加入購物車」同一支 API
      await addMenuItemToCart({
        sessionId: expectedSessionId,
        menuItemId: Number(item.id),
        quantity: 1,
        optionValueIds: [],
      });
      if (!isCurrentMenuSession(expectedSessionId, expectedGeneration) || sessionEnded.current) return;
      setItemQuickAdd(itemKey, 'added');
      window.clearTimeout(quickAddDoneTimers.current.get(itemKey));
      quickAddDoneTimers.current.set(itemKey, window.setTimeout(() => {
        quickAddDoneTimers.current.delete(itemKey);
        setItemQuickAdd(itemKey, null);
      }, QUICK_ADD_DONE_MS));
      showFeedback('success', `已加入購物車：${item.name}`);
      // 購物車列平常靠 WebSocket 更新；這裡主動抓一次，連線不穩時畫面也不會落後
      refreshCart();
    } catch (error) {
      setItemQuickAdd(itemKey, null);
      if (!isCurrentMenuSession(expectedSessionId, expectedGeneration) || sessionEnded.current) return;
      if (handleSessionApiError(error, expectedSessionId, expectedGeneration)) return;
      // 售完、下架、分類被停用、桌次已關閉（409）都會帶後端寫好的原因
      showFeedback('error', error?.message || '加入購物車失敗，請稍後再試');
    }
  };

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
      <div ref={rootRef} data-menu-page className="relative min-h-screen w-full self-start bg-paper pb-24">
        {/* 固定在頂部：桌號頂欄、搜尋框、分類頁籤。內容捲動時它們不動 */}
        <div ref={headerRef} className="sticky top-0 z-20 bg-paper">
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

          <nav ref={tabBarRef} aria-label="菜單分類" className="overflow-x-auto border-b border-line bg-surface">
            <div className="w-max px-4">
              <MenuCategoryTabs
                  category={category}
                  activeCategoryId={activeCategoryId}
                  onClick={handleCategoryClick}
              />
            </div>
          </nav>
        </div>

        <main className="px-4 pb-4">
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
          ) : visibleItemCount === 0 ? (
            <MenuState
              title={isSearching ? '找不到符合的菜色' : '目前沒有上架的菜單'}
              description={isSearching ? '試試其他關鍵字，或清除搜尋看看其他菜色。' : '請稍後重新載入，或按右上角的服務鈴詢問店員。'}
              action={isSearching ? '清除搜尋' : '重新載入'}
              onAction={isSearching ? clearSearch : retryMenu}
            />
          ) : sections.map((section, index) => {
            const isLastSection = index === sections.length - 1;
            return (
              <section
                key={section.category.id}
                ref={(element) => {
                  if (element) sectionRefs.current.set(String(section.category.id), element);
                  else sectionRefs.current.delete(String(section.category.id));
                }}
                aria-labelledby={`menu-section-${section.category.id}`}
                // 點頁籤捲到這一段時標題停在固定頂欄下面（scroll-margin-top = 頂欄高度）。
                // 最後一段至少撐到「一個畫面高」，不然它矮的時候捲不到頂，頁籤點了也對不上
                // （7rem = 頁面底部留給購物車列的 pb-24 加上 main 的 pb-4）
                className={`scroll-mt-(--menu-header-h) pb-2 ${isLastSection && !isSearching ? 'min-h-[calc(100dvh_-_var(--menu-header-h,0px)_-_7rem)]' : ''}`}
              >
                <div className="flex items-baseline gap-2 px-1 pb-4 pt-4">
                  <h2 id={`menu-section-${section.category.id}`} className="type-h2 text-ink-900">{section.category.name}</h2>
                  <span className="type-caption text-ink-600">
                    {section.items.length} 款{!isSearching && section.category.name === '肉品' ? '・全部現切' : ''}
                  </span>
                </div>
                {section.items.length === 0 ? (
                  <p className="px-1 type-body-sm text-ink-600">這個分類目前沒有上架的菜色</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {section.items.map((item) => (
                      <MenuItemCard
                        key={item.id}
                        item={item}
                        quickAddStatus={quickAddStatus[String(item.id)]}
                        onOpen={() => openItemDetail(item)}
                        onQuickAdd={() => handleQuickAdd(item)}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
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
        {/* [+] 快速加入的回饋：成功一行提示，失敗顯示後端給的原因。浮在購物車列上方，不擋住其他操作 */}
        <div aria-live="polite" aria-atomic="true" className="pointer-events-none fixed inset-x-4 bottom-28 z-30 flex justify-center">
          {menuFeedback && (
            <p
              role={menuFeedback.type === 'error' ? 'alert' : undefined}
              className={`max-w-full rounded-btn px-4 py-3 type-body-sm text-white shadow-lg ${menuFeedback.type === 'error' ? 'bg-danger' : 'bg-ink-900'}`}
            >
              {menuFeedback.text}
            </p>
          )}
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

function MenuItemCard({ item, quickAddStatus, onOpen, onQuickAdd }) {
  const isSoldOut = Boolean(item.soldOut)
  const needsOptions = item.hasRequiredOptions !== false

  // 整列點擊永遠進詳情頁；[+] 是另一顆獨立的按鈕（按鈕不能包按鈕），
  // 所以整列的點擊用一個蓋滿整列的透明按鈕來做。它放在列的前面，[+] 在後面，
  // 同樣是 relative 定位的話後面的會疊在上面，不用 z-index（用了會蓋過底部的購物車列）
  return (
    <div className="relative">
      <button
        type="button"
        disabled={isSoldOut}
        onClick={onOpen}
        aria-label={isSoldOut ? `${item.name}，售完` : `查看${item.name}詳情`}
        className={`absolute inset-0 rounded-card outline-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 ${isSoldOut ? 'cursor-not-allowed' : 'cursor-pointer active:bg-ink-900/5'}`}
      />
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
        // 售完的品項不顯示 [+]
        action={isSoldOut ? null : (
          <QuickAddButton
            itemName={item.name}
            needsOptions={needsOptions}
            status={quickAddStatus}
            onClick={onQuickAdd}
          />
        )}
      />
    </div>
  )
}

// 觸控範圍 44×44，看得到的圓鈕 28px；負的邊距讓圓鈕貼齊卡片內容邊緣、也不撐高價格那一行
function QuickAddButton({ itemName, needsOptions, status, onClick }) {
  const label = status === 'added'
    ? `已加入購物車：${itemName}`
    : needsOptions ? `${itemName}，選擇選項` : `加入購物車：${itemName}`

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={Boolean(status)}
      aria-label={label}
      className="relative -my-1.5 -mr-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full outline-brand-600 focus-visible:outline-2 disabled:cursor-default"
    >
      {status === 'added' ? (
        <span className="flex size-7 items-center justify-center rounded-full bg-success">
          <SvgIconMap.ToastCheck aria-hidden="true" className="size-4" />
        </span>
      ) : (
        <SvgIconMap.CounterRedplus aria-hidden="true" className={`size-7 ${status === 'adding' ? 'opacity-50' : ''}`} />
      )}
    </button>
  )
}
