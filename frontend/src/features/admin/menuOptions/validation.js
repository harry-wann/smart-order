export function validateOptionGroup({ name, minSelect, maxSelect, sortOrder, mode }) {
  if (!name) return '請輸入群組名稱';
  if (name.length > 50) return '群組名稱最多 50 個字元';

  if (!Number.isSafeInteger(minSelect) || minSelect < 0) {
    return mode === 'create'
      ? 'min_select 必須是大於或等於 0 的整數'
      : '至少要選的數量必須是大於或等於 0 的整數';
  }

  if (!Number.isSafeInteger(maxSelect) || maxSelect < 1 || maxSelect < minSelect) {
    return mode === 'create'
      ? 'max_select 必須是大於等於 min_select 且至少為 1 的整數'
      : '最多可選的數量必須是大於等於至少要選數量且至少為 1 的整數';
  }

  if (mode === 'edit' && (!Number.isSafeInteger(sortOrder) || sortOrder < 0)) {
    return '排序必須是大於或等於 0 的整數';
  }

  return '';
}

export function validateOptionValue({ name, priceDelta, priceInput, mode }) {
  if (!name) return '請輸入選項名稱';
  if (name.length > 50) return '選項名稱最多 50 個字元';

  const isInvalidPrice = !Number.isFinite(priceDelta) || priceDelta < 0;
  const hasTooManyDecimals = mode === 'create' && !/^\d+(\.\d{1,2})?$/.test(priceInput);
  if (isInvalidPrice || hasTooManyDecimals) {
    return mode === 'create'
      ? '價差必須是大於或等於 0，且最多兩位小數的數字'
      : '價差必須是大於或等於 0 的數字';
  }

  return '';
}
