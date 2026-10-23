import { useEffect, useState } from 'react';
import { employeeClient } from '@/services/client/employeeClient';
import { validateOptionGroup } from './validation';

// 選項群組 API（/order/admin）只給店長，要帶員工 token，所以用 employeeClient
export default function useOptionGroups() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingGroup, setEditingGroup] = useState(null);
  const [editGroupName, setEditGroupName] = useState('');
  const [editGroupMinSelect, setEditGroupMinSelect] = useState('0');
  const [editGroupMaxSelect, setEditGroupMaxSelect] = useState('1');
  const [editGroupError, setEditGroupError] = useState('');
  const [isSavingGroupEdit, setIsSavingGroupEdit] = useState(false);
  const [isReorderingGroups, setIsReorderingGroups] = useState(false);
  const [reorderGroupsError, setReorderGroupsError] = useState('');
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupMinSelect, setNewGroupMinSelect] = useState('0');
  const [newGroupMaxSelect, setNewGroupMaxSelect] = useState('1');
  const [addGroupError, setAddGroupError] = useState('');
  const [isSavingGroup, setIsSavingGroup] = useState(false);

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadOptionGroups() {
      try {
        const { data } = await employeeClient.get('/order/admin/optionGroups');
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

    const validationError = validateOptionGroup({ name, minSelect, maxSelect, mode: 'create' });
    if (validationError) {
      setAddGroupError(validationError);
      return;
    }
    setIsSavingGroup(true);
    setAddGroupError('');
    try {
      const { data } = await employeeClient.post('/order/admin/optionGroups', {
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

      setGroups(prevGroups => [...prevGroups, createdGroup]
        .sort((first, second) => first.sortOrder - second.sortOrder));
      setSelectedGroupId(createdGroup.id);
      setIsAddingGroup(false);
    } catch (error) {
      setAddGroupError(error instanceof Error ? error.message : '新增群組失敗，請稍後再試');
    } finally {
      setIsSavingGroup(false);
    }
  };

  const handleOpenEditGroupModal = group => {
    setEditingGroup(group);
    setEditGroupName(group.name);
    setEditGroupMinSelect(String(group.minSelect));
    setEditGroupMaxSelect(String(group.maxSelect));
    setEditGroupError('');
  };

  const handleSaveGroup = async () => {
    if (!editingGroup) return;

    const name = editGroupName.trim();
    const minSelect = Number(editGroupMinSelect);
    const maxSelect = Number(editGroupMaxSelect);
    const sortOrder = editingGroup.sortOrder;

    const validationError = validateOptionGroup({
      name,
      minSelect,
      maxSelect,
      sortOrder,
      mode: 'edit',
    });
    if (validationError) {
      setEditGroupError(validationError);
      return;
    }

    setIsSavingGroupEdit(true);
    setEditGroupError('');
    try {
      const { data } = await employeeClient.put(
        `/order/admin/optionGroups/${editingGroup.id}`,
        { name, minSelect, maxSelect, sortOrder }
      );
      setGroups(prevGroups => prevGroups
        .map(group => (
          group.id === editingGroup.id
            ? {
                ...group,
                name: data.name,
                minSelect: data.minSelect,
                maxSelect: data.maxSelect,
                sortOrder: data.sortOrder,
              }
            : group
        ))
        .sort((first, second) => first.sortOrder - second.sortOrder));
      setEditingGroup(null);
    } catch (error) {
      setEditGroupError(error instanceof Error ? error.message : '更新選項群組失敗，請稍後再試');
    } finally {
      setIsSavingGroupEdit(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!editingGroup || isSavingGroupEdit) return;
    if (!window.confirm(`確定要刪除「${editingGroup.name}」群組及其選項嗎？`)) return;

    setIsSavingGroupEdit(true);
    setEditGroupError('');
    try {
      await employeeClient.delete(`/order/admin/optionGroups/${editingGroup.id}`);
      const remainingGroups = groups.filter(group => group.id !== editingGroup.id);
      setGroups(prevGroups => prevGroups.filter(group => group.id !== editingGroup.id));
      setSelectedGroupId(previousId => (
        previousId === editingGroup.id ? remainingGroups[0]?.id ?? null : previousId
      ));
      setEditingGroup(null);
    } catch (error) {
      setEditGroupError(error instanceof Error ? error.message : '刪除選項群組失敗，請稍後再試');
    } finally {
      setIsSavingGroupEdit(false);
    }
  };

  const handleReorderGroups = async (sourceGroupId, targetGroupId, insertAfterTarget) => {
    if (isReorderingGroups || sourceGroupId === targetGroupId) return;

    const sourceIndex = groups.findIndex(group => group.id === sourceGroupId);
    const targetIndex = groups.findIndex(group => group.id === targetGroupId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const previousGroups = groups;
    const reorderedGroups = [...groups];
    const [movedGroup] = reorderedGroups.splice(sourceIndex, 1);
    const updatedTargetIndex = reorderedGroups.findIndex(group => group.id === targetGroupId);
    const insertIndex = updatedTargetIndex + (insertAfterTarget ? 1 : 0);
    reorderedGroups.splice(insertIndex, 0, movedGroup);
    const groupsWithUpdatedOrder = reorderedGroups.map((group, index) => ({
      ...group,
      sortOrder: index,
    }));

    setIsReorderingGroups(true);
    setReorderGroupsError('');
    setGroups(groupsWithUpdatedOrder);

    try {
      const saveResults = await Promise.allSettled(groupsWithUpdatedOrder.map(group => (
        employeeClient.put(`/order/admin/optionGroups/${group.id}`, {
          name: group.name,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          sortOrder: group.sortOrder,
        })
      )));
      const failedSave = saveResults.find(result => result.status === 'rejected');
      if (failedSave) throw failedSave.reason;
    } catch (error) {
      const rollbackResults = await Promise.allSettled(previousGroups.map(group => (
        employeeClient.put(`/order/admin/optionGroups/${group.id}`, {
          name: group.name,
          minSelect: group.minSelect,
          maxSelect: group.maxSelect,
          sortOrder: group.sortOrder,
        })
      )));
      setGroups(previousGroups);
      setReorderGroupsError(
        `${error instanceof Error ? error.message : '重新排序選項群組失敗'}${
          rollbackResults.some(result => result.status === 'rejected')
            ? '；部分排序未能還原，請重新整理頁面。'
            : ''
        }`
      );
    } finally {
      setIsReorderingGroups(false);
    }
  };


  return {
    data: { groups, setGroups, selectedGroupId, setSelectedGroupId, currentGroup },
    loading: { isLoading, loadError },
    editForm: {
      editingGroup,
      editGroupName,
      setEditGroupName,
      editGroupMinSelect,
      setEditGroupMinSelect,
      editGroupMaxSelect,
      setEditGroupMaxSelect,
      editGroupError,
      isSavingGroupEdit,
      setEditingGroup,
    },
    createForm: {
      isAddingGroup,
      newGroupName,
      setNewGroupName,
      newGroupMinSelect,
      setNewGroupMinSelect,
      newGroupMaxSelect,
      setNewGroupMaxSelect,
      addGroupError,
      isSavingGroup,
      setIsAddingGroup,
    },
    actions: {
      handleOpenAddGroupModal,
      handleAddGroup,
      handleOpenEditGroupModal,
      handleSaveGroup,
      handleDeleteGroup,
      handleReorderGroups,
    },
    reorder: { isReorderingGroups, reorderGroupsError },
  };
}
