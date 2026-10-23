import React, { useEffect, useState } from 'react';
import ToggleSwitch from '../../../components/adminMenu/ToggleSwitch';
import CategorySidebar from '../../../components/adminMenu/CategorySidebar';
import type { Category } from '../../../components/adminMenu/CategorySidebar';
import SOButton from '@/components/SOButton';
import TopBar from '@/components/dashboard/TopBar';
import SOFormInput, { SOFormInputType } from '@/components/input/SOFormInput';
import { SvgIconMap } from '@/assets/SvgIconMap';
import ProductModal from '@/components/adminMenu/ProductModal';
import type { OptionGroupSummary } from '@/components/adminMenu/ProductModal';
import { ApiError, describeApiError } from '@/services/client/ApiError';
import { employeeClient } from '@/services/client/employeeClient';

export interface BadgeItem {
  text: string;
  type: 'danger' | 'warning';
}

export interface Product {
  id: number;
  name: string;
  description?: string;
  categoryId: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  imageText: string;
  imageUrl?: string | null;
  // 鍋底、免費續加、是否追蹤庫存、飲食標示；optionGroupIds 的順序就是顧客端顯示順序
  soupBase?: boolean;
  refill?: boolean;
  trackInventory?: boolean;
  vegetarian?: boolean;
  containsBeef?: boolean;
  spicyLevel?: number;
  optionGroupIds?: number[];
}

interface AdminMenuItemResponse {
  id: number;
  img: string | null;
  name: string;
  description: string | null;
  price: number;
  categoryId: number;
  stock: number;
  active: boolean;
  soupBase: boolean;
  refill: boolean;
  trackInventory: boolean;
  vegetarian: boolean;
  containsBeef: boolean;
  spicyLevel: number;
  optionGroupIds: number[];
}

interface SaveMenuItemRequest {
  name: string;
  description: string;
  categoryId: number;
  price: number;
  imageUrl: string | null;
  stock: number;
  active: boolean;
  soupBase: boolean;
  refill: boolean;
  trackInventory: boolean;
  vegetarian: boolean;
  containsBeef: boolean;
  spicyLevel: number;
  optionGroupIds: number[];
}

interface MenuCategoryResponse {
  id: number;
  name: string;
  count: number;
  sortOrder: number;
  active: boolean;
  cookOrder: number;
}

function toCategory(category: MenuCategoryResponse): Category {
  return {
    id: String(category.id),
    name: category.name,
    count: category.count,
    active: category.active,
    cookOrder: category.cookOrder,
  };
}

const SPICY_LABELS = ['不辣', '小辣', '中辣', '大辣'];

