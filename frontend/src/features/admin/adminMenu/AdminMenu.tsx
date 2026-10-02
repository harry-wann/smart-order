import React, { useState } from 'react';
import ToggleSwitch from '../../../components/adminMenu/ToggleSwitch';
import CategorySidebar from '../../../components/adminMenu/CategorySidebar';
import type { Category } from '../../../components/adminMenu/CategorySidebar';
import icPlus from '../../../assets/ic_adminMenu_plus.svg'
import SOButton from '@/components/SOButton';

interface Badge {
  text: string;
  type: 'danger' | 'warning';
}

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  stock: number;
  status: 'active' | 'inactive';
  badge: Badge | null;
  imageText: string;
}

const INITIAL_CATEGORIES: Category[] = [
  { id: 'all', name: '全部', count: 64 },
  { id: 'soup', name: '鍋底', count: 4 },
  { id: 'meat', name: '肉品', count: 12 },
  { id: 'seafood', name: '海鮮', count: 9 },
  { id: 'vegetable', name: '蔬菜', count: 10 },
  { id: 'hotpot', name: '火鍋料', count: 11 },
  { id: 'main', name: '主食', count: 6 },
  { id: 'drink', name: '飲料', count: 8 },
  { id: 'alcohol', name: '酒類', count: 4 },
];

const INITIAL_PRODUCTS: Product[] = [
  {
    id: 1,
    name: '安格斯霜降牛五花',
    category: '肉品',
    price: 380,
    stock: 18,
    status: 'active',
    badge: { text: '人氣', type: 'warning' },
    imageText: '肉盤'
  },
  {
    id: 2,
    name: '伊比利豬梅花',
    category: '肉品',
    price: 320,
    stock: 24,
    status: 'active',
    badge: null,
    imageText: '豬肉盤'
  },
  {
    id: 3,
    name: '紐西蘭小羔羊肩',
    category: '肉品',
    price: 340,
    stock: 0,
    status: 'inactive',
    badge: { text: '售完', type: 'danger' },
    imageText: '羊肉盤'
  },
  {
    id: 4,
    name: '台灣松阪豬',
    category: '肉品',
    price: 300,
    stock: 9,
    status: 'active',
    badge: null,
    imageText: '豬肉盤'
  },
  {
    id: 5,
    name: '美國老饕牛小排',
    category: '肉品',
    price: 520,
    stock: 6,
    status: 'active',
    badge: { text: '低量', type: 'warning' },
    imageText: '肉盤'
  },
  {
    id: 6,
    name: '霜降牛舌',
    category: '肉品',
    price: 460,
    stock: 12,
    status: 'inactive',
    badge: null,
    imageText: '肉盤'
  }
];

