import React from 'react';

interface SOButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'content'> {
  text?: React.ReactNode | React.ReactNode[];
  content?: React.ReactNode | React.ReactNode[];
  variant?: 'default' | 'danger' | 'ghost' | 'secondary';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  height?: string;
}

export default function SOButton({
  text = null,
  content = null,
  variant = 'default',
  disabled = false,
  type = 'button',
  height = 'h-11',
  ...props
}: SOButtonProps) {
  const justifyClass = Array.isArray(text) && text.length > 1 ? 'justify-between' : 'justify-center';
  const contentClass = Array.isArray(content) && content.length > 1 ? 'justify-between' : 'justify-center';
  // DS-02: lg / md / sm 對應 52 / 44 / 36px，水平留白也跟著尺寸固定。
  const isLarge = height.includes('h-13') || height.includes('52px') || height.includes('56px');
  const isMedium = height.includes('h-11') || height.includes('h-12');
  const paddingClass = isLarge ? 'px-6' : isMedium ? 'px-5' : 'px-3.5';
  const textClass = isLarge
    ? 'type-button'
    : isMedium
      ? 'text-base leading-none font-medium'
      : 'text-sm leading-none font-medium';

  const themeClass: Record<string, string> = {
    danger: 'bg-danger text-surface hover:bg-[color-mix(in_srgb,var(--color-danger),black_8%)]',
    ghost: 'bg-transparent border border-transparent text-ink-600',
    secondary: 'bg-surface border border-brand-600 text-brand-600',
    default: 'bg-brand-600 text-surface hover:bg-[color-mix(in_srgb,var(--color-brand-600),black_8%)]',
  };

  return (
    <button
      type={type}
      disabled={disabled}
      className={`flex ${height} w-full items-center rounded-(--radius-btn) ${paddingClass} ${textClass} ${themeClass[variant] || themeClass.default} transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100`}
      {...props}
    >
      {text !== null ? (
        <div className={`flex w-full ${justifyClass}`}>
          {Array.isArray(text) ? (
            text.map((item, index) => (
              <span key={index} className="mx-3 flex items-center">
                {item}
              </span>
            ))
          ) : (
            <span className="flex items-center">{text}</span>
          )}
        </div>
      ) : (
        <div className={`flex w-full ${contentClass}`}>
          {Array.isArray(content) ? (
            content.map((item, index) => (
              <div key={index} className="flex items-center">
                {item}
              </div>
            ))
          ) : (
            <div className="flex items-center">{content}</div>
          )}
        </div>
      )}
    </button>
  );
}
