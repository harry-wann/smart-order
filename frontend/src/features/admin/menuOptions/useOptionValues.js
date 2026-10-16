import { useEffect, useState } from 'react';
import { createApiClient } from '@/services/client/createApiClient';
import { validateOptionValue } from './validation';

const optionGroupsClient = createApiClient();

export default function useOptionValues({ selectedGroupId, currentGroup, setGroups }) {
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [tempItemName, setTempItemName] = useState('');
  const [tempItemPrice, setTempItemPrice] = useState(0);
  const [editItemError, setEditItemError] = useState('');
  const [isSavingItemEdit, setIsSavingItemEdit] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('0');
  const [addItemError, setAddItemError] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);
  const [togglingItemId, setTogglingItemId] = useState(null);
  const [toggleItemError, setToggleItemError] = useState('');

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
  }, [selectedGroupId, setGroups]);

  const handleOpenItemModal = (item) => {
    setEditingItem(item);
    setTempItemName(item.name);
    setTempItemPrice(item.priceDiff);
    setEditItemError('');
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
    const validationError = validateOptionValue({
      name,
      priceDelta,
      priceInput: newItemPrice,
      mode: 'create',
    });
    if (validationError) {
      setAddItemError(validationError);
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

  const handleSaveItem = async () => {
    if (!editingItem || !currentGroup) return;

    const name = tempItemName.trim();
    const priceDelta = Number(tempItemPrice);
    const validationError = validateOptionValue({
      name,
      priceDelta,
      priceInput: tempItemPrice,
      mode: 'edit',
    });
    if (validationError) {
      setEditItemError(validationError);
      return;
    }

    setIsSavingItemEdit(true);
    setEditItemError('');
    try {
      const { data } = await optionGroupsClient.put(
        `/order/admin/optionGroups/${currentGroup.id}/items/${editingItem.id}`,
        { name, priceDelta }
      );
      setGroups(prevGroups => prevGroups.map(group => (
        group.id === currentGroup.id
          ? {
              ...group,
              items: group.items.map(item => (
                item.id === editingItem.id
                  ? { ...item, name: data.name, priceDiff: Number(data.priceDelta) }
                  : item
              )),
            }
          : group
      )));
      setEditingItem(null);
    } catch (error) {
      setEditItemError(error instanceof Error ? error.message : '更新選項失敗，請稍後再試');
    } finally {
      setIsSavingItemEdit(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!editingItem || !currentGroup || isDeletingItem) return;
    if (!window.confirm(`確定要刪除「${editingItem.name}」選項嗎？`)) return;

    setIsDeletingItem(true);
    setEditItemError('');
    try {
      await optionGroupsClient.delete(
        `/order/admin/optionGroups/${currentGroup.id}/items/${editingItem.id}`
      );
      setGroups(prevGroups => prevGroups.map(group => (
        group.id === currentGroup.id
          ? { ...group, items: group.items.filter(item => item.id !== editingItem.id) }
          : group
      )));
      setEditingItem(null);
    } catch (error) {
      setEditItemError(error instanceof Error ? error.message : '刪除選項失敗，請稍後再試');
    } finally {
      setIsDeletingItem(false);
    }
  };

  const handleToggleItem = async item => {
    if (!currentGroup || togglingItemId) return;

    setTogglingItemId(item.id);
    setToggleItemError('');
    try {
      const { data } = await optionGroupsClient.patch(
        `/order/admin/optionGroups/${currentGroup.id}/items/${item.id}/status`,
        { active: item.status !== 'active' }
      );
      setGroups(prevGroups => prevGroups.map(group => (
        group.id === currentGroup.id
          ? {
              ...group,
              items: group.items.map(groupItem => (
                groupItem.id === item.id
                  ? { ...groupItem, status: data.active ? 'active' : 'inactive' }
                  : groupItem
              )),
            }
          : group
      )));
    } catch (error) {
      setToggleItemError(error instanceof Error ? error.message : '更新選項狀態失敗，請稍後再試');
    } finally {
      setTogglingItemId(null);
    }
  };


  return {
    loading: { isLoadingDetails, detailsError },
    editForm: {
      editingItem,
      tempItemName,
      setTempItemName,
      tempItemPrice,
      setTempItemPrice,
      editItemError,
      isSavingItemEdit,
      isDeletingItem,
      setEditingItem,
    },
    createForm: {
      isAddingItem,
      newItemName,
      setNewItemName,
      newItemPrice,
      setNewItemPrice,
      addItemError,
      isSavingItem,
      setIsAddingItem,
    },
    status: { togglingItemId, toggleItemError },
    actions: {
      handleOpenItemModal,
      handleOpenAddItemModal,
      handleAddItem,
      handleSaveItem,
      handleDeleteItem,
      handleToggleItem,
    },
  };
}
