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
import axios from 'axios';

export interface BadgeItem {
  text: string;
  type: 'danger' | 'warning';
}

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  imageText: string;
  imageUrl?: string | null;
}

interface AdminMenuItemResponse {
  img: string | null;
  name: string;
  price: number;
}

interface MenuCategoryResponse {
  id: number;
  name: string;
  count: number;
}

export default function AdminMenu() {
  const [activeCategory, setActiveCategory] = useState<string>('全部'); 
  // 商品類別
  const [categories, setCategories] = useState<Category[]>([]);
  // 產品
  const [products, setProducts] = useState<Product[]>([]);
  // 分類後商品列表
  const [searchTerm, setSearchTerm] = useState<string>(''); 
  // 
  const [modalMode, setModalMode] = useState<'closed' | 'add' | 'edit'>('closed');
  // 選取商品
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});
  //
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);

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

  const toggleStatus = (id: number) => {
    setProducts(prev => 
      prev.map(item => 
        item.id === id 
          ? { ...item, status: item.status === 'active' ? 'inactive' : 'active' }
          : item
      )
    );
  };

  const handleOpenAdd = () => {
    // 動態抓取第一個非「全部」的有效分類名稱
    const firstValidCategory = categories.find(c => c.id !== 'all')?.name || '';

    setCurrentProduct({ 
      name: '', 
      category: activeCategory === '全部' ? firstValidCategory : activeCategory, 
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

  const handleDeleteProduct = (id: number) => {
    if (window.confirm('確定要刪除此商品嗎？')) {
      setProducts(prev => prev.filter(item => item.id !== id));
    }
  };

  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    if (categoryId === 'all') return; 

    const hasProducts = products.some(p => p.category === categoryName);
    if (hasProducts) {
      alert(`「${categoryName}」分類下尚有商品，請先將商品刪除或變更分類後再進行操作！`);
      return;
    }

    if (window.confirm(`確定要刪除「${categoryName}」分類嗎？`)) {
      setCategories(prev => prev.filter(c => c.id !== categoryId));
      if (activeCategory === categoryName) {
        setActiveCategory('全部');
      }
    }
  };

  const handleSaveProduct = (formData: Partial<Product>) => {
    if (!formData.name) return;

    const stockVal = Number(formData.stock) || 0;
    
    if (modalMode === 'add') {
      const firstValidCategory = categories.find(c => c.id !== 'all')?.name || '';
      
      const newProduct: Product = {
        id: Date.now(),
        name: formData.name,
        category: formData.category || firstValidCategory, 
        price: Number(formData.price) || 0,
        stock: stockVal,
        status: (formData.status as 'active' | 'inactive') || 'active',
        imageText: formData.imageText || '預設圖'
      };
      setProducts([newProduct, ...products]);
    } else if (modalMode === 'edit' && formData.id) {
      setProducts(prev => 
        prev.map(item => 
          item.id === formData.id 
            ? { 
                ...(formData as Product), 
                stock: stockVal,
                price: Number(formData.price) 
              } 
            : item
        )
      );
    }
    setModalMode('closed');
  };

  const handleAddCategory = (newCategoryName: string) => {
    if (categories.some(c => c.name === newCategoryName)) {
      alert('分類名稱已存在！');
      return;
    }
    const newCat: Category = {
      id: Date.now().toString(),
      name: newCategoryName,
      count: 0 
    };
    setCategories([...categories, newCat]);
  };

  const getProductBadge = (product: Product): BadgeItem | null => {
    if (product.stock === 0) return { text: '售完', type: 'danger' };
    if (product.stock <= 5) return { text: '低量', type: 'warning' };
    return null;
  };

  const filteredProducts = products.filter(item => {
    const matchCategory = activeCategory === '全部' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleSelectCategory = (categoryName: string) => {
    setActiveCategory(categoryName);
    const category = categories.find(item => item.name === categoryName);
    setActiveCategoryId(categoryName === '全部' ? null : Number(category?.id));
  };

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await axios.get<MenuCategoryResponse[]>('http://localhost:8080/api/order/admin/categories');
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
  }, []);

  useEffect(() => {
    let isCurrentRequest = true;
    const timeoutId = setTimeout(() => {
      async function loadItems() {
        try {
          const response = await axios.get<AdminMenuItemResponse[]>('http://localhost:8080/api/order/admin/menu', {
            params: { categoryId: activeCategoryId ?? undefined },
          });
          if (isCurrentRequest) {
            const categoryName = categories.find(category => Number(category.id) === activeCategoryId)?.name ?? '全部';
            setProducts(response.data.map((item, index) => ({
              id: index + 1,
              name: item.name,
              category: categoryName,
              price: item.price,
              stock: 10,
              status: 'active',
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
    }, 300);

    return () => {
      isCurrentRequest = false;
      clearTimeout(timeoutId);
    };
  }, [activeCategoryId, categories]);

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
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
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
    <div className="bg-paper text-ink-900 p-6 min-h-screen font-sans relative">
      <div className="flex max-w-7xl mx-auto gap-8">
        
        <CategorySidebar 
          categories={displayCategories} 
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
        />

        <div className="flex-1 bg-surface rounded-xl shadow-(--shadow-card) border border-line overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-line flex justify-between items-center bg-surface-200">
              <span className="text-sm font-bold text-ink-600">當前分類：{activeCategory}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-line text-ink-400 text-xs bg-surface-200">
                    <th className="p-4 font-medium">縮圖</th>
                    <th className="p-4 font-medium">品項</th>
                    <th className="p-4 font-medium">分類</th>
                    <th className="p-4 font-medium">價格</th>
                    <th className="p-4 font-medium">庫存</th>
                    <th className="p-4 font-medium">上架狀態</th>
                    <th className="p-4 font-medium">操作</th>
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
                            <div className="text-xs text-ink-400 mt-1">份量・加點配料</div>
                          </td>
                          <td className="p-4 text-ink-600">{product.category}</td>
                          <td className="p-4 font-medium text-ink-900">${product.price}</td>
                          <td className={`p-4 font-medium ${product.stock === 0 ? 'text-danger' : 'text-ink-600'}`}>庫存</td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <ToggleSwitch active={isActive} onToggle={() => toggleStatus(product.id)} />
                              <span className="text-xs text-ink-600">{isActive ? '上架中' : '已下架'}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => handleOpenEdit(product)} className="text-ink-600 hover:text-ink-900 text-xs border border-line px-3 py-1.5 rounded-lg bg-surface shadow-sm hover:bg-surface-200 transition-colors cursor-pointer">編輯</button>
                              <button type="button" onClick={() => handleDeleteProduct(product.id)} className="text-danger hover:text-red-700 text-xs border border-line px-3 py-1.5 rounded-lg bg-surface shadow-sm hover:bg-red-50 transition-colors cursor-pointer">刪除</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-ink-400">
                        {searchTerm ? '找不到符合的商品' : '此分類目前沒有商品'}
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
      />
    </div>
  </>
  );
}