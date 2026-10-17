import TopBar from '@/components/dashboard/TopBar'
import SOButton from '@/components/SOButton';
import OptionGroupSidebar from '../../../components/menuOptions/OptionGroupSidebar';
import OptionGroupDetail from '../../../components/menuOptions/OptionGroupDetail';
import AssociatedProducts from '../../../components/menuOptions/AssociatedProducts';
import EditOptionGroupModal from '../../../components/menuOptions/EditOptionGroupModal';
import EditItemModal from '../../../components/menuOptions/EditItemModal';
import AddOptionGroupModal from '../../../components/menuOptions/AddOptionGroupModal';
import AddOptionValueModal from '../../../components/menuOptions/AddOptionValueModal';
import { SvgIconMap } from '@/assets/SvgIconMap';
import useOptionGroups from './useOptionGroups';
import useOptionValues from './useOptionValues';

export default function MenuOptions() {
  const {
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
      editGroupSortOrder,
      setEditGroupSortOrder,
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
    },
  } = useOptionGroups();
  const {
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
  } = useOptionValues({ selectedGroupId, currentGroup, setGroups });

  return (
    <>
      <TopBar
        childrenLeft={
          <span className="rounded-pill border border-line bg-surface-2 px-2.5 py-1 type-dashboard-top-bar-tag text-ink-600">
            {groups.length} 個群組
          </span>
        }
        childrenRight={
          <div className="w-fit">
            <SOButton
              type="button"
              onClick={handleOpenAddGroupModal}
              disabled={isLoading}
              height="h-9"
              content={
                <span className="flex items-center gap-1.5">
                  <SvgIconMap.DashboardPlus aria-hidden="true" />
                  新增群組
                </span>
              }
            />
          </div>
        }
      />
      <div className="relative flex min-h-0 min-w-0 flex-1 gap-4 overflow-auto bg-paper px-6 py-5 font-sans text-ink-900">
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
              onOpenEditGroupModal={() => handleOpenEditGroupModal(currentGroup)}
              onOpenItemModal={handleOpenItemModal}
              onOpenAddItemModal={handleOpenAddItemModal}
              onToggleItem={handleToggleItem}
              togglingItemId={togglingItemId}
              toggleItemError={toggleItemError}
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

          <EditOptionGroupModal
            group={editingGroup}
            groupName={editGroupName}
            setGroupName={setEditGroupName}
            minSelect={editGroupMinSelect}
            setMinSelect={setEditGroupMinSelect}
            maxSelect={editGroupMaxSelect}
            setMaxSelect={setEditGroupMaxSelect}
            sortOrder={editGroupSortOrder}
            setSortOrder={setEditGroupSortOrder}
            error={editGroupError}
            isSaving={isSavingGroupEdit}
            onClose={() => setEditingGroup(null)}
            onSave={handleSaveGroup}
            onDelete={handleDeleteGroup}
          />

          <EditItemModal
            isOpen={Boolean(editingItem)}
            itemName={tempItemName}
            setItemName={setTempItemName}
            itemPrice={tempItemPrice}
            setItemPrice={setTempItemPrice}
            error={editItemError}
            isSaving={isSavingItemEdit}
            isDeleting={isDeletingItem}
            onClose={() => setEditingItem(null)}
            onSave={handleSaveItem}
            onDelete={handleDeleteItem}
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
