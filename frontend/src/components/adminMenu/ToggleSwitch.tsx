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
      className={`w-10 h-6 rounded-full relative transition-colors cursor-pointer ${
        active ? 'bg-success' : 'bg-line-strong'
      }`}
    >
      <div className={`w-4 h-4 bg-surface rounded-full absolute top-1 transition-transform ${
        active ? 'right-1' : 'left-1'
      }`} />
    </button>
  );
}