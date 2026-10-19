import React, { useEffect, useState } from 'react';
import ToggleSwitch from '../../../components/adminMenu/ToggleSwitch';
import CategorySidebar from '../../../components/adminMenu/CategorySidebar';
import type { Category } from '../../../components/adminMenu/CategorySidebar';
import SOButton from '@/components/SOButton';
import TopBar from '@/components/dashboard/TopBar';
import Badge from '@/components/Badge';
import SOFormInput, { SOFormInputType } from '@/components/input/SOFormInput';
import { SvgIconMap } from '@/assets/SvgIconMap';
import ProductModal from '@/components/adminMenu/ProductModal';
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
}

interface SaveMenuItemRequest {
  name: string;
  description: string;
  categoryId: number;
  price: number;
  imageUrl: string | null;
  stock: number;
  active: boolean;
}

interface MenuCategoryResponse {
  id: number;
  name: string;
  count: number;
}

interface CreatedMenuCategoryResponse {
  id: number;
  name: string;
}

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

  const toggleStatus = async (product: Product) => {
    const active = product.status !== 'active';
    try {
      await employeeClient.patch(`/order/admin/items/${product.id}/status`, { active });
      setReloadKey(key => key + 1);
    } catch (error) {
      alert(error instanceof Error ? error.message : '更新上架狀態失敗');
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
      imageText: '預設圖' 
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
        alert(error instanceof Error ? error.message : '刪除商品失敗');
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
      alert(error instanceof Error ? error.message : '儲存商品失敗');
    }
  };

  const handleAddCategory = async (newCategoryName: string): Promise<Category | null> => {
    if (categories.some(c => c.name === newCategoryName)) {
      alert('分類名稱已存在！');
      return null;
    }
    const response = await employeeClient.post<CreatedMenuCategoryResponse>(
      '/order/admin/categories',
      { name: newCategoryName },
    );
    const newCategory: Category = {
      id: String(response.data.id),
      name: response.data.name,
      count: 0,
    };
    setCategories(prev => [...prev, newCategory]);
    return newCategory;
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

    await employeeClient.delete(
      `/order/admin/categories/${categoryId}`
    );

    setCategories(prev => prev.filter(item => item.id !== categoryId));

    if (activeCategoryId === categoryId) {
      setActiveCategoryId(null);
    }
  };

  const getProductBadge = (product: Product): BadgeItem | null => {
    if (product.stock === 0) return { text: '售完', type: 'danger' };
    if (product.stock <= 5) return { text: '低量', type: 'warning' };
    return null;
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
        const fetchedCategories = response.data.map(category => ({
          ...category,
          id: String(category.id),
        }))

        const categoriesWithAll = [
          { id: 'all', name: '全部', count: 0 },
          ...fetchedCategories
        ];
        

        setCategories(categoriesWithAll);
      } catch (error) {
        console.error(error);
      }
    }
    fetchCategories();
  }, [reloadCategoriesKey]);

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
            })));
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
  }, [activeCategoryId, searchKeyword, reloadKey]);

  return (
  <>
    <TopBar 
      childrenLeft={<div className='flex scale-80'><Badge text={`${totalProductCount} 個品項・${categories.length} 個分類`} col="plain" /></div>} 
      childrenRight={
        <div className="flex items-center gap-3">
          <div className="w-64">
            <SOFormInput
              type={SOFormInputType.NORMAL}
              icon={SvgIconMap.MenuSearch}
              defaultValue=""
              placeholder="搜尋菜色"
              onChange={setSearchKeyword}
            />
          </div>
          <SOButton 
            type="button"
            onClick={handleOpenAdd} 
            height='h-[44px]' 
            content={[
              <div key="param-2" className="flex items-center gap-1">
                <span>新增商品</span>
                <SvgIconMap.AdminMenuPlus aria-hidden="true" />
              </div>
            ]}
          />
        </div>
      }
    />
    <div className="min-h-0 flex-1 overflow-hidden bg-paper p-6 font-sans text-ink-900">
      <div className="flex h-full min-h-0 max-w-7xl mx-auto gap-8">
        
        <CategorySidebar 
          categories={displayCategories} 
          activeCategoryId={activeCategoryId ?? 'all'}
          onSelectCategory={handleSelectCategory}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
          onDeleteClassification={handleDeleteClassification}
        />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-(--shadow-card)">
          <div
            className="no-scrollbar min-h-0 flex-1 overflow-auto"
            onWheel={event => {
              if (event.shiftKey) {
                event.currentTarget.scrollTop += event.deltaY || event.deltaX;
                event.preventDefault();
              }
            }}
          >
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-surface shadow-[inset_0_-1px_0_var(--color-line)]">
                <tr className="text-ink-400 text-xs bg-surface-2">
                    <th className="border-b border-line p-4 font-medium">縮圖</th>
                    <th className="border-b border-line p-4 font-medium">品項</th>
                    <th className="border-b border-line p-4 font-medium">分類</th>
                    <th className="border-b border-line p-4 font-medium">價格</th>
                    <th className="border-b border-line p-4 font-medium">庫存</th>
                    <th className="border-b border-line p-4 font-medium">上架狀態</th>
                    <th className="border-b border-line p-4 font-medium">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-sm">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map(product => {
                      const isActive = product.status === 'active';
                      const currentBadge = getProductBadge(product);
                      return (
                        <tr key={product.id} className="hover:bg-surface-200 transition-colors">
                          <td className="p-4">
                            <div className="w-16 h-16 bg-surface-200 rounded-lg flex flex-col items-center justify-center text-[10px] text-ink-400 border border-line leading-tight text-center break-all px-1">
                              {product.imageUrl
                                ? <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                : <span>{product.imageText}</span>}
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-ink-900">{product.name}</span>
                              {currentBadge && (
                                <div className="flex scale-80">
                                  <Badge text={currentBadge.text} col={currentBadge.type === 'danger' ? 'sold' : 'hot'} />
                                </div>
                              )}
                            </div>
                            {product.description && <div className="text-xs text-ink-400 mt-1">{product.description}</div>}
                          </td>
                          <td className="p-4 text-ink-600">
                            {categories.find(category => category.id === product.categoryId)?.name ?? ''}
                          </td>
                          <td className="p-4 font-medium text-ink-900">${product.price}</td>
                          <td className={`p-4 font-medium ${product.stock === 0 ? 'text-danger' : 'text-ink-600'}`}>{product.stock}</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <ToggleSwitch active={isActive} onToggle={() => void toggleStatus(product)} />
                              <span className="text-xs text-ink-600">{isActive ? '上架中' : '已下架'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleOpenEdit(product)} className="text-ink-600 hover:text-ink-900 text-xs border border-line px-3 py-1.5 rounded-lg bg-surface shadow-sm hover:bg-surface-200 transition-colors cursor-pointer">編輯</button>
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
    <ProductModal
      isOpen={modalMode !== 'closed'}
      mode={modalMode === 'add' ? 'add' : 'edit'}
      initialData={currentProduct}
      categories={categories}
      onClose={() => setModalMode('closed')}
      onSave={handleSaveProduct}
      onDelete={handleDeleteProduct}
    />
  </>
  );
}
