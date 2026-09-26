export default function SOButton({
  text = null,
  content = null,
  variant = 'default',
  disabled = false,
  type = 'button',
  ...props
}) {
  const justifyClass = Array.isArray(text) && text.length > 1 ? 'justify-between' : 'justify-center'
  const contentClass =
    Array.isArray(content) && content.length > 1 ? 'justify-between' : 'justify-center'

  const themeClass = {
    danger: 'bg-danger text-surface hover:bg-[color-mix(in_srgb,var(--color-danger),black_8%)]',
    ghost: 'bg-transparent border border-transparent text-ink-600',
    secondary: 'bg-surface border border-brand-600 text-brand-600',
    default:
      'bg-brand-600 text-surface hover:bg-[color-mix(in_srgb,var(--color-brand-600),black_8%)]',
  }

  return (
    <button
      type={type}
      disabled={disabled}
      className={`flex w-full items-center rounded-[var(--radius-btn)] type-button sm:h-[36px] sm:px-3.5 md:h-[44px] md:px-5 lg:h-[52px] lg:px-6 ${themeClass[variant]} transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100`}
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
  )
}
