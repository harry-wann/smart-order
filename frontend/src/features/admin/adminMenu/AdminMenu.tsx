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
  isPopular?: boolean; 
  imageText: string;
}

const INITIAL_PRODUCTS: Product[] = [
  { id: 1, name: '安格斯霜降牛五花', category: '肉品', price: 380, stock: 18, status: 'active', isPopular: true, imageText: '牛五花' },
  { id: 2, name: '伊比利豬梅花', category: '肉品', price: 320, stock: 24, status: 'active', isPopular: false, imageText: '豬梅花' },
  { id: 3, name: '紐西蘭小羔羊肩', category: '肉品', price: 340, stock: 0, status: 'inactive', isPopular: false, imageText: '羊肉片' },
  { id: 4, name: '台灣松阪豬', category: '肉品', price: 300, stock: 9, status: 'active', isPopular: false, imageText: '松阪豬' },
  { id: 5, name: '美國老饕牛小排', category: '肉品', price: 520, stock: 3, status: 'active', isPopular: false, imageText: '牛小排' },
  { id: 6, name: '霜降牛舌', category: '肉品', price: 460, stock: 12, status: 'inactive', isPopular: false, imageText: '牛舌' }
];

export default function AdminMenu() {
  const [activeCategory, setActiveCategory] = useState<string>('全部'); 
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [searchTerm, setSearchTerm] = useState<string>(''); 

  const [modalMode, setModalMode] = useState<'closed' | 'add' | 'edit'>('closed');
  const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});

  // 動態計算分類數量
  const displayCategories = categories.map(cat => ({
    ...cat,
    count: cat.id === 'all' 
      ? products.length 
      : products.filter(p => p.category === cat.name).length
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
      isPopular: false, 
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
        isPopular: formData.isPopular || false,
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
    if (product.isPopular) return { text: '人氣', type: 'warning' };
    return null;
  };

  const filteredProducts = products.filter(item => {
    const matchCategory = activeCategory === '全部' || item.category === activeCategory;
    const matchSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  useEffect(()=>{
    async function fetchCategories() {
      try {
        const response = await axios.get('http://localhost:8080/api/order/category');
        const fetchedCategories = response.data.map((category: Category[]) => ({
          ...category,
          count:0
        }))

        const categoriesWithAll = [
          { id: 'all', name: '全部', count: 0 },
          ...fetchedCategories
        ];

        setCategories(categoriesWithAll);
      } catch (error) {
        console.error(error)
      }
    }
    fetchCategories()
  },[]);

  return (
  <>
    <TopBar 
      childrenLeft={<div className='flex scale-80'><Badge text={`${products.length} 個品項・${categories.length} 個分類`} col="plain" /></div>} 
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
          onSelectCategory={setActiveCategory}
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
                              <span>{product.imageText}</span>
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
                          <td className={`p-4 font-medium ${product.stock === 0 ? 'text-danger' : 'text-ink-600'}`}>{product.stock}</td>
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