export default function AdminMenu() {
  const [activeCategory, setActiveCategory] = useState<string>('肉品');
  const [categories, setCategories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);

  const [modalMode, setModalMode] = useState<'closed' | 'add' | 'edit'>('closed');
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});

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
    setCurrentProduct({ name: '', category: activeCategory === '全部' ? '肉品' : activeCategory, price: 0, stock: 0, status: 'active', imageText: '肉盤' });
    setModalMode('add');
  };

  const handleOpenEdit = (product: Product) => {
    setCurrentProduct({ ...product });
    setModalMode('edit');
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProduct.name) return;

    if (modalMode === 'add') {
      const newProduct: Product = {
        id: Date.now(),
        name: currentProduct.name,
        category: currentProduct.category || '肉品',
        price: Number(currentProduct.price) || 0,
        stock: Number(currentProduct.stock) || 0,
        status: (currentProduct.status as 'active' | 'inactive') || 'active',
        badge: null,
        imageText: currentProduct.imageText || '肉盤'
      };
      setProducts([newProduct, ...products]);
    } else if (modalMode === 'edit' && currentProduct.id) {
      setProducts(prev => 
        prev.map(item => item.id === currentProduct.id ? (currentProduct as Product) : item)
      );
    }
    setModalMode('closed');
  };

  const handleAddCategory = (newCategoryName: string) => {
    const newCat: Category = {
      id: Date.now().toString(),
      name: newCategoryName,
      count: 0
    };
    setCategories([...categories, newCat]);
  };

  const filteredProducts = activeCategory === '全部' 
    ? products 
    : products.filter(item => item.category === activeCategory);

  return (
    <div className="bg-paper text-ink-900 p-6 min-h-screen font-sans relative">
      <div className="flex max-w-7xl mx-auto gap-8">
        
        <CategorySidebar 
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
          onAddCategory={handleAddCategory}
        />

        <div className="flex-1 bg-surface rounded-xl shadow-(--shadow-card) border border-line overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-4 border-b border-line flex justify-between items-center bg-surface-200">
              <span className="text-sm font-bold text-ink-600">當前分類：{activeCategory}</span>
              <div>
              <SOButton 
              type="button"
              onClick={handleOpenAdd} 
              height='h-[44px]' 
              content={[<div key="param-2" className="flex items-center gap-1">
                <span>新增商品</span>
                <img src={icPlus} alt="" />
              </div>]}
              />
            </div>
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
                      return (
                        <tr key={product.id} className="hover:bg-surface-200 transition-colors">
                          <td className="p-4">
                            <div className="w-16 h-16 bg-surface-200 rounded-lg flex flex-col items-center justify-center text-[10px] text-ink-400 border border-line leading-tight">
                              <span>{product.imageText}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-ink-900">{product.name}</span>
                              {product.badge && (
                                <span className={`px-2 py-0.5 text-xs rounded-full ${
                                  product.badge.type === 'danger' 
                                    ? 'bg-danger-bg text-danger-ink' 
                                    : 'bg-warning-bg text-warning-ink'
                                }`}>
                                  {product.badge.text}
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-ink-400 mt-1">份量・加點配料</div>
                          </td>
                          <td className="p-4 text-ink-600">{product.category}</td>
                          <td className="p-4 font-medium text-ink-900">{product.price}</td>
                          <td className={`p-4 font-medium ${product.stock === 0 ? 'text-danger' : 'text-ink-600'}`}>
                            {product.stock}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <ToggleSwitch 
                                active={isActive} 
                                onToggle={() => toggleStatus(product.id)} 
                              />
                              <span className="text-xs text-ink-600">
                                {isActive ? '上架中' : '已下架'}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <button 
                              type="button"
                              onClick={() => handleOpenEdit(product)}
                              className="text-ink-600 hover:text-ink-900 text-xs border border-line px-3 py-1.5 rounded-lg bg-surface shadow-sm hover:bg-surface-200 transition-colors cursor-pointer"
                            >
                              編輯
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-ink-400">
                        此分類目前沒有商品
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-4 text-xs text-ink-400 bg-surface-200 border-t border-line">
            快速下架開關直接放在列上 — 這是店家最常做的一件事，不用點進去。
          </div>
        </div>

      </div>

      {modalMode !== 'closed' && (
        <div className="fixed inset-0 bg-ink-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface rounded-xl p-6 w-full max-w-md shadow-(--shadow-pop) border border-line space-y-4">
            <h3 className="text-lg font-bold text-ink-900">
              {modalMode === 'add' ? '新增商品' : '編輯商品'}
            </h3>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div>
                <label className="block text-xs text-ink-600 mb-1">品項名稱</label>
                <input 
                  type="text" 
                  value={currentProduct.name || ''}
                  onChange={e => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                  required
                  className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-ink-600 mb-1">價格</label>
                  <input 
                    type="number" 
                    value={currentProduct.price || 0}
                    onChange={e => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface"
                  />
                </div>
                <div>
                  <label className="block text-xs text-ink-600 mb-1">庫存</label>
                  <input 
                    type="number" 
                    value={currentProduct.stock || 0}
                    onChange={e => setCurrentProduct({ ...currentProduct, stock: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 text-sm border border-line rounded-lg focus:outline-none focus:border-brand-600 bg-surface"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setModalMode('closed')}
                  className="px-4 py-2 text-xs border border-line rounded-lg text-ink-600 hover:bg-surface-200 cursor-pointer"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-xs bg-brand-600 text-surface rounded-lg font-medium hover:opacity-90 cursor-pointer"
                >
                  確認儲存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}