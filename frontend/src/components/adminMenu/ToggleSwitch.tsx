import React from 'react';

interface ToggleSwitchProps {
  active: boolean;
  onToggle: () => void;
}

export default function ToggleSwitch({ active, onToggle }: ToggleSwitchProps) {
  return (
    <button 
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={active}
      aria-label="商品上架狀態"
      className={`w-[46px] h-[26px] shrink-0 rounded-full relative transition-colors cursor-pointer ${
        active ? 'bg-success' : 'bg-line'
      }`}
    >
      <div className={`w-5 h-5 bg-surface rounded-full absolute top-[3px] transition-transform ${
        active ? 'left-[23px]' : 'left-[3px]'
      }`} />
    </button>
  );
}