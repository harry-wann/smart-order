import React, { useEffect, useState } from 'react';
import TopBar from '@/components/dashboard/TopBar'
import OptionGroupSidebar from '../../../components/menuOptions/OptionGroupSidebar';
import OptionGroupDetail from '../../../components/menuOptions/OptionGroupDetail';
import AssociatedProducts from '../../../components/menuOptions/AssociatedProducts';
import GroupNameModal from '../../../components/menuOptions/GroupNameModal';
import EditItemModal from '../../../components/menuOptions/EditItemModal';
import AddOptionGroupModal from '../../../components/menuOptions/AddOptionGroupModal';
import AddOptionValueModal from '../../../components/menuOptions/AddOptionValueModal';
import { SvgIconMap } from '@/assets/SvgIconMap';
import { createApiClient } from '@/services/client/createApiClient'

const optionGroupsClient = createApiClient()

export default function MenuOptions() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');

  const [isEditingGroupName, setIsEditingGroupName] = useState(false);
  const [tempGroupName, setTempGroupName] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMinSelect, setNewGroupMinSelect] = useState('0');
  const [newGroupMaxSelect, setNewGroupMaxSelect] = useState('1');
  const [addGroupError, setAddGroupError] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  const [editingItem, setEditingItem] = useState(null);
  const [tempItemName, setTempItemName] = useState('');
  const [tempItemPrice, setTempItemPrice] = useState(0);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('0');
  const [addItemError, setAddItemError] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadOptionGroups() {
      try {
        const { data } = await optionGroupsClient.get('/order/admin/optionGroups');
        if (!isCurrentRequest) return;

        const fetchedGroups = data.map(group => ({
          id: String(group.id),
          name: group.name,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          sortOrder: group.sortOrder,
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

  useEffect(() => {
    if (!selectedGroupId) return undefined;

    let isCurrentRequest = true;
    async function loadOptionGroupDetails() {
      setIsLoadingDetails(true);
      setDetailsError('');
      try {
        const { data } = await optionGroupsClient.get(
          `/order/admin/optionGroups/${selectedGroupId}`
        );
        if (!isCurrentRequest) return;

        setGroups(prevGroups => prevGroups.map(group => (
          group.id === selectedGroupId
            ? {
                ...group,
                items: data.items.map(item => ({
                  id: String(item.id),
                  name: item.name,
                  priceDiff: Number(item.priceDelta),
                  sortOrder: item.sortOrder,
                  status: item.active ? 'active' : 'inactive',
                })),
                associatedProducts: data.associatedProducts,
              }
            : group
        )));
      } catch (error) {
        if (isCurrentRequest) {
          setDetailsError(error instanceof Error ? error.message : '載入選項群組資料失敗');
        }
      } finally {
        if (isCurrentRequest) setIsLoadingDetails(false);
      }
    }

    loadOptionGroupDetails();
    return () => {
      isCurrentRequest = false;
    };
  }, [selectedGroupId]);

  const handleOpenAddGroupModal = () => {
    setNewGroupName('');
    setNewGroupMinSelect('0');
    setNewGroupMaxSelect('1');
    setAddGroupError('');
    setIsAddingGroup(true);
  };

  const handleAddGroup = async () => {
    const name = newGroupName.trim();
    const minSelect = Number(newGroupMinSelect);
    const maxSelect = Number(newGroupMaxSelect);

    if (!name) {
      setAddGroupError('請輸入群組名稱');
      return;
    }
    if (name.length > 50) {
      setAddGroupError('群組名稱最多 50 個字元');
      return;
    }
    if (!Number.isSafeInteger(minSelect) || minSelect < 0) {
      setAddGroupError('min_select 必須是大於或等於 0 的整數');
      return;
    }
    if (!Number.isSafeInteger(maxSelect) || maxSelect < 1 || maxSelect < minSelect) {
      setAddGroupError('max_select 必須是大於等於 min_select 且至少為 1 的整數');
      return;
    }
    setIsSavingGroup(true);
    setAddGroupError('');
    try {
      const { data } = await optionGroupsClient.post('/order/admin/optionGroups', {
        name,
        minSelect,
        maxSelect,
      });
      const createdGroup = {
        id: String(data.id),
        name: data.name,
        minSelect: data.minSelect,
        maxSelect: data.maxSelect,
        sortOrder: data.sortOrder,
        items: [],
        associatedProducts: null,
      };

      setGroups(prevGroups => [...prevGroups, createdGroup]);
      setSelectedGroupId(createdGroup.id);
      setIsAddingGroup(false);
    } catch (error) {
      setAddGroupError(error instanceof Error ? error.message : '新增群組失敗，請稍後再試');
    } finally {
      setIsSavingGroup(false);
    }
  };

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

  const handleOpenAddItemModal = () => {
    setNewItemName('');
    setNewItemPrice('0');
    setAddItemError('');
    setIsAddingItem(true);
  };

  const handleAddItem = async () => {
    if (!currentGroup) return;

    const name = newItemName.trim();
    const priceDelta = Number(newItemPrice);
    if (!name) {
      setAddItemError('請輸入選項名稱');
      return;
    }
    if (name.length > 50) {
      setAddItemError('選項名稱最多 50 個字元');
      return;
    }
    if (!Number.isFinite(priceDelta) || priceDelta < 0 || !/^\d+(\.\d{1,2})?$/.test(newItemPrice)) {
      setAddItemError('價差必須是大於或等於 0，且最多兩位小數的數字');
      return;
    }

    setIsSavingItem(true);
    setAddItemError('');
    try {
      const { data } = await optionGroupsClient.post(
        `/order/admin/optionGroups/${currentGroup.id}/items`,
        { name, priceDelta }
      );
      const createdItem = {
        id: String(data.id),
        name: data.name,
        priceDiff: Number(data.priceDelta),
        sortOrder: data.sortOrder,
        status: data.active ? 'active' : 'inactive',
      };

      setGroups(prevGroups => prevGroups.map(group => (
        group.id === currentGroup.id
          ? { ...group, items: [...group.items, createdItem] }
          : group
      )));
      setIsAddingItem(false);
    } catch (error) {
      setAddItemError(error instanceof Error ? error.message : '新增選項失敗，請稍後再試');
    } finally {
      setIsSavingItem(false);
    }
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

  return (
    <>
      <TopBar
        childrenLeft={
          <span className="rounded-pill border border-line bg-surface-2 px-2.5 py-1 type-dashboard-top-bar-tag text-ink-600">
            {groups.length} 個群組
          </span>
        }
        childrenRight={
          <button
            type="button"
            onClick={handleOpenAddGroupModal}
            disabled={isLoading}
            className="flex h-9 items-center gap-1.5 rounded-(--radius-btn) bg-brand-600 px-3.5 type-body-sm text-white transition-colors hover:bg-brand-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <SvgIconMap.DashboardPlus aria-hidden="true" />
            新增群組
          </button>
        }
      />
      <div className="relative flex min-h-0 flex-1 gap-4 overflow-y-auto bg-paper px-6 py-5 font-sans text-ink-900">
      <OptionGroupSidebar 
        groups={groups} 
        selectedGroupId={selectedGroupId} 
        onSelectGroup={setSelectedGroupId} 
      />

      {isLoading ? (
        <div className="flex-1 rounded-(--radius-card) border border-line bg-surface p-6 text-ink-600">載入選項群組中...</div>
      ) : loadError ? (
        <div role="alert" className="flex-1 rounded-(--radius-card) border border-danger-line bg-surface p-6 text-danger">載入選項群組失敗：{loadError}</div>
      ) : currentGroup ? (
        <>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <OptionGroupDetail
              currentGroup={currentGroup}
              isLoading={isLoadingDetails}
              onOpenGroupNameModal={handleOpenGroupNameModal}
              onOpenItemModal={handleOpenItemModal}
              onOpenAddItemModal={handleOpenAddItemModal}
            />

            <AssociatedProducts
              associatedProducts={currentGroup.associatedProducts}
              isLoading={isLoadingDetails}
            />
            {detailsError && (
              <div role="alert" className="text-danger">
                載入選項群組資料失敗：{detailsError}
              </div>
            )}
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

          <AddOptionValueModal
            isOpen={isAddingItem}
            itemName={newItemName}
            setItemName={setNewItemName}
            itemPrice={newItemPrice}
            setItemPrice={setNewItemPrice}
            error={addItemError}
            isSaving={isSavingItem}
            onClose={() => setIsAddingItem(false)}
            onSave={handleAddItem}
          />
        </>
      ) : (
        <div className="flex-1 rounded-(--radius-card) border border-line bg-surface p-6 text-ink-600">目前沒有選項群組</div>
      )}
      </div>
      <AddOptionGroupModal
        isOpen={isAddingGroup}
        groupName={newGroupName}
        setGroupName={setNewGroupName}
        minSelect={newGroupMinSelect}
        setMinSelect={setNewGroupMinSelect}
        maxSelect={newGroupMaxSelect}
        setMaxSelect={setNewGroupMaxSelect}
        error={addGroupError}
        isSaving={isSavingGroup}
        onClose={() => setIsAddingGroup(false)}
        onSave={handleAddGroup}
      />
    </>
  );
}