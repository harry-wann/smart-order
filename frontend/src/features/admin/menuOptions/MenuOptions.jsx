import React, { useState } from 'react';
import TopBar from '@/components/dashboard/TopBar'
import OptionGroupSidebar from '../../../components/MenuOptions/OptionGroupSidebar';
import OptionGroupDetail from '../../../components/MenuOptions/OptionGroupDetail';
import AssociatedProducts from '../../../components/MenuOptions/AssociatedProducts';
import GroupNameModal from '../../../components/MenuOptions/GroupNameModal';
import EditItemModal from '../../../components/MenuOptions/EditItemModal';
import SOButton from '@/components/SOButton';
import Badge from '@/components/Badge';

const INITIAL_OPTION_GROUPS = [
  {
    id: 'g1',
    name: '份量',
    typeDescription: '必選 單選 · 掛在 18 個品項上',
    minSelect: 1,
    maxSelect: 1,
    sortOrder: 1,
    items: [
      { id: 'i1', name: '半份 約 120g', priceDiff: 0, sortOrder: 1, status: 'active' },
      { id: 'i2', name: '全份 約 220g', priceDiff: 80, sortOrder: 2, status: 'active' },
      { id: 'i3', name: '加大 約 320g', priceDiff: 160, sortOrder: 3, status: 'disabled' },
    ],
    associatedProducts: [
      '安格斯霜降牛五花', '伊比利豬梅花', '台灣松阪豬', '美國老饕牛小排',
      '霜降牛舌', '紐西蘭小羔羊肩', '海鮮拼盤', '時蔬八品', '...還有 10 個'
    ]
  },
  {
    id: 'g2',
    name: '辣度',
    typeDescription: '選填 單選 · 掛在 22 個品項上',
    minSelect: 0,
    maxSelect: 1,
    sortOrder: 2,
    items: [
      { id: 'i4', name: '不辣', priceDiff: 0, sortOrder: 1, status: 'active' },
      { id: 'i5', name: '小辣', priceDiff: 0, sortOrder: 2, status: 'active' },
    ],
    associatedProducts: ['麻辣鍋底', '川味口水雞']
  },
  {
    id: 'g3',
    name: '加點配料',
    typeDescription: '選填 複選 · 掛在 26 個品項上',
    minSelect: 0,
    maxSelect: 5,
    sortOrder: 3,
    items: [
      { id: 'i6', name: '手工蝦滑', priceDiff: 120, sortOrder: 1, status: 'active' },
    ],
    associatedProducts: ['綜合火鍋料']
  }
];

export default function MenuOptions() {
  const [groups, setGroups] = useState(INITIAL_OPTION_GROUPS);
  const [selectedGroupId, setSelectedGroupId] = useState(INITIAL_OPTION_GROUPS[0].id);

  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [tempGroupName, setTempGroupName] = useState('');

  const [editingItem, setEditingItem] = useState(null);
  const [tempItemName, setTempItemName] = useState('');
  const [tempItemPrice, setTempItemPrice] = useState(0);

  const currentGroup = groups.find(g => g.id === selectedGroupId) || groups[0];

  const handleOpenGroupNameModal = () => {
    setTempGroupName(currentGroup.name);
    setIsEditingGroupName(true);
  };

  const handleSaveGroupName = () => {
    setGroups(prevGroups =>
      prevGroups.map(g =>
        g.id === currentGroup.id ? { ...g, name: tempGroupName } : g
      )
    );
    setIsEditingGroupName(false);
  };

  const handleOpenItemModal = (item) => {
    setEditingItem(item);
    setTempItemName(item.name);
    setTempItemPrice(item.priceDiff);
  };

  const handleSaveItem = () => {
    if (!editingItem) return;
    setGroups(prevGroups =>
      prevGroups.map(g => {
        if (g.id !== currentGroup.id) return g;
        const updatedItems = g.items.map(item =>
          item.id === editingItem.id
            ? { ...item, name: tempItemName, priceDiff: Number(tempItemPrice) }
            : item
        );
        return { ...g, items: updatedItems };
      })
    );
    setEditingItem(null);
  };

  return (<><TopBar
        childrenLeft={
          <div className='flex scale-70'>
            <Badge text="5 個群組" col="plain" />
          </div>
        }
        childrenRight={
          <SOButton height="h-[44px]"text="新增群組" />
        }
      />
    <div className="flex h-screen bg-paper p-(--spacing-page) gap-(--spacing-field) text-ink-900 font-sans relative">
      
      
      <OptionGroupSidebar 
        groups={groups} 
        selectedGroupId={selectedGroupId} 
        onSelectGroup={setSelectedGroupId} 
      />

      <div className="flex-1 flex flex-col gap-(--spacing-field)">
        <OptionGroupDetail 
          currentGroup={currentGroup}
          onOpenGroupNameModal={handleOpenGroupNameModal}
          onOpenItemModal={handleOpenItemModal}
        />

        <AssociatedProducts 
          associatedProducts={currentGroup.associatedProducts} 
        />
      </div>

      <GroupNameModal 
        isOpen={isEditingGroupName}
        groupName={tempGroupName}
        setGroupName={setTempGroupName}
        onClose={() => setIsEditingGroupName(false)}
        onSave={handleSaveGroupName}
      />

      <EditItemModal 
        isOpen={Boolean(editingItem)}
        itemName={tempItemName}
        setItemName={setTempItemName}
        itemPrice={tempItemPrice}
        setItemPrice={setTempItemPrice}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveItem}
      />

    </div></>
  );
}