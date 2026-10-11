import { useEffect, useState } from "react";
import SOFormInput, { SOFormInputType } from '../../../components/input/SOFormInput'
import MenuCategoryTabs from '../../../components/MenuCategoryTabs'
import MenuItemRow from '../../../components/order/MenuItemRow'
import { SvgIconMap } from '@/assets/SvgIconMap'
import CustomerTopBar from '@/components/CustomerTopBar'
import SOButton from '@/components/SOButton'
import ServiceBell from '@/features/customer/order/ServiceBell'

import { Link, useNavigate } from "react-router";

import axios from "axios";

export default function Menu() {
  const [category,setCategory]=useState([]);
  const [items,setItems]=useState([]);
  const [activeCategoryId,setActiveCategoryId]=useState(null);
  const [searchKeyword,setSearchKeyword]=useState('');
  const [isBellOpen, setIsBellOpen] = useState(false);
  const navigate = useNavigate("");

  useEffect(() => {
    async function loadCategories() {
      try {
        const response = await axios.get('http://localhost:8080/api/order/category');
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
    const timeoutId = setTimeout(() => {
    async function loadItems() {
      try {
        const response = await axios.get('http://localhost:8080/api/order/items', {
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
    }, 300);

    return () => {
      isCurrentRequest = false;
      clearTimeout(timeoutId);
    };
  }, [activeCategoryId, searchKeyword]);

  return (
      <div className="relative min-h-screen w-full self-start bg-surface-2 pb-24">
        <CustomerTopBar title="A03 桌" subTitle="2 大 1 小 18:32 入座" showBackButton={false}>
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
          <div className="flex flex-col gap-4">
            {items.map((item) => (
                <button key={item.id} onClick={()=>{navigate('/order/itemdetail',{state : {productId:item.id}})}} className="cursor-pointer text-left">
                  <MenuItemRow
                      img={item.imageUrl}
                      title={item.name}
                      desc={item.description}
                      price={item.price}
                      isSoldOut={item.soldOut}
                  />
                </button>
            ))}
          </div>
        </main>

        <div className="fixed bottom-0 left-0 h-23.25 w-full border-t border-line bg-surface px-4 py-4">
          <Link to="/order/cart">
            <SOButton
                height="h-[56px]"
                content={[
                  <div key="cart-info" className="flex items-center gap-2">
                    <SvgIconMap.OrderShoppingCart role="img" aria-label="Cart" className="h-6 w-6" />
                    <span className="text-lg font-medium">購物車 6 項</span>
                  </div>,
                  <div key="cart-price" className="flex items-center gap-2">
                    <span className="text-lg font-medium">NT$ 1,420</span>
                    <SvgIconMap.MenuRight role="img" aria-label="Right" className="h-5 w-5" />
                  </div>,
                ]}
            />
          </Link>
        </div>
        <ServiceBell open={isBellOpen} onclick={() => setIsBellOpen(false)} />
      </div>
  )
}