export default function AdminMenu() {
  // 商品類別
  const [categories, setCategories] = useState<Category[]>([]);
  // 產品
  const [products, setProducts] = useState<Product[]>([]);
  // 分類後商品列表
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  // 
  const [modalMode, setModalMode] = useState<'closed' | 'add' | 'edit'>('closed');
  // 選取商品
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  //
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [reloadCategoriesKey, setReloadCategoriesKey] = useState(0);
  // 可以掛在品項上的選項群組（品項編輯視窗用）
  const [optionGroups, setOptionGroups] = useState<OptionGroupSummary[]>([]);
  // 後端回 403 代表登入的不是店長（例如櫃檯人員）：改顯示說明，不要顯示空表格
  const [accessDenied, setAccessDenied] = useState(false);

  // 動態計算分類數量
  const totalProductCount = categories
    .filter(category => category.id !== 'all')
    .reduce((total, category) => total + category.count, 0);
  const displayCategories = categories.map(cat => ({
    ...cat,
    count: cat.id === 'all' 
      ? totalProductCount
      : cat.count
  }));

  const markAccessDenied = (error: unknown) => {
    if (error instanceof ApiError && error.status === 403) setAccessDenied(true);
  };

  const toggleStatus = async (product: Product) => {
    const active = product.status !== 'active';
    try {
      await employeeClient.patch(`/order/admin/items/${product.id}/status`, { active });
      setReloadKey(key => key + 1);
    } catch (error) {
      alert(describeApiError(error, '更新上架狀態失敗'));
    }
  };

  const handleOpenAdd = () => {
    const firstValidCategoryId = categories.find(category => category.id !== 'all')?.id || '';

    setCurrentProduct({ 
      name: '', 
      categoryId: activeCategoryId ?? firstValidCategoryId,
      price: 0, 
      stock: 10, 
      status: 'active', 
      imageText: '預設圖',
      soupBase: false,
      refill: false,
      trackInventory: true,
      vegetarian: false,
      containsBeef: false,
      spicyLevel: 0,
      optionGroupIds: [],
    });
    setModalMode('add');
  };

  const handleOpenEdit = (product: Product) => {
    setCurrentProduct({ ...product });
    setModalMode('edit');
  };

  const handleDeleteProduct = async (id: number) => {
    if (window.confirm('確定要刪除此商品嗎？')) {
      try {
        await employeeClient.delete(`/order/admin/items/${id}`);
        setModalMode('closed');
        setReloadKey(key => key + 1);
        setReloadCategoriesKey(key => key + 1);
      } catch (error) {
        alert(describeApiError(error, '刪除商品失敗'));
      }
    }
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    if (categoryId === 'all') return; 

    const category = categories.find(item => item.id === categoryId);
    const hasProducts =
      (category?.count ?? 0) > 0 ||
      products.some(product => product.categoryId === categoryId);
    if (hasProducts) {
      alert(`「${categoryName}」分類下尚有商品，請先將商品刪除或變更分類後再進行操作！`);
      return;
    }

    if (window.confirm(`確定要刪除「${categoryName}」分類嗎？`)) {
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      if (activeCategoryId === categoryId) {
        setActiveCategoryId(null);
      }
    }
  };

  const handleSaveProduct = async (formData: Partial<Product>) => {
    if (!formData.name || !formData.categoryId) return;

    const payload: SaveMenuItemRequest = {
      name: formData.name.trim(),
      description: formData.description?.trim() ?? '',
      categoryId: Number(formData.categoryId),
      price: Number(formData.price) || 0,
      imageUrl: formData.imageUrl?.trim() || null,
      stock: Math.max(0, Number(formData.stock) || 0),
      active: formData.status !== 'inactive',
      soupBase: formData.soupBase === true,
      refill: formData.refill === true,
      trackInventory: formData.trackInventory !== false,
      vegetarian: formData.vegetarian === true,
      containsBeef: formData.containsBeef === true,
      spicyLevel: Math.min(3, Math.max(0, Number(formData.spicyLevel) || 0)),
      optionGroupIds: formData.optionGroupIds ?? [],
    };

    try {
      if (modalMode === 'add') {
        await employeeClient.post('/order/admin/items', payload);
      } else if (modalMode === 'edit' && formData.id) {
        await employeeClient.put(`/order/admin/items/${formData.id}`, payload);
      } else {
        return;
      }
      setModalMode('closed');
      setReloadKey(key => key + 1);
      setReloadCategoriesKey(key => key + 1);
    } catch (error) {
      alert(describeApiError(error, '儲存商品失敗'));
    }
  };

  const handleAddCategory = async (newCategoryName: string): Promise<Category | null> => {
    if (categories.some(c => c.name === newCategoryName)) {
      alert('分類名稱已存在！');
      return null;
    }
    try {
      const response = await employeeClient.post<MenuCategoryResponse>(
        '/order/admin/categories',
        { name: newCategoryName },
      );
      const newCategory = toCategory(response.data);
      setCategories(prev => [...prev, newCategory]);
      return newCategory;
    } catch (error) {
      alert(describeApiError(error, '新增分類失敗，請稍後再試。'));
      return null;
    }
  };

  // 分類改名（停用狀態維持不變）。成功回 true，失敗已用 alert 顯示原因
  const handleRenameCategory = async (categoryId: string, name: string): Promise<boolean> => {
    try {
      const response = await employeeClient.put<MenuCategoryResponse>(
        `/order/admin/categories/${categoryId}`,
        { name },
      );
      setCategories(prev => prev.map(item => item.id === categoryId ? toCategory(response.data) : item));
      return true;
    } catch (error) {
      alert(describeApiError(error, '分類改名失敗，請稍後再試。'));
      return false;
    }
  };

  // 停用／啟用分類：停用後顧客端看不到這個分類，底下的品項也一起看不到
  const handleToggleCategoryActive = async (categoryId: string, active: boolean): Promise<boolean> => {
    const category = categories.find(item => item.id === categoryId);
    if (!category) return false;
    if (!active && !window.confirm(`停用「${category.name}」後，顧客端看不到這個分類和底下的所有品項，確定嗎？`)) {
      return false;
    }
    try {
      const response = await employeeClient.put<MenuCategoryResponse>(
        `/order/admin/categories/${categoryId}`,
        { active },
      );
      setCategories(prev => prev.map(item => item.id === categoryId ? toCategory(response.data) : item));
      return true;
    } catch (error) {
      alert(describeApiError(error, '更新分類狀態失敗，請稍後再試。'));
      return false;
    }
  };

  // 出餐順序：只送 cookOrder，名稱和停用狀態維持不變（出菜看板依這個值排同一張單的品項）
  const handleChangeCategoryCookOrder = async (categoryId: string, cookOrder: number): Promise<boolean> => {
    try {
      const response = await employeeClient.put<MenuCategoryResponse>(
        `/order/admin/categories/${categoryId}`,
        { cookOrder },
      );
      setCategories(prev => prev.map(item => item.id === categoryId ? toCategory(response.data) : item));
      return true;
    } catch (error) {
      alert(describeApiError(error, '更新出餐順序失敗，請稍後再試。'));
      return false;
    }
  };

  // 分類上移／下移一格：把全部分類（含停用的）依新順序送給後端。
  // 一起送移動前畫面上的順序（expectedCategoryIds），後端發現資料庫的順序已經不一樣（別人剛排過）就回 409，
  // 不會照畫面上的舊順序把別人排好的蓋掉
  const handleMoveCategory = async (categoryId: string, direction: -1 | 1): Promise<boolean> => {
    const ids = categories.filter(item => item.id !== 'all').map(item => item.id);
    const index = ids.indexOf(categoryId);
    const target = index + direction;
    if (index === -1 || target < 0 || target >= ids.length) return false;
    const expectedCategoryIds = ids.map(Number);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      const response = await employeeClient.patch<MenuCategoryResponse[]>(
        '/order/admin/categories/sort-order',
        { categoryIds: ids.map(Number), expectedCategoryIds },
      );
      setCategories(prev => [
        ...prev.filter(item => item.id === 'all'),
        ...response.data.map(toCategory),
      ]);
      return true;
    } catch (error) {
      alert(describeApiError(error, '調整分類排序失敗，請重新整理後再試。'));
      // 清單過期（別人新增、刪除過分類，或剛調整過順序）：重抓分類，不然之後每次移動都會再撞 409
      if (error instanceof ApiError && error.code === 'CATEGORY_LIST_CHANGED') {
        setReloadCategoriesKey(key => key + 1);
      }
      return false;
    }
  };

  const handleDeleteClassification = async (categoryId: string): Promise<void> => {
    if (categoryId === 'all') return;

    const category = categories.find(item => item.id === categoryId);
    const hasProducts =
      (category?.count ?? 0) > 0 ||
      products.some(product => product.categoryId === categoryId);

    if (hasProducts) {
      alert('此分類下尚有商品，請先將商品移走或刪除。');
      return;
    }

    if (!window.confirm(`確定要刪除「${category?.name ?? ''}」分類嗎？`)) {
      return;
    }

    try {
      await employeeClient.delete(
        `/order/admin/categories/${categoryId}`
      );
    } catch (error) {
      alert(describeApiError(error, '刪除分類失敗，請稍後再試。'));
      return;
    }

    setCategories(prev => prev.filter(item => item.id !== categoryId));

    if (activeCategoryId === categoryId) {
      setActiveCategoryId(null);
    }
  };

  // 不追蹤庫存的品項（例如免費續加）庫存是 0 也不算售完、不顯示低量
  const getProductBadge = (product: Product): BadgeItem | null => {
    if (product.trackInventory === false) return null;
    if (product.stock === 0) return { text: '售完', type: 'danger' };
    if (product.stock <= 5) return { text: '低量', type: 'warning' };
    return null;
  };

  // 品項下方的小標籤：鍋底、免費續加、飲食標示、辣度、選項群組數
  const getProductTags = (product: Product): string[] => {
    const tags: string[] = [];
    if (product.soupBase) tags.push('鍋底');
    if (product.refill) tags.push('免費續加');
    if (product.vegetarian) tags.push('素食');
    if (product.containsBeef) tags.push('含牛');
    if ((product.spicyLevel ?? 0) > 0) tags.push(SPICY_LABELS[product.spicyLevel ?? 0] ?? '');
    if ((product.optionGroupIds?.length ?? 0) > 0) tags.push(`${product.optionGroupIds?.length} 個選項群組`);
    return tags.filter(Boolean);
  };

  const filteredProducts = products.filter(item => {
    const matchCategory = activeCategoryId === null || item.categoryId === activeCategoryId;
    const matchSearch = item.name.toLowerCase().includes(searchKeyword.trim().toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleSelectCategory = (categoryId: string) => {
    setActiveCategoryId(categoryId === 'all' ? null : categoryId);
  };

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await employeeClient.get<MenuCategoryResponse[]>('/order/admin/categories');
        const fetchedCategories = response.data.map(toCategory)

        const categoriesWithAll = [
          { id: 'all', name: '全部', count: 0 },
          ...fetchedCategories
        ];
        

        setCategories(categoriesWithAll);
      } catch (error) {
        console.error(error);
        markAccessDenied(error);
      }
    }
    fetchCategories();
  }, [reloadCategoriesKey]);

  useEffect(() => {
    let isCurrentRequest = true;
    async function fetchOptionGroups() {
      try {
        const response = await employeeClient.get<OptionGroupSummary[]>('/order/admin/optionGroups');
        if (isCurrentRequest) {
          setOptionGroups(response.data.map(group => ({ id: group.id, name: group.name })));
        }
      } catch (error) {
        console.error(error);
        markAccessDenied(error);
      }
    }
    fetchOptionGroups();
    return () => {
      isCurrentRequest = false;
    };
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;
      async function loadItems() {
        try {
          const response = await employeeClient.get<AdminMenuItemResponse[]>('/order/admin/menu', {
            params: searchKeyword.trim()
              ? { keyword: searchKeyword.trim() }
              : { categoryId: activeCategoryId === null ? undefined : Number(activeCategoryId) },
          });
          if (isCurrentRequest) {
            setProducts(response.data.map(item => ({
              id: item.id,
              name: item.name,
              description: item.description ?? '',
              categoryId: String(item.categoryId),
              price: item.price,
              stock: item.stock,
              status: item.active ? 'active' : 'inactive',
              imageText: item.img ? '' : '無圖片',
              imageUrl: item.img,
              soupBase: item.soupBase,
              refill: item.refill,
              trackInventory: item.trackInventory,
              vegetarian: item.vegetarian,
              containsBeef: item.containsBeef,
              spicyLevel: item.spicyLevel,
              optionGroupIds: item.optionGroupIds,
            })));
          }
        } catch (error) {
          if (isCurrentRequest) {
            console.error(error);
            markAccessDenied(error);
          }
        }
      }
      loadItems();

    return () => {
      isCurrentRequest = false;
    };
  }, [activeCategoryId, searchKeyword, reloadKey]);

  return (
  <>
    <TopBar 
      tag={accessDenied ? undefined : `${totalProductCount} 個品項・${categories.filter(category => category.id !== 'all').length} 個分類`}
      childrenRight={accessDenied ? undefined : (
        <div className="flex items-center gap-3">
          <div className="w-36">
            <SOFormInput
              type={SOFormInputType.NORMAL}
              icon={SvgIconMap.MenuSearch}
              defaultValue=""
              placeholder="搜尋品項"
              onChange={setSearchKeyword}
            />
          </div>
          <SOButton 
            type="button"
            onClick={handleOpenAdd} 
            className="flex h-11 shrink-0 items-center rounded-(--radius-btn) bg-brand-600 px-5 type-body-sm text-surface transition-colors hover:bg-brand-700"
            content={[
              <div key="param-2" className="flex items-center gap-1">
                <SvgIconMap.AdminMenuPlus aria-hidden="true" />
                <span>新增品項</span>
              </div>
            ]}
          />
        </div>
      )}
    />
    {accessDenied ? (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-paper p-6 font-sans text-ink-900">
        <p role="alert" className="rounded-xl border border-line bg-surface px-8 py-6 type-body">
          權限不足：菜單管理只有店長可以使用
        </p>
      </div>
    ) : (
    <div className="min-h-0 flex-1 overflow-hidden bg-paper p-6 font-sans text-ink-900">
      <div className="flex h-full min-h-0 gap-6">
        
        <CategorySidebar 
          categories={displayCategories} 
          activeCategoryId={activeCategoryId ?? 'all'}
          onSelectCategory={handleSelectCategory}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onDeleteClassification={handleDeleteClassification}
          onRenameCategory={handleRenameCategory}
          onToggleCategoryActive={handleToggleCategoryActive}
          onMoveCategory={handleMoveCategory}
          onChangeCategoryCookOrder={handleChangeCategoryCookOrder}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            className="min-h-0 overflow-auto rounded-xl border border-line bg-surface"
            onWheel={event => {
              if (event.shiftKey) {
                event.currentTarget.scrollTop += event.deltaY || event.deltaX;
                event.preventDefault();
              }
            }}
          >
            {/* 版面分兩段（xl = 1280px）：
                - 1280px 以上：欄位完整，跟原本一樣（縮圖、分類、上架狀態文字都顯示）。
                - 1024～1279px（店家端最小驗收寬度）：可用寬度只有約 560px，放不下 780px 的完整表格，
                  所以收合欄位讓「價格、庫存、上架開關、編輯」全部在畫面內、不用左右捲動——
                  縮圖縮小、分類欄改成品項下方的小標籤、上架狀態只留開關（已下架另加標籤）。
                「操作」欄仍保留 sticky，視窗再窄時至少編輯按鈕一直在。 */}
            <table className="w-full min-w-0 xl:min-w-[780px] text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-surface shadow-[inset_0_-1px_0_var(--color-line)]">
                <tr className="type-caption text-ink-600 bg-surface-2">
                    <th className="w-14 border-b border-line px-2 py-3 font-bold whitespace-nowrap xl:w-[88px] xl:px-4">縮圖</th>
                    <th className="border-b border-line px-2 py-3 font-bold whitespace-nowrap xl:px-4">品項</th>
                    <th className="hidden w-20 border-b border-line px-4 py-3 font-bold whitespace-nowrap xl:table-cell">分類</th>
                    <th className="w-16 border-b border-line px-2 py-3 font-bold whitespace-nowrap xl:w-20 xl:px-4">價格</th>
                    <th className="w-16 border-b border-line px-2 py-3 font-bold whitespace-nowrap xl:w-20 xl:px-4">庫存</th>
                    <th className="w-16 border-b border-line px-2 py-3 font-bold whitespace-nowrap xl:w-[132px] xl:px-4">
                      <span className="xl:hidden">上架</span>
                      <span className="hidden xl:inline">上架狀態</span>
                    </th>
                    <th className="sticky right-0 w-[88px] border-b border-line bg-surface-2 px-2 py-3 font-bold whitespace-nowrap shadow-[inset_1px_0_0_var(--color-line)] xl:w-[90px] xl:px-4">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line type-body-sm">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => {
                      const isActive = product.status === 'active';
                      const currentBadge = getProductBadge(product);
                      const isTracked = product.trackInventory !== false;
                      const productTags = getProductTags(product);
                      return (
                        <tr key={product.id} className={currentBadge?.type === 'danger' ? 'bg-danger-bg' : currentBadge ? 'bg-warning-bg' : 'bg-surface hover:bg-paper transition-colors'}>
                          <td className="px-2 py-3 xl:px-4">
                            <div className="size-10 xl:size-18 overflow-hidden bg-surface-2 rounded-lg flex flex-col items-center justify-center text-[10px] text-ink-400 border border-dashed border-line-strong leading-tight text-center break-all">
                              {product.imageUrl
                                ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                : <span>{product.imageText}</span>}
                            </div>
                          </td>
                          <td className="px-2 py-3 xl:px-4">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="type-dashboard-menu-highlighted text-ink-900">{product.name}</span>
                              {!isActive && (
                                <span className="shrink-0 rounded-full border border-line bg-surface-2 px-2.5 py-0.5 type-dashboard-top-bar-tag text-ink-600 xl:hidden">
                                  已下架
                                </span>
                              )}
                              {currentBadge && (
                                <span className={`shrink-0 rounded-full px-2.5 py-0.5 type-dashboard-top-bar-tag ${currentBadge.type === 'danger' ? 'bg-danger text-surface' : 'border border-warning-line bg-warning-bg text-hold-ink'}`}>
                                  {currentBadge.text}
                                </span>
                              )}
                            </div>
                            {product.description && <div className="type-caption text-ink-600 mt-1">{product.description}</div>}
                            {/* 窄版（< xl）沒有分類欄，分類名稱放在這裡；寬版只有在有標示時才顯示這一列。
                                分類寫成「分類：鍋底」純文字，不做成膠囊，才不會跟「鍋底」這類品項標示看起來重複 */}
                            <div className={`mt-1 flex-wrap items-center gap-1 ${productTags.length > 0 ? 'flex' : 'flex xl:hidden'}`}>
                              <span className="pr-1 type-caption text-ink-400 xl:hidden">
                                分類：{categories.find(category => category.id === product.categoryId)?.name ?? ''}
                              </span>
                              {productTags.map(tag => (
                                <span key={tag} className="rounded-full border border-line bg-surface-2 px-2 py-0.5 type-caption text-ink-600">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="hidden px-4 py-3 text-ink-600 xl:table-cell">
                            {categories.find(category => category.id === product.categoryId)?.name ?? ''}
                          </td>
                          <td className="px-2 py-3 font-bold tabular-nums text-ink-900 xl:px-4">{product.price}</td>
                          <td className={`px-2 py-3 xl:px-4 tabular-nums ${currentBadge?.type === 'danger' ? 'font-bold text-danger' : currentBadge ? 'font-bold text-warning' : 'text-ink-900'}`}>
                            {isTracked ? product.stock : <span className="type-caption font-normal text-ink-400">不追蹤</span>}
                          </td>
                          <td className="px-2 py-3 xl:px-4">
                            <div className="flex items-center gap-2">
                              <ToggleSwitch active={isActive} onToggle={() => void toggleStatus(product)} />
                              <span className="hidden type-caption whitespace-nowrap text-ink-600 xl:inline">{isActive ? '上架中' : '已下架'}</span>
                            </div>
                          </td>
                          <td className="sticky right-0 bg-inherit px-2 py-3 shadow-[inset_1px_0_0_var(--color-line)] xl:px-4">
                            <div className="flex justify-center gap-2">
                              <SOButton
                                type="button"
                                onClick={() => handleOpenEdit(product)}
                                className="flex h-9 w-auto shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-(--radius-btn) border border-transparent bg-transparent px-3 py-1.5 type-body-sm text-ink-600 transition-all duration-300 hover:bg-surface-2 hover:text-ink-900 active:scale-[0.98]"
                                content={
                                  <span className="flex items-center gap-1">
                                    <SvgIconMap.OptionsEdit />
                                    編輯
                                  </span>
                                }
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-ink-400">
                        {searchKeyword ? '找不到符合的商品' : '此分類目前沒有商品'}
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
    )}
    <ProductModal
      isOpen={modalMode !== 'closed'}
      mode={modalMode === 'add' ? 'add' : 'edit'}
      initialData={currentProduct}
      categories={categories}
      optionGroups={optionGroups}
      onClose={() => setModalMode('closed')}
      onSave={handleSaveProduct}
      onDelete={handleDeleteProduct}
    />
  </>
  );
}
