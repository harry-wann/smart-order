import React, { useEffect, useState } from 'react';
import TopBar from '@/components/dashboard/TopBar'
import OptionGroupSidebar from '../../../components/menuOptions/OptionGroupSidebar';
import OptionGroupDetail from '../../../components/menuOptions/OptionGroupDetail';
import AssociatedProducts from '../../../components/menuOptions/AssociatedProducts';
import GroupNameModal from '../../../components/menuOptions/GroupNameModal';
import EditItemModal from '../../../components/menuOptions/EditItemModal';
import SOButton from '@/components/SOButton';
import Badge from '@/components/Badge';
import { createApiClient } from '@/services/client/createApiClient'

const optionGroupsClient = createApiClient()

export default function MenuOptions() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [tempGroupName, setTempGroupName] = useState('');

  const [editingItem, setEditingItem] = useState(null);
  const [tempItemName, setTempItemName] = useState('');
  const [tempItemPrice, setTempItemPrice] = useState(0);

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadOptionGroups() {
      try {
        const { data } = await optionGroupsClient.get('/order/admin/optionGroups');
        if (!isCurrentRequest) return;

        const fetchedGroups = data.map(group => ({
          id: String(group.id),
          name: group.name,
          minSelect: null,
          maxSelect: null,
          sortOrder: null,
          items: [],
          associatedProducts: null,
        }));
        setGroups(fetchedGroups);
        setSelectedGroupId(fetchedGroups[0]?.id ?? null);
      } catch (error) {
        if (isCurrentRequest) {
          setLoadError(error instanceof Error ? error.message : '載入選項群組失敗');
        }
      } finally {
        if (isCurrentRequest) setIsLoading(false);
      }
    }

    loadOptionGroups();
    return () => {
      isCurrentRequest = false;
    };
  }, []);

  const currentGroup = groups.find(g => g.id === selectedGroupId);

  const handleOpenGroupNameModal = () => {
    if (!currentGroup) return;
    setTempGroupName(currentGroup.name);
    setIsEditingGroupName(true);
  };

  const handleSaveGroupName = () => {
    if (!currentGroup) return;
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
            <Badge text={`${groups.length} 個群組`} col="plain" />
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

      {isLoading ? (
        <div className="flex-1 text-ink-600">載入選項群組中...</div>
      ) : loadError ? (
        <div role="alert" className="flex-1 text-danger">載入選項群組失敗：{loadError}</div>
      ) : currentGroup ? (
        <>
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
        </>
      ) : (
        <div className="flex-1 text-ink-600">目前沒有選項群組</div>
      )}
    </div></>
  );
}